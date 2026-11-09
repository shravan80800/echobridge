import { describe, it, expect, beforeEach } from "vitest";
import {
  getComprehensionQuestions,
  evaluateComprehensionQuiz,
  computeReceiptHash,
  acknowledgeReceipt,
  getReceipt,
  ComprehensionQuizFailedError,
} from "@/services/workflow/receipt.service";
import { GET, POST } from "@/app/api/receipt/route";
import { NextRequest } from "next/server";
import { repository } from "@/lib/supabase/repository";

describe("Handover Receipt & Risk Comprehension Service (TASK-021)", () => {
  beforeEach(() => {
    repository.resetInMemoryStore(true);
  });

  describe("getComprehensionQuestions", () => {
    it("returns 3 critical risk comprehension questions for CampusConnect", async () => {
      const questions = await getComprehensionQuestions("CampusConnect", "incoming_lead");
      expect(questions.length).toBe(3);

      // Verify Trap 1 question: registration deadline
      const deadlineQ = questions.find((q) => q.question.includes("deadline"));
      expect(deadlineQ).toBeDefined();
      expect(deadlineQ?.related_risk_claim_id).toBe("CLM-TRAP-1");

      // Verify Trap 2 question: Redis session caching rationale
      const redisQ = questions.find((q) => q.question.includes("Redis"));
      expect(redisQ).toBeDefined();
      expect(redisQ?.related_risk_claim_id).toBe("CLM-TRAP-2");

      // Verify Trap 3 question: Stale deployment runbook risk
      const runbookQ = questions.find((q) => q.question.includes("deployment worker"));
      expect(runbookQ).toBeDefined();
      expect(runbookQ?.related_risk_claim_id).toBe("CLM-TRAP-3");
    });
  });

  describe("evaluateComprehensionQuiz (Anti-Blind 'Accept All' Rule)", () => {
    it("passes when recipient answers all 3 questions correctly (100%)", () => {
      const answers = [
        { question_id: "QUIZ-01", selected_index: 1 }, // March 20th
        { question_id: "QUIZ-02", selected_index: 1 }, // 20 DB connections limit
        { question_id: "QUIZ-03", selected_index: 1 }, // 9-month old runbook
      ];

      const result = evaluateComprehensionQuiz(answers);
      expect(result.correctCount).toBe(3);
      expect(result.scorePercentage).toBe(100);
      expect(result.passed).toBe(true);
    });

    it("passes when recipient answers 2 of 3 questions correctly (67%)", () => {
      const answers = [
        { question_id: "QUIZ-01", selected_index: 1 }, // Correct
        { question_id: "QUIZ-02", selected_index: 0 }, // Incorrect
        { question_id: "QUIZ-03", selected_index: 1 }, // Correct
      ];

      const result = evaluateComprehensionQuiz(answers);
      expect(result.correctCount).toBe(2);
      expect(result.scorePercentage).toBe(67);
      expect(result.passed).toBe(true);
    });

    it("fails when recipient answers only 1 question correctly (33%)", () => {
      const answers = [
        { question_id: "QUIZ-01", selected_index: 0 }, // Incorrect
        { question_id: "QUIZ-02", selected_index: 0 }, // Incorrect
        { question_id: "QUIZ-03", selected_index: 1 }, // Correct
      ];

      const result = evaluateComprehensionQuiz(answers);
      expect(result.correctCount).toBe(1);
      expect(result.scorePercentage).toBe(33);
      expect(result.passed).toBe(false);
    });
  });

  describe("computeReceiptHash (Cryptographic Determinism)", () => {
    it("computes deterministic SHA-256 digital signature hash", () => {
      const params = {
        projectId: "CampusConnect",
        draftVersionId: "DV-LEAD-V2.0",
        audienceRole: "incoming_lead" as const,
        incomingUserName: "Riya Patel",
        timestamp: "2026-03-12T12:00:00Z",
        score: 100,
      };

      const hash1 = computeReceiptHash(params);
      const hash2 = computeReceiptHash(params);

      expect(hash1).toMatch(/^0x[a-f0-9]{40}$/);
      expect(hash1).toBe(hash2);

      // Altering parameter yields different signature
      const hashDiff = computeReceiptHash({ ...params, score: 67 });
      expect(hashDiff).not.toBe(hash1);
    });
  });

  describe("acknowledgeReceipt", () => {
    it("throws error and blocks receipt generation when comprehension check fails", async () => {
      const failingAnswers = [
        { question_id: "QUIZ-01", selected_index: 0 }, // Wrong
        { question_id: "QUIZ-02", selected_index: 0 }, // Wrong
        { question_id: "QUIZ-03", selected_index: 0 }, // Wrong
      ];

      await expect(
        acknowledgeReceipt({
          projectId: "CampusConnect",
          audienceRole: "incoming_lead",
          incomingUserName: "Riya Patel",
          answers: failingAnswers,
        })
      ).rejects.toThrow(ComprehensionQuizFailedError);
    });

    it("issues receipt certificate and logs audit event when comprehension check passes", async () => {
      const passingAnswers = [
        { question_id: "QUIZ-01", selected_index: 1 }, // Correct
        { question_id: "QUIZ-02", selected_index: 1 }, // Correct
        { question_id: "QUIZ-03", selected_index: 1 }, // Correct
      ];

      const { receipt, evaluation } = await acknowledgeReceipt({
        projectId: "CampusConnect",
        audienceRole: "incoming_lead",
        incomingUserName: "Riya Patel",
        answers: passingAnswers,
      });

      expect(receipt.id).toContain("RCP-LEAD-");
      expect(receipt.comprehension_score).toBe(100);
      expect(receipt.comprehension_passed).toBe(true);
      expect(receipt.receipt_hash).toMatch(/^0x[a-f0-9]{40}$/);
      expect(evaluation.passed).toBe(true);

      // Verify saved in repository
      const savedReceipt = await getReceipt("CampusConnect", "incoming_lead");
      expect(savedReceipt).not.toBeNull();
      expect(savedReceipt?.receipt_hash).toBe(receipt.receipt_hash);

      // Verify audit event emitted
      const auditTrail = await repository.listAuditEvents("CampusConnect");
      expect(auditTrail.some((e) => e.event_type === "receipt_acknowledged")).toBe(true);
    });
  });

  describe("API Route: /api/receipt", () => {
    it("GET /api/receipt returns quiz questions and receipt status", async () => {
      const req = new NextRequest("http://localhost:3000/api/receipt?projectId=CampusConnect&role=incoming_lead");
      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.questions.length).toBe(3);
    });

    it("POST /api/receipt with failing answers returns 400 COMPREHENSION_CHECK_FAILED", async () => {
      const req = new NextRequest("http://localhost:3000/api/receipt", {
        method: "POST",
        body: JSON.stringify({
          action: "acknowledge",
          audienceRole: "incoming_lead",
          incomingUserName: "Riya Patel",
          answers: [
            { question_id: "QUIZ-01", selected_index: 0 },
            { question_id: "QUIZ-02", selected_index: 0 },
            { question_id: "QUIZ-03", selected_index: 0 },
          ],
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.errorType).toBe("COMPREHENSION_CHECK_FAILED");
    });

    it("POST /api/receipt with passing answers returns 200 and receipt certificate", async () => {
      const req = new NextRequest("http://localhost:3000/api/receipt", {
        method: "POST",
        body: JSON.stringify({
          action: "acknowledge",
          audienceRole: "incoming_lead",
          incomingUserName: "Riya Patel",
          answers: [
            { question_id: "QUIZ-01", selected_index: 1 },
            { question_id: "QUIZ-02", selected_index: 1 },
            { question_id: "QUIZ-03", selected_index: 1 },
          ],
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.receipt.receipt_hash).toMatch(/^0x/);
    });
  });
});
