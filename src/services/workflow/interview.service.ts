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
import { getGeminiClient } from "@/lib/gemini/client";
import { buildDraftVersionId, buildScopedGapId } from "@/utils/project-scope";

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
  const roleNeutralClaimId = baseClaimId.replace(/-LEAD-|-INT-/g, "-ROLE-");
  const roleNeutralTargetId = baseTargetId.replace(/-LEAD-|-INT-/g, "-ROLE-");
  return (
    c.id === question.claim_id ||
    baseClaimId === baseTargetId ||
    roleNeutralClaimId === roleNeutralTargetId ||
    baseClaimId === `${baseTargetId}-INTERN` ||
    c.id.startsWith(`${question.claim_id}-`) ||
    (question.planted_trap_id === 2 && c.text.toLowerCase().includes("redis")) ||
    (question.planted_trap_id === 7 && c.text.toLowerCase().includes("domain"))
  );
}

/**
 * Generates 3 repo/doc-specific Gap-Interview questions when a custom project
 * workspace has no pre-existing gap questions.
 */
export async function synthesizeDynamicGapQuestions(
  projectId: string
): Promise<GapQuestion[]> {
  const [project, sources, v10Lead] = await Promise.all([
    repository.getProject(projectId),
    repository.listSources(projectId),
    repository.getDraftVersion(projectId, "incoming_lead", "v1.0"),
  ]);

  const projectName = project?.name || projectId;
  const claims = v10Lead?.claims || [];
  if (sources.length === 0 && claims.length === 0) {
    return [];
  }

  const readmeSource =
    sources.find(
      (s) => s.title.startsWith("README:") || s.title.startsWith("Google Doc:")
    ) || sources[0];
  const issuesSource = sources.find(
    (s) =>
      s.title.startsWith("Open Issues:") ||
      s.title.startsWith("Open Pull Requests:")
  );
  const commitsSource = sources.find((s) =>
    s.title.startsWith("Recent Commits:")
  );

  const pickClaimForSource = (
    preferredSourceId?: string,
    fallbackIndex = 0
  ): ClaimRecord | undefined => {
    if (preferredSourceId) {
      const fromSrc = claims.find((c) =>
        (c.evidence || []).some((e) => e.source_id === preferredSourceId)
      );
      if (fromSrc) return fromSrc;
    }
    return claims[fallbackIndex] || claims[0];
  };

  const claim1 = pickClaimForSource(readmeSource?.id, 0);
  const claim2 = pickClaimForSource(issuesSource?.id, 1);
  const claim3 = pickClaimForSource(commitsSource?.id, 2);

  let questionTexts = [
    {
      question_text: `Why was the core architecture and stack in ${readmeSource?.title || projectName} chosen, and what design trade-offs should the incoming owner preserve?`,
      context_summary:
        claim1?.text ||
        `Derived from ${readmeSource?.title || projectName} — architectural rationale is undocumented in source files.`,
    },
    {
      question_text: issuesSource
        ? `Which items tracked in ${issuesSource.title} are highest priority for week-one continuity in ${projectName}, and who owns follow-up decisions?`
        : `Which unresolved tasks, edge cases, or stakeholder sign-offs in ${projectName} need immediate week-one attention?`,
      context_summary:
        claim2?.text ||
        `Derived from ${issuesSource?.title || projectName} — ownership & priority rationale needs confirmation.`,
    },
    {
      question_text: `Where are runtime secrets, deployment credentials, and rollback checks managed for ${projectName}, and are there unwritten operational steps?`,
      context_summary:
        claim3?.text ||
        `Derived from ${commitsSource?.title || projectName} — operational deployment & secret handover verification.`,
    },
  ];

  // Optional Gemini refinement when configured (keeps deterministic structure on failure/offline)
  const gemini = getGeminiClient();
  if (gemini && claims.length > 0) {
    try {
      const summaryContext = claims
        .slice(0, 6)
        .map((c, idx) => `${idx + 1}. [${c.section}] ${c.text}`)
        .join("\n");
      const prompt = `You are EchoBridge's Gap-Interview Designer for project "${projectName}".
Based on these extracted claims from the repository/document:
${summaryContext}

Generate exactly 3 concise tacit-knowledge handover questions asking what is NOT written in the docs:
1) Architecture & design trade-off rationale
2) Open issues / PR priorities & stakeholder ownership
3) Deployment credentials, environment variables & rollback runbook

Return JSON: { "questions": [{ "question_text": "...", "context_summary": "..." }] } (exact 3 items).`;

      const response = await gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { temperature: 0, responseMimeType: "application/json" },
      });
      const parsed = JSON.parse(response.text?.trim() || "{}");
      if (Array.isArray(parsed.questions) && parsed.questions.length === 3) {
        const refined = parsed.questions
          .map((q: unknown) => {
            if (!q || typeof q !== "object") return null;
            const rec = q as Record<string, unknown>;
            const qt =
              typeof rec.question_text === "string"
                ? rec.question_text.trim()
                : "";
            const cs =
              typeof rec.context_summary === "string"
                ? rec.context_summary.trim()
                : "";
            return qt && cs ? { question_text: qt, context_summary: cs } : null;
          })
          .filter(
            (x: { question_text: string; context_summary: string } | null): x is {
              question_text: string;
              context_summary: string;
            } => x !== null
          );
        if (refined.length === 3) {
          questionTexts = refined;
        }
      }
    } catch {
      // Fall back to deterministic grounded repo/doc questions above
    }
  }

  const linkedClaims = [claim1, claim2, claim3];
  const generated: GapQuestion[] = questionTexts.map((qt, idx) => ({
    id: buildScopedGapId(projectId, idx + 1),
    project_id: projectId,
    claim_id:
      linkedClaims[idx]?.id ||
      claims[0]?.id ||
      `CLM-CUSTOM-${projectId.toUpperCase().slice(0, 12)}-GAP-${idx + 1}`,
    question_text: qt.question_text,
    context_summary: qt.context_summary,
    assigned_contact_if_unanswered: "Repository Maintainer / Project Mentor",
    status: "pending",
  }));

  await repository.saveGapQuestions(generated);
  return generated;
}

/**
 * Retrieves or generates the targeted gap questions for a project.
 */
export async function getOrGenerateGapQuestions(
  projectId = "CampusConnect",
  audienceRole: AudienceRole = "incoming_lead"
): Promise<GapQuestion[]> {
  void audienceRole;
  const existing = await repository.listGapQuestions(projectId);
  if (existing.length > 0) {
    return existing;
  }

  if (projectId !== "CampusConnect") {
    return synthesizeDynamicGapQuestions(projectId);
  }

  // Load from synthetic CampusConnect benchmark seed
  const seed = getCampusConnectSeedData();
  const seedQuestions = seed.gapQuestions.filter(
    (g) => g.project_id === projectId
  );

  // If repository has none, populate seed questions
  await repository.saveGapQuestions(seedQuestions);

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

    const draftV11Id = buildDraftVersionId(projectId, targetRole, "v1.1");
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

    const draftV11Id = buildDraftVersionId(projectId, targetRole, "v1.1");
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
