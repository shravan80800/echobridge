/**
 * Stage 4: Gap-Interview Service
 * Implements docs/DECISIONS.md ADR-006, docs/PRD.md Section 4 & 5 (Trap 2 & Trap 7), and TASKS.md TASK-017.
 *
 * Turns unwritten tacit knowledge (Red Unsupported & critical Yellow gaps)
 * into attributed Blue Attested evidence, updates Draft to v1.1 with recalculated
 * Confidence Score, and supports sudden-exit fallback routing to a named contact.
 */

import type {
  AudienceRole,
  ClaimRecord,
  DraftVersion,
  GapQuestion,
  GapQuestionStatus,
} from "@/types/echobridge.types";
import { repository } from "@/lib/supabase/repository";
import { computeConfidenceBreakdown } from "@/services/trust/confidence.service";
import { logAuditEvent } from "@/services/workflow/audit.service";
import { getCampusConnectSeedData } from "@/services/seed/campus-connect.seed";

export interface GapInterviewProgress {
  totalQuestions: number;
  answeredCount: number;
  skippedCount: number;
  pendingCount: number;
  isComplete: boolean;
  questions: GapQuestion[];
  draftVersionV1_1?: DraftVersion | null;
}

function stripVersionSuffix(claimId: string): string {
  return claimId.replace(/-V1\.[012]|-V2\.0/g, "");
}

async function mergeNewCustomClaimsFromV10(
  projectId: string,
  role: AudienceRole,
  claims: ClaimRecord[],
  targetDraftVersionId: string
): Promise<ClaimRecord[]> {
  const v10 = await repository.getDraftVersion(projectId, role, "v1.0");
  if (!v10) return claims;

  const existingBaseIds = new Set(claims.map((c) => stripVersionSuffix(c.id)));
  const extras = v10.claims.filter((c) => {
    const isCustom =
      c.id.startsWith("CLM-CUSTOM-") ||
      c.id.startsWith("CLM-GEN-") ||
      (c.evidence || []).some((e) => !e.source_id.startsWith("SRC-"));
    return isCustom && !existingBaseIds.has(stripVersionSuffix(c.id));
  });

  if (extras.length === 0) return claims;
  return [
    ...claims,
    ...extras.map((c) => ({
      ...c,
      id: `${stripVersionSuffix(c.id)}-V1.1`,
      draft_version_id: targetDraftVersionId,
    })),
  ];
}

function matchesGapQuestionClaim(
  c: ClaimRecord,
  question: GapQuestion,
  targetRole: AudienceRole
): boolean {
  if (targetRole === "incoming_intern" && !c.audience_acl.includes("incoming_intern")) {
    return false;
  }
  const baseClaimId = stripVersionSuffix(c.id);
  const baseTargetId = stripVersionSuffix(question.claim_id);
  return (
    c.id === question.claim_id ||
    baseClaimId === baseTargetId ||
    baseClaimId === `${baseTargetId}-INTERN` ||
    c.id.startsWith(`${question.claim_id}-`) ||
    (question.planted_trap_id === 2 && c.text.toLowerCase().includes("redis")) ||
    (question.planted_trap_id === 7 && c.text.toLowerCase().includes("domain"))
  );
}

/**
 * Retrieves or generates the targeted gap questions for a project.
 */
export async function getOrGenerateGapQuestions(
  projectId = "CampusConnect",
  audienceRole: AudienceRole = "incoming_lead"
): Promise<GapQuestion[]> {
  const existing = await repository.listGapQuestions(projectId);
  if (existing.length > 0) {
    return existing;
  }

  // Load from synthetic CampusConnect benchmark seed
  const seed = getCampusConnectSeedData();
  const seedQuestions = seed.gapQuestions.filter(
    (g) => g.project_id === projectId
  );

  // If repository has none, populate seed questions
  for (const q of seedQuestions) {
    // In-memory set
    (repository as any).gapQuestions?.set(q.id, q);
  }

  return seedQuestions;
}

/**
 * Submits an answer to a gap question by the departing member.
 * Transitions the claim from Red Unsupported -> Blue Attested (ADR-006).
 * Creates or updates DraftVersion v1.1 and recalculates Confidence Score.
 */
export async function submitGapAnswer(params: {
  questionId: string;
  answerText: string;
  answeredBy?: string;
  projectId?: string;
  audienceRole?: AudienceRole;
}): Promise<{
  question: GapQuestion;
  updatedClaim: ClaimRecord | null;
  draftVersionV1_1: DraftVersion;
}> {
  const {
    questionId,
    answerText,
    answeredBy = "Aarav Sharma (Departing Lead)",
    projectId = "CampusConnect",
    audienceRole = "incoming_lead",
  } = params;

  // 1. Resolve question ID (support direct ID or aliases GAP-Q-01 -> GAP-TRAP-2, GAP-Q-02 -> GAP-TRAP-7)
  let resolvedId = questionId;
  const existingQuestions = await getOrGenerateGapQuestions(projectId, audienceRole);
  const matched = existingQuestions.find(
    (q) =>
      q.id === questionId ||
      (questionId === "GAP-Q-01" && (q.id === "GAP-TRAP-2" || q.planted_trap_id === 2)) ||
      (questionId === "GAP-Q-02" && (q.id === "GAP-TRAP-7" || q.planted_trap_id === 7)) ||
      (questionId === "GAP-Q-03" && q.id === "GAP-003")
  );
  if (matched) {
    resolvedId = matched.id;
  }

  // Answer question in repository
  const question = await repository.answerGapQuestion(
    resolvedId,
    answerText,
    answeredBy
  );

  if (!question) {
    throw new Error(`Gap question ${questionId} not found`);
  }

  // 2. Fetch latest v1.1 or v1.0 claims to promote into v1.1 across target role + sibling audience
  const applyAnswerForRole = async (
    targetRole: AudienceRole
  ): Promise<{ draft: DraftVersion; matched: ClaimRecord | null } | null> => {
    const baseDraft =
      (await repository.getDraftVersion(projectId, targetRole, "v1.1")) ||
      (await repository.getDraftVersion(projectId, targetRole, "v1.0"));
    if (!baseDraft) return null;

    const draftV11Id = `DFT-${targetRole === "incoming_lead" ? "LEAD" : "INT"}-v1.1`;
    let claimsCopy: ClaimRecord[] = JSON.parse(JSON.stringify(baseDraft.claims));
    claimsCopy = await mergeNewCustomClaimsFromV10(
      projectId,
      targetRole,
      claimsCopy,
      draftV11Id
    );

    let matched: ClaimRecord | null = null;
    for (let i = 0; i < claimsCopy.length; i++) {
      const c = claimsCopy[i];
      if (matchesGapQuestionClaim(c, question, targetRole)) {
        c.evidence_state = "attested"; // Transition Red -> Blue Attested!
        c.text = `${c.text.replace(/\s*\[Attested(?:\s+by)?[^\]]*\]/gi, "").trim()} [Attested by ${answeredBy}: "${answerText}"]`;
        matched = c;
        break;
      }
    }

    const normalizedV11Claims = claimsCopy.map((c) => ({
      ...c,
      id: c.id.endsWith("-V1.1") ? c.id : `${stripVersionSuffix(c.id)}-V1.1`,
      draft_version_id: draftV11Id,
    }));
    const updatedConf = computeConfidenceBreakdown(normalizedV11Claims);
    const savedV11: DraftVersion = {
      id: draftV11Id,
      project_id: projectId,
      audience_role: targetRole,
      version_label: "v1.1",
      confidence: updatedConf,
      status: "gap_interview_complete",
      claims: normalizedV11Claims,
      created_at: new Date().toISOString(),
    };
    await repository.saveDraftVersion(savedV11);

    // If v2.0 already exists in storage, keep its matching claim synchronized too
    if (matched) {
      const existingV20 = await repository.getDraftVersion(
        projectId,
        targetRole,
        "v2.0"
      );
      if (existingV20) {
        const v20Claims: ClaimRecord[] = JSON.parse(
          JSON.stringify(existingV20.claims)
        );
        let touched = false;
        for (const c20 of v20Claims) {
          if (matchesGapQuestionClaim(c20, question, targetRole)) {
            c20.evidence_state = "attested";
            c20.text = matched.text;
            touched = true;
            break;
          }
        }
        if (touched) {
          await repository.saveDraftVersion({
            ...existingV20,
            claims: v20Claims,
            confidence: computeConfidenceBreakdown(v20Claims),
          });
        }
      }
    }

    return { draft: savedV11, matched };
  };

  const primaryResult = await applyAnswerForRole(audienceRole);
  if (!primaryResult) {
    throw new Error(`No draft version found for ${projectId} / ${audienceRole}`);
  }

  const siblingRole: AudienceRole =
    audienceRole === "incoming_lead" ? "incoming_intern" : "incoming_lead";
  await applyAnswerForRole(siblingRole);

  const updatedClaim = primaryResult.matched;
  const draftV1_1 = primaryResult.draft;
  const updatedConfidence = draftV1_1.confidence;

  // 5. Emit immutable audit event
  await logAuditEvent({
    project_id: projectId,
    actor_role: "departing_member",
    actor_name: answeredBy,
    event_type: "gap_answered",
    details_json: {
      question_id: questionId,
      claim_id: question.claim_id,
      answer_snippet: answerText.slice(0, 100),
      transition: "unsupported -> attested",
      new_confidence_score: updatedConfidence.total_score,
      timestamp: new Date().toISOString(),
    },
  });

  return {
    question,
    updatedClaim,
    draftVersionV1_1: draftV1_1,
  };
}

/**
 * Simulates Sudden Exit:
 * When departing member is unavailable, leaves unanswered gaps Red (Unsupported)
 * and assigns them to a named fallback contact (e.g. Prof. Deshmukh).
 */
export async function simulateSuddenExit(params: {
  projectId?: string;
  assignedFallbackContact?: string;
  audienceRole?: AudienceRole;
}): Promise<{
  questions: GapQuestion[];
  draftVersionV1_1: DraftVersion;
}> {
  const {
    projectId = "CampusConnect",
    assignedFallbackContact = "Prof. Deshmukh (Faculty Mentor, CS Dept)",
    audienceRole = "incoming_lead",
  } = params;

  const questions = await getOrGenerateGapQuestions(projectId, audienceRole);
  const updatedQuestions: GapQuestion[] = [];

  for (const q of questions) {
    if (q.status === "pending") {
      const updated = await repository.skipGapQuestionSuddenExit(
        q.id,
        assignedFallbackContact
      );
      if (updated) updatedQuestions.push(updated);
    } else {
      updatedQuestions.push(q);
    }
  }

  const applySuddenExitForRole = async (
    targetRole: AudienceRole
  ): Promise<DraftVersion | null> => {
    const baseDraft =
      (await repository.getDraftVersion(projectId, targetRole, "v1.1")) ||
      (await repository.getDraftVersion(projectId, targetRole, "v1.0"));
    if (!baseDraft) return null;

    const draftV11Id = `DFT-${targetRole === "incoming_lead" ? "LEAD" : "INT"}-v1.1`;
    let claimsCopy: ClaimRecord[] = JSON.parse(JSON.stringify(baseDraft.claims));
    claimsCopy = await mergeNewCustomClaimsFromV10(
      projectId,
      targetRole,
      claimsCopy,
      draftV11Id
    );

    const normalizedClaims = claimsCopy.map((c) => {
      const nextText =
        c.evidence_state === "unsupported"
          ? `${c.text.replace(/\s*\[Fallback Contact:.*?\]/g, "").trim()} [Fallback Contact: ${assignedFallbackContact}]`
          : c.text;
      return {
        ...c,
        id: c.id.endsWith("-V1.1") ? c.id : `${stripVersionSuffix(c.id)}-V1.1`,
        draft_version_id: draftV11Id,
        text: nextText,
      };
    });

    const conf = computeConfidenceBreakdown(normalizedClaims);
    const savedDraft: DraftVersion = {
      id: draftV11Id,
      project_id: projectId,
      audience_role: targetRole,
      version_label: "v1.1",
      confidence: conf,
      status: "gap_interview_complete",
      claims: normalizedClaims,
      created_at: new Date().toISOString(),
    };
    await repository.saveDraftVersion(savedDraft);
    return savedDraft;
  };

  const draftV1_1 = await applySuddenExitForRole(audienceRole);
  if (!draftV1_1) {
    throw new Error(`No draft version found for ${projectId} / ${audienceRole}`);
  }

  const siblingRole: AudienceRole =
    audienceRole === "incoming_lead" ? "incoming_intern" : "incoming_lead";
  await applySuddenExitForRole(siblingRole);

  // Log audit event
  await logAuditEvent({
    project_id: projectId,
    actor_role: "reviewer",
    actor_name: "Sudden Exit Safety Handler",
    event_type: "gap_answered",
    details_json: {
      action: "sudden_exit_fallback_routing",
      unanswered_gaps_count: updatedQuestions.filter(
        (q) => q.status === "skipped_sudden_exit"
      ).length,
      assigned_fallback_contact: assignedFallbackContact,
      timestamp: new Date().toISOString(),
    },
  });

  return {
    questions: updatedQuestions,
    draftVersionV1_1: draftV1_1,
  };
}

/**
 * Returns overall interview progress KPIs.
 */
export async function getGapInterviewProgress(
  projectId = "CampusConnect",
  audienceRole: AudienceRole = "incoming_lead"
): Promise<GapInterviewProgress> {
  const questions = await getOrGenerateGapQuestions(projectId, audienceRole);
  const draftVersionV1_1 = await repository.getDraftVersion(
    projectId,
    audienceRole,
    "v1.1"
  );

  const answeredCount = questions.filter((q) => q.status === "answered").length;
  const skippedCount = questions.filter(
    (q) => q.status === "skipped_sudden_exit"
  ).length;
  const pendingCount = questions.filter((q) => q.status === "pending").length;

  return {
    totalQuestions: questions.length,
    answeredCount,
    skippedCount,
    pendingCount,
    isComplete: pendingCount === 0 && questions.length > 0,
    questions,
    draftVersionV1_1,
  };
}
