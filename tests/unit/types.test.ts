import { describe, it, expect } from "vitest";
import {
  ALL_ROLES,
  AUDIENCE_ROLES,
  PERSONA_PROFILES,
  EVIDENCE_STATES,
  CONFIDENCE_WEIGHTS,
  type ClaimRecord,
  type DraftVersion,
  type Chunk,
  type AuditEvent,
  type PlantedTrapVerification,
} from "@/types/echobridge.types";

describe("EchoBridge Domain Interfaces & Types", () => {
  it("defines the 4 required system roles", () => {
    expect(ALL_ROLES).toEqual([
      "departing_member",
      "reviewer",
      "incoming_lead",
      "incoming_intern",
    ]);
  });

  it("defines the 2 audience roles for handover drafts", () => {
    expect(AUDIENCE_ROLES).toEqual(["incoming_lead", "incoming_intern"]);
  });

  it("exports complete Persona profiles for the 1-click Judge Role Switcher", () => {
    for (const role of ALL_ROLES) {
      const profile = PERSONA_PROFILES[role];
      expect(profile).toBeDefined();
      expect(profile.name.length).toBeGreaterThan(0);
      expect(profile.title.length).toBeGreaterThan(0);
      expect(profile.badge.length).toBeGreaterThan(0);
      expect(profile.description.length).toBeGreaterThan(0);
    }

    expect(PERSONA_PROFILES.departing_member.name).toBe("Aarav");
    expect(PERSONA_PROFILES.reviewer.name).toBe("Prof. Deshmukh");
    expect(PERSONA_PROFILES.incoming_lead.name).toBe("Riya");
    expect(PERSONA_PROFILES.incoming_intern.name).toBe("Kabir");
  });

  it("defines all 7 evidence states in domain type system", () => {
    expect(EVIDENCE_STATES).toHaveLength(7);
    expect(EVIDENCE_STATES).toContain("corroborated");
    expect(EVIDENCE_STATES).toContain("single_source");
    expect(EVIDENCE_STATES).toContain("attested");
    expect(EVIDENCE_STATES).toContain("stale");
    expect(EVIDENCE_STATES).toContain("conflicting");
    expect(EVIDENCE_STATES).toContain("unsupported");
    expect(EVIDENCE_STATES).toContain("restricted");
  });

  it("enforces that confidence score weights sum exactly to 1.0", () => {
    const sum =
      CONFIDENCE_WEIGHTS.citation_coverage +
      CONFIDENCE_WEIGHTS.corroboration_rate +
      CONFIDENCE_WEIGHTS.freshness_rate +
      CONFIDENCE_WEIGHTS.conflict_free_rate;

    expect(sum).toBeCloseTo(1.0, 5);
    expect(CONFIDENCE_WEIGHTS.citation_coverage).toBe(0.4);
    expect(CONFIDENCE_WEIGHTS.corroboration_rate).toBe(0.25);
    expect(CONFIDENCE_WEIGHTS.freshness_rate).toBe(0.15);
    expect(CONFIDENCE_WEIGHTS.conflict_free_rate).toBe(0.2);
  });

  it("correctly models a typed ClaimRecord with evidence and reviewer status", () => {
    const sampleClaim: ClaimRecord = {
      id: "CLM-001",
      draft_version_id: "DRAFT-001",
      project_id: "CAMPUSCONNECT",
      audience_role: "incoming_lead",
      section: "architecture",
      claim_type: "decision",
      text: "Next.js 15 App Router is used for full-stack serverless rendering.",
      evidence_state: "corroborated",
      evidence: [
        {
          chunk_id: "CHK-001",
          source_id: "SRC-001",
          source_type: "document",
          source_title: "Architecture Doc v2",
          author: "Aarav",
          evidence_timestamp: "2026-03-01T10:00:00Z",
          quoted_span: "Next.js 15 App Router is used",
          is_verbatim_verified: true,
          entailment_verdict: "supported",
        },
        {
          chunk_id: "CHK-002",
          source_id: "SRC-002",
          source_type: "git_repo",
          source_title: "Git PR #12",
          author: "Maya",
          evidence_timestamp: "2026-03-02T12:00:00Z",
          quoted_span: "Migrated to Next.js 15 App Router",
          is_verbatim_verified: true,
          entailment_verdict: "supported",
        },
      ],
      audience_acl: ["incoming_lead", "incoming_intern"],
      review: {
        status: "approved",
        reviewer_id: "USR-002",
        reviewer_name: "Prof. Deshmukh",
        reviewed_at: "2026-03-10T14:00:00Z",
      },
    };

    expect(sampleClaim.evidence).toHaveLength(2);
    expect(sampleClaim.evidence[0].author).not.toBe(sampleClaim.evidence[1].author);
    expect(sampleClaim.evidence_state).toBe("corroborated");
  });

  it("correctly models a DraftVersion and AuditEvent entity", () => {
    const sampleDraft: DraftVersion = {
      id: "DV-001",
      project_id: "CAMPUSCONNECT",
      audience_role: "incoming_lead",
      version_label: "v1.0",
      confidence: {
        total_score: 87,
        citation_coverage: 0.95,
        corroboration_rate: 0.75,
        freshness_rate: 0.9,
        conflict_rate: 0.1,
        conflict_free_rate: 0.9,
        weights: CONFIDENCE_WEIGHTS,
      },
      status: "draft",
      claims: [],
      created_at: new Date().toISOString(),
    };

    const sampleAudit: AuditEvent = {
      id: "AUD-001",
      project_id: "CAMPUSCONNECT",
      actor_role: "reviewer",
      actor_name: "Prof. Deshmukh",
      event_type: "handover_approved",
      details_json: { version: "v2.0", audience: "incoming_lead" },
      created_at: new Date().toISOString(),
    };

    expect(sampleDraft.confidence.total_score).toBe(87);
    expect(sampleAudit.event_type).toBe("handover_approved");
  });

  it("correctly models PlantedTrapVerification for CampusConnect test traps", () => {
    const trap1: PlantedTrapVerification = {
      trap_id: 1,
      name: "Chat vs. Doc Contradiction",
      description: "Registration deadline 15 Mar (chat) vs. 20 Mar (doc)",
      expected_behavior: "Flagged as Purple Conflicting side-by-side",
      status: "pending",
      target_route: "/draft",
    };

    expect(trap1.trap_id).toBe(1);
    expect(trap1.status).toBe("pending");
  });
});
