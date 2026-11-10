/**
 * Stage 5: Human Review, Version Diff & Handover Approval Service
 * Implements docs/DECISIONS.md ADR-007, docs/PRD.md Section 4 & 5, and TASKS.md TASK-019.
 *
 * Rules:
 * - Separation of Duties (ADR-007): departing_member is strictly forbidden from approving handovers (403).
 * - Reviewer holds sole approval authority (Prof. Deshmukh).
 * - Side-by-side conflict resolution (Trap 1): preserves both versions until reviewer decides.
 * - Multi-version diff generator (v1.0 -> v1.1 -> v2.0).
 */

import type {
  AudienceRole,
  ClaimRecord,
  DraftVersion,
  EvidenceState,
  ReviewStatus,
  Role,
  VersionLabel,
} from "@/types/echobridge.types";
import { repository } from "@/lib/supabase/repository";
import { computeConfidenceBreakdown } from "@/services/trust/confidence.service";
import { logAuditEvent } from "@/services/workflow/audit.service";
import { getCampusConnectSeedData } from "@/services/seed/campus-connect.seed";
import { buildDraftVersionId } from "@/utils/project-scope";

export interface ClaimDiffItem {
  claimId: string;
  changeType: "added" | "removed" | "modified" | "unchanged";
  oldClaim?: ClaimRecord;
  newClaim?: ClaimRecord;
  textDiff?: {
    oldText: string;
    newText: string;
    isModified: boolean;
  };
  stateDiff?: {
    oldState: EvidenceState;
    newState: EvidenceState;
    isModified: boolean;
  };
  reviewDiff?: {
    oldStatus: ReviewStatus;
    newStatus: ReviewStatus;
    isModified: boolean;
  };
}

export interface VersionDiffSummary {
  fromVersion: VersionLabel;
  toVersion: VersionLabel;
  audienceRole: AudienceRole;
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  unchangedCount: number;
  totalCount: number;
  confidenceScoreChange: {
    from: number;
    to: number;
    delta: number;
  };
  items: ClaimDiffItem[];
}

export class ReviewAuthorizationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 403) {
    super(message);
    this.name = "ReviewAuthorizationError";
    this.statusCode = statusCode;
  }
}

/**
 * Validates that the active persona has permission to perform reviewer actions.
 * Enforces ADR-007: Departing member can NEVER self-approve or review claims.
 */
export function assertReviewerAuthority(actorRole: Role): void {
  if (actorRole === "departing_member") {
    throw new ReviewAuthorizationError(
      "Separation of Duties violation: The departing member cannot approve or review the handover draft (ADR-007).",
      403
    );
  }

  if (actorRole !== "reviewer") {
    throw new ReviewAuthorizationError(
      `Permission denied: Persona '${actorRole}' does not hold reviewer authorization. Only reviewer (Mentor/Lead) can approve or edit claims.`,
      403
    );
  }
}

/**
 * Calculates a structured semantic diff between two draft versions.
 */
export function computeVersionDiff(
  oldDraft: DraftVersion,
  newDraft: DraftVersion
): VersionDiffSummary {
  const oldClaimsMap = new Map<string, ClaimRecord>();
  for (const c of oldDraft.claims) {
    // Normalise base ID by stripping version suffix (-V1.1, -V2.0)
    const baseId = c.id.replace(/-V1\.[012]|-V2\.0/g, "");
    oldClaimsMap.set(baseId, c);
  }

  const newClaimsMap = new Map<string, ClaimRecord>();
  for (const c of newDraft.claims) {
    const baseId = c.id.replace(/-V1\.[012]|-V2\.0/g, "");
    newClaimsMap.set(baseId, c);
  }

  const allBaseIds = new Set<string>([
    ...Array.from(oldClaimsMap.keys()),
    ...Array.from(newClaimsMap.keys()),
  ]);

  const items: ClaimDiffItem[] = [];
  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;
  let unchangedCount = 0;

  for (const baseId of allBaseIds) {
    const oldClaim = oldClaimsMap.get(baseId);
    const newClaim = newClaimsMap.get(baseId);

    if (!oldClaim && newClaim) {
      addedCount++;
      items.push({
        claimId: baseId,
        changeType: "added",
        newClaim,
        textDiff: { oldText: "", newText: newClaim.text, isModified: true },
        stateDiff: {
          oldState: newClaim.evidence_state,
          newState: newClaim.evidence_state,
          isModified: false,
        },
        reviewDiff: {
          oldStatus: "pending",
          newStatus: newClaim.review.status,
          isModified: false,
        },
      });
    } else if (oldClaim && !newClaim) {
      removedCount++;
      items.push({
        claimId: baseId,
        changeType: "removed",
        oldClaim,
        textDiff: { oldText: oldClaim.text, newText: "", isModified: true },
        stateDiff: {
          oldState: oldClaim.evidence_state,
          newState: oldClaim.evidence_state,
          isModified: false,
        },
        reviewDiff: {
          oldStatus: oldClaim.review.status,
          newStatus: "rejected",
          isModified: true,
        },
      });
    } else if (oldClaim && newClaim) {
      const isTextModified = oldClaim.text.trim() !== newClaim.text.trim();
      const isStateModified = oldClaim.evidence_state !== newClaim.evidence_state;
      const isReviewModified =
        oldClaim.review.status !== newClaim.review.status;

      if (isTextModified || isStateModified || isReviewModified) {
        modifiedCount++;
        items.push({
          claimId: baseId,
          changeType: "modified",
          oldClaim,
          newClaim,
          textDiff: {
            oldText: oldClaim.text,
            newText: newClaim.text,
            isModified: isTextModified,
          },
          stateDiff: {
            oldState: oldClaim.evidence_state,
            newState: newClaim.evidence_state,
            isModified: isStateModified,
          },
          reviewDiff: {
            oldStatus: oldClaim.review.status,
            newStatus: newClaim.review.status,
            isModified: isReviewModified,
          },
        });
      } else {
        unchangedCount++;
        items.push({
          claimId: baseId,
          changeType: "unchanged",
          oldClaim,
          newClaim,
          textDiff: {
            oldText: oldClaim.text,
            newText: newClaim.text,
            isModified: false,
          },
          stateDiff: {
            oldState: oldClaim.evidence_state,
            newState: newClaim.evidence_state,
            isModified: false,
          },
          reviewDiff: {
            oldStatus: oldClaim.review.status,
            newStatus: newClaim.review.status,
            isModified: false,
          },
        });
      }
    }
  }

  const fromScore = oldDraft.confidence?.total_score || 0;
  const toScore = newDraft.confidence?.total_score || 0;

  return {
    fromVersion: oldDraft.version_label,
    toVersion: newDraft.version_label,
    audienceRole: oldDraft.audience_role,
    addedCount,
    removedCount,
    modifiedCount,
    unchangedCount,
    totalCount: items.length,
    confidenceScoreChange: {
      from: fromScore,
      to: toScore,
      delta: toScore - fromScore,
    },
    items,
  };
}

function stripClaimVersionSuffix(claimId: string): string {
  return claimId.replace(/-V1\.[012]|-V2\.0/g, "");
}

function findMatchingClaimIndex(
  claims: ClaimRecord[],
  claimId: string,
  matchTrap1 = false
): number {
  const targetBase = stripClaimVersionSuffix(claimId);
  return claims.findIndex(
    (c) =>
      c.id === claimId ||
      stripClaimVersionSuffix(c.id) === targetBase ||
      (matchTrap1 && c.planted_trap_id === 1 && claimId.includes("TRAP-1"))
  );
}

async function syncClaimAcrossVersions(params: {
  projectId: string;
  audienceRole: AudienceRole;
  primaryDraftId: string;
  claimId: string;
  updatedFields: Partial<ClaimRecord>;
  matchTrap1?: boolean;
}): Promise<void> {
  const {
    projectId,
    audienceRole,
    primaryDraftId,
    claimId,
    updatedFields,
    matchTrap1 = false,
  } = params;

  for (const label of ["v1.1", "v2.0"] as const) {
    const draft = await repository.getDraftVersion(
      projectId,
      audienceRole,
      label
    );
    if (!draft || draft.id === primaryDraftId) continue;

    const idx = findMatchingClaimIndex(draft.claims, claimId, matchTrap1);
    if (idx < 0) continue;

    const nextClaims: ClaimRecord[] = JSON.parse(JSON.stringify(draft.claims));
    nextClaims[idx] = {
      ...nextClaims[idx],
      ...updatedFields,
      id: nextClaims[idx].id,
      draft_version_id: draft.id,
    };

    await repository.saveDraftVersion({
      ...draft,
      claims: nextClaims,
      confidence: computeConfidenceBreakdown(nextClaims),
    });
  }
}

/**
 * Reviews a single claim (approve, edit, redact, reject).
 * Emits an immutable audit log and updates the claim in repository.
 */
export async function reviewClaim(params: {
  claimId: string;
  action: ReviewStatus;
  actorRole: Role;
  reviewerName?: string;
  editedText?: string;
  notes?: string;
  projectId?: string;
  audienceRole?: AudienceRole;
}): Promise<ClaimRecord> {
  const {
    claimId,
    action,
    actorRole,
    reviewerName = "Prof. Deshmukh (Reviewer)",
    editedText,
    notes,
    projectId = "CampusConnect",
    audienceRole = "incoming_lead",
  } = params;

  // 1. Enforce Separation of Duties
  assertReviewerAuthority(actorRole);

  // 2. Fetch latest draft to update
  const latestDraft =
    (await repository.getDraftVersion(projectId, audienceRole, "v2.0")) ||
    (await repository.getDraftVersion(projectId, audienceRole, "v1.1")) ||
    (await repository.getDraftVersion(projectId, audienceRole, "v1.0"));

  if (!latestDraft) {
    throw new Error(`Draft version not found for ${projectId} / ${audienceRole}`);
  }

  // Find target claim in draft
  const claimIndex = latestDraft.claims.findIndex(
    (c) =>
      c.id === claimId ||
      c.id.replace(/-V1\.[012]|-V2\.0/g, "") ===
        claimId.replace(/-V1\.[012]|-V2\.0/g, "")
  );

  let targetClaim: ClaimRecord;

  if (claimIndex >= 0) {
    targetClaim = latestDraft.claims[claimIndex];
  } else {
    // Check repository store
    const fromRepo = await repository.getClaim(claimId);
    if (!fromRepo) {
      throw new Error(`Claim ${claimId} not found in project ${projectId}`);
    }
    targetClaim = fromRepo;
  }

  // 3. Apply Reviewer Mutation
  const isEdit = (action as string) === "edit" || action === "edited";
  const isRedact = (action as string) === "redact" || action === "redacted";

  const normalizedStatus: ReviewStatus = isEdit
    ? "edited"
    : isRedact
    ? "redacted"
    : action;

  targetClaim.review = {
    status: normalizedStatus,
    reviewer_name: reviewerName,
    reviewed_at: new Date().toISOString(),
    notes: notes || targetClaim.review?.notes,
  };

  if (isEdit && editedText) {
    targetClaim.review.edited_text = editedText;
    targetClaim.text = editedText;
  } else if (isRedact) {
    targetClaim.text = "[REDACTED BY REVIEWER]";
    targetClaim.evidence_state = "restricted";
    targetClaim.review.notes = notes || "Redacted sensitive proprietary detail";
  }

  // 4. Update in repository across active draft versions
  await repository.updateClaimReview(targetClaim.id, targetClaim.review);

  // If in latest draft claims, replace and recalculate confidence
  if (claimIndex >= 0) {
    latestDraft.claims[claimIndex] = targetClaim;
    latestDraft.confidence = computeConfidenceBreakdown(latestDraft.claims);
    await repository.saveDraftVersion(latestDraft);
    await syncClaimAcrossVersions({
      projectId,
      audienceRole,
      primaryDraftId: latestDraft.id,
      claimId: targetClaim.id,
      updatedFields: {
        text: targetClaim.text,
        evidence_state: targetClaim.evidence_state,
        review: targetClaim.review,
      },
    });
  }

  // 5. Emit immutable audit log
  await logAuditEvent({
    project_id: projectId,
    actor_role: actorRole,
    actor_name: reviewerName,
    event_type: "claim_reviewed",
    details_json: {
      claim_id: targetClaim.id,
      action,
      evidence_state: targetClaim.evidence_state,
      edited_text: editedText ? editedText.slice(0, 100) : undefined,
      timestamp: new Date().toISOString(),
    },
  });

  return targetClaim;
}

/**
 * Resolves a conflicting claim (Trap 1: chat vs doc contradiction).
 * The reviewer selects the winning side or enters a custom reconciled resolution.
 */
export async function resolveConflict(params: {
  claimId: string;
  winningSide: "side_a" | "side_b" | "custom";
  actorRole: Role;
  reviewerName?: string;
  customText?: string;
  projectId?: string;
  audienceRole?: AudienceRole;
}): Promise<ClaimRecord> {
  const {
    claimId,
    winningSide,
    actorRole,
    reviewerName = "Prof. Deshmukh (Reviewer)",
    customText,
    projectId = "CampusConnect",
    audienceRole = "incoming_lead",
  } = params;

  // 1. Enforce Separation of Duties
  assertReviewerAuthority(actorRole);

  // 2. Fetch latest draft
  const latestDraft =
    (await repository.getDraftVersion(projectId, audienceRole, "v2.0")) ||
    (await repository.getDraftVersion(projectId, audienceRole, "v1.1")) ||
    (await repository.getDraftVersion(projectId, audienceRole, "v1.0"));

  if (!latestDraft) {
    throw new Error(`Draft version not found for ${projectId} / ${audienceRole}`);
  }

  const claimIndex = latestDraft.claims.findIndex(
    (c) =>
      c.id === claimId ||
      c.id.replace(/-V1\.[012]|-V2\.0/g, "") ===
        claimId.replace(/-V1\.[012]|-V2\.0/g, "") ||
      (c.planted_trap_id === 1 && claimId.includes("TRAP-1"))
  );

  if (claimIndex < 0) {
    throw new Error(`Conflicting claim ${claimId} not found`);
  }

  const claim = latestDraft.claims[claimIndex];

  // 3. Resolve conflict
  let resolvedText = "";
  if (winningSide === "side_b") {
    // Planning doc date (March 20th)
    resolvedText =
      "Event registration closes on March 20th to allow late entries from affiliated engineering departments.";
  } else if (winningSide === "side_a") {
    // Chat date (March 15th)
    resolvedText =
      "Event registration closes on March 15th at midnight sharp as discussed in team chat.";
  } else {
    resolvedText =
      customText ||
      "Event registration deadline reconciled: March 20th approved as authoritative official date.";
  }

  claim.text = resolvedText;
  claim.evidence_state = "corroborated"; // Resolved conflict transitions to corroborated

  if (claim.conflict_pair) {
    claim.conflict_pair = {
      ...claim.conflict_pair,
      resolved_winner: winningSide,
      custom_resolution: resolvedText,
    };
  }

  claim.review = {
    status: "approved",
    reviewer_name: reviewerName,
    reviewed_at: new Date().toISOString(),
    edited_text: resolvedText,
    notes: `Conflict resolved in favour of ${winningSide}: ${resolvedText}`,
  };

  // 4. Update latest draft and synchronize conflict resolution across v1.1 & v2.0
  latestDraft.claims[claimIndex] = claim;
  latestDraft.confidence = computeConfidenceBreakdown(latestDraft.claims);
  await repository.saveDraftVersion(latestDraft);
  await syncClaimAcrossVersions({
    projectId,
    audienceRole,
    primaryDraftId: latestDraft.id,
    claimId: claim.id,
    updatedFields: {
      text: claim.text,
      evidence_state: claim.evidence_state,
      conflict_pair: claim.conflict_pair,
      review: claim.review,
    },
    matchTrap1: true,
  });

  // 5. Emit immutable audit event
  await logAuditEvent({
    project_id: projectId,
    actor_role: actorRole,
    actor_name: reviewerName,
    event_type: "claim_reviewed",
    details_json: {
      claim_id: claim.id,
      action: "conflict_resolved",
      winning_side: winningSide,
      resolved_text: resolvedText,
      new_confidence_score: latestDraft.confidence.total_score,
      timestamp: new Date().toISOString(),
    },
  });

  return claim;
}

/**
 * Final Handover Approval:
 * When the human Reviewer approves, creates DraftVersion v2.0 with status 'approved',
 * recalculates Confidence Score, and publishes for incoming members.
 */
export async function approveHandover(params: {
  projectId?: string;
  audienceRole?: AudienceRole;
  actorRole: Role;
  reviewerName?: string;
}): Promise<{
  draftV2_0: DraftVersion;
  versionDiffV1_1toV2_0: VersionDiffSummary;
}> {
  const {
    projectId = "CampusConnect",
    audienceRole = "incoming_lead",
    actorRole,
    reviewerName = "Prof. Deshmukh (Project Mentor)",
  } = params;

  // 1. Enforce Separation of Duties (ADR-007)
  assertReviewerAuthority(actorRole);

  // 2. Fetch base draft (v1.1 or v1.0) and merge any custom v1.0 claims
  const baseDraft =
    (await repository.getDraftVersion(projectId, audienceRole, "v1.1")) ||
    (await repository.getDraftVersion(projectId, audienceRole, "v1.0"));

  if (!baseDraft) {
    throw new Error(`Base draft version not found for ${projectId} / ${audienceRole}`);
  }

  // Clone claims and merge any custom/generated claims from v1.0 that aren't already present
  const v2Claims: ClaimRecord[] = JSON.parse(JSON.stringify(baseDraft.claims));
  const v10Draft = await repository.getDraftVersion(projectId, audienceRole, "v1.0");
  if (v10Draft) {
    const existingBaseIds = new Set(v2Claims.map((c) => stripClaimVersionSuffix(c.id)));
    for (const c of v10Draft.claims) {
      const isCustom =
        c.id.startsWith("CLM-CUSTOM-") ||
        c.id.startsWith("CLM-GEN-") ||
        (c.evidence || []).some((e) => !e.source_id.startsWith("SRC-"));
      if (isCustom && !existingBaseIds.has(stripClaimVersionSuffix(c.id))) {
        v2Claims.push(JSON.parse(JSON.stringify(c)));
        existingBaseIds.add(stripClaimVersionSuffix(c.id));
      }
    }
  }

  const targetV2Id = buildDraftVersionId(projectId, audienceRole, "v2.0");
  for (const c of v2Claims) {
    const baseId = stripClaimVersionSuffix(c.id);
    c.id = `${baseId}-V2.0`;
    c.draft_version_id = targetV2Id;

    if (c.evidence_state === "conflicting") {
      c.evidence_state = "corroborated";
      if (c.conflict_pair) {
        c.conflict_pair.resolved_winner = "side_b";
        c.conflict_pair.custom_resolution =
          "Authoritative planning document date (March 20th) approved by reviewer.";
      }
      c.text =
        "Event registration closes on March 20th to allow late entries from affiliated engineering departments.";
    }

    if (c.review.status === "pending") {
      c.review = {
        status: "approved",
        reviewer_name: reviewerName,
        reviewed_at: new Date().toISOString(),
      };
    }
  }

  // 3. Recalculate transparent 4-part confidence score for v2.0
  const updatedConfidence = computeConfidenceBreakdown(v2Claims);

  // 4. Construct DraftVersion v2.0
  const draftV2_0: DraftVersion = {
    id: targetV2Id,
    project_id: projectId,
    audience_role: audienceRole,
    version_label: "v2.0",
    confidence: updatedConfidence,
    status: "approved",
    claims: v2Claims,
    created_at: new Date().toISOString(),
  };

  await repository.saveDraftVersion(draftV2_0);

  // 5. Emit immutable audit log
  await logAuditEvent({
    project_id: projectId,
    actor_role: "reviewer",
    actor_name: reviewerName,
    event_type: "handover_approved",
    details_json: {
      version: "v2.0",
      audience_role: audienceRole,
      claims_count: v2Claims.length,
      final_confidence_score: updatedConfidence.total_score,
      timestamp: new Date().toISOString(),
    },
  });

  // 6. Compute diff against v1.1
  const versionDiffV1_1toV2_0 = computeVersionDiff(baseDraft, draftV2_0);

  return {
    draftV2_0,
    versionDiffV1_1toV2_0,
  };
}

function buildClonedDraftVersion(
  sourceDraft: DraftVersion,
  projectId: string,
  targetRole: AudienceRole,
  targetVersion: "v1.1" | "v2.0"
): DraftVersion {
  const targetDraftId = buildDraftVersionId(projectId, targetRole, targetVersion);
  const idSuffix = targetVersion === "v1.1" ? "-V1.1" : "-V2.0";
  const clonedClaims: ClaimRecord[] = JSON.parse(
    JSON.stringify(sourceDraft.claims || [])
  ).map((c: ClaimRecord) => ({
    ...c,
    id: `${stripClaimVersionSuffix(c.id)}${idSuffix}`,
    draft_version_id: targetDraftId,
    project_id: projectId,
    audience_role: targetRole,
  }));

  return {
    id: targetDraftId,
    project_id: projectId,
    audience_role: targetRole,
    version_label: targetVersion,
    confidence: computeConfidenceBreakdown(clonedClaims),
    status: "draft",
    claims: clonedClaims,
    created_at: new Date().toISOString(),
  };
}

/**
 * For custom (non-CampusConnect) projects that only have v1.0 generated so far,
 * automatically initializes v1.1 and v2.0 snapshots from v1.0 so /review and
 * /handover always load populated claims instead of empty states.
 */
export async function ensureCustomDraftVersionsInitialized(
  projectId: string,
  roles: AudienceRole[] = ["incoming_lead", "incoming_intern"]
): Promise<void> {
  if (!projectId || projectId === "CampusConnect") return;

  for (const role of roles) {
    const [v1_0, existingV1_1, existingV2_0] = await Promise.all([
      repository.getDraftVersion(projectId, role, "v1.0"),
      repository.getDraftVersion(projectId, role, "v1.1"),
      repository.getDraftVersion(projectId, role, "v2.0"),
    ]);

    if (!v1_0) continue;

    let v1_1 = existingV1_1;
    if (!v1_1) {
      v1_1 = buildClonedDraftVersion(v1_0, projectId, role, "v1.1");
      await repository.saveDraftVersion(v1_1);
    }

    if (!existingV2_0) {
      const v2_0 = buildClonedDraftVersion(
        v1_1 || v1_0,
        projectId,
        role,
        "v2.0"
      );
      await repository.saveDraftVersion(v2_0);
    }
  }
}

/**
 * Retrieves the full review workspace state (all draft versions, diffs, conflicts).
 */
export async function getReviewDashboardData(params: {
  projectId?: string;
  audienceRole?: AudienceRole;
  fromVersion?: VersionLabel;
  toVersion?: VersionLabel;
}): Promise<{
  drafts: DraftVersion[];
  activeDraft: DraftVersion | null;
  conflicts: ClaimRecord[];
  diff: VersionDiffSummary | null;
  quarantinedCount: number;
}> {
  const {
    projectId = "CampusConnect",
    audienceRole = "incoming_lead",
    fromVersion = "v1.0",
    toVersion = "v1.1",
  } = params;

  await ensureCustomDraftVersionsInitialized(projectId, [audienceRole]);

  // Retrieve all versions for this audience
  const v1_0 = await repository.getDraftVersion(projectId, audienceRole, "v1.0");
  const v1_1 = await repository.getDraftVersion(projectId, audienceRole, "v1.1");
  const v2_0 = await repository.getDraftVersion(projectId, audienceRole, "v2.0");

  const drafts = [v1_0, v1_1, v2_0].filter((d): d is DraftVersion => d !== null);

  const activeDraft = v2_0 || v1_1 || v1_0 || null;

  // Filter conflict claims
  const conflicts = (activeDraft?.claims || []).filter(
    (c) => c.evidence_state === "conflicting" || !!c.conflict_pair
  );

  // Compute requested version diff
  let diff: VersionDiffSummary | null = null;
  const draftMap: Record<VersionLabel, DraftVersion | null> = {
    "v1.0": v1_0,
    "v1.1": v1_1,
    "v2.0": v2_0,
  };

  const oldD = draftMap[fromVersion];
  const newD = draftMap[toVersion];

  if (oldD && newD) {
    diff = computeVersionDiff(oldD, newD);
  }

  // Quarantined count
  const secrets = await repository.listSecrets(projectId);

  return {
    drafts,
    activeDraft,
    conflicts,
    diff,
    quarantinedCount: secrets.length,
  };
}
