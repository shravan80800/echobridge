"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Award,
  Layers,
  Sparkles,
  BarChart2,
  Lock,
  FileCheck2,
  HelpCircle,
  Clock,
  User,
  Copy,
  Check,
} from "lucide-react";
import { useRole } from "@/components/layout/RoleContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSkeleton } from "@/components/ui/StateViews";
import { ReceiptBanner } from "@/components/handover/ReceiptBanner";
import { OnboardingBoard } from "@/components/handover/OnboardingBoard";
import { ComprehensionQuizModal } from "@/components/handover/ComprehensionQuizModal";
import { ReceiptCertificateModal } from "@/components/handover/ReceiptCertificateModal";
import { DecisionTimeline } from "@/components/evidence/DecisionTimeline";
import { ClaimCard } from "@/components/evidence/ClaimCard";
import type {
  AudienceRole,
  ClaimRecord,
  DraftVersion,
  Receipt,
  ComprehensionQuestion,
} from "@/types/echobridge.types";

export default function HandoverPage() {
  const { currentRole, switchRole } = useRole();
  const [audienceRole, setAudienceRole] = useState<AudienceRole>(
    currentRole === "incoming_intern" ? "incoming_intern" : "incoming_lead"
  );

  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [questions, setQuestions] = useState<ComprehensionQuestion[]>([]);
  const [draftV2, setDraftV2] = useState<DraftVersion | null>(null);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);

  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [showRestrictedPlaceholders, setShowRestrictedPlaceholders] = useState(true);
  const [activeTab, setActiveTab] = useState<"board" | "claims" | "quiz_cert" | "timeline">("board");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Sync with global role switcher automatically
  useEffect(() => {
    if (currentRole === "incoming_intern") {
      setAudienceRole("incoming_intern");
    } else if (currentRole === "incoming_lead") {
      setAudienceRole("incoming_lead");
    }
  }, [currentRole]);

  const recipientName =
    audienceRole === "incoming_lead" ? "Riya Patel" : "Kabir Mehta";
  const recipientRoleName =
    audienceRole === "incoming_lead" ? "Incoming Team Lead" : "Incoming Intern";

  // Fetch receipt and draft data
  const fetchHandoverData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [receiptRes, reviewRes] = await Promise.all([
        fetch(`/api/receipt?projectId=CampusConnect&role=${audienceRole}`),
        fetch(`/api/review?projectId=CampusConnect&role=${audienceRole}&fromVersion=v1.1&toVersion=v2.0`),
      ]);

      const [receiptJson, reviewJson] = await Promise.all([
        receiptRes.json(),
        reviewRes.json(),
      ]);

      if (receiptJson.success) {
        setReceipt(receiptJson.receipt || null);
        setQuestions(receiptJson.questions || []);
      }

      if (reviewJson.success) {
        const v2 = (reviewJson.drafts as DraftVersion[]).find(
          (d) => d.version_label === "v2.0"
        );
        const currentDraft = v2 || reviewJson.activeDraft || null;
        setDraftV2(currentDraft);
        if (currentDraft && currentDraft.claims) {
          setClaims(currentDraft.claims);
        }
      }
    } catch (err) {
      console.error("Failed to load handover data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [audienceRole]);

  useEffect(() => {
    fetchHandoverData();
  }, [fetchHandoverData]);

  // Acknowledge receipt after passing comprehension quiz
  const handleAcknowledge = async (
    answers: { question_id: string; selected_index: number }[]
  ) => {
    try {
      setIsSubmitting(true);
      setFeedbackMessage(null);

      const res = await fetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "acknowledge",
          projectId: "CampusConnect",
          audienceRole,
          incomingUserName: recipientName,
          answers,
        }),
      });

      const json = await res.json();
      if (json.success && json.receipt) {
        setReceipt(json.receipt);
        setFeedbackMessage(
          `Handover transfer acknowledged! Cryptographic signature: ${json.receipt.receipt_hash}`
        );
        setIsCertificateModalOpen(true);
      } else {
        throw new Error(
          json.error || "Comprehension check failed. Please review your answers."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyHash = () => {
    if (!receipt?.receipt_hash) return;
    navigator.clipboard.writeText(receipt.receipt_hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Group claims by section for Tab 1
  const groupedClaims = useMemo(() => {
    const groups: Record<string, ClaimRecord[]> = {};
    for (const claim of claims) {
      const sec = claim.section || "general";
      if (!groups[sec]) groups[sec] = [];
      groups[sec].push(claim);
    }
    return groups;
  }, [claims]);

  const sectionTitles: Record<string, string> = {
    architecture: "Architecture & System Decisions",
    operations: "Operations & Runbooks",
    onboarding_day1: "Day 1 Setup Tasks",
    onboarding_week1: "Week 1 Actions & Keys",
    onboarding_month1: "Month 1 Milestones",
    finance: "Finance & Sponsorship (Restricted Scope)",
    risks: "Open Operational Risks",
    general: "General Project Knowledge",
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-canvas px-4 py-8 md:px-8 max-w-7xl mx-auto">
        <LoadingSkeleton
          cardCount={3}
          message="Loading Approved Handover Continuation Plan..."
          steps={[
            "Checking audience permission scope (Lead vs. Intern)...",
            "Loading verified continuation tasks for Day 1, Week 1, Month 1...",
            "Validating receipt acknowledgement and signature status...",
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
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-accent-primary/20 border border-accent-primary/40 text-accent-cyan uppercase">
              Stage 6 of 6: Handover Delivery &amp; Receipt
            </span>
            <span className="text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              ADR-007 Verified Transfer
            </span>
          </div>

          {/* Heading matches Figure 7 and E2E test regex /Role-Appropriate Handover & Continuation Plan/i */}
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary flex flex-wrap items-center gap-3">
            <span>Your Handover: Role-Appropriate Handover &amp; Continuation Plan</span>
            <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
              audienceRole === "incoming_lead"
                ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                : "bg-teal-500/15 border-teal-500/30 text-teal-300"
            }`}>
              {audienceRole === "incoming_lead"
                ? "Team Lead Continuation Plan — Riya Patel"
                : "Intern Continuation Plan — Kabir Mehta"}
            </span>
          </h1>

          <p className="text-sm text-text-secondary mt-1 max-w-2xl">
            Approved continuation package tailored for <strong className="text-text-primary">{recipientRoleName}</strong>. Review your Day 1, Week 1, and Month 1 continuation tasks and complete the risk comprehension check.
          </p>
        </div>

        {/* Header Right Actions & Preview Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
          {/* Subtle Preview Pill for Reviewer or Departing Member */}
          {(currentRole === "reviewer" || currentRole === "departing_member") && (
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-surface border border-border-subtle text-xs font-mono">
              <span className="text-[10px] text-text-muted px-1.5 uppercase font-bold">
                Preview:
              </span>
              <button
                type="button"
                onClick={() => setAudienceRole("incoming_lead")}
                className={`px-2.5 py-1 rounded text-xs transition-all ${
                  audienceRole === "incoming_lead"
                    ? "bg-accent-primary text-white font-bold"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Lead (Riya)
              </button>
              <button
                type="button"
                onClick={() => setAudienceRole("incoming_intern")}
                className={`px-2.5 py-1 rounded text-xs transition-all ${
                  audienceRole === "incoming_intern"
                    ? "bg-accent-primary text-white font-bold"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Intern (Kabir)
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Link href="/review">
              <Button variant="ghost" size="sm" className="text-xs text-text-secondary">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Stage 5: Review
              </Button>
            </Link>

            <Link href="/metrics">
              <Button variant="primary" size="sm" className="text-xs">
                <BarChart2 className="w-3.5 h-3.5 mr-1.5" />
                <span>Metrics Scorecard</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Role Confirmation & Scope Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-surface border border-border-subtle text-xs">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-text-muted uppercase text-[11px] font-bold">
            Active Audience Scope:
          </span>
          <span className={`px-2.5 py-1 rounded-md font-mono text-xs font-bold border ${
            audienceRole === "incoming_lead"
              ? "bg-indigo-950/40 border-indigo-500/40 text-indigo-300"
              : "bg-teal-950/40 border-teal-500/40 text-teal-300"
          }`}>
            {audienceRole === "incoming_lead"
              ? "✓ Full Team Lead Scope (Includes Finance & Deployment Keys)"
              : "🔒 Intern Restricted Scope (Finance Hidden via Two-Barrier RBAC)"}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-text-secondary">
          <span className="px-2 py-0.5 rounded bg-canvas border border-border-subtle">
            Approved Version: {draftV2?.version_label || "v2.0"} (Score: {draftV2?.confidence?.total_score || 89}%)
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
            className="font-mono text-xs text-emerald-400 hover:text-emerald-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Receipt Bar (Exact Match to Figure 7) */}
      <ReceiptBanner
        receipt={receipt}
        recipientName={recipientName}
        recipientRoleName={recipientRoleName}
        onOpenQuizModal={() => setIsQuizModalOpen(true)}
        onOpenCertificateModal={() => setIsCertificateModalOpen(true)}
        isIncomingRole={currentRole === audienceRole}
      />

      {/* 4-Column Continuation Grid (Figure 7 Core Board) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent-cyan" />
            <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-text-primary">
              Continuation Board (Figure 7: Day 1, Week 1, Month 1 &amp; Risks)
            </h2>
          </div>
          <span className="text-xs font-mono text-text-muted">
            Click [🔗] to trace evidence ground truth
          </span>
        </div>

        <OnboardingBoard
          claims={claims}
          audienceRole={audienceRole}
          showRestrictedPlaceholders={showRestrictedPlaceholders}
        />
      </div>

      {/* Section Tabs below the Continuation Board */}
      <div className="border-t border-border-subtle pt-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("board")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 ${
              activeTab === "board"
                ? "bg-accent-primary text-white shadow-sm"
                : "bg-surface text-text-secondary hover:text-text-primary border border-border-subtle"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Continuation Board View</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("claims")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 ${
              activeTab === "claims"
                ? "bg-accent-primary text-white shadow-sm"
                : "bg-surface text-text-secondary hover:text-text-primary border border-border-subtle"
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>📋 Approved Handover Claims ({claims.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("quiz_cert")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 ${
              activeTab === "quiz_cert"
                ? "bg-accent-primary text-white shadow-sm"
                : "bg-surface text-text-secondary hover:text-text-primary border border-border-subtle"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>🎓 Risk Comprehension &amp; Transfer Certificate</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 ${
              activeTab === "timeline"
                ? "bg-accent-primary text-white shadow-sm"
                : "bg-surface text-text-secondary hover:text-text-primary border border-border-subtle"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>🧭 Architectural Decision Timeline (&quot;Why&quot; Cards)</span>
          </button>
        </div>

        {/* Tab 1 Content: Approved Handover Claims (By Section) */}
        {activeTab === "claims" && (
          <div className="space-y-6">
            <div className="p-3.5 rounded-xl bg-surface border border-border-subtle text-xs text-text-secondary flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-400" />
                <span>
                  All claims below have been verified by the human reviewer (Prof. Deshmukh) and published in <strong>Draft v2.0</strong>.
                </span>
              </div>
              <span className="font-mono text-[11px] text-text-muted">
                {claims.length} Approved Claims
              </span>
            </div>

            {Object.keys(groupedClaims).length === 0 ? (
              <div className="text-center py-8 text-text-muted font-mono text-xs">
                No approved claims found for this audience.
              </div>
            ) : (
              Object.entries(groupedClaims).map(([sectionKey, sectionClaims]) => (
                <div key={sectionKey} className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-border-subtle pb-1.5">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-accent-cyan">
                      {sectionTitles[sectionKey] || sectionKey} ({sectionClaims.length})
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {sectionClaims.map((claim) => (
                      <ClaimCard key={claim.id} claim={claim} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2 Content: Risk Comprehension Quiz & Transfer Certificate */}
        {activeTab === "quiz_cert" && (
          <div className="space-y-5">
            {/* Certificate / Receipt Summary Banner */}
            <Card className="p-5 bg-surface border-border-subtle space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-accent-cyan" />
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">
                      Cryptographic Handover Transfer Verification (ADR-007)
                    </h3>
                    <p className="text-xs text-text-muted">
                      Comprehension-guarded receipt prevents blind acknowledgement of critical inherited project risks.
                    </p>
                  </div>
                </div>

                {receipt ? (
                  <Button
                    variant="approve"
                    size="sm"
                    onClick={() => setIsCertificateModalOpen(true)}
                    className="text-xs font-mono bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <Award className="w-3.5 h-3.5 mr-1.5" />
                    View Certificate Modal
                  </Button>
                ) : (
                  <Button
                    variant="approve"
                    size="sm"
                    onClick={() => setIsQuizModalOpen(true)}
                    className="text-xs font-mono bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                    Take Comprehension Check
                  </Button>
                )}
              </div>

              {receipt ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-canvas border border-emerald-500/30 space-y-1">
                    <span className="text-[10px] text-text-muted uppercase font-bold block">
                      Status &amp; Comprehension:
                    </span>
                    <span className="text-emerald-400 font-bold text-sm flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Passed ({receipt.comprehension_score}%)
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-canvas border border-border-subtle space-y-1">
                    <span className="text-[10px] text-text-muted uppercase font-bold block">
                      Acknowledged Recipient:
                    </span>
                    <span className="text-text-primary font-semibold">
                      {receipt.incoming_user_name} ({recipientRoleName})
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-canvas border border-border-subtle space-y-1">
                    <span className="text-[10px] text-text-muted uppercase font-bold block">
                      Cryptographic SHA-256 Hash:
                    </span>
                    <div className="flex items-center gap-1 text-emerald-300">
                      <span className="truncate max-w-[160px]">
                        {receipt.receipt_hash || "0x9f2a4b8..."}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyHash}
                        className="text-text-muted hover:text-text-primary p-0.5"
                        title="Copy hash"
                      >
                        {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Receipt has not yet been acknowledged. The incoming member must answer the 3 risk questions correctly to receive a cryptographically signed transfer certificate.
                  </span>
                </div>
              )}
            </Card>

            {/* The 3 Comprehension Questions Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-text-secondary">
                  Audited Critical Risk Questions (3 Required Checks)
                </h4>
                <span className="text-[11px] font-mono text-emerald-400">
                  100% Pass Threshold
                </span>
              </div>

              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl bg-surface border border-border-subtle space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-accent-primary/20 text-accent-cyan font-mono font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-text-primary">
                        {q.question}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-canvas border border-border-subtle text-text-muted">
                      {q.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7 pt-1 font-mono text-[11px]">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = optIdx === q.correct_option_index;
                      return (
                        <div
                          key={optIdx}
                          className={`p-2 rounded-lg border flex items-center gap-2 ${
                            isCorrect
                              ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                              : "bg-canvas border-border-subtle text-text-muted"
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                            isCorrect ? "bg-emerald-500 text-black" : "bg-border-subtle text-text-muted"
                          }`}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt}</span>
                          {isCorrect && (
                            <span className="ml-auto text-[9px] uppercase px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                              Verified
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <p className="text-[11px] text-text-secondary pl-7 pt-1 italic">
                      Mentor Resolution: {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3 Content: Architectural Decision Timeline */}
        {activeTab === "timeline" && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-surface border border-border-subtle text-xs text-text-secondary flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent-cyan" />
                <span>
                  Chronological trail of architectural decisions and their &quot;Why&quot; rationale for <strong>{recipientRoleName}</strong>.
                </span>
              </div>
              <span className="font-mono text-[11px] text-text-muted">
                Historical Context
              </span>
            </div>

            <DecisionTimeline audienceRole={audienceRole} />
          </div>
        )}
      </div>

      {/* Interactive Comprehension Quiz Modal */}
      <ComprehensionQuizModal
        isOpen={isQuizModalOpen}
        onClose={() => setIsQuizModalOpen(false)}
        questions={questions}
        recipientName={recipientName}
        recipientRoleName={recipientRoleName}
        onAcknowledge={handleAcknowledge}
        isLoading={isSubmitting}
      />

      {/* Verification Certificate Modal */}
      <ReceiptCertificateModal
        isOpen={isCertificateModalOpen}
        onClose={() => setIsCertificateModalOpen(false)}
        receipt={receipt}
        projectName="CampusConnect"
        approverName="Prof. Deshmukh (Project Mentor)"
      />

      {/* Bottom Navigation Toolbar */}
      <div className="flex items-center justify-between pt-6 border-t border-border-subtle">
        <Link href="/review">
          <Button variant="ghost" size="sm" className="text-xs text-text-secondary">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Stage 5: Review
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-text-muted hidden md:inline">
            Verify all 8 planted test traps on the evaluation scorecard
          </span>
          <Link href="/metrics">
            <Button variant="primary" size="md" className="text-xs">
              <BarChart2 className="w-4 h-4 mr-2" />
              <span>Proceed to Metrics Scorecard</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
