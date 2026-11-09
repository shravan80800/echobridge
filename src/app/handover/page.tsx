"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Send,
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
import type {
  AudienceRole,
  ClaimRecord,
  DraftVersion,
  Receipt,
  ComprehensionQuestion,
} from "@/types/echobridge.types";

export default function HandoverPage() {
  const { currentRole, currentProfile } = useRole();
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
  const [activeTab, setActiveTab] = useState<"onboarding" | "timeline">("onboarding");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Sync with global role switcher if user switches to intern or lead
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
            <span className="text-xs font-mono text-text-muted">
              ADR-007 Verified Transfer
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
            Role-Appropriate Handover &amp; Continuation Plan
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl">
            Approved handover package tailored for <strong className="text-text-primary">{recipientRoleName}</strong>. Review your Day 1, Week 1, and Month 1 continuation tasks and complete the risk comprehension check.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/review">
            <Button variant="ghost" size="sm" className="text-xs text-text-secondary">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Stage 5: Review
            </Button>
          </Link>

          <Link href="/metrics">
            <Button variant="primary" size="sm" className="text-xs">
              <BarChart2 className="w-3.5 h-3.5 mr-1.5" />
              <span>Metrics &amp; 8-Trap Scorecard</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Audience Scope Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-surface border border-border-subtle text-xs">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-text-muted uppercase text-[11px]">
            Audience View:
          </span>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <button
              type="button"
              onClick={() => setAudienceRole("incoming_lead")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                audienceRole === "incoming_lead"
                  ? "bg-accent-primary text-white font-bold shadow-sm"
                  : "bg-canvas text-text-secondary hover:text-text-primary border border-border-subtle"
              }`}
            >
              Team Lead View (Riya)
            </button>

            <button
              type="button"
              onClick={() => setAudienceRole("incoming_intern")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                audienceRole === "incoming_intern"
                  ? "bg-accent-primary text-white font-bold shadow-sm"
                  : "bg-canvas text-text-secondary hover:text-text-primary border border-border-subtle"
              }`}
            >
              Intern View (Kabir)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-text-secondary">
          <span className="px-2 py-0.5 rounded bg-canvas border border-border-subtle">
            Approved Version: {draftV2?.version_label || "v2.0"} (Score: {draftV2?.confidence?.total_score || 89}%)
          </span>
        </div>
      </div>

      {/* Feedback Toast */}
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

      {/* Top Receipt Status Banner */}
      <ReceiptBanner
        receipt={receipt}
        recipientName={recipientName}
        recipientRoleName={recipientRoleName}
        onOpenQuizModal={() => setIsQuizModalOpen(true)}
        onOpenCertificateModal={() => setIsCertificateModalOpen(true)}
        isIncomingRole={currentRole === audienceRole}
      />

      {/* Recipient Package View Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("onboarding")}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
            activeTab === "onboarding"
              ? "bg-accent-primary text-white shadow-md"
              : "bg-surface text-text-secondary hover:text-text-primary border border-border-subtle"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Continuation Board (Day 1 / Week 1 / Month 1)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("timeline")}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
            activeTab === "timeline"
              ? "bg-accent-primary text-white shadow-md"
              : "bg-surface text-text-secondary hover:text-text-primary border border-border-subtle"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Architectural Decision Timeline (&quot;Why&quot; Cards)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-200">
            Historical Rationale
          </span>
        </button>
      </div>

      {/* Conditional View: 3-Column Continuation Board vs. Decision Timeline */}
      {activeTab === "onboarding" ? (
        <OnboardingBoard
          claims={claims}
          audienceRole={audienceRole}
          showRestrictedPlaceholders={showRestrictedPlaceholders}
        />
      ) : (
        <DecisionTimeline audienceRole={audienceRole} />
      )}

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
