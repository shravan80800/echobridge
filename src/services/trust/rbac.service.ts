/**
 * RBAC & Audience Isolation Guards
 * Implements docs/SECURITY.md Section 1, docs/PRD.md Section 6 & 7 (Trap 5 & Trap 8), and TASKS.md TASK-012.
 *
 * Provides two-barrier defense against confidentiality leakage:
 * Barrier 1: Pre-Model Filtering (filterChunksForAudience) prevents restricted chunks from entering LLM context.
 * Barrier 2: Post-Generation Guard (enforcePostGenerationGuard) drops any claim citing unauthorized chunks and replaces with zero-leak placeholders.
 */

import type {
  AudienceRole,
  ClaimRecord,
  Chunk,
  Role,
} from "@/types/echobridge.types";
import { logAuditEvent } from "@/services/workflow/audit.service";

export interface PostGenerationGuardResult {
  filteredClaims: ClaimRecord[];
  droppedClaimsCount: number;
  placeholderCount: number;
  droppedClaimIds: string[];
}

/**
 * Barrier 1 — Pre-Model Filtering:
 * Returns ONLY chunks permitted for the target audience.
 * Any chunk where targetRole is NOT in allowed_roles is strictly excluded
 * before prompt assembly.
 */
export function filterChunksForAudience(
  chunks: Chunk[],
  targetRole: AudienceRole
): Chunk[] {
  if (!chunks || chunks.length === 0) return [];
  return chunks.filter((chunk) => chunk.allowed_roles.includes(targetRole));
}

/**
 * Computes the strict intersection of allowed_roles across all cited chunk IDs.
 * Access is Role AND Source Permissions — never the union.
 */
export function computeClaimAudienceAcl(
  evidenceChunkIds: string[],
  chunksById: Map<string, Chunk> | Record<string, Chunk>
): AudienceRole[] {
  if (!evidenceChunkIds || evidenceChunkIds.length === 0) {
    // If ungrounded or unsupported, default to public scope
    return ["incoming_lead", "incoming_intern"];
  }

  const getChunk = (id: string): Chunk | undefined => {
    if (chunksById instanceof Map) return chunksById.get(id);
    return chunksById[id];
  };

  let intersection: AudienceRole[] = ["incoming_lead", "incoming_intern"];

  for (const chunkId of evidenceChunkIds) {
    const chunk = getChunk(chunkId);
    if (!chunk) continue;

    // Filter intersection
    intersection = intersection.filter((role) =>
      chunk.allowed_roles.includes(role)
    );
  }

  return intersection;
}

/**
 * Barrier 2 — Post-Generation Guard:
 * Re-evaluates claims after generation. If a claim cites ANY chunk outside
 * targetRole's permitted scope (e.g. Trap 8 mixed claim), the claim content is dropped,
 * logged as an access_denied_guard audit event, and replaced with a zero-leak placeholder.
 */
export async function enforcePostGenerationGuard(params: {
  claims: ClaimRecord[];
  chunksById: Map<string, Chunk> | Record<string, Chunk>;
  targetRole: AudienceRole;
  showRestrictedPlaceholders?: boolean;
  projectId?: string;
}): Promise<PostGenerationGuardResult> {
  const {
    claims,
    chunksById,
    targetRole,
    showRestrictedPlaceholders = true,
    projectId = "CampusConnect",
  } = params;

  const getChunk = (id: string): Chunk | undefined => {
    if (chunksById instanceof Map) return chunksById.get(id);
    return chunksById[id];
  };

  const filteredClaims: ClaimRecord[] = [];
  const droppedClaimIds: string[] = [];
  let droppedClaimsCount = 0;
  let placeholderCount = 0;

  for (const claim of claims) {
    // Collect all chunk IDs cited by this claim
    const citedChunkIds = claim.evidence?.map((e) => e.chunk_id) || [];

    // Recompute claim audience ACL from cited chunks
    const computedAcl = computeClaimAudienceAcl(citedChunkIds, chunksById);

    // Check if ANY cited chunk is forbidden for targetRole
    let isForbidden = !computedAcl.includes(targetRole);

    for (const chunkId of citedChunkIds) {
      const chunk = getChunk(chunkId);
      if (chunk && !chunk.allowed_roles.includes(targetRole)) {
        isForbidden = true;
        break;
      }
    }

    if (isForbidden) {
      // Access Denied: Drop claim from this audience view
      droppedClaimsCount++;
      droppedClaimIds.push(claim.id);

      // Log access_denied_guard in audit trail
      await logAuditEvent({
        project_id: projectId,
        actor_role: targetRole,
        actor_name: `Post-Generation RBAC Guard`,
        event_type: "access_denied_guard",
        details_json: {
          claim_id: claim.id,
          target_role: targetRole,
          claim_section: claim.section,
          cited_chunk_ids: citedChunkIds,
          action: showRestrictedPlaceholders
            ? "replaced_with_zero_leak_placeholder"
            : "dropped",
          timestamp: new Date().toISOString(),
        },
      });

      // Emit zero-leak restricted placeholder if enabled
      if (showRestrictedPlaceholders) {
        placeholderCount++;
        filteredClaims.push({
          id: `RESTRICTED-${claim.id}`,
          draft_version_id: claim.draft_version_id,
          project_id: claim.project_id,
          audience_role: targetRole,
          section: claim.section,
          claim_type: claim.claim_type,
          // Zero-leak text: no title, topic, author, or source leaked
          text: "Restricted: request access",
          evidence_state: "restricted",
          evidence: [], // Zero evidence leaked
          audience_acl: [targetRole],
          review: {
            status: "approved",
          },
          created_at: new Date().toISOString(),
        });
      }
    } else {
      // Permitted: retain claim with verified audience ACL
      filteredClaims.push({
        ...claim,
        audience_acl: computedAcl,
      });
    }
  }

  return {
    filteredClaims,
    droppedClaimsCount,
    placeholderCount,
    droppedClaimIds,
  };
}

/**
 * Server-side authorization check for sensitive actions.
 * Enforces separation of duties:
 * Departing member is strictly blocked from self-approving or publishing a handover (HTTP 403).
 */
export function canApproveHandover(actorRole: Role): boolean {
  return actorRole === "reviewer";
}
