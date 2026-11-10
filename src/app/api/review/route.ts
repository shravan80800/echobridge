/**
 * Review API Route Handler
 * Implements docs/ARCHITECTURE.md Section 3, docs/DECISIONS.md ADR-007, and TASKS.md TASK-019.
 *
 * GET: Returns draft versions, active draft claims, conflict pairs, and version diff summaries.
 * POST: Handles reviewer claim mutations (approve, edit, redact, reject),
 *       conflict resolution (Trap 1), and final handover approval (Draft v2.0).
 *
 * Strictly enforces Separation of Duties: departing_member returns 403 Forbidden.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getReviewDashboardData,
  reviewClaim,
  resolveConflict,
  approveHandover,
  ReviewAuthorizationError,
} from "@/services/workflow/review.service";
import type {
  AudienceRole,
  Role,
  VersionLabel,
  ReviewStatus,
} from "@/types/echobridge.types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || "CampusConnect";
    const roleParam = (searchParams.get("role") || "incoming_lead") as AudienceRole;
    const fromVersion = (searchParams.get("fromVersion") || "v1.0") as VersionLabel;
    const toVersion = (searchParams.get("toVersion") || "v1.1") as VersionLabel;

    const data = await getReviewDashboardData({
      projectId,
      audienceRole: roleParam,
      fromVersion,
      toVersion,
    });

    return NextResponse.json({
      success: true,
      projectId,
      audienceRole: roleParam,
      ...data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load review workspace",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || "review_claim";
    const projectId = body.projectId || "CampusConnect";
    const audienceRole = (body.audienceRole || "incoming_lead") as AudienceRole;
    const actorRole = (body.actorRole || "reviewer") as Role;
    const reviewerName = body.reviewerName || "Prof. Deshmukh (Project Mentor)";

    // 1. Claim Mutation (approve, edit, redact, reject)
    if (action === "review_claim") {
      if (!body.claimId || !body.reviewAction) {
        return NextResponse.json(
          {
            success: false,
            error: "claimId and reviewAction ('approve' | 'edit' | 'redact' | 'reject') are required",
          },
          { status: 400 }
        );
      }

      const updatedClaim = await reviewClaim({
        claimId: body.claimId,
        action: body.reviewAction as ReviewStatus,
        actorRole,
        reviewerName,
        editedText: body.editedText,
        notes: body.notes,
        projectId,
        audienceRole,
      });

      return NextResponse.json({
        success: true,
        message: `Claim ${body.claimId} review updated to '${body.reviewAction}'.`,
        claim: updatedClaim,
      });
    }

    // 2. Conflict Resolution (Trap 1)
    if (action === "resolve_conflict") {
      if (!body.claimId || !body.winningSide) {
        return NextResponse.json(
          {
            success: false,
            error: "claimId and winningSide ('side_a' | 'side_b' | 'custom') are required",
          },
          { status: 400 }
        );
      }

      const resolvedClaim = await resolveConflict({
        claimId: body.claimId,
        winningSide: body.winningSide,
        actorRole,
        reviewerName,
        customText: body.customText,
        projectId,
        audienceRole,
      });

      return NextResponse.json({
        success: true,
        message: `Conflict resolved for claim ${body.claimId}. State transitioned to Corroborated.`,
        claim: resolvedClaim,
      });
    }

    // 3. Final Handover Approval (Creates v2.0)
    if (action === "approve_handover") {
      const result = await approveHandover({
        projectId,
        audienceRole,
        actorRole,
        reviewerName,
      });

      return NextResponse.json({
        success: true,
        message: `Handover draft approved by ${reviewerName}! Version v2.0 published with confidence ${result.draftV2_0.confidence.total_score}%.`,
        data: result,
      });
    }

    return NextResponse.json(
      { success: false, error: `Unsupported action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof ReviewAuthorizationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          errorType: "SEPARATION_OF_DUTIES_VIOLATION",
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to execute review action",
      },
      { status: 500 }
    );
  }
}
