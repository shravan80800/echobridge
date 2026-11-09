import { describe, it, expect, beforeEach } from "vitest";
import {
  filterChunksForAudience,
  computeClaimAudienceAcl,
  enforcePostGenerationGuard,
  canApproveHandover,
} from "@/services/trust/rbac.service";
import type { Chunk, ClaimRecord } from "@/types/echobridge.types";
import { repository } from "@/lib/supabase/repository";
import { getCampusConnectSeedData } from "@/services/seed/campus-connect.seed";

describe("RBAC & Audience Isolation Guards (TASK-012 / Trap 5 & 8)", () => {
  let seedChunks: Chunk[];
  let chunksById: Map<string, Chunk>;

  beforeEach(() => {
    repository.resetInMemoryStore(false);
    const seed = getCampusConnectSeedData();
    seedChunks = seed.chunks;
    chunksById = new Map(seedChunks.map((c) => [c.id, c]));
  });

  describe("filterChunksForAudience (Barrier 1 — Pre-Model Filtering / Trap 5)", () => {
    it("returns all chunks including confidential finance folder for incoming_lead", () => {
      const leadChunks = filterChunksForAudience(seedChunks, "incoming_lead");

      expect(leadChunks.length).toBe(10);
      const financeChunk = leadChunks.find((c) => c.id === "CHK-08");
      expect(financeChunk).toBeDefined();
      expect(financeChunk?.content).toContain("sponsorship budget");
    });

    it("strictly excludes confidential finance folder from incoming_intern (Trap 5)", () => {
      const internChunks = filterChunksForAudience(seedChunks, "incoming_intern");

      expect(internChunks.length).toBe(9);
      const financeChunk = internChunks.find((c) => c.id === "CHK-08");
      // Trap 5: Finance chunk MUST NOT enter Intern retrieval
      expect(financeChunk).toBeUndefined();

      // Verify all returned chunks permit incoming_intern
      internChunks.forEach((chunk) => {
        expect(chunk.allowed_roles).toContain("incoming_intern");
      });
    });
  });

  describe("computeClaimAudienceAcl", () => {
    it("computes strict intersection when mixing public and restricted chunks", () => {
      // CHK-01 (public: lead + intern) + CHK-08 (restricted: lead only)
      const acl = computeClaimAudienceAcl(["CHK-01", "CHK-08"], chunksById);
      expect(acl).toEqual(["incoming_lead"]);
      expect(acl.includes("incoming_intern")).toBe(false);
    });

    it("returns lead + intern when all cited chunks are public", () => {
      // CHK-01 and CHK-03 are both public
      const acl = computeClaimAudienceAcl(["CHK-01", "CHK-03"], chunksById);
      expect(acl).toEqual(["incoming_lead", "incoming_intern"]);
    });

    it("returns default open scope for ungrounded claims", () => {
      const acl = computeClaimAudienceAcl([], chunksById);
      expect(acl).toEqual(["incoming_lead", "incoming_intern"]);
    });
  });

  describe("enforcePostGenerationGuard (Barrier 2 — Post-Generation Guard / Trap 8)", () => {
    it("allows purely public claims through to incoming_intern", async () => {
      const publicClaim: ClaimRecord = {
        id: "CLM-PUB-01",
        draft_version_id: "DFT-INT-1.0",
        project_id: "CampusConnect",
        audience_role: "incoming_intern",
        section: "architecture",
        claim_type: "decision",
        text: "Next.js 15 App Router handles all web frontend and server routes.",
        evidence_state: "corroborated",
        evidence: [
          {
            id: "EVD-01",
            claim_id: "CLM-PUB-01",
            chunk_id: "CHK-01",
            source_id: "SRC-ARCH-01",
            source_type: "document",
            source_title: "Architecture_Overview.md",
            author: "Aarav Sharma",
            evidence_timestamp: "2026-03-01T10:00:00Z",
            quoted_span: "Next.js 15 App Router handles frontend and API routes",
            is_verbatim_verified: true,
            entailment_verdict: "supported",
          },
        ],
        audience_acl: ["incoming_lead", "incoming_intern"],
        review: { status: "pending" },
      };

      const result = await enforcePostGenerationGuard({
        claims: [publicClaim],
        chunksById,
        targetRole: "incoming_intern",
      });

      expect(result.droppedClaimsCount).toBe(0);
      expect(result.placeholderCount).toBe(0);
      expect(result.filteredClaims).toHaveLength(1);
      expect(result.filteredClaims[0].text).toBe(publicClaim.text);
    });

    it("drops Trap 8 mixed claim from incoming_intern and emits zero-leak placeholder", async () => {
      // Trap 8: Claim blends public architecture doc with restricted finance note
      const mixedClaim: ClaimRecord = {
        id: "CLM-MIXED-TRAP-08",
        draft_version_id: "DFT-INT-1.0",
        project_id: "CampusConnect",
        audience_role: "incoming_intern",
        section: "architecture",
        claim_type: "decision",
        text: "Supabase Pro is funded under account line CC-TECH-401 for vector search.",
        evidence_state: "corroborated",
        evidence: [
          {
            id: "EVD-MIX-01",
            claim_id: "CLM-MIXED-TRAP-08",
            chunk_id: "CHK-10", // Public Supabase doc
            source_id: "SRC-ARCH-01",
            source_type: "document",
            source_title: "Architecture_Overview.md",
            author: "Aarav Sharma",
            evidence_timestamp: "2026-03-01T10:00:00Z",
            quoted_span: "Database Layer: Supabase PostgreSQL with pgvector",
            is_verbatim_verified: true,
            entailment_verdict: "supported",
          },
          {
            id: "EVD-MIX-02",
            claim_id: "CLM-MIXED-TRAP-08",
            chunk_id: "CHK-08", // RESTRICTED Finance folder (Lead-only)
            source_id: "SRC-FIN-06",
            source_type: "finance_folder",
            source_title: "Finance/Sponsorship_Budget_2025-26.md",
            author: "Prof. Deshmukh",
            evidence_timestamp: "2026-02-15T11:00:00Z",
            quoted_span: "funded under account line CC-TECH-401",
            is_verbatim_verified: true,
            entailment_verdict: "supported",
          },
        ],
        audience_acl: ["incoming_lead"], // Restricted!
        review: { status: "pending" },
      };

      const result = await enforcePostGenerationGuard({
        claims: [mixedClaim],
        chunksById,
        targetRole: "incoming_intern",
        showRestrictedPlaceholders: true,
      });

      expect(result.droppedClaimsCount).toBe(1);
      expect(result.placeholderCount).toBe(1);
      expect(result.filteredClaims).toHaveLength(1);

      const placeholder = result.filteredClaims[0];
      expect(placeholder.evidence_state).toBe("restricted");
      expect(placeholder.text).toBe("Restricted: request access");
      // Zero-leak check: no topic, title, source, or evidence leaked
      expect(placeholder.evidence).toEqual([]);
      expect(placeholder.text).not.toContain("Supabase");
      expect(placeholder.text).not.toContain("CC-TECH-401");
      expect(placeholder.text).not.toContain("Finance");

      // Verify access_denied_guard audit event logged
      const auditTrail = await repository.listAuditEvents("CampusConnect");
      expect(auditTrail.some((e) => e.event_type === "access_denied_guard")).toBe(true);
    });

    it("preserves Trap 8 mixed claim in incoming_lead view without placeholder", async () => {
      const mixedClaim: ClaimRecord = {
        id: "CLM-MIXED-TRAP-08",
        draft_version_id: "DFT-LEAD-1.0",
        project_id: "CampusConnect",
        audience_role: "incoming_lead",
        section: "architecture",
        claim_type: "decision",
        text: "Supabase Pro is funded under account line CC-TECH-401 for vector search.",
        evidence_state: "corroborated",
        evidence: [
          {
            id: "EVD-MIX-01",
            claim_id: "CLM-MIXED-TRAP-08",
            chunk_id: "CHK-10",
            source_id: "SRC-ARCH-01",
            source_type: "document",
            source_title: "Architecture_Overview.md",
            author: "Aarav Sharma",
            evidence_timestamp: "2026-03-01T10:00:00Z",
            quoted_span: "Database Layer: Supabase PostgreSQL",
            is_verbatim_verified: true,
            entailment_verdict: "supported",
          },
          {
            id: "EVD-MIX-02",
            claim_id: "CLM-MIXED-TRAP-08",
            chunk_id: "CHK-08",
            source_id: "SRC-FIN-06",
            source_type: "finance_folder",
            source_title: "Finance/Sponsorship_Budget_2025-26.md",
            author: "Prof. Deshmukh",
            evidence_timestamp: "2026-02-15T11:00:00Z",
            quoted_span: "funded under account line CC-TECH-401",
            is_verbatim_verified: true,
            entailment_verdict: "supported",
          },
        ],
        audience_acl: ["incoming_lead"],
        review: { status: "pending" },
      };

      const result = await enforcePostGenerationGuard({
        claims: [mixedClaim],
        chunksById,
        targetRole: "incoming_lead",
      });

      expect(result.droppedClaimsCount).toBe(0);
      expect(result.placeholderCount).toBe(0);
      expect(result.filteredClaims[0].text).toContain("CC-TECH-401");
    });
  });

  describe("canApproveHandover (Separation of Duties)", () => {
    it("only permits reviewer to approve handovers; blocks departing member", () => {
      expect(canApproveHandover("reviewer")).toBe(true);
      expect(canApproveHandover("departing_member")).toBe(false);
      expect(canApproveHandover("incoming_lead")).toBe(false);
      expect(canApproveHandover("incoming_intern")).toBe(false);
    });
  });
});
