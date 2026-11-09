"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileCheck2,
  Shield,
  Layers,
} from "lucide-react";
import { useRole } from "@/components/layout/RoleContext";
import { Button } from "@/components/ui/Button";
import { LoadingSkeleton } from "@/components/ui/StateViews";
import { GapQuestionCard } from "@/components/interview/GapQuestionCard";
import { SuddenExitFallbackBanner } from "@/components/interview/SuddenExitFallbackBanner";
import type { GapQuestion, DraftVersion } from "@/types/echobridge.types";

export default function GapInterviewPage() {
  const { currentRole } = useRole();
  const [questions, setQuestions] = useState<GapQuestion[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState<string>("");
  const [draftV1_1, setDraftV1_1] = useState<DraftVersion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const departingName = "Aarav Sharma (Departing Lead)";

  // Fetch interview data from /api/gap-interview
  const fetchInterviewData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/gap-interview?projectId=CampusConnect&role=incoming_lead");
      const json = await res.json();
      if (json.success) {
        setQuestions(json.questions || []);
        if (json.draftVersionV1_1) {
          setDraftV1_1(json.draftVersionV1_1);
        }
        if (!activeQuestionId && json.questions && json.questions.length > 0) {
          const firstPending = json.questions.find(
            (q: GapQuestion) => q.status === "pending"
          );
          setActiveQuestionId(firstPending ? firstPending.id : json.questions[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch interview questions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeQuestionId]);

  useEffect(() => {
    fetchInterviewData();
  }, [fetchInterviewData]);

  // Submit answer
  const handleSubmitAnswer = async (questionId: string, answerText: string) => {
    try {
      setIsSubmitting(true);
      setFeedbackMessage(null);

      const res = await fetch("/api/gap-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "answer",
          questionId,
          answerText,
          answeredBy: departingName,
          projectId: "CampusConnect",
          audienceRole: "incoming_lead",
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const updatedQuestion: GapQuestion = json.data.question;
        setDraftV1_1(json.data.draftVersionV1_1);

        setQuestions((prev) =>
          prev.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q))
        );

        setFeedbackMessage(
          `Answer recorded! Knowledge gap transitioned to Attested (Blue). New Draft v1.1 Confidence: ${json.data.draftVersionV1_1.confidence.total_score}%.`
        );

        // Advance to next pending question if available
        const remainingPending = questions.filter(
          (q) => q.id !== questionId && q.status === "pending"
        );
        if (remainingPending.length > 0) {
          setActiveQuestionId(remainingPending[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to submit gap answer:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simulate Sudden Exit
  const handleSimulateSuddenExit = async (fallbackContact: string) => {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/gap-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sudden_exit",
          projectId: "CampusConnect",
          assignedFallbackContact: fallbackContact,
          audienceRole: "incoming_lead",
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setQuestions(json.data.questions || []);
        setDraftV1_1(json.data.draftVersionV1_1);
        setFeedbackMessage(
          `Sudden exit simulated. Unanswered gaps retained as Red and safely routed to ${fallbackContact}.`
        );
      }
    } catch (err) {
      console.error("Failed to simulate sudden exit:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset Interview state
  const handleReset = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/gap-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset",
          projectId: "CampusConnect",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setQuestions(json.questions || []);
        if (json.questions.length > 0) {
          setActiveQuestionId(json.questions[0].id);
        }
        setFeedbackMessage("Gap-Interview reset to benchmark state.");
        await fetchInterviewData();
      }
    } catch (err) {
      console.error("Failed to reset interview:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCount = questions.length;
  const answeredCount = questions.filter((q) => q.status === "answered").length;
  const isSuddenExitActive = questions.some((q) => q.status === "skipped_sudden_exit");

  const activeQuestion =
    questions.find((q) => q.id === activeQuestionId) || questions[0];
  const activeIndex = questions.findIndex((q) => q.id === activeQuestion?.id);

  const handlePrevQuestion = () => {
    if (activeIndex > 0) {
      setActiveQuestionId(questions[activeIndex - 1].id);
    }
  };

  const handleNextQuestion = () => {
    if (activeIndex < questions.length - 1) {
      setActiveQuestionId(questions[activeIndex + 1].id);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-canvas px-4 py-8 md:px-8 max-w-7xl mx-auto">
        <LoadingSkeleton
          cardCount={2}
          message="Loading Targeted Gap-Interview Workspace..."
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas px-4 py-6 md:px-8 max-w-5xl mx-auto space-y-6">
      {/* ==================================================================== */}
      {/* 1. CLEAN PAGE HEADER                                                 */}
      {/* ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-accent-primary/15 border border-accent-primary/30 text-accent-cyan uppercase">
              Stage 4 of 6: Tacit Knowledge Recovery
            </span>
            <span className="text-xs font-mono text-text-muted">
              ADR-006 Epistemic Honesty
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
            4. Targeted Gap-Interview
          </h1>

          <p className="text-sm text-text-secondary mt-1 max-w-2xl">
            Extract unwritten architectural decisions and institutional context before the lead departs. Answers transition Red gaps to{" "}
            <span className="text-cyan-400 font-semibold font-mono">Attested (Blue)</span> evidence.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReset}
            disabled={isSubmitting}
            className="text-xs font-mono"
            title="Reset questions to benchmark state"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset
          </Button>

          <Link href="/review">
            <Button variant="primary" size="sm" className="text-xs font-mono">
              Continue to Review (Stage 5) →
            </Button>
          </Link>
        </div>
      </div>

      {/* Success / Feedback Banner */}
      {feedbackMessage && (
        <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center justify-between font-mono animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-cyan-400/70 hover:text-cyan-400"
          >
            ✕
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. COMPACT QUESTION SWITCHER PILLS (FIGURE 2 WORKFLOW)               */}
      {/* ==================================================================== */}
      <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-surface border border-border-subtle text-xs font-mono">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-text-muted text-[11px] px-2 uppercase font-bold tracking-wider hidden sm:inline">
            Questions:
          </span>

          {questions.map((q, idx) => {
            const isCurrent = q.id === activeQuestion?.id;
            const isDone = q.status === "answered";
            const isTrap2 = q.planted_trap_id === 2 || q.id.includes("TRAP-2");
            const isTrap7 = q.planted_trap_id === 7 || q.id.includes("TRAP-7");

            const shortLabel = isTrap2
              ? `Q1: Redis Choice (Trap 2)`
              : isTrap7
              ? `Q2: Domain Ownership (Trap 7)`
              : `Q${idx + 1}: Staging Sync`;

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setActiveQuestionId(q.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs select-none shrink-0 ${
                  isCurrent
                    ? "bg-accent-primary text-white font-bold shadow-sm"
                    : isDone
                    ? "bg-canvas text-cyan-400 border border-cyan-500/30 hover:bg-surface-hover"
                    : "bg-canvas text-text-secondary border border-border-subtle hover:text-text-primary hover:bg-surface-hover"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isDone ? "bg-cyan-400" : "bg-rose-400"
                  }`}
                />
                <span>{shortLabel}</span>
                {isDone && <span className="text-[10px] opacity-80">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Previous / Next Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handlePrevQuestion}
            disabled={activeIndex <= 0}
            className="p-1.5 rounded-lg bg-canvas hover:bg-surface-hover border border-border-subtle text-text-muted hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
            title="Previous Question"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextQuestion}
            disabled={activeIndex >= questions.length - 1}
            className="p-1.5 rounded-lg bg-canvas hover:bg-surface-hover border border-border-subtle text-text-muted hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
            title="Next Question"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. CENTERED HIGH-FOCUS CARD (CONCEPT MOCKUP FIGURE 2)                */}
      {/* ==================================================================== */}
      {activeQuestion && (
        <GapQuestionCard
          question={activeQuestion}
          currentIndex={activeIndex}
          totalCount={totalCount}
          departingMemberName={departingName}
          isDepartingLead={currentRole === "departing_member"}
          onSubmitAnswer={handleSubmitAnswer}
          isLoading={isSubmitting}
        />
      )}

      {/* ==================================================================== */}
      {/* 4. SUDDEN EXIT FALLBACK BAR (CLEAN FOOTER BOX BELOW CARD)            */}
      {/* ==================================================================== */}
      <SuddenExitFallbackBanner
        isSuddenExitActive={isSuddenExitActive}
        assignedFallbackContact="Prof. Deshmukh (Faculty Mentor, CS Dept)"
        unansweredCount={questions.filter((q) => q.status === "pending").length}
        onSimulateSuddenExit={handleSimulateSuddenExit}
        onReset={handleReset}
        isLoading={isSubmitting}
      />
    </main>
  );
}
