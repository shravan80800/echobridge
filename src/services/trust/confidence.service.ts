/**
 * Transparent Confidence Score Heuristic Engine
 * Implements docs/PRD.md Section 5, docs/DESIGN.md Section 5.2, and TASKS.md TASK-014.
 *
 * Computes the 4-part evidence quality heuristic:
 * Score = round(100 * (0.40 * citation_coverage + 0.25 * corroboration_rate + 0.15 * freshness_rate + 0.20 * (1 - conflict_rate)))
 *
 * Explicitly surfaces individual rates so reviewers see an honest heuristic rather than a black-box probability.
 */

import {
  CONFIDENCE_WEIGHTS,
  type ClaimRecord,
  type ConfidenceBreakdown,
  type ConfidenceWeights,
} from "@/types/echobridge.types";

/**
 * Computes transparent ConfidenceBreakdown from a list of claims.
 */
export function computeConfidenceBreakdown(
  claims: ClaimRecord[],
  customWeights?: Partial<ConfidenceWeights>
): ConfidenceBreakdown {
  const weights: ConfidenceWeights = {
    ...CONFIDENCE_WEIGHTS,
    ...customWeights,
  };

  if (!claims || claims.length === 0) {
    return {
      total_score: 0,
      citation_coverage: 0,
      corroboration_rate: 0,
      freshness_rate: 0,
      conflict_rate: 0,
      conflict_free_rate: 1,
      weights,
    };
  }

  // Filter out restricted placeholders from quality scoring calculation
  // (Placeholders are access control artifacts, not knowledge claims)
  const verifiableClaims = claims.filter(
    (c) => c.evidence_state !== "restricted"
  );

  const total = verifiableClaims.length > 0 ? verifiableClaims.length : claims.length;

  // 1. Citation Coverage: claims with at least 1 verified cited chunk
  let verifiedCitationCount = 0;
  let corroboratedCount = 0;
  let freshCount = 0;
  let conflictCount = 0;

  for (const claim of verifiableClaims) {
    // Has at least 1 verified citation
    const hasVerifiedCitation =
      claim.evidence &&
      claim.evidence.some(
        (e) => e.is_verbatim_verified && e.entailment_verdict === "supported"
      );

    if (hasVerifiedCitation || claim.evidence_state === "attested") {
      verifiedCitationCount++;
    }

    // Corroboration Rate: Green claims supported by 2+ independent sources
    if (claim.evidence_state === "corroborated") {
      corroboratedCount++;
    }

    // Freshness Rate: Claims not marked Stale (Orange)
    if (claim.evidence_state !== "stale") {
      freshCount++;
    }

    // Conflict Rate: Claims marked Conflicting (Purple)
    if (claim.evidence_state === "conflicting") {
      conflictCount++;
    }
  }

  const citation_coverage = Number((verifiedCitationCount / total).toFixed(4));
  const corroboration_rate = Number((corroboratedCount / total).toFixed(4));
  const freshness_rate = Number((freshCount / total).toFixed(4));
  const conflict_rate = Number((conflictCount / total).toFixed(4));
  const conflict_free_rate = Number(Math.max(0, 1 - conflict_rate).toFixed(4));

  // Compute weighted total score (0 to 100)
  const weightedSum =
    weights.citation_coverage * citation_coverage +
    weights.corroboration_rate * corroboration_rate +
    weights.freshness_rate * freshness_rate +
    weights.conflict_free_rate * conflict_free_rate;

  const total_score = Math.min(100, Math.max(0, Math.round(100 * weightedSum)));

  return {
    total_score,
    citation_coverage,
    corroboration_rate,
    freshness_rate,
    conflict_rate,
    conflict_free_rate,
    weights,
  };
}
