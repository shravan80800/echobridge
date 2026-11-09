import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GapQuestionCard } from "@/components/interview/GapQuestionCard";
import { SuddenExitFallbackBanner } from "@/components/interview/SuddenExitFallbackBanner";
import type { GapQuestion } from "@/types/echobridge.types";

describe("Stage 4 UI: GapQuestionCard & SuddenExitFallbackBanner (TASK-018)", () => {
  const pendingQuestion: GapQuestion = {
    id: "GAP-TRAP-2",
    project_id: "CampusConnect",
    claim_id: "CLM-TRAP-2",
    question_text: "Why was Redis chosen over Postgres for caching session data?",
    context_summary:
      "Architecture Doc v2 mentions Redis for caching, but the rationale for not using Postgres session tables is absent.",
    status: "pending",
    planted_trap_id: 2,
  };

  const answeredQuestion: GapQuestion = {
    id: "GAP-TRAP-2",
    project_id: "CampusConnect",
    claim_id: "CLM-TRAP-2",
    question_text: "Why was Redis chosen over Postgres for caching session data?",
    context_summary:
      "Architecture Doc v2 mentions Redis for caching, but the rationale for not using Postgres session tables is absent.",
    answer_text:
      "PostgreSQL connection pool exhausted under 1,200 concurrent users during hackathon surge.",
    answered_by: "Aarav Sharma (Departing Lead)",
    answered_at: "2026-03-11T14:45:00Z",
    status: "answered",
    planted_trap_id: 2,
  };

  const skippedQuestion: GapQuestion = {
    id: "GAP-TRAP-7",
    project_id: "CampusConnect",
    claim_id: "CLM-TRAP-7",
    question_text: "Who owns the campusconnect.dev domain renewal?",
    context_summary: "No source document contains domain registrar ownership.",
    status: "skipped_sudden_exit",
    assigned_contact_if_unanswered: "Prof. Deshmukh (Faculty Mentor, CS Dept)",
    planted_trap_id: 7,
  };

  describe("GapQuestionCard", () => {
    it("renders pending question with red unsupported badge and planted trap chip", () => {
      const html = renderToStaticMarkup(
        React.createElement(GapQuestionCard, {
          question: pendingQuestion,
          currentIndex: 0,
          totalCount: 3,
          departingMemberName: "Aarav Sharma",
          onSubmitAnswer: async () => {},
        })
      );

      expect(html).toContain("Why was Redis chosen over Postgres");
      expect(html).toContain("Architecture Doc v2 mentions Redis");
      expect(html).toContain("Trap 2: Redis Choice Rationale");
      expect(html).toContain("UNSUPPORTED GAP");
      expect(html).toContain("Submit as Attested Evidence");
    });

    it("renders answered question with Attested (Blue) badge and attribution", () => {
      const html = renderToStaticMarkup(
        React.createElement(GapQuestionCard, {
          question: answeredQuestion,
          currentIndex: 0,
          totalCount: 3,
          departingMemberName: "Aarav Sharma",
          onSubmitAnswer: async () => {},
        })
      );

      expect(html).toContain("ATTESTED");
      expect(html).toContain("Attested by Aarav Sharma");
      expect(html).toContain("PostgreSQL connection pool exhausted");
      expect(html).toContain("Claim promoted to");
    });

    it("renders sudden-exit question with fallback contact notice and unsupported badge", () => {
      const html = renderToStaticMarkup(
        React.createElement(GapQuestionCard, {
          question: skippedQuestion,
          currentIndex: 1,
          totalCount: 3,
          departingMemberName: "Aarav Sharma",
          onSubmitAnswer: async () => {},
        })
      );

      expect(html).toContain("Departing Member Unavailable (Sudden Exit)");
      expect(html).toContain("Prof. Deshmukh (Faculty Mentor, CS Dept)");
      expect(html).toContain("UNSUPPORTED GAP");
    });
  });

  describe("SuddenExitFallbackBanner", () => {
    it("renders default standby state with simulate action button", () => {
      const html = renderToStaticMarkup(
        React.createElement(SuddenExitFallbackBanner, {
          isSuddenExitActive: false,
          assignedFallbackContact: "Prof. Deshmukh",
          unansweredCount: 2,
          onSimulateSuddenExit: async () => {},
          onReset: async () => {},
        })
      );

      expect(html).toContain("Sudden Exit Safety Handler (ADR-006)");
      expect(html).toContain("Simulate Sudden Exit");
      expect(html).not.toContain("Fallback Mode Active");
    });

    it("renders active fallback mode with designated mentor routing", () => {
      const html = renderToStaticMarkup(
        React.createElement(SuddenExitFallbackBanner, {
          isSuddenExitActive: true,
          assignedFallbackContact: "Prof. Deshmukh (Faculty Mentor, CS Dept)",
          unansweredCount: 2,
          onSimulateSuddenExit: async () => {},
          onReset: async () => {},
        })
      );

      expect(html).toContain("Fallback Mode Active");
      expect(html).toContain("Prof. Deshmukh (Faculty Mentor, CS Dept)");
      expect(html).toContain("Reset Mode");
    });
  });
});
