/**
 * Date Freshness & Staleness Checker
 * Implements docs/PRD.md Section 5 & 7 (Trap 3) and TASKS.md TASK-014.
 *
 * Compares source and chunk timestamps against the project freshness threshold
 * (default 180 days / 6 months) to detect outdated runbooks and documentation.
 */

import type { Chunk, ClaimRecord } from "@/types/echobridge.types";

export const DEFAULT_FRESHNESS_THRESHOLD_DAYS = 180; // 6 months

/**
 * Checks whether a given ISO timestamp is older than thresholdDays.
 */
export function isDateStale(
  timestamp: string,
  thresholdDays = DEFAULT_FRESHNESS_THRESHOLD_DAYS,
  referenceDate?: string | Date
): boolean {
  if (!timestamp) return false;

  const ref = referenceDate ? new Date(referenceDate) : new Date();
  const target = new Date(timestamp);

  if (isNaN(target.getTime()) || isNaN(ref.getTime())) {
    return false;
  }

  const diffMs = ref.getTime() - target.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays > thresholdDays;
}

/**
 * Calculates the age of a timestamp in whole days.
 */
export function getDaysAgo(
  timestamp: string,
  referenceDate?: string | Date
): number {
  if (!timestamp) return 0;
  const ref = referenceDate ? new Date(referenceDate) : new Date();
  const target = new Date(timestamp);
  if (isNaN(target.getTime()) || isNaN(ref.getTime())) return 0;

  const diffMs = ref.getTime() - target.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Returns a human-friendly age string (e.g., "9 months ago", "3 days ago").
 */
export function formatDaysAgo(
  timestamp: string,
  referenceDate?: string | Date
): string {
  const days = getDaysAgo(timestamp, referenceDate);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

/**
 * Checks if a claim is supported solely by stale sources.
 * A claim is flagged as Stale (Orange) if ALL its cited supporting chunks are older
 * than thresholdDays.
 */
export function isClaimStale(
  claim: ClaimRecord,
  chunksById: Map<string, Chunk> | Record<string, Chunk>,
  thresholdDays = DEFAULT_FRESHNESS_THRESHOLD_DAYS,
  referenceDate?: string | Date
): boolean {
  if (!claim.evidence || claim.evidence.length === 0) {
    return false;
  }

  const getChunk = (id: string): Chunk | undefined => {
    if (chunksById instanceof Map) return chunksById.get(id);
    return chunksById[id];
  };

  const citedChunks: Chunk[] = [];
  for (const ev of claim.evidence) {
    const chunk = getChunk(ev.chunk_id);
    if (chunk) citedChunks.push(chunk);
  }

  if (citedChunks.length === 0) return false;

  // Stale if ALL cited chunks exceed the threshold
  return citedChunks.every((chunk) =>
    isDateStale(chunk.chunk_timestamp, thresholdDays, referenceDate)
  );
}
