import { describe, it, expect, beforeEach } from "vitest";
import {
  getOrGenerateGapQuestions,
  submitGapAnswer,
  simulateSuddenExit,
  getGapInterviewProgress,
} from "@/services/workflow/interview.service";
import { GET, POST } from "@/app/api/gap-interview/route";
import { NextRequest } from "next/server";
import { repository } from "@/lib/supabase/repository";

describe("Gap-Interview Service & API (TASK-017 / Trap 2 & 7)", () => {
  beforeEach(() => {
    // Reset in-memory store and re-seed default CampusConnect data
    repository.resetInMemoryStore(true);
  });

  describe("getOrGenerateGapQuestions", () => {
    it("returns targeted gap questions for CampusConnect", async () => {
      const questions = await getOrGenerateGapQuestions("CampusConnect", "incoming_lead");

      expect(questions.length).toBeGreaterThanOrEqual(2);

      // Verify Trap 2: Redis choice rationale question
      const redisQ = questions.find((q) => q.question_text.includes("Redis"));
      expect(redisQ).toBeDefined();
      expect(redisQ?.planted_trap_id).toBe(2);

      // Verify Trap 7: Domain renewal ownership question
      const domainQ = questions.find((q) => q.question_text.includes("domain"));
      expect(domainQ).toBeDefined();
      expect(domainQ?.planted_trap_id).toBe(7);
    });
  });

  describe("submitGapAnswer & Trap 2 Verification (Red -> Blue Attested)", () => {
    it("records departing member answer with direct ID GAP-TRAP-2, transitions claim to Attested (Blue), and creates v1.1", async () => {
      const answer =
        "Redis was selected specifically because during the 2025 spring hackathon surge, PostgreSQL session queries hit max pool limits, causing 504 errors.";

      const result = await submitGapAnswer({
        questionId: "GAP-TRAP-2",
        answerText: answer,
        answeredBy: "Aarav Sharma (Departing Lead)",
        projectId: "CampusConnect",
        audienceRole: "incoming_lead",
      });

      // 1. Question status updated
      expect(result.question.status).toBe("answered");
      expect(result.question.answer_text).toBe(answer);
      expect(result.question.answered_by).toContain("Aarav Sharma");
      expect(result.question.answered_at).toBeDefined();

      // 2. Linked claim transitioned to Attested (Blue) - ADR-006 & Trap 2 Verified!
      expect(result.updatedClaim).not.toBeNull();
      expect(result.updatedClaim?.evidence_state).toBe("attested"); // Blue!
      expect(result.updatedClaim?.text).toContain(answer);

      // 3. Draft v1.1 created with updated Confidence Score
      expect(result.draftVersionV1_1.version_label).toBe("v1.1");
      expect(result.draftVersionV1_1.status).toBe("gap_interview_complete");
      expect(result.draftVersionV1_1.confidence.total_score).toBeGreaterThan(0);

      // 4. Audit trail records gap_answered event
      const auditTrail = await repository.listAuditEvents("CampusConnect");
      expect(auditTrail.some((e) => e.event_type === "gap_answered")).toBe(true);
    });

    it("also supports alias GAP-Q-01 matching Trap 2 seamlessly", async () => {
      const result = await submitGapAnswer({
        questionId: "GAP-Q-01",
        answerText: "Postgres pool was exhausted during the spring rush.",
        answeredBy: "Aarav Sharma",
      });
      expect(result.question.status).toBe("answered");
      expect(result.question.planted_trap_id).toBe(2);
      expect(result.updatedClaim?.evidence_state).toBe("attested");
    });
  });

  describe("simulateSuddenExit (Safety Fallback Routing)", () => {
    it("leaves unanswered gaps as Red Unsupported and assigns named fallback contact", async () => {
      const fallbackContact = "Prof. Deshmukh (Faculty Mentor, CS Dept)";

      const result = await simulateSuddenExit({
        projectId: "CampusConnect",
        assignedFallbackContact: fallbackContact,
        audienceRole: "incoming_lead",
      });

      // Verify all pending questions are marked skipped_sudden_exit
      expect(
        result.questions.some((q) => q.status === "skipped_sudden_exit")
      ).toBe(true);

      const skippedQ = result.questions.find(
        (q) => q.status === "skipped_sudden_exit"
      );
      expect(skippedQ?.assigned_contact_if_unanswered).toBe(fallbackContact);

      // Verify v1.1 draft preserves red gaps with fallback contact note
      const v1_1 = result.draftVersionV1_1;
      const redGaps = v1_1.claims.filter((c) => c.evidence_state === "unsupported");
      expect(redGaps.length).toBeGreaterThan(0);
      expect(redGaps[0].text).toContain(fallbackContact);
    });
  });

  describe("API Route: /api/gap-interview", () => {
    it("GET /api/gap-interview returns questions and progress KPIs", async () => {
      const req = new NextRequest("http://localhost:3000/api/gap-interview?projectId=CampusConnect");
      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.totalQuestions).toBeGreaterThanOrEqual(2);
      expect(json.questions).toBeDefined();
    });

    it("POST /api/gap-interview records answer via HTTP", async () => {
      const req = new NextRequest("http://localhost:3000/api/gap-interview", {
        method: "POST",
        body: JSON.stringify({
          action: "answer",
          questionId: "GAP-Q-02",
          answerText: "Prof. Deshmukh owns the domain registration under faculty account line.",
          answeredBy: "Aarav Sharma",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.question.status).toBe("answered");
      expect(json.data.draftVersionV1_1.version_label).toBe("v1.1");
    });
  });
});
