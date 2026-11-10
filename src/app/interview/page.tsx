"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { useRole } from "@/components/layout/RoleContext";
import { Button } from "@/components/ui/Button";
import { LoadingSkeleton } from "@/components/ui/StateViews";
import { GapQuestionCard } from "@/components/interview/GapQuestionCard";
import type { GapQuestion } from "@/types/echobridge.types";

export default function GapInterviewPage() {
  const { currentRole } = useRole();
  const [questions, setQuestions] = useState<GapQuestion[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suddenExitNote, setSuddenExitNote] = useState<string | null>(null);

  const departingName = "Aarav Sharma";

  const fetchInterviewData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(
        "/api/gap-interview?projectId=CampusConnect&role=incoming_lead",
        { cache: "no-store" }
      );
      const json = await res.json();
      if (json.success) {
        const fetchedQuestions: GapQuestion[] = json.questions || [];
        setQuestions(fetchedQuestions);
        if (!activeQuestionId && fetchedQuestions.length > 0) {
          const firstPending = fetchedQuestions.find(
            (q) => q.status === "pending"
          );
          setActiveQuestionId(
            firstPending ? firstPending.id : fetchedQuestions[0].id
          );
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

  const handleSubmitAnswer = async (
    questionId: string,
    answerText: string
  ) => {
    try {
      setIsSubmitting(true);
      setSuddenExitNote(null);

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
        setQuestions((prev) =>
          prev.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q))
        );
      }
    } catch (err) {
      console.error("Failed to submit gap answer:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipRemaining = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/gap-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sudden_exit",
          projectId: "CampusConnect",
          assignedFallbackContact: "Prof. Deshmukh (Faculty Mentor, CS Dept)",
          audienceRole: "incoming_lead",
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setQuestions(json.data.questions || []);
        setSuddenExitNote(
          "Unanswered questions will stay marked as open gaps for Prof. Deshmukh"
        );
      }
    } catch (err) {
      console.error("Failed to mark questions as open gaps:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsSubmitting(true);
      setSuddenExitNote(null);
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
        if (json.questions?.length > 0) {
          setActiveQuestionId(json.questions[0].id);
        }
        await fetchInterviewData();
      }
    } catch (err) {
      console.error("Failed to reset interview:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSuddenExitActive = questions.some(
    (q) => q.status === "skipped_sudden_exit"
  );

  const activeQuestion =
    questions.find((q) => q.id === activeQuestionId) || questions[0];
  const activeIndex = questions.findIndex((q) => q.id === activeQuestion?.id);

  if (isLoading) {
    return (
      <main className="max-w-2xl mx-auto w-full py-4">
        <LoadingSkeleton
          cardCount={1}
          message="Loading missing project questions..."
        />
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto w-full space-y-5">
      {/* ==================================================================== */}
      {/* 1. CLEAN HEADER                                                      */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            2. Targeted Gap Interview
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Help fill in unwritten project decisions that aren&apos;t in your files.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleReset}
          disabled={isSubmitting}
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          className="self-start sm:self-center shrink-0"
        >
          Reset Demo
        </Button>
      </div>

      {/* ==================================================================== */}
      {/* 2. QUESTION SELECTOR TABS (ABOVE CARD)                               */}
      {/* ==================================================================== */}
      <div className="flex flex-wrap items-center gap-2">
        {questions.map((q, idx) => {
          const isCurrent = q.id === activeQuestion?.id;
          const isDone = q.status === "answered";

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setActiveQuestionId(q.id)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 border ${
                isCurrent
                  ? "bg-teal-700 text-white border-teal-700 shadow-sm font-semibold"
                  : isDone
                  ? "bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50 shadow-sm"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100 shadow-sm"
              }`}
            >
              <span>Question {idx + 1}</span>
              {isDone && (
                <span
                  className={isCurrent ? "text-emerald-200" : "text-emerald-600"}
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* 3. MAIN CARD (MATCHES FIGURE 2 CONCEPT MOCKUP)                       */}
      {/* ==================================================================== */}
      {activeQuestion && (
        <GapQuestionCard
          question={activeQuestion}
          currentIndex={activeIndex}
          totalCount={questions.length}
          departingMemberName={departingName}
          isDepartingLead={currentRole === "departing_member"}
          cleanMode
          onSubmitAnswer={handleSubmitAnswer}
          isLoading={isSubmitting}
        />
      )}

      {/* Simple Confirmation Note when Sudden Exit / Skip Triggered */}
      {(suddenExitNote || isSuddenExitActive) && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            Unanswered questions will stay marked as open gaps for Prof. Deshmukh
          </span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. BOTTOM NAVIGATION BAR BELOW THE CARD                              */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={handleSkipRemaining}
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          Departing member unavailable? Skip remaining questions
        </Button>

        <Link href="/review" className="w-full sm:w-auto">
          <Button variant="primary" className="w-full sm:w-auto">
            Continue to Review &amp; Approval →
          </Button>
        </Link>
      </div>
    </main>
  );
}
