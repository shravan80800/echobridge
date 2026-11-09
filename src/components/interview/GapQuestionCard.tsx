"use client";

import React, { useState, useEffect } from "react";
import {
  HelpCircle,
  AlertTriangle,
  UserCheck,
  Clock,
  Sparkles,
  Send,
  Edit3,
  ShieldAlert,
  CheckCircle2,
  Lock,
} from "lucide-react";
import type { GapQuestion } from "@/types/echobridge.types";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import { Button } from "@/components/ui/Button";

interface GapQuestionCardProps {
  question: GapQuestion;
  currentIndex: number;
  totalCount: number;
  departingMemberName?: string;
  isDepartingLead?: boolean;
  onSubmitAnswer: (questionId: string, answerText: string) => Promise<void>;
  isLoading?: boolean;
}

// Sample answers pre-configured for judges to test 1-click answers for planted traps
const SAMPLE_ANSWERS: Record<string, string> = {
  "GAP-TRAP-2":
    "Redis was selected specifically because during the 2025 spring hackathon surge, PostgreSQL session connection pool limits were exhausted under 1,200 concurrent users, causing HTTP 504 gateway timeouts. Moving active session state into Redis eliminated the database pool bottleneck.",
  "GAP-TRAP-7":
    "The campusconnect.dev domain renewal is managed directly by Prof. Deshmukh through the CS Department university registrar account. Billing is renewed annually on August 15th via university budget line #CS-2025.",
  "GAP-003":
    "Vercel Preview staging environments are triggered automatically on every pull request targeting the 'develop' branch. Environment variables are synced from the .env.staging Vault secret group.",
};

export function GapQuestionCard({
  question,
  currentIndex,
  totalCount,
  departingMemberName = "Aarav Sharma (Departing Lead)",
  isDepartingLead = true,
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
      "Documented based on team discussion: All technical details verified.";
    setAnswerText(sample);
  };

  const isAnswered = question.status === "answered" && !!question.answer_text;
  const isSkippedSuddenExit = question.status === "skipped_sudden_exit";

  return (
    <div
      className={`rounded-xl border transition-all ${
        isAnswered
          ? "border-blue-500/40 bg-surface shadow-md shadow-blue-950/20"
          : isSkippedSuddenExit
          ? "border-rose-500/30 bg-surface"
          : "border-border-subtle bg-surface"
      }`}
    >
      {/* Top Header & Metadata Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 md:p-5 border-b border-border-subtle bg-canvas/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-accent-cyan text-xs font-mono font-bold">
            {currentIndex + 1}/{totalCount}
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block">
              Targeted Tacit Knowledge Interview
            </span>
            <span className="text-xs font-mono text-text-secondary">
              ID: {question.id}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {question.planted_trap_id && (
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-purple-500/15 border border-purple-500/30 text-purple-300">
              Trap {question.planted_trap_id}:{" "}
              {question.planted_trap_id === 2
                ? "Redis Choice Rationale"
                : question.planted_trap_id === 7
                ? "Domain Renewal Ownership"
                : `Test Trap ${question.planted_trap_id}`}
            </span>
          )}

          {isAnswered ? (
            <EvidenceBadge state="attested" size="sm" />
          ) : isSkippedSuddenExit ? (
            <EvidenceBadge state="unsupported" size="sm" />
          ) : (
            <EvidenceBadge state="unsupported" size="sm" />
          )}
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-5">
        {/* Context Summary Alert */}
        <div className="rounded-lg p-3.5 bg-rose-950/20 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-rose-300 block">
              Knowledge Gap Identified in Automated Reconstruction:
            </span>
            <p className="text-text-secondary leading-relaxed">
              {question.context_summary}
            </p>
          </div>
        </div>

        {/* Targeted Question Prompt */}
        <div>
          <label className="text-xs font-mono uppercase tracking-wider text-accent-cyan flex items-center gap-1.5 mb-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            Interview Question:
          </label>
          <h2 className="text-base md:text-lg font-semibold text-text-primary leading-snug">
            {question.question_text}
          </h2>
        </div>

        {/* Skipped Sudden Exit Alert */}
        {isSkippedSuddenExit && (
          <div className="rounded-lg p-4 bg-rose-950/30 border border-rose-500/40 text-rose-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Departing Member Unavailable (Sudden Exit)</span>
            </div>
            <p className="text-text-secondary">
              This question was not answered by the departing lead. In accordance with epistemic honesty rules, it remains <strong className="text-rose-400 font-mono">RED (UNSUPPORTED)</strong> in the handover draft and has been routed to:
            </p>
            <div className="p-2 rounded bg-canvas border border-border-subtle font-mono text-xs text-text-primary">
              Assigned Contact: {question.assigned_contact_if_unanswered || "Prof. Deshmukh (Faculty Mentor)"}
            </div>
          </div>
        )}

        {/* Answer Form or Attested Display */}
        {isAnswered && !isEditing ? (
          <div className="space-y-3 rounded-xl border border-blue-500/30 bg-blue-950/10 p-4">
            <div className="flex items-center justify-between gap-2 border-b border-blue-500/20 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-mono font-semibold text-blue-300">
                  Attested by {question.answered_by || departingMemberName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {question.answered_at && (
                  <span className="text-[11px] font-mono text-text-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(question.answered_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="text-xs h-7 px-2 text-text-secondary hover:text-text-primary"
                >
                  <Edit3 className="w-3 h-3 mr-1" />
                  Edit Answer
                </Button>
              </div>
            </div>

            <p className="text-sm font-sans text-text-primary leading-relaxed whitespace-pre-wrap pl-1">
              {question.answer_text}
            </p>

            <div className="pt-2 text-[11px] font-mono text-blue-400/90 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                Claim promoted to <strong>Attested (Blue)</strong>. Confidence Score updated for Draft v1.1.
              </span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor={`gap-answer-${question.id}`}
                className="text-xs font-mono text-text-secondary flex items-center gap-1.5"
              >
                <span>Provide Rationale / Operational Guidance:</span>
              </label>

              {/* 1-Click Demo Sample Answer Filler for Judges */}
              <button
                type="button"
                onClick={handleFillSample}
                className="flex items-center gap-1 text-[11px] font-mono text-accent-cyan hover:text-cyan-300 transition-colors"
                title="Fill realistic sample answer for demo evaluation"
              >
                <Sparkles className="w-3 h-3" />
                <span>Fill Demo Answer</span>
              </button>
            </div>

            <textarea
              id={`gap-answer-${question.id}`}
              rows={4}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Explain the background rationale, architectural constraints, or point of contact not written in connected files..."
              className="w-full p-3.5 text-xs md:text-sm font-sans rounded-xl bg-canvas border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/60 leading-relaxed resize-y"
              disabled={isLoading}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-[11px] font-mono text-text-muted">
                {answerText.length} characters • Attributed to {departingMemberName}
              </span>

              <div className="flex items-center gap-2">
                {isAnswered && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    disabled={isLoading}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!answerText.trim() || isLoading}
                  isLoading={isLoading}
                  className="bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20 text-xs"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Submit as Attested Evidence (Blue)
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
