import { describe, it, expect, beforeEach } from "vitest";
import {
  reconstructDraftForAudience,
  reconstructAllAudienceDrafts,
} from "@/services/trust/generator.service";
import { GET, POST } from "@/app/api/reconstruct/route";
import { NextRequest } from "next/server";
import { repository } from "@/lib/supabase/repository";

describe("Retrieve-Only Generator & /api/reconstruct (TASK-015)", () => {
  beforeEach(() => {
    // Reset repository in-memory store and re-seed default CampusConnect dataset
    repository.resetInMemoryStore(true);
  });

  describe("reconstructDraftForAudience (Team Lead View)", () => {
    it("generates Lead v1.0 draft and identifies planted traps 1, 2, 3, 5, 7", async () => {
      const result = await reconstructDraftForAudience({
        projectId: "CampusConnect",
        targetRole: "incoming_lead",
      });

      expect(result.draftVersion).toBeDefined();
      expect(result.draftVersion.version_label).toBe("v1.0");
      expect(result.draftVersion.audience_role).toBe("incoming_lead");
      expect(result.claims.length).toBeGreaterThanOrEqual(5);

      // Verify Confidence Score Breakdown
      expect(result.confidence.total_score).toBeGreaterThan(0);
      expect(result.confidence.citation_coverage).toBeGreaterThan(0.4);
      expect(result.confidence.freshness_rate).toBeGreaterThan(0);

      // Verify Planted Trap 1: Timeline Conflict (Purple CONFLICTING)
      expect(result.trapsDetected.trap1Conflict).toBe(true);
      const conflictClaim = result.claims.find((c) => c.evidence_state === "conflicting");
      expect(conflictClaim).toBeDefined();
      expect(conflictClaim?.conflict_pair).toBeDefined();
      expect(conflictClaim?.conflict_pair?.side_a.author).toBe("Maya Patel");
      expect(conflictClaim?.conflict_pair?.side_b.author).toBe("Aarav Sharma");

      // Verify Planted Trap 2: Missing Redis Rationale (Red UNSUPPORTED)
      expect(result.trapsDetected.trap2MissingRationale).toBe(true);
      const redisClaim = result.claims.find(
        (c) => c.evidence_state === "unsupported" && c.text.toLowerCase().includes("redis")
      );
      expect(redisClaim).toBeDefined();

      // Verify Planted Trap 3: Stale Runbook (Orange STALE)
      expect(result.trapsDetected.trap3StaleRunbook).toBe(true);
      const staleClaim = result.claims.find((c) => c.evidence_state === "stale");
      expect(staleClaim).toBeDefined();

      // Verify Planted Trap 5: Confidential Finance is VISIBLE to Team Lead
      const financeClaim = result.claims.find(
        (c) => c.text.toLowerCase().includes("budget") || c.text.toLowerCase().includes("sponsorship")
      );
      expect(financeClaim).toBeDefined();

      // Verify Planted Trap 7: Domain renewal gap (Red UNSUPPORTED)
      expect(result.trapsDetected.trap7DomainRenewalGap).toBe(true);
    });
  });

  describe("reconstructDraftForAudience (Intern View & Trap 5 & 8 Verification)", () => {
    it("enforces Pre-Model and Post-Generation RBAC for Intern view", async () => {
      const result = await reconstructDraftForAudience({
        projectId: "CampusConnect",
        targetRole: "incoming_intern",
        showRestrictedPlaceholders: true,
      });

      expect(result.draftVersion.audience_role).toBe("incoming_intern");

      // Trap 5 & 8 Verification:
      // Confidential finance text MUST NOT be visible anywhere in intern claims
      result.claims.forEach((claim) => {
        if (claim.evidence_state !== "restricted") {
          expect(claim.text).not.toContain("CC-TECH-401");
          expect(claim.text).not.toContain("HDFC Bank Account ending 4412");
        }
      });

      // Restricted placeholder present in Intern view
      const placeholder = result.claims.find((c) => c.evidence_state === "restricted");
      expect(placeholder).toBeDefined();
      expect(placeholder?.text).toBe("Restricted: request access");
      expect(placeholder?.evidence).toEqual([]);
    });
  });

  describe("reconstructAllAudienceDrafts", () => {
    it("creates separate versions for Lead and Intern with distinct ACL boundaries", async () => {
      const { leadDraft, internDraft } = await reconstructAllAudienceDrafts("CampusConnect");

      expect(leadDraft.draftVersion.audience_role).toBe("incoming_lead");
      expect(internDraft.draftVersion.audience_role).toBe("incoming_intern");

      // Verify lead draft has full access whereas intern draft has restricted placeholders
      const leadHasRestricted = leadDraft.claims.some((c) => c.evidence_state === "restricted");
      const internHasRestricted = internDraft.claims.some((c) => c.evidence_state === "restricted");

      expect(leadHasRestricted).toBe(false);
      expect(internHasRestricted).toBe(true);
    });
  });

  describe("API Route: /api/reconstruct", () => {
    it("POST /api/reconstruct generates drafts for both audiences", async () => {
      const req = new NextRequest("http://localhost:3000/api/reconstruct", {
        method: "POST",
        body: JSON.stringify({ projectId: "CampusConnect", audienceRole: "both" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.leadDraft).toBeDefined();
      expect(json.data.internDraft).toBeDefined();
      expect(json.data.leadDraft.confidence.total_score).toBeGreaterThan(0);
      expect(json.data.internDraft.confidence.total_score).toBeGreaterThan(0);
    });

    it("GET /api/reconstruct returns existing reconstructed drafts", async () => {
      // First generate
      await reconstructAllAudienceDrafts("CampusConnect");

      // Then fetch via GET
      const req = new NextRequest("http://localhost:3000/api/reconstruct?projectId=CampusConnect");
      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.leadDraft).toBeDefined();
      expect(json.internDraft).toBeDefined();
    });
  });
});
