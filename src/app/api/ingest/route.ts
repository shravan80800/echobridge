/**
 * Source Ingestion API Route Handler
 * Implements docs/ARCHITECTURE.md Section 3 and TASKS.md TASK-010.
 *
 * GET: Retrieves current source inventory, ACL scope map, quarantined secrets, and injection warnings.
 * POST: Triggers ingestion of custom sources or re-indexes the CampusConnect benchmark seed.
 */

import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/supabase/repository";
import {
  ingestCampusConnectSeed,
  ingestSources,
  type RawSourceInput,
} from "@/services/ingestion/parser.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || "CampusConnect";

    const [sources, chunks, secrets] = await Promise.all([
      repository.listSources(projectId),
      repository.listChunks(projectId),
      repository.listSecrets(projectId),
    ]);

    const aclScopeMap = sources.map((s) => {
      const sourceChunks = chunks.filter((c) => c.source_id === s.id);
      return {
        sourceId: s.id,
        title: s.title,
        sourceType: s.source_type,
        allowedRoles: s.allowed_roles,
        isRestrictedFromIntern: !s.allowed_roles.includes("incoming_intern"),
        chunkCount: sourceChunks.length,
      };
    });

    const injectionAlerts = secrets.filter(
      (sec) => sec.secret_type === "prompt_injection"
    );

    return NextResponse.json({
      success: true,
      projectId,
      sourcesCount: sources.length,
      chunksCount: chunks.length,
      quarantinedSecretsCount: secrets.length,
      injectionAlertsCount: injectionAlerts.length,
      sources,
      aclScopeMap,
      quarantinedSecrets: secrets,
      injectionAlerts,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to retrieve ingestion status",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: {
      projectId?: string;
      sources?: RawSourceInput[];
      useSeed?: boolean;
      reset?: boolean;
    } = {};

    try {
      body = await request.json();
    } catch {
      // Empty body allowed to trigger default seed ingestion
    }

    const projectId = body.projectId || "CampusConnect";

    if (body.reset) {
      repository.resetInMemoryStore(false);
    }

    if (body.sources && Array.isArray(body.sources) && body.sources.length > 0) {
      const summary = await ingestSources(body.sources, projectId);
      return NextResponse.json({
        success: true,
        message: `Successfully ingested ${summary.sourcesIngested} sources and created ${summary.chunksCreated} chunks.`,
        data: summary,
      });
    }

    // Default: Ingest CampusConnect Seed Dataset
    const summary = await ingestCampusConnectSeed(projectId);
    return NextResponse.json({
      success: true,
      message: `CampusConnect seed sources ingested successfully (${summary.sourcesIngested} sources, ${summary.chunksCreated} chunks).`,
      data: summary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to ingest sources",
      },
      { status: 500 }
    );
  }
}
