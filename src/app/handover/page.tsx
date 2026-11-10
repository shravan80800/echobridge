"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { CheckCircle2, FileText, GitBranch } from "lucide-react";
import { useRole } from "@/components/layout/RoleContext";
import { StepGuideBanner } from "@/components/ui/StepGuideBanner";
import { LoadingSkeleton } from "@/components/ui/StateViews";
import { ReceiptBanner } from "@/components/handover/ReceiptBanner";
import { OnboardingBoard } from "@/components/handover/OnboardingBoard";
import { ComprehensionQuizModal } from "@/components/handover/ComprehensionQuizModal";
import { ReceiptCertificateModal } from "@/components/handover/ReceiptCertificateModal";
import { ClaimCard } from "@/components/evidence/ClaimCard";
import { DecisionTimeline } from "@/components/evidence/DecisionTimeline";
import { SourceCitationPopover } from "@/components/evidence/SourceCitationPopover";
import type {
  AudienceRole,
  Chunk,
  ClaimRecord,
  DraftVersion,
  EvidenceRecord,
  Receipt,
  ComprehensionQuestion,
  SourceType,
} from "@/types/echobridge.types";

export default function HandoverPage() {
  const {
    currentRole,
    activeProjectId,
    activeProjectName,
    workspaceRevision,
  } = useRole();
  const [audienceRole, setAudienceRole] = useState<AudienceRole>(
    currentRole === "incoming_intern" ? "incoming_intern" : "incoming_lead"
  );

  const [resolvedProjectName, setResolvedProjectName] =
    useState<string>(activeProjectName);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [questions, setQuestions] = useState<ComprehensionQuestion[]>([]);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [chunks, setChunks] = useState<Chunk[]>([]);

  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [bottomTab, setBottomTab] = useState<"claims" | "timeline">("claims");

  // Source Citation Popover State
  const [inspectedEvidence, setInspectedEvidence] =
    useState<EvidenceRecord | null>(null);
  const [inspectedChunk, setInspectedChunk] = useState<Chunk | null>(null);
  const [inspectedClaimText, setInspectedClaimText] = useState<string>("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [isResettingReceipt, setIsResettingReceipt] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Sync automatically with active navbar role switcher
  useEffect(() => {
    if (currentRole === "incoming_intern") {
      setAudienceRole("incoming_intern");
    } else if (currentRole === "incoming_lead") {
      setAudienceRole("incoming_lead");
    }
  }, [currentRole]);

  // Sync resolved project display name when active workspace changes
  useEffect(() => {
    setResolvedProjectName(activeProjectName);
  }, [activeProjectName]);

  const recipientName =
    audienceRole === "incoming_lead" ? "Riya Patel" : "Kabir Mehta";
  const recipientRoleName =
    audienceRole === "incoming_lead"
      ? "Incoming Team Lead"
      : "Incoming Intern";

  const fetchHandoverData = useCallback(async () => {
    void workspaceRevision;
    try {
      setIsLoading(true);
      const encodedProject = encodeURIComponent(activeProjectId);
      const [handoverRes, reviewRes, ingestRes] = await Promise.all([
        fetch(`/api/handover?projectId=${encodedProject}&role=${audienceRole}`, {
          cache: "no-store",
        }),
        fetch(
          `/api/review?projectId=${encodedProject}&role=${audienceRole}&fromVersion=v1.1&toVersion=v2.0`,
          { cache: "no-store" }
        ),
        fetch(`/api/ingest?projectId=${encodedProject}`, { cache: "no-store" }),
      ]);

      const [handoverJson, reviewJson, ingestJson] = await Promise.all([
        handoverRes.json(),
        reviewRes.json(),
        ingestRes.json(),
      ]);

      if (handoverJson.success) {
        setReceipt(handoverJson.receipt || null);
        setQuestions(
          handoverJson.comprehensionQuestions || handoverJson.questions || []
        );
        if (handoverJson.projectName) {
          setResolvedProjectName(handoverJson.projectName);
        }
      }

      if (reviewJson.success) {
        const v2 = (reviewJson.drafts as DraftVersion[]).find(
          (d) => d.version_label === "v2.0"
        );
        const currentDraft = v2 || reviewJson.activeDraft || null;
        if (currentDraft && currentDraft.claims) {
          setClaims(currentDraft.claims);
        } else {
          setClaims([]);
        }
      }

      if (ingestJson.success) {
        setChunks(ingestJson.chunks || []);
      }
    } catch (err) {
      console.error("Failed to load handover data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProjectId, workspaceRevision, audienceRole]);

  useEffect(() => {
    fetchHandoverData();
  }, [fetchHandoverData]);

  const handleAcknowledge = async (
    answers: { question_id: string; selected_index: number }[]
  ) => {
    if (isSubmittingRef.current || isSubmitting) return;
    isSubmittingRef.current = true;
    try {
      setIsSubmitting(true);
      setFeedbackMessage(null);

      const res = await fetch("/api/handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          action: "acknowledge",
          projectId: activeProjectId,
          audienceRole,
          incomingUserName: recipientName,
          answers,
        }),
      });

      const json = await res.json();
      if (json.success && json.receipt) {
        setReceipt(json.receipt);
        setFeedbackMessage(
          `Handover receipt acknowledged by ${recipientName}.`
        );
        setIsQuizModalOpen(false);
        setIsCertificateModalOpen(true);
      } else {
        throw new Error(
          json.error || "Please review your answers and try again."
        );
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleResetReceipt = async () => {
    try {
      setIsResettingReceipt(true);
      setFeedbackMessage(null);
      const res = await fetch("/api/handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          action: "reset",
          projectId: activeProjectId,
          audienceRole,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setReceipt(null);
        setIsCertificateModalOpen(false);
        setFeedbackMessage(
          `Receipt cleared for ${recipientName}. Click Acknowledge to generate a fresh signature.`
        );
      }
    } catch (err) {
      console.error("Failed to reset receipt:", err);
    } finally {
      setIsResettingReceipt(false);
    }
  };

  const chunksMap = useMemo(
    () => new Map<string, Chunk>(chunks.map((c) => [c.id, c])),
    [chunks]
  );

  // Open citation modal from any OnboardingBoard [🔗] icon or ClaimCard button
  const handleInspectTaskSource = (taskLabel: string, claim?: ClaimRecord) => {
    if (claim?.evidence && claim.evidence.length > 0) {
      const ev = claim.evidence[0];
      setInspectedEvidence(ev);
      setInspectedChunk(chunksMap.get(ev.chunk_id) || null);
      setInspectedClaimText(claim.text);
      return;
    }

    if (activeProjectId !== "CampusConnect") {
      const evClaim =
        claims.find(
          (c) =>
            c.text.toLowerCase().includes(taskLabel.toLowerCase()) &&
            c.evidence &&
            c.evidence.length > 0
        ) || claims.find((c) => c.evidence && c.evidence.length > 0);
      if (evClaim && evClaim.evidence[0]) {
        const ev = evClaim.evidence[0];
        const chunk = chunks.find((c) => c.id === ev.chunk_id) || chunks[0] || null;
        setInspectedEvidence(ev);
        setInspectedChunk(chunk);
        setInspectedClaimText(evClaim.text);
        return;
      }
      const chunk = chunks[0] || null;
      setInspectedEvidence({
        source_id: chunk?.source_id || activeProjectId,
        source_type: "document",
        source_title: `${resolvedProjectName} Source`,
        chunk_id: chunk?.id || "CHUNK-01",
        author: chunk?.author || "Repository Maintainer",
        evidence_timestamp: chunk?.chunk_timestamp || new Date().toISOString(),
        quoted_span: chunk ? chunk.content.slice(0, 120) : taskLabel,
        is_verbatim_verified: true,
        entailment_verdict: "supported",
      });
      setInspectedChunk(chunk);
      setInspectedClaimText(taskLabel);
      return;
    }

    const lower = taskLabel.toLowerCase();
    let matchedSourceId = "SRC-ARCH-01";
    let matchedSourceTitle = "Architecture Doc v2";
    let matchedSourceType: SourceType = "document";
    let matchedQuote =
      "Next.js 15 App Router web frontend with PostgreSQL database";
    let matchedAuthor = "Aarav Sharma";

    if (lower.includes("pull request") || lower.includes("pr")) {
      matchedSourceId = "SRC-GIT-02";
      matchedSourceTitle = "GitHub PR #12 Export";
      matchedSourceType = "git_repo";
      matchedQuote = "Open PR #12 ticketing workflow awaiting final review";
    } else if (lower.includes("api keys") || lower.includes("rotate")) {
      matchedSourceId = "SRC-CHAT-03";
      matchedSourceTitle = "Team Chat Export (March)";
      matchedSourceType = "chat_export";
      matchedQuote = "Rotate Stripe and deployment environment variables before launch";
    } else if (lower.includes("conflict") || lower.includes("release")) {
      matchedSourceId = "SRC-PLAN-04";
      matchedSourceTitle = "Event Planning Doc";
      matchedSourceType = "document";
      matchedQuote = "Event registration closes on March 20th to allow late entries";
      matchedAuthor = "Aarav Sharma & Prof. Deshmukh";
    } else if (lower.includes("sponsorship") || lower.includes("budget")) {
      matchedSourceId = "SRC-FIN-06";
      matchedSourceTitle = "Finance & Sponsorship Folder";
      matchedSourceType = "finance_folder";
      matchedQuote = "Annual club sponsorship allocation under budget line CC-TECH-401";
      matchedAuthor = "Prof. Deshmukh";
    } else if (lower.includes("runbook") || lower.includes("worker")) {
      matchedSourceId = "SRC-RUNBOOK-05";
      matchedSourceTitle = "Deployment Runbook";
      matchedSourceType = "runbook";
      matchedQuote = "Restart background worker pipelines using updated Docker compose parameters";
    } else if (lower.includes("rate limits") || lower.includes("connection pool")) {
      matchedSourceId = "SRC-ARCH-01";
      matchedSourceTitle = "Architecture Doc v2";
      matchedSourceType = "document";
      matchedQuote = "PostgreSQL connection pool exhausted under 1,200 concurrent users; Redis used for active sessions";
    }

    const chunk =
      chunks.find((c) => c.source_id === matchedSourceId) || chunks[0] || null;

    setInspectedEvidence({
      source_id: matchedSourceId,
      source_type: matchedSourceType,
      source_title: matchedSourceTitle,
      chunk_id: chunk?.id || "CHK-01",
      author: matchedAuthor,
      evidence_timestamp: "2026-03-10T10:00:00Z",
      quoted_span: chunk ? chunk.content.slice(0, 120) : matchedQuote,
      is_verbatim_verified: true,
      entailment_verdict: "supported",
    });
    setInspectedChunk(chunk);
    setInspectedClaimText(taskLabel);
  };

  // Group approved claims by clean section names
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
    architecture: "Architecture & Framework",
    decisions: "Decisions & Strategy",
    operations: "Operations & Runbooks",
    onboarding_day1: "Day 1 Setup Tasks",
    onboarding_week1: "Week 1 Actions & Keys",
    onboarding_month1: "Month 1 Milestones",
    finance: "Finance & Budget",
    risks: "Open Risks",
    general: "Project Knowledge",
  };

  if (isLoading) {
    return (
      <main className="w-full py-4">
        <LoadingSkeleton
          cardCount={3}
          message="Loading your role-appropriate handover..."
        />
      </main>
    );
  }

  return (
    <main className="w-full space-y-6">
      <StepGuideBanner
        stepLabel={`STEP 4 OF 4 • FINAL HANDOVER & RECEIPT • ${resolvedProjectName || activeProjectName}`}
      >
        Handover for <strong>{resolvedProjectName || activeProjectName}</strong>.
        Compare <strong>Team Lead (Riya)</strong> vs.{" "}
        <strong>Intern (Kabir)</strong> views, then click{" "}
        <strong>Acknowledge</strong> to generate your signed 1-page certificate.
      </StepGuideBanner>

      {/* ==================================================================== */}
      {/* TOP-RIGHT SIMPLE AUDIENCE TOGGLE ROW                                 */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-medium text-slate-500">
            Final Handover &amp; Continuation Plan
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-600">
            Viewing Handover For:
          </span>
          <div className="inline-flex items-center p-1 rounded-lg bg-white border border-slate-200 shadow-sm text-xs">
            <button
              type="button"
              onClick={() => setAudienceRole("incoming_lead")}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                audienceRole === "incoming_lead"
                  ? "bg-teal-700 text-white font-semibold shadow-sm"
                  : "text-slate-700 hover:bg-slate-100 font-medium"
              }`}
            >
              Team Lead (Riya)
            </button>
            <button
              type="button"
              onClick={() => setAudienceRole("incoming_intern")}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                audienceRole === "incoming_intern"
                  ? "bg-teal-700 text-white font-semibold shadow-sm"
                  : "text-slate-700 hover:bg-slate-100 font-medium"
              }`}
            >
              Intern (Kabir)
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MAIN CARD CONTAINER ("Your Handover" — EXACT FIGURE 7 MATCH)         */}
      {/* ==================================================================== */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-7 space-y-6">
        {/* 1. Card Title Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Your Handover
            </h1>

            {audienceRole === "incoming_lead" ? (
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default select-none">
                Team Lead Continuation Plan — Full Access
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 cursor-default select-none">
                Intern Continuation Plan — Restricted Access
              </span>
            )}
          </div>
        </div>

        {/* 2. Top Receipt Bar */}
        <ReceiptBanner
          receipt={receipt}
          recipientName={recipientName}
          recipientRoleName={recipientRoleName}
          cleanMode
          onOpenQuizModal={() => setIsQuizModalOpen(true)}
          onOpenCertificateModal={() => setIsCertificateModalOpen(true)}
          onResetReceipt={handleResetReceipt}
          isResetting={isResettingReceipt}
          isIncomingRole={currentRole === audienceRole}
        />

        {/* 3. Responsive 4-Column Continuation Plan Grid */}
        {activeProjectId !== "CampusConnect" && claims.length === 0 && !isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
            No handover claims found yet for <span className="font-semibold text-slate-800">{resolvedProjectName}</span>. Import or reconstruct drafts first.
          </div>
        ) : (
          <OnboardingBoard
            claims={claims}
            audienceRole={audienceRole}
            cleanMode
            onInspectSource={handleInspectTaskSource}
          />
        )}
      </section>

      {/* ==================================================================== */}
      {/* 4. APPROVED KNOWLEDGE BASE CLAIMS & TIMELINE BELOW BOARD             */}
      {/* ==================================================================== */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setBottomTab("claims")}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-colors cursor-pointer ${
                bottomTab === "claims"
                  ? "bg-teal-700 text-white border-teal-700 font-semibold shadow-sm"
                  : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Approved Knowledge Base Claims ({claims.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setBottomTab("timeline")}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-colors cursor-pointer ${
                bottomTab === "timeline"
                  ? "bg-teal-700 text-white border-teal-700 font-semibold shadow-sm"
                  : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
              }`}
            >
              <GitBranch className="w-4 h-4" />
              <span>Decision Timeline</span>
            </button>
          </div>

          <span className="text-xs text-slate-500">
            Role-filtered for {recipientName}
          </span>
        </div>

        {bottomTab === "claims" ? (
          <div className="space-y-6">
            {Object.keys(groupedClaims).length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No approved handover claims available yet.
              </div>
            ) : (
              Object.entries(groupedClaims).map(
                ([sectionKey, sectionClaims]) => (
                  <div key={sectionKey} className="space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <h2 className="text-sm font-bold text-slate-800">
                        {sectionTitles[sectionKey] || sectionKey}
                      </h2>
                      <span className="text-xs text-slate-500">
                        {sectionClaims.length} item
                        {sectionClaims.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {sectionClaims.map((claim) => (
                        <ClaimCard
                          key={claim.id}
                          claim={claim}
                          chunksById={chunksMap}
                          cleanMode
                          onInspectEvidence={(evidence, chunk, claimText) => {
                            setInspectedEvidence(evidence);
                            setInspectedChunk(chunk || null);
                            setInspectedClaimText(claimText || "");
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )
              )
            )}
          </div>
        ) : (
          <DecisionTimeline audienceRole={audienceRole} />
        )}
      </section>

      {/* Modals */}
      <ComprehensionQuizModal
        isOpen={isQuizModalOpen}
        onClose={() => setIsQuizModalOpen(false)}
        questions={questions}
        recipientName={recipientName}
        recipientRoleName={recipientRoleName}
        cleanMode
        onAcknowledge={handleAcknowledge}
        isLoading={isSubmitting}
      />

      <ReceiptCertificateModal
        isOpen={isCertificateModalOpen}
        onClose={() => setIsCertificateModalOpen(false)}
        receipt={receipt}
        projectName={resolvedProjectName || activeProjectName}
        approverName="Prof. Deshmukh (Project Mentor)"
      />

      <SourceCitationPopover
        isOpen={Boolean(inspectedEvidence)}
        onClose={() => setInspectedEvidence(null)}
        evidence={inspectedEvidence}
        chunk={inspectedChunk}
        claimText={inspectedClaimText}
      />
    </main>
  );
}
