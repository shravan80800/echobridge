import { describe, it, expect } from "vitest";
import { computeConfidenceBreakdown } from "@/services/trust/confidence.service";
import {
  isDateStale,
  getDaysAgo,
  formatDaysAgo,
  isClaimStale,
} from "@/utils/date-freshness";
import {
  detectConflictsInChunks,
  applyConflictToClaim,
  resolveClaimConflict,
} from "@/services/trust/conflict.service";
import type { Chunk, ClaimRecord, EvidenceRecord } from "@/types/echobridge.types";
import { getCampusConnectSeedData } from "@/services/seed/campus-connect.seed";

describe("Confidence Heuristic, Conflict Detector & Staleness Checker (TASK-014)", () => {
  describe("Exact Confidence Score Formula Math", () => {
    it("computes 100 for perfectly verified, corroborated, fresh, and non-conflicting claims", () => {
      const perfectClaims: ClaimRecord[] = [
        {
          id: "CLM-01",
          draft_version_id: "DFT-01",
          project_id: "CampusConnect",
          audience_role: "incoming_lead",
          section: "architecture",
          claim_type: "decision",
          text: "Perfect claim 1",
          evidence_state: "corroborated",
          evidence: [
            {
              id: "EVD-01",
              claim_id: "CLM-01",
              chunk_id: "CHK-01",
              source_id: "SRC-01",
              source_type: "document",
              source_title: "Doc 1",
              author: "Aarav",
              evidence_timestamp: "2026-03-01T00:00:00Z",
              quoted_span: "quote",
              is_verbatim_verified: true,
              entailment_verdict: "supported",
            },
          ],
          audience_acl: ["incoming_lead"],
          review: { status: "pending" },
        },
      ];

      const breakdown = computeConfidenceBreakdown(perfectClaims);
      expect(breakdown.citation_coverage).toBe(1.0);
      expect(breakdown.corroboration_rate).toBe(1.0);
      expect(breakdown.freshness_rate).toBe(1.0);
      expect(breakdown.conflict_rate).toBe(0.0);
      expect(breakdown.conflict_free_rate).toBe(1.0);
      expect(breakdown.total_score).toBe(100);
    });

    it("accurately verifies formula: 100 * (0.40 * 0.8 + 0.25 * 0.6 + 0.15 * 0.8 + 0.20 * 0.9) = 77", () => {
      // 10 claims:
      // 8 have citations (coverage = 0.8)
      // 6 are corroborated (corroboration = 0.6)
      // 8 are fresh / 2 stale (freshness = 0.8)
      // 1 is conflicting (conflict = 0.1, conflict_free = 0.9)
      const claims: ClaimRecord[] = [];
      for (let i = 0; i < 10; i++) {
        let state: any = "single_source";
        if (i < 6) state = "corroborated";
        else if (i === 6) state = "single_source";
        else if (i === 7) state = "stale";
        else if (i === 8) state = "stale";
        else if (i === 9) state = "conflicting";

        const hasCitation = i < 8;

        claims.push({
          id: `CLM-MATH-${i}`,
          draft_version_id: "DFT-01",
          project_id: "CampusConnect",
          audience_role: "incoming_lead",
          section: "architecture",
          claim_type: "decision",
          text: `Math test claim ${i}`,
          evidence_state: state,
          evidence: hasCitation
            ? [
                {
                  id: `EVD-${i}`,
                  claim_id: `CLM-MATH-${i}`,
                  chunk_id: "CHK-01",
                  source_id: "SRC-01",
                  source_type: "document",
                  source_title: "Doc 1",
                  author: "Author",
                  evidence_timestamp: "2026-03-01T00:00:00Z",
                  quoted_span: "quote",
                  is_verbatim_verified: true,
                  entailment_verdict: "supported",
                },
              ]
            : [],
          audience_acl: ["incoming_lead"],
          review: { status: "pending" },
        });
      }

      const breakdown = computeConfidenceBreakdown(claims);
      expect(breakdown.citation_coverage).toBe(0.8);
      expect(breakdown.corroboration_rate).toBe(0.6);
      expect(breakdown.freshness_rate).toBe(0.8);
      expect(breakdown.conflict_rate).toBe(0.1);
      expect(breakdown.conflict_free_rate).toBe(0.9);
      expect(breakdown.total_score).toBe(77);
    });

    it("returns 0 score when claims list is empty", () => {
      const breakdown = computeConfidenceBreakdown([]);
      expect(breakdown.total_score).toBe(0);
      expect(breakdown.citation_coverage).toBe(0);
    });
  });

  describe("Date Freshness & Staleness Checker (Trap 3 Verification)", () => {
    const referenceDate = new Date("2026-03-15T00:00:00Z");

    it("flags Planted Trap 3 (Deployment Runbook 9 months old) as stale", () => {
      // 9 months prior to March 2026: June 1, 2025
      const staleTimestamp = "2025-06-01T08:00:00Z";
      expect(isDateStale(staleTimestamp, 180, referenceDate)).toBe(true);
      expect(getDaysAgo(staleTimestamp, referenceDate)).toBeGreaterThan(270);
      expect(formatDaysAgo(staleTimestamp, referenceDate)).toContain("months ago");
    });

    it("confirms recent docs (under 180 days) are fresh", () => {
      const freshTimestamp = "2026-03-01T10:00:00Z";
      expect(isDateStale(freshTimestamp, 180, referenceDate)).toBe(false);
      expect(getDaysAgo(freshTimestamp, referenceDate)).toBeLessThan(30);
    });

    it("isClaimStale flags claim when all supporting chunks are outdated", () => {
      const staleChunk: Chunk = {
        id: "CHK-06",
        project_id: "CampusConnect",
        source_id: "SRC-RUNBOOK-05",
        content: "Worker Maintenance manual restart script",
        author: "Aarav Sharma",
        chunk_timestamp: "2025-06-01T08:00:00Z",
        allowed_roles: ["incoming_lead", "incoming_intern"],
        injection_flagged: false,
        redaction_count: 0,
      };

      const claim: ClaimRecord = {
        id: "CLM-STALE",
        draft_version_id: "DFT-01",
        project_id: "CampusConnect",
        audience_role: "incoming_lead",
        section: "tasks_dependencies",
        claim_type: "next_action",
        text: "Worker service must be restarted manually.",
        evidence_state: "stale",
        evidence: [
          {
            id: "EVD-06",
            claim_id: "CLM-STALE",
            chunk_id: "CHK-06",
            source_id: "SRC-RUNBOOK-05",
            source_type: "runbook",
            source_title: "Deployment_Runbook.md",
            author: "Aarav Sharma",
            evidence_timestamp: "2025-06-01T08:00:00Z",
            quoted_span: "Worker Maintenance",
            is_verbatim_verified: true,
            entailment_verdict: "supported",
          },
        ],
        audience_acl: ["incoming_lead"],
        review: { status: "pending" },
      };

      const chunksMap = new Map([["CHK-06", staleChunk]]);
      expect(isClaimStale(claim, chunksMap, 180, referenceDate)).toBe(true);
    });
  });

  describe("Conflict Detector & Resolution (Trap 1 Verification)", () => {
    it("detects Planted Trap 1 (March 15 vs. March 20 registration deadline)", () => {
      const seed = getCampusConnectSeedData();
      const conflicts = detectConflictsInChunks(seed.chunks);

      expect(conflicts.length).toBeGreaterThanOrEqual(1);
      const timelineConflict = conflicts.find(
        (c) => c.entity_attribute === "event_registration_deadline"
      );

      expect(timelineConflict).toBeDefined();
      expect(timelineConflict!.side_a.author).toBe("Maya Patel");
      expect(timelineConflict!.side_a.quoted_span).toContain("March 15th");
      expect(timelineConflict!.side_b.author).toBe("Aarav Sharma");
      expect(timelineConflict!.side_b.quoted_span).toContain("March 20th");
    });

    it("applies conflict to claim and sets evidence_state to conflicting (Purple)", () => {
      const seed = getCampusConnectSeedData();
      const conflict = detectConflictsInChunks(seed.chunks)[0];

      const rawClaim: ClaimRecord = {
        id: "CLM-CONF",
        draft_version_id: "DFT-01",
        project_id: "CampusConnect",
        audience_role: "incoming_lead",
        section: "decisions",
        claim_type: "decision",
        text: "Event registration deadline",
        evidence_state: "single_source",
        evidence: [],
        audience_acl: ["incoming_lead"],
        review: { status: "pending" },
      };

      const conflictingClaim = applyConflictToClaim(rawClaim, conflict);
      expect(conflictingClaim.evidence_state).toBe("conflicting");
      expect(conflictingClaim.conflict_pair).toBeDefined();
      expect(conflictingClaim.text).toContain("Contradiction detected");
    });

    it("resolves conflict upon Reviewer decision selection", () => {
      const seed = getCampusConnectSeedData();
      const conflict = detectConflictsInChunks(seed.chunks)[0];

      const rawClaim: ClaimRecord = {
        id: "CLM-CONF",
        draft_version_id: "DFT-01",
        project_id: "CampusConnect",
        audience_role: "incoming_lead",
        section: "decisions",
        claim_type: "decision",
        text: "Contradiction detected...",
        evidence_state: "conflicting",
        conflict_pair: conflict,
        evidence: [],
        audience_acl: ["incoming_lead"],
        review: { status: "pending" },
      };

      // Reviewer resolves choosing Side B (March 20)
      const resolved = resolveClaimConflict(rawClaim, {
        winner: "side_b",
        reviewerName: "Prof. Deshmukh",
      });

      expect(resolved.evidence_state).toBe("single_source");
      expect(resolved.text).toContain("March 20th");
      expect(resolved.conflict_pair?.resolved_winner).toBe("side_b");
      expect(resolved.review.status).toBe("edited");
      expect(resolved.review.reviewer_name).toBe("Prof. Deshmukh");
    });
  });
});
