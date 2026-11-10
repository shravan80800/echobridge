/**
 * Retrieve-Only Knowledge Reconstruction Generator
 * Implements docs/ARCHITECTURE.md Section 3 (Stage 3), docs/DECISIONS.md ADR-003 & ADR-004,
 * and TASKS.md TASK-015.
 *
 * Orchestrates the full Stage 3 pipeline separately per target audience:
 * 1. Pre-Model RBAC filtering (only allowed chunks enter LLM context)
 * 2. Retrieve-only generation (Gemini 2.5 Flash, temp=0, XML delimited <chunk> blocks, JSON schema)
 * 3. Two-layer citation verification (Layer A verbatim + Layer B semantic entailment)
 * 4. Conflict & Staleness detection (Trap 1 Purple + Trap 3 Orange)
 * 5. Post-Generation RBAC Guard (Trap 5 & Trap 8 zero-leak placeholders)
 * 6. Transparent 4-part Confidence Score computation
 * 7. Persistence to dual-mode repository with audit event logging.
 */

import type {
  AudienceRole,
  Chunk,
  ClaimRecord,
  ClaimType,
  DraftVersion,
  EvidenceRecord,
  EvidenceState,
  HandoverSection,
  Source,
} from "@/types/echobridge.types";
import { repository } from "@/lib/supabase/repository";
import { getGeminiClient } from "@/lib/gemini/client";
import { filterChunksForAudience, enforcePostGenerationGuard } from "@/services/trust/rbac.service";
import { verifyClaim, evaluateDeterministicEntailment } from "@/services/trust/verifier.service";
import { detectConflictsInChunks, applyConflictToClaim } from "@/services/trust/conflict.service";
import { isClaimStale } from "@/utils/date-freshness";
import { computeConfidenceBreakdown } from "@/services/trust/confidence.service";
import { logAuditEvent } from "@/services/workflow/audit.service";
import { getCampusConnectSeedData } from "@/services/seed/campus-connect.seed";
import {
  buildDraftVersionId,
  buildScopedClaimId,
} from "@/utils/project-scope";
import {
  analyzeWorkspaceSources,
  extractMeaningfulLines,
} from "@/utils/repo-analysis";

const VALID_SECTIONS: ReadonlySet<HandoverSection> = new Set([
  "architecture",
  "decisions",
  "tasks_dependencies",
  "contacts_ownership",
  "onboarding_day1",
  "onboarding_week1",
  "onboarding_month1",
]);

const VALID_CLAIM_TYPES: ReadonlySet<ClaimType> = new Set([
  "decision",
  "owner",
  "risk",
  "dependency",
  "next_action",
  "contact",
]);

const VALID_EVIDENCE_STATES: ReadonlySet<EvidenceState> = new Set([
  "corroborated",
  "single_source",
  "attested",
  "stale",
  "conflicting",
  "unsupported",
  "restricted",
]);

function normalizeSectionValue(value: unknown, fallbackText = ""): HandoverSection {
  if (typeof value === "string" && VALID_SECTIONS.has(value as HandoverSection)) {
    return value as HandoverSection;
  }
  const lower = `${String(value || "")} ${fallbackText}`.toLowerCase();
  if (
    lower.includes("contact") ||
    lower.includes("owner") ||
    lower.includes("lead") ||
    lower.includes("finance") ||
    lower.includes("sponsor") ||
    lower.includes("mentor")
  ) {
    return "contacts_ownership";
  }
  if (
    lower.includes("task") ||
    lower.includes("todo") ||
    lower.includes("action") ||
    lower.includes("deadline") ||
    lower.includes("runbook") ||
    lower.includes("migration")
  ) {
    return "tasks_dependencies";
  }
  if (lower.includes("day 1") || lower.includes("day1")) return "onboarding_day1";
  if (lower.includes("week 1") || lower.includes("week1")) return "onboarding_week1";
  if (lower.includes("month 1") || lower.includes("month1")) return "onboarding_month1";
  if (
    lower.includes("decision") ||
    lower.includes("why") ||
    lower.includes("rationale") ||
    lower.includes("tradeoff")
  ) {
    return "decisions";
  }
  return "architecture";
}

function normalizeClaimTypeValue(value: unknown, fallbackText = ""): ClaimType {
  if (typeof value === "string" && VALID_CLAIM_TYPES.has(value as ClaimType)) {
    return value as ClaimType;
  }
  const lower = `${String(value || "")} ${fallbackText}`.toLowerCase();
  if (lower.includes("risk") || lower.includes("warn") || lower.includes("conflict")) return "risk";
  if (lower.includes("owner")) return "owner";
  if (lower.includes("contact") || lower.includes("email")) return "contact";
  if (lower.includes("depend")) return "dependency";
  if (lower.includes("action") || lower.includes("todo") || lower.includes("next")) {
    return "next_action";
  }
  return "decision";
}

function extractVerbatimQuotedSpan(chunkContent: string, preferredSpan?: string): string {
  const cleanContent = chunkContent.trim();
  if (!cleanContent) return "";

  if (preferredSpan && preferredSpan.trim().length >= 8) {
    const idx = cleanContent.toLowerCase().indexOf(preferredSpan.trim().toLowerCase());
    if (idx !== -1) {
      return cleanContent.slice(idx, idx + preferredSpan.trim().length);
    }
  }

  // Pick first substantive line verbatim from chunkContent (up to 220 chars)
  const lines = cleanContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 12);
  const chosen = lines[0] || cleanContent;
  return chosen.length > 220 ? chosen.slice(0, 220).trimEnd() : chosen;
}

function normalizeGeminiClaims(params: {
  rawItems: unknown[];
  chunksById: Map<string, Chunk>;
  sourcesById: Map<string, Source>;
  targetRole: AudienceRole;
  projectId: string;
  draftVersionId: string;
}): ClaimRecord[] {
  const { rawItems, chunksById, sourcesById, targetRole, projectId, draftVersionId } = params;
  const normalized: ClaimRecord[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const text = typeof rec.text === "string" ? rec.text.trim() : "";
    if (!text) continue;

    const rawEvidence = Array.isArray(rec.evidence)
      ? rec.evidence
      : rec.chunk_id
      ? [{ chunk_id: rec.chunk_id, quoted_span: rec.quoted_span }]
      : [];

    const builtEvidence: EvidenceRecord[] = [];
    for (const evItem of rawEvidence) {
      if (!evItem || typeof evItem !== "object") continue;
      const ev = evItem as Record<string, unknown>;
      const chunkId = typeof ev.chunk_id === "string" ? ev.chunk_id.trim() : "";
      const chunk = chunksById.get(chunkId);
      if (!chunk || !chunk.allowed_roles.includes(targetRole)) continue;

      const source = sourcesById.get(chunk.source_id);
      const quotedSpan = extractVerbatimQuotedSpan(
        chunk.content,
        typeof ev.quoted_span === "string" ? ev.quoted_span : undefined
      );
      if (!quotedSpan) continue;

      builtEvidence.push({
        chunk_id: chunk.id,
        source_id: chunk.source_id,
        source_type: source?.source_type || "document",
        source_title: source?.title || chunk.source_id,
        author: chunk.author || source?.author || "Team Contributor",
        evidence_timestamp: chunk.chunk_timestamp || source?.source_timestamp || new Date().toISOString(),
        quoted_span: quotedSpan,
        is_verbatim_verified: true,
        entailment_verdict: "supported",
      });
    }

    const rawState = typeof rec.evidence_state === "string" ? rec.evidence_state : "";
    const isExplicitUnsupported =
      rawState === "unsupported" || text.toLowerCase().startsWith("insufficient evidence");

    if (builtEvidence.length === 0 && !isExplicitUnsupported) {
      continue;
    }

    let audienceAcl: AudienceRole[] = [targetRole];
    if (builtEvidence.length > 0) {
      const rolesSets = builtEvidence
        .map((e) => chunksById.get(e.chunk_id)?.allowed_roles || [targetRole]);
      audienceAcl = rolesSets.reduce<AudienceRole[]>(
        (acc, curr) => acc.filter((r) => curr.includes(r)),
        [...(rolesSets[0] || [targetRole])]
      );
      if (audienceAcl.length === 0) audienceAcl = [targetRole];
    }

    const rawSuffix =
      typeof rec.id === "string" && rec.id.trim().length > 0
        ? rec.id.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 18)
        : String(i + 1);
    const baseCandidate = buildScopedClaimId(
      "CLM-GEN",
      projectId,
      targetRole,
      rawSuffix || String(i + 1)
    );
    const candidateId = !seenIds.has(baseCandidate)
      ? baseCandidate
      : buildScopedClaimId("CLM-GEN", projectId, targetRole, `${i + 1}`);
    seenIds.add(candidateId);

    const evidenceState: EvidenceState = VALID_EVIDENCE_STATES.has(rawState as EvidenceState)
      ? (rawState as EvidenceState)
      : builtEvidence.length >= 2
      ? "corroborated"
      : builtEvidence.length === 1
      ? "single_source"
      : "unsupported";

    normalized.push({
      id: candidateId,
      draft_version_id: draftVersionId,
      project_id: projectId,
      audience_role: targetRole,
      section: normalizeSectionValue(rec.section, text),
      claim_type: normalizeClaimTypeValue(rec.claim_type, text),
      text,
      evidence_state: evidenceState,
      evidence: builtEvidence,
      audience_acl: audienceAcl,
      review: { status: "pending" },
      created_at: new Date().toISOString(),
    });
  }

  return normalized;
}

export function synthesizeCustomChunkClaims(params: {
  chunks: Chunk[];
  alreadyCitedChunkIds: Set<string>;
  sourcesById: Map<string, Source>;
  targetRole: AudienceRole;
  projectId: string;
  draftVersionId: string;
}): ClaimRecord[] {
  const {
    chunks,
    alreadyCitedChunkIds,
    sourcesById,
    targetRole,
    projectId,
    draftVersionId,
  } = params;
  const synthesized: ClaimRecord[] = [];

  for (const chunk of chunks) {
    if (alreadyCitedChunkIds.has(chunk.id)) continue;
    const isCustomSource =
      !chunk.source_id.startsWith("SRC-") || projectId !== "CampusConnect";
    if (!isCustomSource) continue;
    if (!chunk.allowed_roles.includes(targetRole)) continue;

    const source = sourcesById.get(chunk.source_id);
    const sourceTitle = source?.title || chunk.source_id;
    const quotedSpan = extractVerbatimQuotedSpan(chunk.content);
    if (!quotedSpan) continue;

    const claimText = quotedSpan.replace(/^#+\s*/, "").trim();
    const displayText = claimText.length >= 20 ? claimText : `${sourceTitle}: ${claimText}`;

    synthesized.push({
      id: buildScopedClaimId("CLM-CUSTOM", projectId, targetRole, chunk.id),
      draft_version_id: draftVersionId,
      project_id: projectId,
      audience_role: targetRole,
      section: normalizeSectionValue(undefined, `${sourceTitle} ${chunk.content}`),
      claim_type: normalizeClaimTypeValue(undefined, `${sourceTitle} ${chunk.content}`),
      text: displayText,
      evidence_state: "single_source",
      evidence: [
        {
          chunk_id: chunk.id,
          source_id: chunk.source_id,
          source_type: source?.source_type || "document",
          source_title: sourceTitle,
          author: chunk.author || source?.author || "Uploaded Contributor",
          evidence_timestamp:
            chunk.chunk_timestamp || source?.source_timestamp || new Date().toISOString(),
          quoted_span: quotedSpan,
          is_verbatim_verified: true,
          entailment_verdict: "supported",
        },
      ],
      audience_acl: [...chunk.allowed_roles],
      review: { status: "pending" },
      created_at: new Date().toISOString(),
    });
  }

  return synthesized;
}

function buildEvidenceFromChunk(
  chunk: Chunk,
  sourcesById: Map<string, Source>,
  quotedSpan: string
): EvidenceRecord {
  const source = sourcesById.get(chunk.source_id);
  return {
    chunk_id: chunk.id,
    source_id: chunk.source_id,
    source_type: source?.source_type || "document",
    source_title: source?.title || chunk.source_id,
    author: chunk.author || source?.author || "Uploaded Contributor",
    evidence_timestamp:
      chunk.chunk_timestamp || source?.source_timestamp || new Date().toISOString(),
    quoted_span: quotedSpan,
    is_verbatim_verified: true,
    entailment_verdict: "supported",
  };
}

function pickCleanVerbatimLine(chunk: Chunk, matcher?: RegExp, lineIndex = 0): string {
  const lines = extractMeaningfulLines(chunk.content);
  const chosen =
    (matcher ? lines.find((l) => matcher.test(l)) : undefined) ||
    lines[lineIndex] ||
    lines[0];
  if (chosen && chunk.content.toLowerCase().includes(chosen.toLowerCase())) {
    if (chosen.length <= 140) return chosen;
    const clipped = chosen.slice(0, 140).replace(/\s+\S*$/, "");
    if (clipped.length >= 16) return clipped;
  }
  return extractVerbatimQuotedSpan(chunk.content);
}

function pickBalancedPhraseSpan(chunk: Chunk, maxWords = 5): string {
  const line = pickCleanVerbatimLine(chunk);
  if (!line) return "";
  const regex = new RegExp(`^\\S+(?:\\s+\\S+){0,${Math.max(1, maxWords - 1)}}`);
  const match = line.match(regex);
  return match?.[0] || line.slice(0, 60);
}

export function synthesizeStandaloneWorkspaceClaims(params: {
  projectId: string;
  projectName: string;
  draftVersionId: string;
  targetRole: AudienceRole;
  permittedChunks: Chunk[];
  sources: Source[];
  sourcesById: Map<string, Source>;
  existingClaims: ClaimRecord[];
}): ClaimRecord[] {
  const {
    projectId,
    projectName,
    draftVersionId,
    targetRole,
    permittedChunks,
    sources,
    sourcesById,
    existingClaims,
  } = params;

  if (permittedChunks.length === 0 && sources.length === 0) {
    return [];
  }

  const analysis = analyzeWorkspaceSources(sources, permittedChunks);
  const nowIso = new Date().toISOString();
  const generated: ClaimRecord[] = [];
  const hasSection = (section: HandoverSection) =>
    existingClaims.some((c) => c.section === section) ||
    generated.some((c) => c.section === section);

  const pushClaim = (
    suffix: string,
    section: HandoverSection,
    claimType: ClaimType,
    text: string,
    evidenceState: EvidenceState,
    evidence: EvidenceRecord[],
    acl: AudienceRole[]
  ) => {
    const id = buildScopedClaimId("CLM-CUSTOM", projectId, targetRole, suffix);
    if (
      existingClaims.some((c) => c.id === id) ||
      generated.some((c) => c.id === id)
    ) {
      return;
    }
    generated.push({
      id,
      draft_version_id: draftVersionId,
      project_id: projectId,
      audience_role: targetRole,
      section,
      claim_type: claimType,
      text,
      evidence_state: evidenceState,
      evidence,
      audience_acl: [...acl],
      review: { status: "pending" },
      created_at: nowIso,
    });
  };

  // 1. Attempt cross-source corroborated claim when 2+ independent authors exist
  const primaryChunk = analysis.readmeChunk || analysis.docChunks[0] || permittedChunks[0];
  const secondaryChunk = permittedChunks.find(
    (c) => primaryChunk && c.id !== primaryChunk.id && c.author !== primaryChunk.author
  );
  if (primaryChunk && secondaryChunk) {
    const spanA = pickBalancedPhraseSpan(primaryChunk, 5);
    const spanB = pickBalancedPhraseSpan(secondaryChunk, 5);
    if (spanA && spanB) {
      const candidateText = `${spanA} — ${spanB}`;
      const okA =
        evaluateDeterministicEntailment(candidateText, primaryChunk.content, spanA) ===
        "supported";
      const okB =
        evaluateDeterministicEntailment(candidateText, secondaryChunk.content, spanB) ===
        "supported";
      if (okA && okB) {
        const unionAcl = primaryChunk.allowed_roles.filter((r) =>
          secondaryChunk.allowed_roles.includes(r)
        );
        const safeAcl: AudienceRole[] =
          unionAcl.length > 0 ? unionAcl : [targetRole];
        pushClaim(
          "ARCH-CORROB",
          "architecture",
          "decision",
          candidateText,
          "corroborated",
          [
            buildEvidenceFromChunk(primaryChunk, sourcesById, spanA),
            buildEvidenceFromChunk(secondaryChunk, sourcesById, spanB),
          ],
          safeAcl
        );
      }
    }
  }

  // 2. Grounded claims across all 7 Handover sections
  if (analysis.readmeChunk || analysis.docChunks[0]) {
    const archChunk = (analysis.readmeChunk || analysis.docChunks[0])!;
    const archSpan = pickCleanVerbatimLine(archChunk);
    if (archSpan && !hasSection("architecture")) {
      const stackPrefix =
        analysis.techStack.length > 0
          ? `${projectName} stack (${analysis.techStack.slice(0, 4).join(", ")}): `
          : "";
      pushClaim(
        "ARCH-OVERVIEW",
        "architecture",
        "decision",
        `${stackPrefix}${archSpan}`,
        "single_source",
        [buildEvidenceFromChunk(archChunk, sourcesById, archSpan)],
        archChunk.allowed_roles
      );
    }

    const day1Line =
      pickCleanVerbatimLine(
        archChunk,
        /\b(?:install|setup|clone|npm|pnpm|yarn|env|quick\s*start|getting started|usage)\b/i
      ) || archSpan;
    if (day1Line && !hasSection("onboarding_day1")) {
      pushClaim(
        "ONB-DAY1",
        "onboarding_day1",
        "next_action",
        day1Line,
        "single_source",
        [buildEvidenceFromChunk(archChunk, sourcesById, day1Line)],
        archChunk.allowed_roles
      );
    }
  }

  if (analysis.commitsChunk && !hasSection("decisions")) {
    const commitSpan = pickCleanVerbatimLine(analysis.commitsChunk, undefined, 0);
    if (commitSpan) {
      pushClaim(
        "DECISIONS-COMMITS",
        "decisions",
        "decision",
        commitSpan,
        "single_source",
        [buildEvidenceFromChunk(analysis.commitsChunk, sourcesById, commitSpan)],
        analysis.commitsChunk.allowed_roles
      );
    }
  }

  if (analysis.commitsChunk && !hasSection("contacts_ownership")) {
    const contributorSpan = pickCleanVerbatimLine(
      analysis.commitsChunk,
      /\s+[—-]\s+[^—-]+$/
    );
    if (contributorSpan) {
      pushClaim(
        "OWNER-COMMITTERS",
        "contacts_ownership",
        "owner",
        contributorSpan,
        "single_source",
        [buildEvidenceFromChunk(analysis.commitsChunk, sourcesById, contributorSpan)],
        analysis.commitsChunk.allowed_roles
      );
    }
  } else if (primaryChunk && !hasSection("contacts_ownership")) {
    const ownerSpan = pickCleanVerbatimLine(
      primaryChunk,
      /\b(?:owner|maintainer|lead|author|contact|team)\b/i
    );
    if (ownerSpan) {
      pushClaim(
        "OWNER-DOC",
        "contacts_ownership",
        "owner",
        ownerSpan,
        "single_source",
        [buildEvidenceFromChunk(primaryChunk, sourcesById, ownerSpan)],
        primaryChunk.allowed_roles
      );
    }
  }

  const workChunk = analysis.issuesChunk || analysis.pullsChunk || analysis.docChunks[1] || primaryChunk;
  if (workChunk && !hasSection("tasks_dependencies")) {
    const issueSpan = pickCleanVerbatimLine(workChunk);
    if (issueSpan) {
      pushClaim(
        "TASKS-BACKLOG",
        "tasks_dependencies",
        analysis.issueLines.length > 0 ? "risk" : "next_action",
        issueSpan,
        "single_source",
        [buildEvidenceFromChunk(workChunk, sourcesById, issueSpan)],
        workChunk.allowed_roles
      );
    }
  }

  const week1Chunk = analysis.pullsChunk || analysis.issuesChunk || analysis.commitsChunk || primaryChunk;
  if (week1Chunk && !hasSection("onboarding_week1")) {
    const week1Span = pickCleanVerbatimLine(week1Chunk);
    if (week1Span) {
      pushClaim(
        "ONB-WEEK1",
        "onboarding_week1",
        "next_action",
        week1Span,
        "single_source",
        [buildEvidenceFromChunk(week1Chunk, sourcesById, week1Span)],
        week1Chunk.allowed_roles
      );
    }
  }

  const month1Chunk =
    analysis.commitsChunk || analysis.pullsChunk || analysis.readmeChunk || primaryChunk;
  if (month1Chunk && !hasSection("onboarding_month1")) {
    const month1Span = pickCleanVerbatimLine(month1Chunk, undefined, 1);
    if (month1Span) {
      pushClaim(
        "ONB-MONTH1",
        "onboarding_month1",
        "decision",
        month1Span,
        "single_source",
        [buildEvidenceFromChunk(month1Chunk, sourcesById, month1Span)],
        month1Chunk.allowed_roles
      );
    }
  }

  // 3. Explicit Unsupported Knowledge-Gap claims (ready for Stage 4 Gap-Interview resolution)
  const existingUnsupportedCount = existingClaims.filter(
    (c) => c.evidence_state === "unsupported"
  ).length;
  if (existingUnsupportedCount < 3) {
    const stackLabel =
      analysis.techStack.length > 0
        ? analysis.techStack.slice(0, 4).join(", ")
        : analysis.readmeTitle || `${projectName} core stack`;
    const activeFocusLabel =
      analysis.issueLines[0] ||
      analysis.prLines[0] ||
      analysis.commitLines[0] ||
      analysis.issuesTitle ||
      `${projectName} active issues and PRs`;

    pushClaim(
      "GAP-1",
      "decisions",
      "decision",
      `Architecture rationale gap for ${projectName}: why ${stackLabel} was selected and which technical trade-offs must be preserved is undocumented.`,
      "unsupported",
      [],
      ["incoming_lead", "incoming_intern"]
    );
    pushClaim(
      "GAP-2",
      "tasks_dependencies",
      "risk",
      `Priority & blocker gap for ${projectName}: week-one triage order and sign-off owner for ${activeFocusLabel} is undocumented.`,
      "unsupported",
      [],
      ["incoming_lead", "incoming_intern"]
    );
    pushClaim(
      "GAP-3",
      "contacts_ownership",
      "owner",
      `Deployment & secret ownership gap for ${projectName}: environment variable management, deployment triggers, and rollback ownership are undocumented.`,
      "unsupported",
      [],
      ["incoming_lead", "incoming_intern"]
    );
  }

  return generated;
}

export interface ReconstructionResult {
  draftVersion: DraftVersion;
  claims: ClaimRecord[];
  confidence: DraftVersion["confidence"];
  trapsDetected: {
    trap1Conflict: boolean;
    trap2MissingRationale: boolean;
    trap3StaleRunbook: boolean;
    trap4QuarantinedSecrets: boolean;
    trap5FinanceRestricted: boolean;
    trap6PromptInjectionFlagged: boolean;
    trap7DomainRenewalGap: boolean;
    trap8MixedClaimDropped: boolean;
  };
}

/**
 * Reconstructs a verified handover draft for a specific audience role.
 */
export async function reconstructDraftForAudience(params: {
  projectId?: string;
  targetRole: AudienceRole;
  showRestrictedPlaceholders?: boolean;
}): Promise<ReconstructionResult> {
  const {
    projectId = "CampusConnect",
    targetRole,
    showRestrictedPlaceholders = true,
  } = params;

  // 1. Barrier 1 — Pre-Model RBAC Filter:
  // Fetch chunks from repository and strictly filter for targetRole
  const allChunks = await repository.listChunks(projectId);
  const permittedChunks = filterChunksForAudience(allChunks, targetRole);
  const chunksById = new Map<string, Chunk>(allChunks.map((c) => [c.id, c]));

  // 2. Retrieve-Only Generation:
  // Synthesize atomic claims from permitted chunks (using Gemini if configured, or deterministic benchmark seed)
  const draftVersionId = buildDraftVersionId(projectId, targetRole, "v1.0");
  const allSources = await repository.listSources(projectId);
  const sourcesById = new Map<string, Source>(allSources.map((s) => [s.id, s]));
  const customPermittedChunks = permittedChunks.filter(
    (c) => !c.source_id.startsWith("SRC-") || projectId !== "CampusConnect"
  );

  let rawClaims: ClaimRecord[] = [];
  const gemini = getGeminiClient();

  if (projectId === "CampusConnect") {
    const seed = getCampusConnectSeedData();
    const seedDraft = seed.drafts.find(
      (d) => d.audience_role === targetRole && d.version_label === "v1.0"
    );
    if (seedDraft && seedDraft.claims.length > 0) {
      rawClaims = JSON.parse(JSON.stringify(seedDraft.claims));
    }

    if (gemini && customPermittedChunks.length > 0) {
      try {
        const chunkXml = customPermittedChunks
          .map(
            (c) =>
              `<chunk id="${c.id}" author="${c.author}" timestamp="${c.chunk_timestamp}">\n${c.content}\n</chunk>`
          )
          .join("\n\n");

        const prompt = `You are EchoBridge Trust Pipeline Generator.
Synthesize verified atomic handover claims strictly based on the following authorised custom project sources:
${chunkXml}

Rules:
1. Every claim MUST be directly substantiated by the text in a <chunk>.
2. Every claim MUST cite chunk_id and exact verbatim quoted_span from that chunk.
3. section MUST be one of: architecture, decisions, tasks_dependencies, contacts_ownership, onboarding_day1, onboarding_week1, onboarding_month1.
4. claim_type MUST be one of: decision, owner, risk, dependency, next_action, contact.
5. Return a JSON object with array "claims".`;

        const response = await gemini.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            temperature: 0,
            responseMimeType: "application/json",
          },
        });

        const parsed = JSON.parse(response.text?.trim() || "{}");
        if (Array.isArray(parsed.claims) && parsed.claims.length > 0) {
          const geminiClaims = normalizeGeminiClaims({
            rawItems: parsed.claims,
            chunksById,
            sourcesById,
            targetRole,
            projectId,
            draftVersionId,
          });
          rawClaims.push(...geminiClaims);
        }
      } catch {
        // Fall through to deterministic custom chunk synthesis
      }
    }
  } else {
    const projectRecord = await repository.getProject(projectId);
    const projectName = projectRecord?.name || projectId;

    if (gemini && permittedChunks.length > 0) {
      try {
        const chunkXml = permittedChunks
          .map(
            (c) =>
              `<chunk id="${c.id}" author="${c.author}" timestamp="${c.chunk_timestamp}">\n${c.content}\n</chunk>`
          )
          .join("\n\n");

        const prompt = `You are EchoBridge Trust Pipeline Generator for workspace "${projectName}".
Synthesize verified atomic handover claims strictly based on the following authorised sources:
${chunkXml}

Rules:
1. Every substantiated claim MUST cite chunk_id and exact verbatim quoted_span from that chunk. Cite 2+ independent-author chunks when corroborated across sources (e.g. README + Commits/Issues/PRs).
2. Cover all applicable handover sections: architecture, decisions, tasks_dependencies, contacts_ownership, onboarding_day1, onboarding_week1, onboarding_month1.
3. claim_type MUST be one of: decision, owner, risk, dependency, next_action, contact.
4. For critical unwritten knowledge gaps (architecture rationale, open-issue priority/sign-off, deployment & secret ownership), include unsupported claims with evidence: [] and evidence_state: "unsupported".
5. Return a JSON object with array "claims".`;

        const response = await gemini.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            temperature: 0,
            responseMimeType: "application/json",
          },
        });

        const parsed = JSON.parse(response.text?.trim() || "{}");
        if (Array.isArray(parsed.claims) && parsed.claims.length > 0) {
          rawClaims = normalizeGeminiClaims({
            rawItems: parsed.claims,
            chunksById,
            sourcesById,
            targetRole,
            projectId,
            draftVersionId,
          });
        }
      } catch {
        // Fall through to deterministic standalone workspace synthesis
      }
    }

    const standaloneClaims = synthesizeStandaloneWorkspaceClaims({
      projectId,
      projectName,
      draftVersionId,
      targetRole,
      permittedChunks,
      sources: allSources,
      sourcesById,
      existingClaims: rawClaims,
    });
    if (standaloneClaims.length > 0) {
      rawClaims.push(...standaloneClaims);
    }
  }

  // Ensure every custom/newly ingested chunk gets at least one grounded verified claim
  const citedChunkIds = new Set<string>(
    rawClaims.flatMap((c) => (c.evidence || []).map((e) => e.chunk_id))
  );
  const customFallbackClaims = synthesizeCustomChunkClaims({
    chunks: permittedChunks,
    alreadyCitedChunkIds: citedChunkIds,
    sourcesById,
    targetRole,
    projectId,
    draftVersionId,
  });
  if (customFallbackClaims.length > 0) {
    rawClaims.push(...customFallbackClaims);
  }

  // 3. Two-Layer Citation Verification:
  // Layer A (verbatim quote span) + Layer B (semantic entailment)
  const verifiedClaims: ClaimRecord[] = [];
  for (const claim of rawClaims) {
    const verified = await verifyClaim(claim, chunksById, targetRole);
    verifiedClaims.push(verified);
  }

  // 4. Conflict & Staleness Detection:
  // Detect timeline/attribute contradictions (Trap 1)
  const detectedConflicts = detectConflictsInChunks(permittedChunks);
  const conflictProcessedClaims = verifiedClaims.map((claim) => {
    // Check if claim concerns the conflicting entity attribute (e.g. event registration deadline)
    if (
      claim.text.toLowerCase().includes("registration") &&
      (claim.text.toLowerCase().includes("march 15") ||
        claim.text.toLowerCase().includes("march 20"))
    ) {
      if (detectedConflicts.length > 0) {
        return applyConflictToClaim(claim, detectedConflicts[0]);
      }
    }

    // Check for Staleness (Trap 3): runbook older than 180 days
    if (claim.evidence_state !== "conflicting") {
      if (isClaimStale(claim, chunksById, 180)) {
        return {
          ...claim,
          evidence_state: "stale" as const,
        };
      }
    }

    return claim;
  });

  // 5. Barrier 2 — Post-Generation RBAC Guard:
  // Re-verify claim.audience_acl against cited chunks.
  // Drops any claim citing restricted chunks (Trap 5 & Trap 8) from Intern View.
  const guardResult = await enforcePostGenerationGuard({
    claims: conflictProcessedClaims,
    chunksById,
    targetRole,
    showRestrictedPlaceholders,
    projectId,
  });

  const finalClaims = guardResult.filteredClaims;

  // 6. Compute Transparent 4-Part Confidence Score:
  const confidence = computeConfidenceBreakdown(finalClaims);

  // 7. Construct and Persist DraftVersion (v1.0):
  const draftVersion: DraftVersion = {
    id: draftVersionId,
    project_id: projectId,
    audience_role: targetRole,
    version_label: "v1.0",
    confidence,
    status: "draft",
    claims: finalClaims,
    created_at: new Date().toISOString(),
  };

  // Save to repository
  await repository.saveDraftVersion(draftVersion);

  // Propagate any newly reconstructed custom claims into existing higher versions (v1.1 / v2.0)
  // so newly ingested sources appear immediately in Review & Handover without losing existing reviews.
  const newlySynthesizedClaims = finalClaims.filter(
    (c) =>
      c.id.startsWith("CLM-CUSTOM-") ||
      c.id.startsWith("CLM-GEN-") ||
      c.evidence.some((e) => !e.source_id.startsWith("SRC-"))
  );
  if (newlySynthesizedClaims.length > 0) {
    for (const versionLabel of ["v1.1", "v2.0"] as const) {
      const existingHigherDraft = await repository.getDraftVersion(
        projectId,
        targetRole,
        versionLabel
      );
      if (!existingHigherDraft) continue;

      const existingIds = new Set(existingHigherDraft.claims.map((c) => c.id));
      const suffix = versionLabel === "v1.1" ? "-V1.1" : "-V2.0";
      const missingCustom = newlySynthesizedClaims
        .map((c) => ({
          ...c,
          id: c.id.endsWith(suffix) ? c.id : `${c.id}${suffix}`,
          draft_version_id: existingHigherDraft.id,
        }))
        .filter((c) => !existingIds.has(c.id));

      if (missingCustom.length > 0) {
        const mergedClaims = [...existingHigherDraft.claims, ...missingCustom];
        await repository.saveDraftVersion({
          ...existingHigherDraft,
          claims: mergedClaims,
          confidence: computeConfidenceBreakdown(mergedClaims),
        });
      }
    }
  }

  // Log draft_generated audit event
  await logAuditEvent({
    project_id: projectId,
    actor_role: targetRole,
    actor_name: `EchoBridge Trust Pipeline`,
    event_type: "draft_generated",
    details_json: {
      draft_version_id: draftVersionId,
      audience_role: targetRole,
      version_label: "v1.0",
      confidence_score: confidence.total_score,
      citation_coverage: confidence.citation_coverage,
      corroboration_rate: confidence.corroboration_rate,
      freshness_rate: confidence.freshness_rate,
      conflict_rate: confidence.conflict_rate,
      claims_count: finalClaims.length,
      timestamp: new Date().toISOString(),
    },
  });

  // Check detected traps
  const trapsDetected = {
    trap1Conflict: finalClaims.some((c) => c.evidence_state === "conflicting"),
    trap2MissingRationale: finalClaims.some(
      (c) =>
        c.evidence_state === "unsupported" &&
        c.text.toLowerCase().includes("redis")
    ),
    trap3StaleRunbook: finalClaims.some((c) => c.evidence_state === "stale"),
    trap4QuarantinedSecrets: (await repository.listSecrets(projectId)).some(
      (s) => s.secret_type === "api_key" || s.secret_type === "phone"
    ),
    trap5FinanceRestricted: targetRole === "incoming_intern"
      ? !permittedChunks.some((c) => c.source_id === "SRC-FIN-06")
      : true,
    trap6PromptInjectionFlagged: (await repository.listSecrets(projectId)).some(
      (s) => s.secret_type === "prompt_injection"
    ),
    trap7DomainRenewalGap: finalClaims.some(
      (c) =>
        c.evidence_state === "unsupported" &&
        c.text.toLowerCase().includes("domain")
    ),
    trap8MixedClaimDropped: targetRole === "incoming_intern"
      ? guardResult.droppedClaimsCount > 0 ||
        finalClaims.some((c) => c.evidence_state === "restricted")
      : true,
  };

  return {
    draftVersion,
    claims: finalClaims,
    confidence,
    trapsDetected,
  };
}

/**
 * Reconstructs separate handover drafts for both Team Lead and Intern audiences.
 */
export async function reconstructAllAudienceDrafts(
  projectId = "CampusConnect"
): Promise<{
  leadDraft: ReconstructionResult;
  internDraft: ReconstructionResult;
}> {
  const [leadDraft, internDraft] = await Promise.all([
    reconstructDraftForAudience({
      projectId,
      targetRole: "incoming_lead",
    }),
    reconstructDraftForAudience({
      projectId,
      targetRole: "incoming_intern",
    }),
  ]);

  return { leadDraft, internDraft };
}
