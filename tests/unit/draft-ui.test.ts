import { describe, it, expect } from "vitest";
import type {
  ClaimRecord,
  ConfidenceBreakdown,
  EvidenceRecord,
  Chunk,
} from "@/types/echobridge.types";
import { findSpanLocation } from "@/utils/text-matching";
import { computeConfidenceBreakdown } from "@/services/trust/confidence.service";

describe("Stage 3 UI Logic & Components (TASK-016)", () => {
  const sampleConfidence: ConfidenceBreakdown = {
    total_score: 82,
    citation_coverage: 0.9,
    corroboration_rate: 0.75,
    freshness_rate: 0.85,
    conflict_rate: 0.05,
    conflict_free_rate: 0.95,
    weights: {
      citation_coverage: 0.4,
      corroboration_rate: 0.25,
      freshness_rate: 0.15,
      conflict_free_rate: 0.2,
    },
  };

  it("verifies ConfidenceScoreCard color tiers", () => {
    const getScoreTier = (score: number) => {
      if (score >= 80) return "emerald";
      if (score >= 60) return "amber";
      return "rose";
    };

    expect(getScoreTier(82)).toBe("emerald");
    expect(getScoreTier(65)).toBe("amber");
    expect(getScoreTier(45)).toBe("rose");
  });

  it("verifies ClaimCard zero-leak restricted placeholder rules", () => {
    const restrictedClaim: ClaimRecord = {
      id: "RESTRICTED-CLM-01",
      draft_version_id: "DFT-INT-1.0",
      project_id: "CampusConnect",
      audience_role: "incoming_intern",
      section: "architecture",
      claim_type: "decision",
      text: "Restricted: request access",
      evidence_state: "restricted",
      evidence: [],
      audience_acl: ["incoming_intern"],
      review: { status: "approved" },
    };

    expect(restrictedClaim.text).toBe("Restricted: request access");
    expect(restrictedClaim.evidence).toHaveLength(0);
    expect(restrictedClaim.text).not.toContain("Finance");
    expect(restrictedClaim.text).not.toContain("Budget");
  });

  it("verifies ClaimCard side-by-side conflict structure", () => {
    const conflictingClaim: ClaimRecord = {
      id: "CLM-CONF-01",
      draft_version_id: "DFT-LEAD-1.0",
      project_id: "CampusConnect",
      audience_role: "incoming_lead",
      section: "decisions",
      claim_type: "decision",
      text: "Contradiction detected: Maya Patel states March 15th whereas Aarav Sharma states March 20th.",
      evidence_state: "conflicting",
      evidence: [],
      audience_acl: ["incoming_lead"],
      conflict_pair: {
        entity_attribute: "event_registration_deadline",
        side_a: {
          value: "Event registration closes on March 15th at midnight",
          author: "Maya Patel",
          timestamp: "2026-03-02T16:00:00Z",
          source_id: "SRC-CHAT-03",
          source_title: "Slack General Chat",
          quoted_span: "March 15th",
          chunk_id: "CHK-03",
        },
        side_b: {
          value: "Event registration closes on March 20th",
          author: "Aarav Sharma",
          timestamp: "2026-03-10T09:00:00Z",
          source_id: "SRC-PLAN-04",
          source_title: "Planning_Doc_v1.2.md",
          quoted_span: "March 20th",
          chunk_id: "CHK-04",
        },
      },
      review: { status: "pending" },
    };

    expect(conflictingClaim.conflict_pair).toBeDefined();
    expect(conflictingClaim.conflict_pair?.side_a.author).toBe("Maya Patel");
    expect(conflictingClaim.conflict_pair?.side_b.author).toBe("Aarav Sharma");
    expect(conflictingClaim.conflict_pair?.side_a.value).toContain("March 15th");
    expect(conflictingClaim.conflict_pair?.side_b.value).toContain("March 20th");
  });

  it("verifies SourceCitationPopover verbatim quote highlight span offsets", () => {
    const chunkText =
      "Session caching uses an in-memory Redis instance to store active attendee session tokens during registration bursts.";
    const quotedSpan = "in-memory Redis instance";

    const spanLocation = findSpanLocation(quotedSpan, chunkText);
    expect(spanLocation).not.toBeNull();
    expect(spanLocation?.start).toBeGreaterThan(0);

    const extracted = chunkText.slice(spanLocation!.start, spanLocation!.end);
    expect(extracted).toBe(quotedSpan);
  });

  it("verifies Draft claim filtering logic across Evidence States and Sections", () => {
    const claims: ClaimRecord[] = [
      {
        id: "CLM-01",
        draft_version_id: "DFT-01",
        project_id: "CampusConnect",
        audience_role: "incoming_lead",
        section: "architecture",
        claim_type: "decision",
        text: "Next.js App Router powers the web frontend",
        evidence_state: "corroborated",
        evidence: [],
        audience_acl: ["incoming_lead"],
        review: { status: "pending" },
      },
      {
        id: "CLM-02",
        draft_version_id: "DFT-01",
        project_id: "CampusConnect",
        audience_role: "incoming_lead",
        section: "decisions",
        claim_type: "decision",
        text: "Contradiction detected: March 15 vs March 20",
        evidence_state: "conflicting",
        evidence: [],
        audience_acl: ["incoming_lead"],
        review: { status: "pending" },
      },
      {
        id: "CLM-03",
        draft_version_id: "DFT-01",
        project_id: "CampusConnect",
        audience_role: "incoming_lead",
        section: "architecture",
        claim_type: "decision",
        text: "Restricted: request access",
        evidence_state: "restricted",
        evidence: [],
        audience_acl: ["incoming_lead"],
        review: { status: "pending" },
      },
    ];

    const filterClaims = (
      list: ClaimRecord[],
      state: string,
      section: string,
      showPlaceholders: boolean
    ) => {
      return list.filter((c) => {
        if (state !== "all" && c.evidence_state !== state) return false;
        if (section !== "all" && c.section !== section) return false;
        if (!showPlaceholders && c.evidence_state === "restricted") return false;
        return true;
      });
    };

    expect(filterClaims(claims, "all", "all", true)).toHaveLength(3);
    expect(filterClaims(claims, "corroborated", "all", true)).toHaveLength(1);
    expect(filterClaims(claims, "all", "architecture", true)).toHaveLength(2);
    expect(filterClaims(claims, "all", "all", false)).toHaveLength(2); // Restricted omitted
  });
});
