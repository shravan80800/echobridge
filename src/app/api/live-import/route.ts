/**
 * Live URL Importer API Route Handler
 * Supports public & PAT-authenticated GitHub repositories and public Google Docs
 * with zero OAuth setup. Supports both creating isolated project workspaces
 * (`mode: "new_workspace"`) and appending into an existing workspace (`projectId`).
 */

import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/supabase/repository";
import { ingestSources, type RawSourceInput } from "@/services/ingestion/parser.service";
import { reconstructAllAudienceDrafts } from "@/services/trust/generator.service";
import {
  appendGapQuestionForLiveImport,
  getOrGenerateGapQuestions,
} from "@/services/workflow/interview.service";
import { ensureCustomDraftVersionsInitialized } from "@/services/workflow/review.service";
import {
  checkLiveImportRateLimit,
  extractClientRateLimitKey,
  fetchGitHubSources,
  fetchGoogleDocSource,
  LiveImportError,
  resolveGitHubWorkspaceMeta,
  resolveGoogleDocWorkspaceMeta,
  stripSecretToken,
} from "@/services/ingestion/live-import.service";

export const dynamic = "force-dynamic";

interface LiveImportRequestBody {
  type?: "github" | "google_doc";
  url?: string;
  token?: string;
  mode?: "new_workspace" | "append";
  projectId?: string;
  title?: string;
}

export async function POST(request: NextRequest) {
  let rawToken: string | undefined;

  const clientKey = extractClientRateLimitKey(request.headers);
  const rateLimit = checkLiveImportRateLimit(clientKey);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Too many live import requests. Please wait ${rateLimit.retryAfterSeconds} seconds and try again.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  try {
    let body: LiveImportRequestBody;
    try {
      body = (await request.json()) as LiveImportRequestBody;
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const importType = body.type;
    const url = typeof body.url === "string" ? body.url.trim() : "";
    rawToken = typeof body.token === "string" ? body.token.trim() : undefined;
    const mode = body.mode === "new_workspace" ? "new_workspace" : "append";
    const titleOverride =
      typeof body.title === "string" ? body.title.trim() : undefined;

    if (importType !== "github" && importType !== "google_doc") {
      return NextResponse.json(
        { success: false, error: "Invalid import type. Expected 'github' or 'google_doc'." },
        { status: 400 }
      );
    }

    if (!url) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid URL to import." },
        { status: 400 }
      );
    }

    // 1. Fetch upstream live content first so invalid/private failures leave zero broken workspaces
    let sources: RawSourceInput[] = [];
    if (importType === "github") {
      const result = await fetchGitHubSources(url, rawToken);
      sources = result.sources;
    } else {
      const docSource = await fetchGoogleDocSource(url, rawToken);
      sources = [docSource];
    }

    // 2. Resolve target workspace & register Project when creating or using a custom workspace
    const importedMeta =
      importType === "github"
        ? resolveGitHubWorkspaceMeta(url, titleOverride)
        : resolveGoogleDocWorkspaceMeta(url, titleOverride);

    let targetProjectId =
      typeof body.projectId === "string" && body.projectId.trim()
        ? body.projectId.trim()
        : "CampusConnect";
    let targetProjectName = targetProjectId;

    if (mode === "new_workspace") {
      targetProjectId = importedMeta.projectId;
      targetProjectName = importedMeta.projectName;

      await repository.createOrUpdateProject({
        id: importedMeta.projectId,
        name: importedMeta.projectName,
        description: importedMeta.description,
        freshness_threshold_days: 180,
        created_at: new Date().toISOString(),
      });
    } else if (targetProjectId !== "CampusConnect") {
      const existing = await repository.getProject(targetProjectId);
      if (!existing) {
        targetProjectName = titleOverride || targetProjectId;
        await repository.createOrUpdateProject({
          id: targetProjectId,
          name: targetProjectName,
          description: "Custom EchoBridge Handover Workspace",
          freshness_threshold_days: 180,
          created_at: new Date().toISOString(),
        });
      } else {
        targetProjectName = existing.name;
      }
    } else {
      const existing = await repository.getProject("CampusConnect");
      targetProjectName = existing?.name || "CampusConnect";
    }

    // 3. Ingest, redact, verify & reconstruct drafts
    const summary = await ingestSources(sources, targetProjectId);
    await reconstructAllAudienceDrafts(targetProjectId);

    const ingestedSourceIds = sources
      .map((s) => s.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    // 4. Initialize v1.1/v2.0 snapshots & synthesize or append Gap-Interview questions
    if (targetProjectId !== "CampusConnect") {
      await ensureCustomDraftVersionsInitialized(targetProjectId);
      const existingGapQuestions = await repository.listGapQuestions(targetProjectId);
      if (existingGapQuestions.length === 0) {
        await getOrGenerateGapQuestions(targetProjectId, "incoming_lead");
      } else if (mode === "append") {
        await appendGapQuestionForLiveImport({
          projectId: targetProjectId,
          importedLabel: importedMeta.projectName,
          sourceIds: ingestedSourceIds,
        });
      }
    } else if (mode === "append") {
      await appendGapQuestionForLiveImport({
        projectId: targetProjectId,
        importedLabel: importedMeta.projectName,
        sourceIds: ingestedSourceIds,
      });
    }

    const projectRecord = await repository.getProject(targetProjectId);
    const resolvedProjectName = projectRecord?.name || targetProjectName;

    return NextResponse.json({
      success: true,
      projectId: targetProjectId,
      projectName: resolvedProjectName,
      sourcesIngested: summary.sourcesIngested,
      chunksCreated: summary.chunksCreated,
      quarantinedSecretsCount: summary.quarantinedSecretsCount,
      injectionsFlaggedCount: summary.injectionsFlaggedCount,
      message: `Live content ingested into "${resolvedProjectName}" and handover drafts updated.`,
    });
  } catch (error) {
    if (error instanceof LiveImportError) {
      return NextResponse.json(
        {
          success: false,
          error: stripSecretToken(error.message, rawToken),
        },
        { status: error.status }
      );
    }

    const message =
      error instanceof Error
        ? stripSecretToken(error.message, rawToken)
        : "Unexpected error during live URL import";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
