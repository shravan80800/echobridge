/**
 * Knowledge Reconstruction API Route Handler
 * Implements docs/ARCHITECTURE.md Section 3 and TASKS.md TASK-015.
 *
 * GET: Retrieves latest reconstructed drafts for Team Lead and Intern.
 * POST: Triggers retrieve-only generation, two-layer citation verification,
 *       conflict/staleness detection, and Post-Generation RBAC guard.
 */

import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/supabase/repository";
import {
  reconstructDraftForAudience,
  reconstructAllAudienceDrafts,
} from "@/services/trust/generator.service";
import type { AudienceRole } from "@/types/echobridge.types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || "CampusConnect";
    const roleParam = searchParams.get("role") as AudienceRole | null;

    if (roleParam === "incoming_lead" || roleParam === "incoming_intern") {
      const draft = await repository.getDraftVersion(projectId, roleParam, "v1.0");
      return NextResponse.json({
        success: true,
        projectId,
        audienceRole: roleParam,
        draft,
      });
    }

    // Default: Return both lead and intern drafts
    const [leadDraft, internDraft] = await Promise.all([
      repository.getDraftVersion(projectId, "incoming_lead", "v1.0"),
      repository.getDraftVersion(projectId, "incoming_intern", "v1.0"),
    ]);

    return NextResponse.json({
      success: true,
      projectId,
      leadDraft,
      internDraft,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch drafts",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: {
      projectId?: string;
      audienceRole?: AudienceRole | "both";
      showRestrictedPlaceholders?: boolean;
    } = {};

    try {
      body = await request.json();
    } catch {
      // Empty body allowed to trigger default reconstruction for both audiences
    }

    const projectId = body.projectId || "CampusConnect";
    const audienceRole = body.audienceRole || "both";
    const showRestrictedPlaceholders =
      body.showRestrictedPlaceholders !== undefined
        ? body.showRestrictedPlaceholders
        : true;

    if (audienceRole === "incoming_lead" || audienceRole === "incoming_intern") {
      const result = await reconstructDraftForAudience({
        projectId,
        targetRole: audienceRole,
        showRestrictedPlaceholders,
      });

      return NextResponse.json({
        success: true,
        message: `Reconstructed ${audienceRole} draft version v1.0. Confidence score: ${result.confidence.total_score}.`,
        data: result,
      });
    }

    // Default: Reconstruct both audiences separately
    const { leadDraft, internDraft } = await reconstructAllAudienceDrafts(projectId);

    return NextResponse.json({
      success: true,
      message: `Reconstructed separate drafts for Team Lead (Score: ${leadDraft.confidence.total_score}) and Intern (Score: ${internDraft.confidence.total_score}).`,
      data: {
        leadDraft,
        internDraft,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Reconstruction failed",
      },
      { status: 500 }
    );
  }
}
