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
  ArrowRight,
  UserX,
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
    "Redis was selected specifically because during the 2025 spring hackathon surge, PostgreSQL connection pool limits were exhausted under 1,200 concurrent users, causing HTTP 504 gateway timeouts. Moving active session state into Redis eliminated the database pool bottleneck.",
  "GAP-TRAP-7":
    "The campusconnect.dev domain renewal is managed directly by Prof. Deshmukh through the CS Department university registrar account. Billing is renewed annually on August 15th via university budget line #CS-2025.",
  "GAP-003":
    "Vercel Preview staging environments are triggered automatically on every pull request targeting the 'develop' branch. Environment variables are synced from the .env.staging Vault secret group.",
};

export function GapQuestionCard({
  question,
  currentIndex,
  totalCount,
  departingMemberName = "Aarav Sharma",
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
      "Documented based on team discussion: PostgreSQL connection pool exhausted under 1,200 concurrent users during hackathon surge.";
    setAnswerText(sample);
  };

  const isAnswered = question.status === "answered" && !!question.answer_text;
  const isSkippedSuddenExit = question.status === "skipped_sudden_exit";

  const getPlantedTrapLabel = () => {
    if (question.planted_trap_id === 2 || question.id.includes("TRAP-2")) {
      return "Trap 2: Redis Choice Rationale";
    }
    if (question.planted_trap_id === 7 || question.id.includes("TRAP-7")) {
      return "Trap 7: Domain Registrar Ownership";
    }
    return null;
  };

  const trapLabel = getPlantedTrapLabel();

  return (
    <div
      className={`rounded-2xl border transition-all shadow-xl ${
        isAnswered
          ? "border-cyan-500/40 bg-surface shadow-cyan-950/20"
          : isSkippedSuddenExit
          ? "border-rose-500/30 bg-surface shadow-rose-950/20"
          : "border-border-subtle bg-surface"
      }`}
    >
      {/* Top Bar of Figure 2 Concept Mockup */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-border-subtle bg-canvas/40">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono font-bold tracking-tight text-text-primary">
            EchoBridge
          </span>
          <span className="text-text-muted text-xs">•</span>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-accent-primary/10 text-accent-cyan border border-accent-primary/20">
            Gap-Interview
          </span>

          {trapLabel && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
              🎯 {trapLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isAnswered ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ATTESTED</span>
            </span>
          ) : isSkippedSuddenExit ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <UserX className="w-3.5 h-3.5" />
              <span>UNSUPPORTED GAP</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>UNSUPPORTED GAP</span>
            </span>
          )}

          <span className="text-xs font-mono font-bold text-text-muted px-2 py-0.5 rounded bg-canvas border border-border-subtle">
            Question {currentIndex + 1} of {totalCount}
          </span>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-6">
        {/* Red Gap Banner inside card matching Figure 2 */}
        <div className="border-l-4 border-rose-500 bg-rose-500/10 p-4 rounded-r-xl space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wide">
              {trapLabel ? `Gap found: rationale for choosing Redis is not in any source` : "Knowledge Gap Detected"}
            </span>
          </div>
          {question.context_summary && (
            <p className="text-xs text-rose-200/90 leading-relaxed font-sans">
              {question.context_summary}
            </p>
          )}
        </div>

        {/* Bold Question Heading */}
        <div>
          <h2 className="text-lg md:text-2xl font-bold tracking-tight text-text-primary leading-snug">
            {question.question_text}
          </h2>
          <span className="text-[11px] font-mono text-text-muted mt-1 block">
            Targeted unwritten institutional context • Claim ID: {question.claim_id}
          </span>
        </div>

        {/* State A: Answered Mode */}
        {isAnswered && !isEditing ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-canvas border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-cyan-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  Attested by Aarav Sharma ({question.answered_at ? new Date(question.answered_at).toLocaleDateString() : "Just now"})
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-[11px] font-mono text-text-muted hover:text-cyan-300 flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>

              <p className="text-sm text-text-primary leading-relaxed font-sans bg-surface/50 p-3 rounded-lg border border-border-subtle">
                &ldquo;{question.answer_text}&rdquo;
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-text-muted pt-1">
                <span>
                  ✓ Claim promoted to <strong>Blue Attested</strong> (never counted as Corroborated Green).
                </span>
                <span className="text-cyan-400 font-bold">
                  Draft v1.1 Updated
                </span>
              </div>
            </div>
          </div>
        ) : isSkippedSuddenExit ? (
          /* State B: Sudden Exit Mode */
          <div className="p-5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-3">
            <div className="flex items-center gap-2 text-rose-300 text-xs font-mono font-bold">
              <UserX className="w-4 h-4 text-rose-400" />
              <span>Departing Member Unavailable (Sudden Exit)</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              This gap remains marked as <strong className="text-rose-400 font-mono">UNSUPPORTED GAP</strong>. It was safely retained and assigned to designated faculty mentor:
            </p>
            <div className="p-3 rounded-lg bg-canvas border border-rose-500/20 text-xs font-mono text-rose-200">
              Assigned Contact: <strong>Prof. Deshmukh (Faculty Mentor, CS Dept)</strong>
            </div>
          </div>
        ) : (
          /* State C: Input Form (Figure 2 Concept Mockup) */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-mono text-text-secondary">
                Departing Lead Response:
              </label>

              {/* 1-Click Demo Fill Button */}
              <button
                type="button"
                onClick={handleFillSample}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono text-accent-cyan hover:text-white bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/20 transition-colors"
                title="Pre-fill authentic testimony for this planted gap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>✨ Fill Demo Answer (Aarav)</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Type your answer to explain the technical rationale..."
              className="w-full px-4 py-3 rounded-xl bg-canvas border border-border-subtle text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary placeholder:text-text-muted font-sans leading-relaxed resize-y"
              required
            />

            {/* Bottom Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-[11px] font-mono text-text-muted">
                Testimony will be verified by Gemini &amp; promoted to <strong>Attested (Blue)</strong>.
              </span>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                disabled={!answerText.trim() || isLoading}
                className="text-xs font-mono w-full sm:w-auto"
              >
                Submit as Attested Evidence
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
