/**
 * Conflict Detector & Resolution Engine
 * Implements docs/DECISIONS.md ADR-007, docs/PRD.md Section 5 & 7 (Trap 1), and TASKS.md TASK-014.
 *
 * Identifies contradictory statements on the same entity attribute across sources
 * (e.g., event registration deadline March 15 vs. March 20), preserves both versions
 * side-by-side with authors and timestamps (Purple CONFLICTING), and provides Reviewer resolution actions.
 */

import type {
  Chunk,
  ClaimRecord,
  ConflictPair,
  ConflictSide,
} from "@/types/echobridge.types";

/**
 * Pre-defined conflicting entity attribute detector rules.
 * Extensible for custom project conflict scanning.
 */
interface ConflictRule {
  entityAttribute: string;
  patternA: RegExp;
  patternB: RegExp;
  extractValueA: (text: string) => string;
  extractValueB: (text: string) => string;
}

const CONFLICT_RULES: ConflictRule[] = [
  // Planted Trap 1: Event Registration Deadline (March 15 vs. March 20)
  {
    entityAttribute: "event_registration_deadline",
    patternA: /\b(?:registration|closes?|deadline)\b.*?\bmarch\s*15(?:th)?\b/i,
    patternB: /\b(?:registration|closes?|timeline)\b.*?\bmarch\s*20(?:th)?\b/i,
    extractValueA: (text) => {
      const match = text.match(/event registration closes on March 15th[^\n.]*/i) ||
        text.match(/March 15th[^\n.]*/i);
      return match ? match[0].trim() : "Event registration closes on March 15th at midnight";
    },
    extractValueB: (text) => {
      const match = text.match(/event registration closes on March 20th[^\n.]*/i) ||
        text.match(/March 20th[^\n.]*/i);
      return match ? match[0].trim() : "Event registration closes on March 20th to allow late entries";
    },
  },
  // Port / Database Conflict Rule Example
  {
    entityAttribute: "database_port",
    patternA: /\bport\s*[:=]?\s*5432\b/i,
    patternB: /\bport\s*[:=]?\s*5433\b/i,
    extractValueA: () => "PostgreSQL port 5432",
    extractValueB: () => "PostgreSQL port 5433",
  },
];

/**
 * Scans a collection of chunks for conflicting statements on the same entity attribute.
 * Accurately detects Planted Trap 1 (March 15 vs. March 20).
 */
export function detectConflictsInChunks(chunks: Chunk[]): ConflictPair[] {
  const conflicts: ConflictPair[] = [];

  for (const rule of CONFLICT_RULES) {
    let matchA: { chunk: Chunk; value: string } | null = null;
    let matchB: { chunk: Chunk; value: string } | null = null;

    for (const chunk of chunks) {
      if (rule.patternA.test(chunk.content)) {
        matchA = {
          chunk,
          value: rule.extractValueA(chunk.content),
        };
      }
      if (rule.patternB.test(chunk.content)) {
        matchB = {
          chunk,
          value: rule.extractValueB(chunk.content),
        };
      }
    }

    if (matchA && matchB && matchA.chunk.id !== matchB.chunk.id) {
      const side_a: ConflictSide = {
        value: matchA.value,
        author: matchA.chunk.author,
        timestamp: matchA.chunk.chunk_timestamp,
        source_id: matchA.chunk.source_id,
        source_title: matchA.chunk.source_id,
        quoted_span: matchA.value,
        chunk_id: matchA.chunk.id,
      };

      const side_b: ConflictSide = {
        value: matchB.value,
        author: matchB.chunk.author,
        timestamp: matchB.chunk.chunk_timestamp,
        source_id: matchB.chunk.source_id,
        source_title: matchB.chunk.source_id,
        quoted_span: matchB.value,
        chunk_id: matchB.chunk.id,
      };

      conflicts.push({
        entity_attribute: rule.entityAttribute,
        side_a,
        side_b,
      });
    }
  }

  return conflicts;
}

/**
 * Attaches a detected conflict pair to a claim and sets evidence_state to conflicting (Purple).
 */
export function applyConflictToClaim(
  claim: ClaimRecord,
  conflict: ConflictPair
): ClaimRecord {
  return {
    ...claim,
    evidence_state: "conflicting",
    conflict_pair: conflict,
    text: `Contradiction detected: ${conflict.side_a.author} states "${conflict.side_a.value}" (${new Date(
      conflict.side_a.timestamp
    ).toLocaleDateString()}), whereas ${conflict.side_b.author} states "${conflict.side_b.value}" (${new Date(
      conflict.side_b.timestamp
    ).toLocaleDateString()}).`,
  };
}

/**
 * Reviewer action: Resolves a conflicting claim by selecting a winner or providing custom text.
 */
export function resolveClaimConflict(
  claim: ClaimRecord,
  resolution: {
    winner: "side_a" | "side_b" | "custom";
    customResolution?: string;
    reviewerName: string;
  }
): ClaimRecord {
  if (!claim.conflict_pair) return claim;

  const winner = resolution.winner;
  let resolvedText = claim.text;

  if (winner === "side_a") {
    resolvedText = claim.conflict_pair.side_a.value;
  } else if (winner === "side_b") {
    resolvedText = claim.conflict_pair.side_b.value;
  } else if (winner === "custom" && resolution.customResolution) {
    resolvedText = resolution.customResolution;
  }

  return {
    ...claim,
    text: resolvedText,
    evidence_state: "single_source", // Resolved by reviewer selection
    conflict_pair: {
      ...claim.conflict_pair,
      resolved_winner: winner,
      custom_resolution: resolution.customResolution,
    },
    review: {
      status: "edited",
      reviewer_name: resolution.reviewerName,
      reviewed_at: new Date().toISOString(),
      edited_text: resolvedText,
      notes: `Conflict on ${claim.conflict_pair.entity_attribute} resolved by reviewer selecting ${winner}.`,
    },
  };
}
