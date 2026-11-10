/**
 * Receipt & Risk Comprehension API Route Handler
 * Implements docs/ARCHITECTURE.md Section 3 and TASKS.md TASK-021.
 *
 * GET: Retrieves onboarding comprehension questions and existing receipt.
 * POST: Evaluates quiz answers or signs & issues a cryptographic receipt certificate.
 */

import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/supabase/repository";

export const dynamic = "force-dynamic";
import {
  getComprehensionQuestions,
  evaluateComprehensionQuiz,
  acknowledgeReceipt,
  getReceipt,
  ComprehensionQuizFailedError,
} from "@/services/workflow/receipt.service";
import { ensureCustomDraftVersionsInitialized } from "@/services/workflow/review.service";
import type { AudienceRole } from "@/types/echobridge.types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || "CampusConnect";
    const roleParam = (searchParams.get("role") || "incoming_lead") as AudienceRole;

    if (projectId !== "CampusConnect") {
      await ensureCustomDraftVersionsInitialized(projectId, [roleParam]);
    }

    const [project, questions, receipt] = await Promise.all([
      repository.getProject(projectId),
      getComprehensionQuestions(projectId, roleParam),
      getReceipt(projectId, roleParam),
    ]);

    return NextResponse.json({
      success: true,
      projectId,
      projectName: project?.name || projectId,
      audienceRole: roleParam,
      hasAcknowledged: !!receipt,
      receipt,
      questions,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load receipt status",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || "acknowledge";
    const projectId = body.projectId || "CampusConnect";
    const audienceRole = (body.audienceRole || "incoming_lead") as AudienceRole;
    const incomingUserName =
      body.incomingUserName ||
      (audienceRole === "incoming_lead" ? "Riya Patel" : "Kabir Mehta");

    if (action === "reset") {
      await repository.clearReceipts(projectId, audienceRole);
      return NextResponse.json({
        success: true,
        message: `Receipt cleared for ${audienceRole} so a fresh handover receipt can be generated.`,
        receipt: null,
      });
    }

    if (!body.answers || !Array.isArray(body.answers)) {
      return NextResponse.json(
        { success: false, error: "Answers array is required" },
        { status: 400 }
      );
    }

    // 1. Preview / Practice Evaluation
    if (action === "evaluate") {
      const questions = await getComprehensionQuestions(projectId, audienceRole);
      const evaluation = evaluateComprehensionQuiz(body.answers, questions);

      return NextResponse.json({
        success: true,
        evaluation,
      });
    }

    // 2. Acknowledge & Issue Digital Verification Receipt
    if (action === "acknowledge") {
      const result = await acknowledgeReceipt({
        projectId,
        audienceRole,
        incomingUserName,
        answers: body.answers,
      });

      return NextResponse.json({
        success: true,
        message: `Handover receipt acknowledged! Cryptographic signature: ${result.receipt.receipt_hash}`,
        receipt: result.receipt,
        evaluation: result.evaluation,
      });
    }

    return NextResponse.json(
      { success: false, error: `Unsupported action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof ComprehensionQuizFailedError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          errorType: "COMPREHENSION_CHECK_FAILED",
          scorePercentage: error.scorePercentage,
          evaluation: error.details,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to acknowledge receipt",
      },
      { status: 500 }
    );
  }
}
