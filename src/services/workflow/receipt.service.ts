/**
 * Stage 6: Handover Receipt & Risk Comprehension Service
 * Implements docs/DECISIONS.md ADR-007, docs/PRD.md Section 4 & 5, and TASKS.md TASK-021.
 *
 * Rules:
 * - Anti-Blind "Accept All": Recipient must pass (>= 67% or 2/3) critical risk comprehension quiz
 *   (covering Trap 1: resolved deadline, Trap 2: Redis rationale, Trap 3: stale runbook)
 * - Cryptographic Receipt Hash: Deterministic SHA-256 digital signature of handover transfer.
 * - Immutable Audit Trail: Emits receipt_acknowledged event.
 */

import crypto from "crypto";
import type {
  AudienceRole,
  ComprehensionQuestion,
  Receipt,
  ReceiptAnswer,
} from "@/types/echobridge.types";
import { repository } from "@/lib/supabase/repository";
import { logAuditEvent } from "@/services/workflow/audit.service";
import { CAMPUS_CONNECT_COMPREHENSION_QUESTIONS } from "@/services/seed/campus-connect.seed";

export interface QuizEvaluationResult {
  totalQuestions: number;
  correctCount: number;
  scorePercentage: number;
  passed: boolean;
  answers: ReceiptAnswer[];
  explanations: {
    question_id: string;
    correct_option_index: number;
    explanation: string;
    was_correct: boolean;
  }[];
}

export class ComprehensionQuizFailedError extends Error {
  statusCode: number;
  scorePercentage: number;
  details: QuizEvaluationResult;

  constructor(message: string, details: QuizEvaluationResult) {
    super(message);
    this.name = "ComprehensionQuizFailedError";
    this.statusCode = 400;
    this.scorePercentage = details.scorePercentage;
    this.details = details;
  }
}

/**
 * Retrieves the comprehension quiz questions for project onboarding.
 */
export async function getComprehensionQuestions(
  projectId = "CampusConnect",
  audienceRole: AudienceRole = "incoming_lead"
): Promise<ComprehensionQuestion[]> {
  // Return pre-configured benchmark risk questions
  return CAMPUS_CONNECT_COMPREHENSION_QUESTIONS;
}

/**
 * Evaluates the recipient's quiz answers against ground truth.
 * Requires at least 67% (2 out of 3 correct) to pass.
 */
export function evaluateComprehensionQuiz(
  submittedAnswers: { question_id: string; selected_index: number }[],
  questions: ComprehensionQuestion[] = CAMPUS_CONNECT_COMPREHENSION_QUESTIONS
): QuizEvaluationResult {
  const questionMap = new Map<string, ComprehensionQuestion>(
    questions.map((q) => [q.id, q])
  );

  let correctCount = 0;
  const answers: ReceiptAnswer[] = [];
  const explanations: QuizEvaluationResult["explanations"] = [];

  for (const sub of submittedAnswers) {
    const q = questionMap.get(sub.question_id);
    if (!q) continue;

    const isCorrect = sub.selected_index === q.correct_option_index;
    if (isCorrect) correctCount++;

    answers.push({
      question_id: sub.question_id,
      selected_index: sub.selected_index,
      is_correct: isCorrect,
    });

    explanations.push({
      question_id: q.id,
      correct_option_index: q.correct_option_index,
      explanation: q.explanation,
      was_correct: isCorrect,
    });
  }

  const total = questions.length;
  const scorePercentage = Math.round((correctCount / total) * 100);
  const passed = correctCount >= 2; // At least 2 of 3 (67%)

  return {
    totalQuestions: total,
    correctCount,
    scorePercentage,
    passed,
    answers,
    explanations,
  };
}

/**
 * Computes a deterministic SHA-256 digital signature receipt hash.
 */
export function computeReceiptHash(params: {
  projectId: string;
  draftVersionId: string;
  audienceRole: AudienceRole;
  incomingUserName: string;
  timestamp: string;
  score: number;
}): string {
  const payload = [
    params.projectId,
    params.draftVersionId,
    params.audienceRole,
    params.incomingUserName,
    params.timestamp,
    params.score.toString(),
  ].join("::");

  const digest = crypto.createHash("sha256").update(payload).digest("hex");
  return `0x${digest.slice(0, 40)}`;
}

/**
 * Computes the full 64-character SHA-256 verification key for display/certificate verification.
 */
export function computeVerificationKey(params: {
  projectId: string;
  draftVersionId: string;
  audienceRole: AudienceRole;
  incomingUserName: string;
  timestamp: string;
  score: number;
}): string {
  const payload = [
    params.projectId,
    params.draftVersionId,
    params.audienceRole,
    params.incomingUserName,
    params.timestamp,
    params.score.toString(),
  ].join("::");

  const digest = crypto.createHash("sha256").update(payload).digest("hex");
  return `sha256:${digest}`;
}

/**
 * Acknowledges handover receipt and issues digital verification certificate.
 * Strictly verifies that the recipient passed the risk comprehension quiz first.
 */
export async function acknowledgeReceipt(params: {
  projectId?: string;
  audienceRole: AudienceRole;
  incomingUserName: string;
  answers: { question_id: string; selected_index: number }[];
}): Promise<{
  receipt: Receipt;
  evaluation: QuizEvaluationResult;
}> {
  const {
    projectId = "CampusConnect",
    audienceRole,
    incomingUserName,
    answers,
  } = params;

  // 1. Grade the comprehension quiz
  const questions = await getComprehensionQuestions(projectId, audienceRole);
  const evaluation = evaluateComprehensionQuiz(answers, questions);

  if (!evaluation.passed) {
    throw new ComprehensionQuizFailedError(
      `Comprehension check failed: You scored ${evaluation.scorePercentage}%. A passing score of at least 67% (2 of 3 correct) on critical project risks is required before receipt issuance.`,
      evaluation
    );
  }

  // 2. Fetch the approved draft version (v2.0 or latest)
  const draft =
    (await repository.getDraftVersion(projectId, audienceRole, "v2.0")) ||
    (await repository.getDraftVersion(projectId, audienceRole, "v1.1")) ||
    (await repository.getDraftVersion(projectId, audienceRole, "v1.0"));

  const draftId = draft?.id || `DFT-${audienceRole === "incoming_lead" ? "LEAD" : "INT"}-v2.0`;
  const timestamp = new Date().toISOString();

  // 3. Compute digital cryptographic receipt hash & full 64-char SHA-256 verification key
  const sigParams = {
    projectId,
    draftVersionId: draftId,
    audienceRole,
    incomingUserName,
    timestamp,
    score: evaluation.scorePercentage,
  };
  const receiptHash = computeReceiptHash(sigParams);
  const verificationKey = computeVerificationKey(sigParams);

  // 4. Construct and save single canonical Receipt per (project_id, audience_role)
  const projectSlug = projectId.toUpperCase().replace(/[^A-Z0-9]+/g, "-") || "PROJECT";
  const receipt: Receipt = {
    id: `RCP-${audienceRole === "incoming_lead" ? "LEAD" : "INT"}-${projectSlug}`,
    project_id: projectId,
    draft_version_id: draftId,
    audience_role: audienceRole,
    incoming_user_name: incomingUserName,
    comprehension_score: evaluation.scorePercentage,
    comprehension_passed: true,
    answers: evaluation.answers,
    acknowledged_at: timestamp,
    receipt_hash: receiptHash,
    verification_key: verificationKey,
  };

  await repository.saveReceipt(receipt);

  // 5. Emit immutable audit log event
  await logAuditEvent({
    project_id: projectId,
    actor_role: audienceRole,
    actor_name: incomingUserName,
    event_type: "receipt_acknowledged",
    details_json: {
      receipt_id: receipt.id,
      receipt_hash: receiptHash,
      audience_role: audienceRole,
      comprehension_score: evaluation.scorePercentage,
      draft_version_id: draftId,
      timestamp,
    },
  });

  return {
    receipt,
    evaluation,
  };
}

/**
 * Retrieves the project handover receipt if already acknowledged.
 */
export async function getReceipt(
  projectId = "CampusConnect",
  audienceRole: AudienceRole = "incoming_lead"
): Promise<Receipt | null> {
  return repository.getReceipt(projectId, audienceRole);
}
