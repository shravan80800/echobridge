/**
 * Live URL Importer API Route Handler (Phase 1)
 * Supports public & PAT-authenticated GitHub repositories and public Google Docs
 * with zero OAuth setup. Runs fetched content through Secret Redaction,
 * Prompt-Injection Guard, and Handover Draft Reconstruction.
 */

import { NextRequest, NextResponse } from "next/server";
import { ingestSources, type RawSourceInput } from "@/services/ingestion/parser.service";
import { reconstructAllAudienceDrafts } from "@/services/trust/generator.service";
import {
  fetchGitHubSources,
  fetchGoogleDocSource,
  LiveImportError,
  stripSecretToken,
} from "@/services/ingestion/live-import.service";

export const dynamic = "force-dynamic";

interface LiveImportRequestBody {
  type?: "github" | "google_doc";
  url?: string;
  token?: string;
  projectId?: string;
}

export async function POST(request: NextRequest) {
  let rawToken: string | undefined;

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
    const projectId =
      typeof body.projectId === "string" && body.projectId.trim()
        ? body.projectId.trim()
        : "CampusConnect";

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

    let sources: RawSourceInput[] = [];
    if (importType === "github") {
      const result = await fetchGitHubSources(url, rawToken);
      sources = result.sources;
    } else {
      const docSource = await fetchGoogleDocSource(url, rawToken);
      sources = [docSource];
    }

    const summary = await ingestSources(sources, projectId);
    await reconstructAllAudienceDrafts(projectId);

    return NextResponse.json({
      success: true,
      sourcesIngested: summary.sourcesIngested,
      chunksCreated: summary.chunksCreated,
      quarantinedSecretsCount: summary.quarantinedSecretsCount,
      injectionsFlaggedCount: summary.injectionsFlaggedCount,
      message: "Live content ingested and draft updated.",
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
