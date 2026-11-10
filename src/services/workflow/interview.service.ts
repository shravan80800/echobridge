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
import {
  buildDraftVersionId,
  buildScopedGapId,
  getProjectTag,
} from "@/utils/project-scope";
import { analyzeWorkspaceSources } from "@/utils/repo-analysis";

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
  const [project, sources, chunks, v10Lead] = await Promise.all([
    repository.getProject(projectId),
    repository.listSources(projectId),
    repository.listChunks(projectId),
    repository.getDraftVersion(projectId, "incoming_lead", "v1.0"),
  ]);

  const projectName = project?.name || projectId;
  const claims = v10Lead?.claims || [];
  if (sources.length === 0 && claims.length === 0) {
    return [];
  }

  const analysis = analyzeWorkspaceSources(sources, chunks);

  const pickClaimForGap = (
    gapSuffix: string,
    preferredTitlePrefix?: string,
    fallbackIndex = 0
  ): ClaimRecord | undefined => {
    const byGap = claims.find((c) => c.id.endsWith(gapSuffix));
    if (byGap) return byGap;

    if (preferredTitlePrefix) {
      const fromTitle = claims.find((c) =>
        (c.evidence || []).some((e) =>
          (e.source_title || "").startsWith(preferredTitlePrefix)
        )
      );
      if (fromTitle) return fromTitle;
    }
    return claims[fallbackIndex] || claims[0];
  };

  const claim1 = pickClaimForGap("-GAP-1", "README:", 0);
  const claim2 = pickClaimForGap("-GAP-2", "Open Issues:", 1);
  const claim3 = pickClaimForGap("-GAP-3", "Recent Commits:", 2);

  const stackText =
    analysis.techStack.length > 0
      ? analysis.techStack.slice(0, 4).join(", ")
      : analysis.readmeTitle || analysis.docTitle || projectName;
  const readmeHint =
    analysis.readmeSummaryLine ||
    analysis.docSummaryLine ||
    claim1?.text ||
    `Core codebase structure documented for ${projectName}.`;

  const issueOrCommitItems =
    analysis.issueLines.length > 0
      ? analysis.issueLines.slice(0, 2)
      : analysis.prLines.length > 0
      ? analysis.prLines.slice(0, 2)
      : analysis.commitLines.slice(0, 2);
  const issueOrCommitFocus = issueOrCommitItems.join("; ");

  const hasIssuesOrPrs =
    analysis.issueLines.length > 0 || analysis.prLines.length > 0;
  const q2QuestionText = hasIssuesOrPrs
    ? `Regarding active items in ${projectName} (${issueOrCommitFocus}), which open issues or pull requests are top week-one priority and who signs off?`
    : issueOrCommitFocus
    ? `Following recent commits in ${projectName} (${issueOrCommitFocus}), which unfinished tasks, edge cases, or branches need immediate week-one attention?`
    : `Which unresolved tasks, edge cases, or stakeholder sign-offs in ${projectName} need immediate week-one attention?`;

  const q2ContextSource =
    analysis.issuesTitle ||
    analysis.pullsTitle ||
    analysis.commitsTitle ||
    projectName;
  const q2ContextSummary = issueOrCommitFocus
    ? `Derived from ${q2ContextSource}: "${issueOrCommitFocus}" — week-one triage order & sign-off owner are undocumented.`
    : claim2?.text ||
      `Derived from ${q2ContextSource} — ownership & priority rationale needs confirmation.`;

  const contributorsNote =
    analysis.contributors.length > 0
      ? `Observed contributors: ${analysis.contributors.slice(0, 3).join(", ")}. `
      : "";

  let questionTexts = [
    {
      question_text: `Why was ${stackText} chosen for ${projectName}, and which architectural constraints or trade-offs should new maintainers preserve?`,
      context_summary: `Grounded in ${analysis.readmeTitle || analysis.docTitle || projectName}: "${readmeHint}" — core design rationale is missing from source files.`,
    },
    {
      question_text: q2QuestionText,
      context_summary: q2ContextSummary,
    },
    {
      question_text: `Where are environment variables, runtime secrets, deployment triggers, and rollback runbooks managed for ${projectName}, and who owns production access?`,
      context_summary: `${contributorsNote}Confirm secret storage, CI/CD deployment steps, and production escalation owner for ${projectName}.`,
    },
  ];

  // Optional Gemini refinement when configured (preserves project-specific entities)
  const gemini = getGeminiClient();
  if (gemini && claims.length > 0) {
    try {
      const summaryContext = claims
        .slice(0, 8)
        .map((c, idx) => `${idx + 1}. [${c.section}] ${c.text}`)
        .join("\n");
      const prompt = `You are EchoBridge's Gap-Interview Designer for project "${projectName}".
Based on these extracted claims from the repository/document:
${summaryContext}

Generate exactly 3 concise tacit-knowledge handover questions asking what is NOT written in the docs, explicitly naming "${projectName}" and real details (${stackText}${issueOrCommitFocus ? `; ${issueOrCommitFocus}` : ""}):
1) Architecture & tech-stack trade-off rationale
2) Open issues / PR or recent commit priorities & stakeholder ownership
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
        const repoLeaf = projectName.includes("/")
          ? projectName.split("/")[1]
          : projectName;
        if (
          refined.length === 3 &&
          refined.every((r: { question_text: string }) =>
            r.question_text.toLowerCase().includes(repoLeaf.toLowerCase())
          )
        ) {
          questionTexts = refined;
        }
      }
    } catch {
      // Fall back to deterministic grounded repo/doc questions above
    }
  }

  const assignedContact =
    analysis.contributors[0] || "Repository Maintainer / Project Mentor";
  const linkedClaims = [claim1, claim2, claim3];
  const generated: GapQuestion[] = questionTexts.map((qt, idx) => ({
    id: buildScopedGapId(projectId, idx + 1),
    project_id: projectId,
    claim_id:
      linkedClaims[idx]?.id ||
      claims[0]?.id ||
      `CLM-CUSTOM-${getProjectTag(projectId)}LEAD-GAP-${idx + 1}`,
    question_text: qt.question_text,
    context_summary: qt.context_summary,
    assigned_contact_if_unanswered: assignedContact,
    status: "pending",
  }));

  await repository.saveGapQuestions(generated);
  return generated;
}

/**
 * Appends 1 dynamic, source-specific Gap-Interview question when live GitHub or
 * Google Doc content is appended into an existing workspace (e.g. CampusConnect).
 */
export async function appendGapQuestionForLiveImport(params: {
  projectId: string;
  importedLabel: string;
  sourceIds: string[];
}): Promise<GapQuestion | null> {
  const { projectId, importedLabel, sourceIds } = params;
  if (sourceIds.length === 0) return null;

  const existing = await getOrGenerateGapQuestions(projectId, "incoming_lead");
  const [project, allSources, allChunks, v10Lead] = await Promise.all([
    repository.getProject(projectId),
    repository.listSources(projectId),
    repository.listChunks(projectId),
    repository.getDraftVersion(projectId, "incoming_lead", "v1.0"),
  ]);

  const sourceIdSet = new Set(sourceIds);
  const importedSources = allSources.filter((s) => sourceIdSet.has(s.id));
  const importedChunks = allChunks.filter((c) => sourceIdSet.has(c.source_id));
  const analysis = analyzeWorkspaceSources(importedSources, importedChunks);

  const claims = v10Lead?.claims || [];
  const linkedClaim =
    claims.find((c) => (c.evidence || []).some((e) => sourceIdSet.has(e.source_id))) ||
    claims.find((c) => c.id.startsWith("CLM-CUSTOM-")) ||
    claims[0];
  if (!linkedClaim) return null;

  const projectName = project?.name || projectId;
  const labelSlug = importedLabel
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 22);
  const gapId = `GAP-APPEND-${getProjectTag(projectId)}${labelSlug || "LIVE"}`;

  const alreadyExists = existing.find((q) => q.id === gapId);
  if (alreadyExists) {
    return alreadyExists;
  }

  const stackHint =
    analysis.techStack.length > 0
      ? ` (stack: ${analysis.techStack.slice(0, 3).join(", ")})`
      : "";
  const activeHint =
    analysis.issueLines[0] ||
    analysis.prLines[0] ||
    analysis.commitLines[0] ||
    analysis.readmeSummaryLine ||
    analysis.docSummaryLine;

  const appended: GapQuestion = {
    id: gapId,
    project_id: projectId,
    claim_id: linkedClaim.id,
    question_text: `How does the newly imported ${importedLabel} source${stackHint} integrate with ${projectName}, and who owns its open issues and deployment handoff?`,
    context_summary: activeHint
      ? `Imported live source "${importedLabel}" (${activeHint}) — integration boundaries & maintainer ownership need confirmation.`
      : `Imported live source "${importedLabel}" — integration boundaries & maintainer ownership need confirmation.`,
    assigned_contact_if_unanswered:
      analysis.contributors[0] || "Repository Maintainer / Project Mentor",
    status: "pending",
  };

  await repository.saveGapQuestions([appended]);
  return appended;
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
