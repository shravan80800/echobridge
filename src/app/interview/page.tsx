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
  TrendingUp,
  FileCheck2,
  Shield,
  Layers,
} from "lucide-react";
import { useRole } from "@/components/layout/RoleContext";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSkeleton } from "@/components/ui/StateViews";
import { GapQuestionCard } from "@/components/interview/GapQuestionCard";
import { SuddenExitFallbackBanner } from "@/components/interview/SuddenExitFallbackBanner";
import type { GapQuestion, DraftVersion } from "@/types/echobridge.types";

export default function GapInterviewPage() {
  const { currentRole } = useRole();
  const [questions, setQuestions] = useState<GapQuestion[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState<string>("");
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "answered">("all");
  const [draftV1_1, setDraftV1_1] = useState<DraftVersion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const isDepartingLead = currentRole === "departing_member";
  const departingName =
    currentRole === "departing_member"
      ? "Aarav Sharma (Departing Lead)"
      : "Aarav Sharma (via Demo Switcher)";

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
          // Select first pending question or first question
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
          `Answer recorded! Knowledge gap transitioned to Attested (Blue). New v1.1 Confidence: ${json.data.draftVersionV1_1.confidence.total_score}%.`
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
          `Sudden exit simulated. Unanswered gaps retained as Red and routed to ${fallbackContact}.`
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
        // Re-fetch progress
        await fetchInterviewData();
      }
    } catch (err) {
      console.error("Failed to reset interview:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // KPIs
  const totalCount = questions.length;
  const answeredCount = questions.filter((q) => q.status === "answered").length;
  const pendingCount = questions.filter((q) => q.status === "pending").length;
  const isSuddenExitActive = questions.some((q) => q.status === "skipped_sudden_exit");

  const filteredQuestions = questions.filter((q) => {
    if (filterTab === "pending") return q.status === "pending";
    if (filterTab === "answered") return q.status === "answered";
    return true;
  });

  const activeQuestion =
    questions.find((q) => q.id === activeQuestionId) || questions[0];
  const activeIndex = questions.findIndex((q) => q.id === activeQuestion?.id);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-canvas px-4 py-8 md:px-8 max-w-7xl mx-auto">
        <LoadingSkeleton
          cardCount={3}
          message="Loading Targeted Gap-Interview Workspace..."
          steps={[
            "Scanning draft v1.0 for unsupported claims...",
            "Loading tacit knowledge questions for CampusConnect...",
            "Checking departing member attribution records...",
          ]}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas px-4 py-6 md:px-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-500/15 border border-indigo-500/30 text-accent-cyan uppercase">
              Stage 4 of 6: Tacit Knowledge Recovery
            </span>
            <span className="text-xs font-mono text-text-muted">
              ADR-006 Epistemic Honesty
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
            Targeted Gap-Interview Terminal
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl">
            Only unwritten architectural constraints, tacit rationale, and critical gaps trigger interview prompts. Submitted answers become{" "}
            <span className="text-blue-400 font-semibold font-mono">Attested (Blue)</span> evidence, advancing the handover draft to v1.1.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReset}
            disabled={isSubmitting}
            className="text-xs"
            title="Reset to synthetic benchmark state"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset Questions
          </Button>

          <Link href="/review">
            <Button variant="approve" size="sm" className="text-xs">
              <span>Stage 5: Review Diff</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Role Notice & Epistemic Honesty Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-surface border border-border-subtle text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="font-mono text-text-secondary">
            Active Persona:{" "}
            <strong className="text-accent-cyan">
              {currentRole === "departing_member"
                ? "Aarav Sharma (Departing Lead)"
                : currentRole === "reviewer"
                ? "Prof. Deshmukh (Reviewer / Mentor)"
                : currentRole === "incoming_lead"
                ? "Riya Patel (Incoming Lead)"
                : "Kabir Mehta (Incoming Intern)"}
            </strong>
          </span>
          <span className="text-text-muted">|</span>
          <span className="text-text-muted hidden sm:inline">
            Rule: Blue Attested evidence is strictly never counted as Green Corroborated.
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-text-secondary">
          <span className="px-2 py-0.5 rounded bg-canvas border border-border-subtle">
            Target: CampusConnect v1.1
          </span>
        </div>
      </div>

      {/* Feedback Alert Toast */}
      {feedbackMessage && (
        <div className="rounded-xl p-3.5 bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-400 hover:text-emerald-200 font-mono text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Counters Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-surface">
          <span className="text-[11px] font-mono text-text-muted uppercase block">
            Total Detected Gaps
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-text-primary">
              {totalCount}
            </span>
            <span className="text-xs text-text-muted font-mono">questions</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-surface border-blue-500/20">
          <span className="text-[11px] font-mono text-blue-400 uppercase block">
            Attested Evidence (Blue)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-blue-400">
              {answeredCount}
            </span>
            <span className="text-xs text-blue-300 font-mono">
              / {totalCount} completed
            </span>
          </div>
        </Card>

        <Card className="p-3.5 bg-surface border-rose-500/20">
          <span className="text-[11px] font-mono text-rose-400 uppercase block">
            Unanswered (Red Gaps)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-rose-400">
              {pendingCount}
            </span>
            <span className="text-xs text-rose-300 font-mono">pending</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-surface">
          <span className="text-[11px] font-mono text-accent-cyan uppercase block">
            Draft v1.1 Confidence
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-accent-cyan">
              {draftV1_1?.confidence?.total_score || 84}%
            </span>
            <span className="text-xs text-emerald-400 font-mono flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5 inline" />
              +8% from v1.0
            </span>
          </div>
        </Card>
      </div>

      {/* Main Split-Screen Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Navigator & Sudden Exit Control (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-4 bg-surface space-y-3">
            <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-accent-cyan" />
                <h2 className="text-xs font-mono font-bold uppercase text-text-primary">
                  Knowledge Gaps Queue
                </h2>
              </div>
              <span className="text-xs font-mono text-text-muted">
                {questions.length} items
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-canvas border border-border-subtle text-xs font-mono">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={`flex-1 py-1 rounded text-center transition-all ${
                  filterTab === "all"
                    ? "bg-surface-hover text-accent-cyan font-bold"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                All ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("pending")}
                className={`flex-1 py-1 rounded text-center transition-all ${
                  filterTab === "pending"
                    ? "bg-rose-500/20 text-rose-300 font-bold"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("answered")}
                className={`flex-1 py-1 rounded text-center transition-all ${
                  filterTab === "answered"
                    ? "bg-blue-500/20 text-blue-300 font-bold"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                Attested ({answeredCount})
              </button>
            </div>

            {/* Questions List */}
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {filteredQuestions.map((q, idx) => {
                const isSelected = q.id === activeQuestion?.id;
                const isQAnswered = q.status === "answered";
                const isQSkipped = q.status === "skipped_sudden_exit";

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setActiveQuestionId(q.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all select-none ${
                      isSelected
                        ? "border-accent-cyan bg-surface-hover shadow-sm"
                        : "border-border-subtle bg-canvas/40 hover:bg-surface-hover/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isQAnswered
                              ? "bg-blue-400"
                              : isQSkipped
                              ? "bg-rose-400"
                              : "bg-rose-500 animate-pulse"
                          }`}
                        />
                        <span className="text-[11px] font-mono text-text-muted">
                          Gap {idx + 1}
                        </span>
                      </div>

                      {q.planted_trap_id && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          Trap {q.planted_trap_id}
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-semibold text-text-primary line-clamp-2 leading-relaxed">
                      {q.question_text}
                    </p>

                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border-subtle/50">
                      <EvidenceBadge
                        state={isQAnswered ? "attested" : "unsupported"}
                        size="sm"
                      />
                      <span className="text-[10px] font-mono text-text-muted truncate max-w-[140px]">
                        {isQAnswered
                          ? `Attested by Aarav`
                          : isQSkipped
                          ? `Fallback: Prof. Deshmukh`
                          : `Needs Rationale`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Sudden Exit Fallback Banner */}
          <SuddenExitFallbackBanner
            isSuddenExitActive={isSuddenExitActive}
            assignedFallbackContact="Prof. Deshmukh (Faculty Mentor, CS Dept)"
            unansweredCount={pendingCount}
            onSimulateSuddenExit={handleSimulateSuddenExit}
            onReset={handleReset}
            isLoading={isSubmitting}
          />
        </div>

        {/* Right Column: Active Question & Live Impact Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {activeQuestion ? (
            <GapQuestionCard
              question={activeQuestion}
              currentIndex={activeIndex >= 0 ? activeIndex : 0}
              totalCount={totalCount}
              departingMemberName={departingName}
              isDepartingLead={isDepartingLead}
              onSubmitAnswer={handleSubmitAnswer}
              isLoading={isSubmitting}
            />
          ) : (
            <Card className="p-8 text-center text-text-muted font-mono text-xs">
              No questions found in this filter view.
            </Card>
          )}

          {/* Live Impact Preview: Draft v1.0 -> Draft v1.1 */}
          <Card className="p-5 bg-surface border-border-subtle space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent-cyan" />
                <h3 className="text-xs font-mono font-bold uppercase text-text-primary">
                  Live Handover Impact: Draft v1.0 → v1.1
                </h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
                Audience: Incoming Team Lead
              </span>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              When the departing lead attests to tacit rationale, the affected claim transitions from <span className="text-rose-400 font-semibold font-mono">UNSUPPORTED</span> to <span className="text-blue-400 font-semibold font-mono">ATTESTED</span>. The Confidence Score is recalculated and persisted in <strong className="text-text-primary font-mono">DraftVersion v1.1</strong>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-canvas border border-border-subtle space-y-1.5">
                <span className="text-[10px] text-text-muted uppercase block">
                  Initial Reconstructed Draft (v1.0)
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Confidence:</span>
                  <span className="font-bold text-text-primary">76%</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-muted">Unanswered Gaps:</span>
                  <span className="text-rose-400 font-bold">2 Red</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-muted">Status:</span>
                  <span className="text-text-secondary">Pre-Interview</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-500/30 space-y-1.5">
                <span className="text-[10px] text-blue-400 uppercase block font-bold">
                  After Gap-Interview (v1.1)
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-blue-300">Confidence:</span>
                  <span className="font-bold text-blue-400">
                    {draftV1_1?.confidence?.total_score || 84}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-blue-300/80">Attested Evidence:</span>
                  <span className="text-blue-400 font-bold">
                    {answeredCount} Blue Claims
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-blue-300/80">Status:</span>
                  <span className="text-emerald-400 font-bold">Ready for Review</span>
                </div>
              </div>
            </div>

            {/* Quick Link to Stage 5 */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <span className="text-[11px] font-mono text-text-muted">
                Next Stage: Reviewer approval & version diff inspection
              </span>
              <Link href="/review">
                <Button variant="primary" size="sm" className="text-xs">
                  <FileCheck2 className="w-3.5 h-3.5 mr-1.5" />
                  Proceed to Stage 5: Review
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Navigation Toolbar */}
      <div className="flex items-center justify-between pt-6 border-t border-border-subtle">
        <Link href="/draft">
          <Button variant="ghost" size="sm" className="text-xs text-text-secondary">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Stage 3: Verify Draft
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-text-muted hidden md:inline">
            Draft v1.1 ready for Reviewer inspection
          </span>
          <Link href="/review">
            <Button variant="primary" size="md" className="text-xs">
              <span>Proceed to Stage 5: Human Review</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
