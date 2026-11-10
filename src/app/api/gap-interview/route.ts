/**
 * Gap-Interview API Route Handler
 * Implements docs/ARCHITECTURE.md Section 3 and TASKS.md TASK-017.
 *
 * GET: Retrieves targeted gap questions and completion progress.
 * POST: Submits answers to transition Red gaps -> Blue Attested,
 *       or triggers Sudden Exit fallback simulation.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getGapInterviewProgress,
  submitGapAnswer,
  simulateSuddenExit,
  getOrGenerateGapQuestions,
} from "@/services/workflow/interview.service";
import type { AudienceRole } from "@/types/echobridge.types";
import { repository } from "@/lib/supabase/repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || "CampusConnect";
    const roleParam = (searchParams.get("role") || "incoming_lead") as AudienceRole;

    const progress = await getGapInterviewProgress(projectId, roleParam);

    return NextResponse.json({
      success: true,
      projectId,
      audienceRole: roleParam,
      ...progress,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load gap interview",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || "answer";
    const projectId = body.projectId || "CampusConnect";
    const audienceRole = (body.audienceRole || "incoming_lead") as AudienceRole;

    if (action === "answer") {
      if (!body.questionId || !body.answerText) {
        return NextResponse.json(
          { success: false, error: "questionId and answerText are required" },
          { status: 400 }
        );
      }

      const result = await submitGapAnswer({
        questionId: body.questionId,
        answerText: body.answerText,
        answeredBy: body.answeredBy,
        projectId,
        audienceRole,
      });

      return NextResponse.json({
        success: true,
        message: `Answer recorded. Knowledge gap transitioned to Attested (Blue). New Confidence Score: ${result.draftVersionV1_1.confidence.total_score}.`,
        data: result,
      });
    }

    if (action === "sudden_exit") {
      const result = await simulateSuddenExit({
        projectId,
        assignedFallbackContact: body.assignedFallbackContact,
        audienceRole,
      });

      return NextResponse.json({
        success: true,
        message: `Sudden exit simulated. Unanswered gaps retained as Red and assigned to fallback contact.`,
        data: result,
      });
    }

    if (action === "reset") {
      await repository.resetProjectStore(projectId);
      const questions = await getOrGenerateGapQuestions(projectId, audienceRole);
      return NextResponse.json({
        success: true,
        message: "Gap questions reset to initial state.",
        questions,
      });
    }

    return NextResponse.json(
      { success: false, error: `Unsupported action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Gap interview operation failed",
      },
      { status: 500 }
    );
  }
}
