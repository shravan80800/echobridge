"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Edit3,
  CheckCircle2,
  UserX,
  AlertTriangle,
} from "lucide-react";
import type { GapQuestion } from "@/types/echobridge.types";
import { Button } from "@/components/ui/Button";

interface GapQuestionCardProps {
  question: GapQuestion;
  currentIndex: number;
  totalCount: number;
  departingMemberName?: string;
  isDepartingLead?: boolean;
  cleanMode?: boolean;
  onSubmitAnswer: (questionId: string, answerText: string) => Promise<void>;
  isLoading?: boolean;
}

const SAMPLE_ANSWERS: Record<string, string> = {
  "GAP-TRAP-2":
    "Redis was selected specifically because during the 2025 spring hackathon surge, PostgreSQL connection pool limits were exhausted under 1,200 concurrent users, causing HTTP 504 gateway timeouts. Moving active session state into Redis eliminated the database pool bottleneck.",
  "GAP-TRAP-7":
    "The campusconnect.dev domain renewal is managed directly by Prof. Deshmukh through the CS Department university registrar account. Billing is renewed annually on August 15th via university budget line #CS-2025.",
  "GAP-003":
    "Vercel Preview staging environments are triggered automatically on every pull request targeting the 'develop' branch. Environment variables are synced from the staging environment secret group.",
};

export function GapQuestionCard({
  question,
  currentIndex,
  totalCount,
  departingMemberName = "Aarav Sharma",
  cleanMode = false,
  onSubmitAnswer,
  isLoading = false,
}: GapQuestionCardProps) {
  const [answerText, setAnswerText] = useState(question.answer_text || "");
  const [isEditing, setIsEditing] = useState(!question.answer_text);

  useEffect(() => {
    setAnswerText(question.answer_text || "");
    setIsEditing(!question.answer_text);
  }, [question.id, question.answer_text]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerText.trim()) return;
    await onSubmitAnswer(question.id, answerText.trim());
    setIsEditing(false);
  };

  const handleFillSample = () => {
    const sample =
      SAMPLE_ANSWERS[question.id] ||
      (question.planted_trap_id === 2 ? SAMPLE_ANSWERS["GAP-TRAP-2"] : "") ||
      (question.planted_trap_id === 7 ? SAMPLE_ANSWERS["GAP-TRAP-7"] : "") ||
      SAMPLE_ANSWERS["GAP-003"] ||
      "Documented based on team discussion: PostgreSQL connection pool exhausted under 1,200 concurrent users during hackathon surge.";
    setAnswerText(sample);
  };

  const isAnswered = question.status === "answered" && !!question.answer_text;
  const isSkippedSuddenExit = question.status === "skipped_sudden_exit";

  const isRedisGap =
    question.planted_trap_id === 2 || question.id.includes("TRAP-2");
  const isDomainGap =
    question.planted_trap_id === 7 || question.id.includes("TRAP-7");

  const getGapHeadline = () => {
    if (isRedisGap) {
      return "Gap found: rationale for choosing Redis is not in any source";
    }
    if (isDomainGap) {
      return "Gap found: domain renewal ownership is not documented in any source";
    }
    return "Gap found: staging deployment details are not in any source";
  };

  const getTestTrapLabel = () => {
    if (isRedisGap) return "Trap 2: Redis Choice Rationale";
    if (isDomainGap) return "Trap 7: Domain Registrar Ownership";
    return null;
  };

  const testTrapLabel = getTestTrapLabel();

  return (
    <div className="w-full rounded-xl overflow-hidden shadow-sm">
      {/* ==================================================================== */}
      {/* CARD TOP HEADER BAR (Matches Figure 2 Dark Teal Header)              */}
      {/* ==================================================================== */}
      <div className="bg-teal-900 text-white px-5 py-3.5 rounded-t-xl flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-bold tracking-tight text-sm text-white">
            EchoBridge
          </span>
          <span className="bg-teal-800 text-teal-100 border border-teal-700 rounded-full px-2.5 py-0.5 text-xs font-medium cursor-default select-none">
            Gap-Interview
          </span>

          {!cleanMode && testTrapLabel && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900 cursor-default select-none">
              {testTrapLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!cleanMode && (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium cursor-default select-none ${
                isAnswered
                  ? "bg-blue-100 text-blue-900"
                  : "bg-rose-100 text-rose-900"
              }`}
            >
              {isAnswered ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>ATTESTED</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>UNSUPPORTED GAP</span>
                </>
              )}
            </span>
          )}

          <span className="text-xs font-medium text-teal-100">
            Question {currentIndex + 1} of {totalCount}
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* CARD BODY                                                            */}
      {/* ==================================================================== */}
      <div className="bg-white p-5 sm:p-6 rounded-b-xl border border-t-0 border-slate-200 space-y-5">
        {/* 1. Red Gap Callout Box (Matches Figure 2) */}
        <div className="bg-rose-50/70 border border-rose-200 border-l-4 border-l-rose-500 rounded-lg p-4 space-y-1">
          <div className="text-slate-900 font-semibold text-base leading-snug">
            {getGapHeadline()}
          </div>
          {question.context_summary && (
            <p className="text-sm text-slate-600 leading-relaxed font-normal">
              {question.context_summary}
            </p>
          )}
        </div>

        {/* 2. Question Prompt */}
        <div>
          <label
            htmlFor={`gap-answer-${question.id}`}
            className="block text-slate-800 font-medium text-base leading-snug"
          >
            {question.question_text}
          </label>
        </div>

        {/* State A: Answered View */}
        {isAnswered && !isEditing ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-600 font-medium">
                  {cleanMode
                    ? `Answered by ${departingMemberName}`
                    : `Attested by ${departingMemberName} (${
                        question.answered_at
                          ? new Date(question.answered_at).toLocaleDateString()
                          : "Just now"
                      })`}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                >
                  Edit answer
                </Button>
              </div>

              <p className="text-sm text-slate-900 leading-relaxed bg-white p-3.5 rounded-lg border border-slate-200">
                &ldquo;{question.answer_text}&rdquo;
              </p>

              {!cleanMode && (
                <p className="text-xs text-slate-600">
                  Claim promoted to <strong>Attested</strong> evidence.
                </p>
              )}
            </div>

            {/* Figure 2 Bottom Confirmation Pill */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full px-3 py-1 text-xs font-medium cursor-default select-none">
                <span>✓ Saved as Attested evidence</span>
              </span>
            </div>
          </div>
        ) : isSkippedSuddenExit ? (
          /* State B: Marked Open for Mentor */
          <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-900 text-sm font-semibold">
              <UserX className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                {cleanMode
                  ? "Marked as an open question for Prof. Deshmukh"
                  : "Departing Member Unavailable (Sudden Exit)"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {cleanMode ? (
                <>
                  Unanswered questions will stay marked as open gaps for{" "}
                  <strong>Prof. Deshmukh</strong> to handle during review.
                </>
              ) : (
                <>
                  Preserved as <strong>UNSUPPORTED GAP</strong> and routed to{" "}
                  <strong>
                    {question.assigned_contact_if_unanswered ||
                      "Prof. Deshmukh (Faculty Mentor, CS Dept)"}
                  </strong>
                  .
                </>
              )}
            </p>
            <div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                Answer this question now
              </Button>
            </div>
          </div>
        ) : (
          /* State C: Answer Input Form (Matches Figure 2) */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-500 font-medium">
                Your explanation will be added with attribution
              </span>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleFillSample}
                leftIcon={<Sparkles className="w-3.5 h-3.5 text-teal-700" />}
              >
                ✨ Fill sample answer for demo
              </Button>
            </div>

            <textarea
              id={`gap-answer-${question.id}`}
              rows={4}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Write a clear explanation in plain words..."
              className="w-full min-h-[110px] px-3.5 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 leading-relaxed resize-y"
              required
            />

            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div>
                {isAnswered && (
                  <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full px-3 py-1 text-xs font-medium cursor-default select-none">
                    <span>✓ Saved as Attested evidence</span>
                  </span>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                disabled={!answerText.trim() || isLoading}
                className="w-full sm:w-auto sm:ml-auto"
              >
                {cleanMode ? "Submit" : "Submit as Attested Evidence"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
