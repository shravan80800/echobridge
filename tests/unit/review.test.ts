import { describe, it, expect, beforeEach } from "vitest";
import {
  reviewClaim,
  resolveConflict,
  approveHandover,
  computeVersionDiff,
  getReviewDashboardData,
  ReviewAuthorizationError,
} from "@/services/workflow/review.service";
import { GET, POST } from "@/app/api/review/route";
import { NextRequest } from "next/server";
import { repository } from "@/lib/supabase/repository";
import { getCampusConnectSeedData } from "@/services/seed/campus-connect.seed";

describe("Review & Version Diff Service + /api/review (TASK-019 / ADR-007)", () => {
  beforeEach(() => {
    // Re-seed benchmark store
    repository.resetInMemoryStore(true);
  });

  describe("Separation of Duties (ADR-007)", () => {
    it("strictly blocks departing_member from approving claims (403 Forbidden)", async () => {
      await expect(
        reviewClaim({
          claimId: "CLM-001",
          action: "approved",
          actorRole: "departing_member", // Forbidden!
          reviewerName: "Aarav Sharma",
        })
      ).rejects.toThrow(ReviewAuthorizationError);
    });

    it("strictly blocks departing_member from resolving conflicts (403 Forbidden)", async () => {
      await expect(
        resolveConflict({
          claimId: "CLM-TRAP-1",
          winningSide: "side_b",
          actorRole: "departing_member", // Forbidden!
          reviewerName: "Aarav Sharma",
        })
      ).rejects.toThrow(ReviewAuthorizationError);
    });

    it("strictly blocks departing_member from approving final handover (403 Forbidden)", async () => {
      await expect(
        approveHandover({
          actorRole: "departing_member", // Forbidden!
          reviewerName: "Aarav Sharma",
          audienceRole: "incoming_lead",
        })
      ).rejects.toThrow(ReviewAuthorizationError);
    });
  });

  describe("Claim-Level Review Mutations (Reviewer Authority)", () => {
    it("approves a claim and records reviewer metadata", async () => {
      const claim = await reviewClaim({
        claimId: "CLM-001",
        action: "approved",
        actorRole: "reviewer",
        reviewerName: "Prof. Deshmukh",
        projectId: "CampusConnect",
        audienceRole: "incoming_lead",
      });

      expect(claim.review.status).toBe("approved");
      expect(claim.review.reviewer_name).toBe("Prof. Deshmukh");
      expect(claim.review.reviewed_at).toBeDefined();

      const auditTrail = await repository.listAuditEvents("CampusConnect");
      expect(auditTrail.some((e) => e.event_type === "claim_reviewed")).toBe(true);
    });

    it("edits claim text and updates review status to 'edited'", async () => {
      const edited = "CampusConnect is architected on Next.js 15 App Router with full Server Actions support.";

      const claim = await reviewClaim({
        claimId: "CLM-001",
        action: "edited",
        editedText: edited,
        actorRole: "reviewer",
        reviewerName: "Prof. Deshmukh",
        projectId: "CampusConnect",
        audienceRole: "incoming_lead",
      });

      expect(claim.review.status).toBe("edited");
      expect(claim.text).toBe(edited);
      expect(claim.review.edited_text).toBe(edited);
    });

    it("redacts sensitive detail, replacing text with [REDACTED BY REVIEWER]", async () => {
      const claim = await reviewClaim({
        claimId: "CLM-001",
        action: "redacted",
        actorRole: "reviewer",
        reviewerName: "Prof. Deshmukh",
        notes: "Redacted internal infrastructure detail",
        projectId: "CampusConnect",
        audienceRole: "incoming_lead",
      });

      expect(claim.review.status).toBe("redacted");
      expect(claim.text).toBe("[REDACTED BY REVIEWER]");
      expect(claim.evidence_state).toBe("restricted");
    });
  });

  describe("Conflict Resolution (Trap 1: March 15 vs. March 20)", () => {
    it("resolves Trap 1 in favour of planning document date (March 20th)", async () => {
      const resolved = await resolveConflict({
        claimId: "CLM-TRAP-1",
        winningSide: "side_b",
        actorRole: "reviewer",
        reviewerName: "Prof. Deshmukh",
        projectId: "CampusConnect",
        audienceRole: "incoming_lead",
      });

      // 1. Text updated to March 20th
      expect(resolved.text).toContain("March 20th");

      // 2. State transitioned from conflicting -> corroborated
      expect(resolved.evidence_state).toBe("corroborated");

      // 3. Conflict pair records resolution
      expect(resolved.conflict_pair?.resolved_winner).toBe("side_b");
      expect(resolved.review.status).toBe("approved");
    });
  });

  describe("Version Diff Generator (computeVersionDiff)", () => {
    it("calculates accurate semantic diff between v1.0 and v1.1", () => {
      const seed = getCampusConnectSeedData();
      const v1_0 = seed.drafts.find(
        (d) => d.audience_role === "incoming_lead" && d.version_label === "v1.0"
      )!;
      const v1_1 = seed.drafts.find(
        (d) => d.audience_role === "incoming_lead" && d.version_label === "v1.1"
      )!;

      const diff = computeVersionDiff(v1_0, v1_1);

      expect(diff.fromVersion).toBe("v1.0");
      expect(diff.toVersion).toBe("v1.1");
      expect(diff.modifiedCount).toBeGreaterThanOrEqual(1);

      // Verify Trap 2 (Redis claim) was modified from unsupported -> attested
      const redisDiff = diff.items.find((i) => i.claimId.includes("TRAP-2"));
      expect(redisDiff).toBeDefined();
      expect(redisDiff?.changeType).toBe("modified");
      expect(redisDiff?.stateDiff?.oldState).toBe("unsupported");
      expect(redisDiff?.stateDiff?.newState).toBe("attested");
    });

    it("calculates accurate semantic diff between v1.1 and v2.0", () => {
      const seed = getCampusConnectSeedData();
      const v1_1 = seed.drafts.find(
        (d) => d.audience_role === "incoming_lead" && d.version_label === "v1.1"
      )!;
      const v2_0 = seed.drafts.find(
        (d) => d.audience_role === "incoming_lead" && d.version_label === "v2.0"
      )!;

      const diff = computeVersionDiff(v1_1, v2_0);

      expect(diff.fromVersion).toBe("v1.1");
      expect(diff.toVersion).toBe("v2.0");

      // Verify Trap 1 was modified from conflicting -> corroborated
      const conflictDiff = diff.items.find((i) => i.claimId.includes("TRAP-1"));
      expect(conflictDiff).toBeDefined();
      expect(conflictDiff?.changeType).toBe("modified");
      expect(conflictDiff?.stateDiff?.oldState).toBe("conflicting");
      expect(conflictDiff?.stateDiff?.newState).toBe("corroborated");
    });
  });

  describe("Final Handover Approval (approveHandover)", () => {
    it("publishes DraftVersion v2.0 with status 'approved'", async () => {
      const result = await approveHandover({
        actorRole: "reviewer",
        reviewerName: "Prof. Deshmukh",
        projectId: "CampusConnect",
        audienceRole: "incoming_lead",
      });

      expect(result.draftV2_0.version_label).toBe("v2.0");
      expect(result.draftV2_0.status).toBe("approved");
      expect(result.draftV2_0.confidence.total_score).toBeGreaterThanOrEqual(75);

      // Verify audit event
      const auditTrail = await repository.listAuditEvents("CampusConnect");
      expect(auditTrail.some((e) => e.event_type === "handover_approved")).toBe(true);
    });
  });

  describe("API Route: /api/review", () => {
    it("GET /api/review returns draft versions and diff summary", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/review?projectId=CampusConnect&role=incoming_lead&fromVersion=v1.0&toVersion=v1.1"
      );
      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.drafts.length).toBeGreaterThanOrEqual(2);
      expect(json.diff).toBeDefined();
      expect(json.diff.fromVersion).toBe("v1.0");
      expect(json.diff.toVersion).toBe("v1.1");
    });

    it("POST /api/review returns 403 Forbidden when departing_member attempts review", async () => {
      const req = new NextRequest("http://localhost:3000/api/review", {
        method: "POST",
        body: JSON.stringify({
          action: "review_claim",
          claimId: "CLM-001",
          reviewAction: "approved",
          actorRole: "departing_member", // Unauthorized!
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.errorType).toBe("SEPARATION_OF_DUTIES_VIOLATION");
    });

    it("POST /api/review resolves conflict when reviewer submits decision", async () => {
      const req = new NextRequest("http://localhost:3000/api/review", {
        method: "POST",
        body: JSON.stringify({
          action: "resolve_conflict",
          claimId: "CLM-TRAP-1",
          winningSide: "side_b",
          actorRole: "reviewer",
          reviewerName: "Prof. Deshmukh",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.claim.evidence_state).toBe("corroborated");
    });
  });
});
