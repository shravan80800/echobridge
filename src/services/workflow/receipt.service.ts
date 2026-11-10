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
import { buildDraftVersionId, getProjectTag } from "@/utils/project-scope";
import { analyzeWorkspaceSources } from "@/utils/repo-analysis";

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
function clipQuizText(value: string, maxLen = 115): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 3).trimEnd()}...`;
}

export async function getComprehensionQuestions(
  projectId = "CampusConnect",
  audienceRole: AudienceRole = "incoming_lead"
): Promise<ComprehensionQuestion[]> {
  if (!projectId || projectId === "CampusConnect") {
    return CAMPUS_CONNECT_COMPREHENSION_QUESTIONS;
  }

  const [project, sources, chunks, gapQuestions, v20, v11, v10] =
    await Promise.all([
      repository.getProject(projectId),
      repository.listSources(projectId),
      repository.listChunks(projectId),
      repository.listGapQuestions(projectId),
      repository.getDraftVersion(projectId, audienceRole, "v2.0"),
      repository.getDraftVersion(projectId, audienceRole, "v1.1"),
      repository.getDraftVersion(projectId, audienceRole, "v1.0"),
    ]);

  const draft = v20 || v11 || v10;
  const claims = draft?.claims || [];
  const projectName = project?.name || projectId;
  const tag = getProjectTag(projectId);

  const analysis = analyzeWorkspaceSources(sources, chunks);
  const primarySource = sources[0];
  const archClaim =
    claims.find((c) => c.section === "architecture") || claims[0];
  const riskOrTaskClaim =
    claims.find(
      (c) =>
        (c.section === "tasks_dependencies" ||
          c.section === "onboarding_week1" ||
          c.claim_type === "risk") &&
        c.evidence.length > 0
    ) || claims[1] || claims[0];

  const stackSummary =
    analysis.techStack.length > 0
      ? analysis.techStack.slice(0, 4).join(", ")
      : "";
  const readmeHighlight =
    analysis.readmeSummaryLine ||
    analysis.docSummaryLine ||
    archClaim?.text ||
    `Verified artifacts from ${primarySource?.title || projectName}`;
  const q1CorrectOption = stackSummary
    ? clipQuizText(`${stackSummary} — ${readmeHighlight}`)
    : clipQuizText(
        primarySource
          ? `${primarySource.title}: ${readmeHighlight}`
          : `${projectName}: ${readmeHighlight}`
      );

  const issueFocus =
    analysis.issueLines.length > 0
      ? analysis.issueLines.slice(0, 2).join("; ")
      : analysis.prLines.length > 0
      ? analysis.prLines.slice(0, 2).join("; ")
      : "";
  const commitFocus =
    analysis.commitLines.length > 0
      ? analysis.commitLines.slice(0, 2).join("; ")
      : "";

  const q2Question = issueFocus
    ? `Which active issue or pull request in ${projectName} requires incoming team attention?`
    : commitFocus
    ? `Which recent commit stream reflects the active implementation focus in ${projectName}?`
    : `Which priority claim or continuity detail was verified for ${projectName}?`;
  const q2CorrectOption = issueFocus
    ? clipQuizText(`${issueFocus} (${analysis.issuesTitle || analysis.pullsTitle || "Open Backlog"})`)
    : commitFocus
    ? clipQuizText(`${commitFocus} (${analysis.commitsTitle || "Recent Commits"})`)
    : clipQuizText(
        riskOrTaskClaim?.text ||
          `Follow verified onboarding & backlog steps tracked in ${projectName}.`
      );
  const q2Explanation = issueFocus
    ? `Derived from ${analysis.issuesTitle || analysis.pullsTitle || projectName}: active open work (${clipQuizText(issueFocus, 90)}) must be triaged in week one.`
    : commitFocus
    ? `Derived from ${analysis.commitsTitle || projectName}: recent commits anchor current development continuity.`
    : `Grounded in ${projectName}'s verified source claims.`;

  const answeredGap = gapQuestions.find(
    (q) => q.status === "answered" && !!q.answer_text
  );
  const q3Question = answeredGap
    ? `According to the attested handover context for ${projectName}, what operational guidance applies to "${clipQuizText(answeredGap.question_text, 85)}"?`
    : `How does EchoBridge safeguard secrets and unsafe prompt instructions discovered inside ${projectName} sources?`;
  const q3CorrectOption = answeredGap
    ? clipQuizText(
        `${answeredGap.answered_by || "Maintainer"}: ${answeredGap.answer_text}`
      )
    : "Quarantines detected secrets/tokens pre-embedding and strips prompt injections before synthesis";
  const q3Options = answeredGap
    ? [
        q3CorrectOption,
        `Ignore documented team decisions and deploy ${projectName} without environment verification`,
        "Auto-delete all handover history and open issues before onboarding",
      ]
    : [
        "Leaves raw tokens inside the draft so incoming owners can copy them",
        q3CorrectOption,
        `Deletes all ${projectName} documentation instead of redacting sensitive lines`,
      ];
  const q3Explanation = answeredGap
    ? `Attested during ${projectName}'s Stage 4 Gap-Interview by ${answeredGap.answered_by || "the departing maintainer"}.`
    : `Every chunk from ${projectName} passed through secret redaction and prompt-injection stripping before handover generation.`;

  return [
    {
      id: `${tag}QUIZ-01`,
      question: stackSummary
        ? `Which core stack and architecture is documented for ${projectName}?`
        : `Which primary source and overview anchors the architecture of ${projectName}?`,
      options: [
        q1CorrectOption,
        "Unverified personal scratchpad outside the repository",
        `Legacy unrelated template external to ${projectName}`,
      ],
      correct_option_index: 0,
      explanation: `EchoBridge indexed ${sources.length} source${
        sources.length === 1 ? "" : "s"
      } for ${projectName}${stackSummary ? ` (${stackSummary})` : ""}, anchored by "${
        analysis.readmeTitle || primarySource?.title || projectName
      }".`,
      related_risk_claim_id: archClaim?.id,
    },
    {
      id: `${tag}QUIZ-02`,
      question: q2Question,
      options: [
        q2CorrectOption,
        `All ${projectName} issues and PRs are automatically closed with zero maintainer review`,
        `${projectName} requires no week-one triage or code review`,
      ],
      correct_option_index: 0,
      explanation: q2Explanation,
      related_risk_claim_id: riskOrTaskClaim?.id || archClaim?.id,
    },
    {
      id: `${tag}QUIZ-03`,
      question: q3Question,
      options: q3Options,
      correct_option_index: answeredGap ? 0 : 1,
      explanation: q3Explanation,
      related_risk_claim_id: answeredGap?.claim_id || claims[2]?.id || archClaim?.id,
    },
  ];
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

  const draftId =
    draft?.id || buildDraftVersionId(projectId, audienceRole, "v2.0");
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
