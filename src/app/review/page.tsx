"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  GitCompare,
  CheckCircle2,
  Shield,
  Lock,
  Check,
  Edit3,
  XCircle,
  Scissors,
  ArrowRight,
  Info,
} from "lucide-react";
import { useRole } from "@/components/layout/RoleContext";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import { ClaimCard } from "@/components/evidence/ClaimCard";
import { SourceCitationPopover } from "@/components/evidence/SourceCitationPopover";
import { Button } from "@/components/ui/Button";
import { StepGuideBanner } from "@/components/ui/StepGuideBanner";
import { LoadingSkeleton } from "@/components/ui/StateViews";
import { ConflictResolutionCard } from "@/components/review/ConflictResolutionCard";
import type {
  AudienceRole,
  Chunk,
  ClaimRecord,
  DraftVersion,
  EvidenceRecord,
  ReviewStatus,
  VersionLabel,
} from "@/types/echobridge.types";
import type { VersionDiffSummary } from "@/services/workflow/review.service";

export default function ReviewPage() {
  const {
    currentRole,
    currentProfile,
    switchRole,
    activeProjectId,
    activeProjectName,
  } = useRole();
  const [audienceRole, setAudienceRole] =
    useState<AudienceRole>("incoming_lead");
  const [viewMode, setViewMode] = useState<"claims" | "diff">("claims");
  const [fromVersion, setFromVersion] = useState<VersionLabel>("v1.0");
  const [toVersion, setToVersion] = useState<VersionLabel>("v1.1");
  const [activeVersionLabel, setActiveVersionLabel] =
    useState<VersionLabel>("v1.1");

  const [drafts, setDrafts] = useState<DraftVersion[]>([]);
  const [activeDraft, setActiveDraft] = useState<DraftVersion | null>(null);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [conflicts, setConflicts] = useState<ClaimRecord[]>([]);
  const [diff, setDiff] = useState<VersionDiffSummary | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string>("");
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>("all");
  const [showRestrictedPlaceholders, setShowRestrictedPlaceholders] =
    useState(true);

  // Inline edit state in Actions Panel
  const [isEditingSelected, setIsEditingSelected] = useState(false);
  const [editText, setEditText] = useState("");

  // Citation Popover state
  const [inspectedEvidence, setInspectedEvidence] =
    useState<EvidenceRecord | null>(null);
  const [inspectedChunk, setInspectedChunk] = useState<Chunk | null>(null);
  const [inspectedClaimText, setInspectedClaimText] = useState<string>("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [publishedSuccess, setPublishedSuccess] = useState(false);

  const isReviewer = currentRole === "reviewer";

  const fetchReviewData = useCallback(async () => {
    try {
      setIsLoading(true);
      const encodedProject = encodeURIComponent(activeProjectId);
      const [reviewRes, ingestRes] = await Promise.all([
        fetch(
          `/api/review?projectId=${encodedProject}&role=${audienceRole}&fromVersion=${fromVersion}&toVersion=${toVersion}`,
          { cache: "no-store" }
        ),
        fetch(`/api/ingest?projectId=${encodedProject}`, { cache: "no-store" }),
      ]);

      const [json, ingestJson] = await Promise.all([
        reviewRes.json(),
        ingestRes.json(),
      ]);

      if (json.success) {
        setDrafts(json.drafts || []);
        setConflicts(json.conflicts || []);
        setDiff(json.diff || null);

        const matched = (json.drafts as DraftVersion[]).find(
          (d) => d.version_label === activeVersionLabel
        );
        const current: DraftVersion | null =
          matched || (json.activeDraft as DraftVersion | null) || null;
        setActiveDraft(current);

        if (current && current.claims) {
          setClaims(current.claims);
          if (
            current.claims.length > 0 &&
            (!selectedClaimId ||
              !current.claims.some((c) => c.id === selectedClaimId))
          ) {
            setSelectedClaimId(current.claims[0].id);
          } else if (current.claims.length === 0) {
            setSelectedClaimId("");
          }
        } else {
          setClaims([]);
          setSelectedClaimId("");
        }
      }

      if (ingestJson.success) {
        setChunks(ingestJson.chunks || []);
      }
    } catch (err) {
      console.error("Failed to load review data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [
    activeProjectId,
    audienceRole,
    fromVersion,
    toVersion,
    activeVersionLabel,
    selectedClaimId,
  ]);

  useEffect(() => {
    fetchReviewData();
  }, [fetchReviewData]);

  const handleReviewClaim = async (
    claimId: string,
    action: ReviewStatus,
    editedText?: string
  ) => {
    if (!isReviewer) {
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedbackMessage(null);

      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review_claim",
          claimId,
          reviewAction: action,
          editedText,
          actorRole: currentRole,
          reviewerName: currentProfile.name,
          projectId: activeProjectId,
          audienceRole,
        }),
      });

      const json = await res.json();
      if (json.success && json.claim) {
        const updatedClaim: ClaimRecord = json.claim;
        setClaims((prev) =>
          prev.map((c) =>
            c.id === updatedClaim.id ||
            c.id.replace(/-V1\.[012]|-V2\.0/g, "") ===
              updatedClaim.id.replace(/-V1\.[012]|-V2\.0/g, "")
              ? updatedClaim
              : c
          )
        );
        setFeedbackMessage(
          `Claim marked as '${action}' by ${currentProfile.name}.`
        );
      } else if (!json.success && json.error) {
        setFeedbackMessage(`Error: ${json.error}`);
      }
    } catch (err) {
      console.error("Failed to review claim:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveConflict = async (
    claimId: string,
    winningSide: "side_a" | "side_b" | "custom",
    customText?: string
  ) => {
    if (!isReviewer) return;

    try {
      setIsSubmitting(true);
      setFeedbackMessage(null);

      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve_conflict",
          claimId,
          winningSide,
          customText,
          actorRole: currentRole,
          reviewerName: currentProfile.name,
          projectId: activeProjectId,
          audienceRole,
        }),
      });

      const json = await res.json();
      if (json.success && json.claim) {
        const resolvedClaim: ClaimRecord = json.claim;
        setClaims((prev) =>
          prev.map((c) =>
            c.id === resolvedClaim.id ||
            c.id.replace(/-V1\.[012]|-V2\.0/g, "") ===
              resolvedClaim.id.replace(/-V1\.[012]|-V2\.0/g, "")
              ? resolvedClaim
              : c
          )
        );
        setConflicts([]);
        setFeedbackMessage(
          winningSide === "side_a"
            ? "Conflict resolved: Registration deadline set to March 15th (Team Chat)."
            : "Conflict resolved: Registration deadline set to March 20th (Planning Doc)."
        );
        await fetchReviewData();
      } else if (!json.success && json.error) {
        setFeedbackMessage(`Error: ${json.error}`);
      }
    } catch (err) {
      console.error("Failed to resolve conflict:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveHandover = async () => {
    if (!isReviewer) return;

    try {
      setIsSubmitting(true);
      setFeedbackMessage(null);

      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_handover",
          actorRole: currentRole,
          reviewerName: currentProfile.name,
          projectId: activeProjectId,
          audienceRole,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const v2 = json.data.draftV2_0;
        setActiveVersionLabel("v2.0");
        setToVersion("v2.0");
        setActiveDraft(v2);
        setClaims(v2.claims);
        setPublishedSuccess(true);
        setFeedbackMessage(
          `Handover published! Approved version created with ${v2.confidence.total_score}% confidence.`
        );
        await fetchReviewData();
      } else if (!json.success && json.error) {
        setFeedbackMessage(`Error: ${json.error}`);
      }
    } catch (err) {
      console.error("Failed to approve handover:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectSnapshot = (label: VersionLabel) => {
    setActiveVersionLabel(label);
    const target = drafts.find((d) => d.version_label === label);
    if (target) {
      setActiveDraft(target);
      setClaims(target.claims);
    }
  };

  const selectedClaim =
    claims.find(
      (c) =>
        c.id === selectedClaimId ||
        c.id.replace(/-V1\.[012]|-V2\.0/g, "") ===
          selectedClaimId.replace(/-V1\.[012]|-V2\.0/g, "")
    ) ||
    claims[0] ||
    null;

  const chunksMap = new Map<string, Chunk>(chunks.map((c) => [c.id, c]));

  const visibleClaims = claims.filter((c) => {
    if (audienceRole === "incoming_intern" && !showRestrictedPlaceholders) {
      if (c.evidence_state === "restricted") return false;
    }
    if (
      selectedStateFilter !== "all" &&
      c.evidence_state !== selectedStateFilter
    ) {
      return false;
    }
    return true;
  });

  const sections = [
    { key: "architecture", label: "Architecture & Framework" },
    { key: "decisions", label: "Decisions & Strategy" },
    { key: "operations", label: "Operations & Runbooks" },
    { key: "finance", label: "Finance & Budget" },
    { key: "open_questions", label: "Open Knowledge Gaps" },
  ];

  const getSectionForClaim = (claim: ClaimRecord) => {
    const text = claim.text.toLowerCase();
    const sec = claim.section?.toLowerCase() || "";
    if (
      sec.includes("arch") ||
      text.includes("next.js") ||
      text.includes("architecture")
    ) {
      return "architecture";
    }
    if (
      sec.includes("decis") ||
      text.includes("deadline") ||
      text.includes("redis")
    ) {
      return "decisions";
    }
    if (
      sec.includes("runbook") ||
      sec.includes("operat") ||
      text.includes("deployment") ||
      text.includes("runbook") ||
      text.includes("docker")
    ) {
      return "operations";
    }
    if (
      sec.includes("finan") ||
      text.includes("budget") ||
      text.includes("sponsorship") ||
      claim.evidence_state === "restricted"
    ) {
      return "finance";
    }
    return "open_questions";
  };

  const stateCounts = {
    all: claims.length,
    corroborated: claims.filter((c) => c.evidence_state === "corroborated")
      .length,
    single_source: claims.filter((c) => c.evidence_state === "single_source")
      .length,
    attested: claims.filter((c) => c.evidence_state === "attested").length,
    stale: claims.filter((c) => c.evidence_state === "stale").length,
    conflicting: claims.filter((c) => c.evidence_state === "conflicting")
      .length,
    unsupported: claims.filter((c) => c.evidence_state === "unsupported")
      .length,
    restricted: claims.filter((c) => c.evidence_state === "restricted").length,
  };

  const conflictClaim = conflicts.find(
    (c) => c.evidence_state === "conflicting"
  );
  const confidence = activeDraft?.confidence;
  const confidenceScore = confidence?.total_score ?? 84;

  if (isLoading) {
    return (
      <main className="w-full py-4">
        <LoadingSkeleton
          cardCount={3}
          message="Loading reviewer workspace and verified handover claims..."
        />
      </main>
    );
  }

  return (
    <main className="w-full space-y-5">
      <StepGuideBanner stepLabel={`STEP 3 OF 4 • REVIEW & APPROVE • ${activeProjectName}`}>
        Reviewing <strong>{activeProjectName}</strong>. Click any <strong>View Proof</strong> button to inspect the exact quote from project files, resolve any conflicts, and click <strong>Approve &amp; Publish Handover →</strong>
      </StepGuideBanner>

      {/* ==================================================================== */}
      {/* 1. DEPARTING MEMBER / NON-REVIEWER POLITE NOTICE BAR                 */}
      {/* ==================================================================== */}
      {!isReviewer && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5 text-sm text-amber-950">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              ℹ️ Only a Reviewer (Mentor or Project Lead) can approve the final
              handover. You can preview the draft below.
            </span>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => switchRole("reviewer")}
            className="shrink-0 self-start sm:self-center"
          >
            Switch to Reviewer (Prof. Deshmukh) →
          </Button>
        </div>
      )}

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {publishedSuccess && (
              <Link href="/handover">
                <Button variant="approve" size="sm">
                  Open Final Handover Plan →
                </Button>
              </Link>
            )}
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. MAIN CARD CONTAINER (PROPOSAL FIGURE 3 + FIGURE 4)                */}
      {/* ==================================================================== */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Top Dark Header Bar (Exact Match to Figure 3 on Page 6) */}
        <div className="bg-slate-900 text-white px-5 py-4 rounded-t-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Title */}
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
            Review and Approval
          </h1>

          {/* Center: Segmented Audience Switcher Buttons */}
          <div className="inline-flex items-center p-1 rounded-lg bg-slate-800 border border-slate-700 text-xs self-start sm:self-center">
            <button
              type="button"
              onClick={() => setAudienceRole("incoming_lead")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                audienceRole === "incoming_lead"
                  ? "bg-teal-600 text-white font-semibold shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>Team Lead View</span>
            </button>

            <button
              type="button"
              onClick={() => setAudienceRole("incoming_intern")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                audienceRole === "incoming_intern"
                  ? "bg-teal-600 text-white font-semibold shadow-sm"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Intern View</span>
            </button>
          </div>

          {/* Right: Teal Confidence Pill */}
          <div className="self-start sm:self-center">
            <span className="inline-flex items-center bg-teal-700 text-white rounded-full px-3.5 py-1 text-xs font-semibold cursor-default select-none">
              Confidence {confidenceScore}%
            </span>
          </div>
        </div>

        {/* Clean 2-Mode Sub-Toolbar inside the white card */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Left View Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode("claims")}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-colors cursor-pointer ${
                viewMode === "claims"
                  ? "bg-white text-teal-800 border-teal-300 shadow-sm font-semibold"
                  : "bg-transparent text-slate-600 border-transparent hover:bg-slate-200/60 hover:text-slate-900"
              }`}
            >
              📄 All Handover Claims (Figure 4 View)
            </button>

            <button
              type="button"
              onClick={() => setViewMode("diff")}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-colors cursor-pointer ${
                viewMode === "diff"
                  ? "bg-white text-teal-800 border-teal-300 shadow-sm font-semibold"
                  : "bg-transparent text-slate-600 border-transparent hover:bg-slate-200/60 hover:text-slate-900"
              }`}
            >
              🔄 Version History &amp; Diff (Figure 3 View)
            </button>
          </div>

          {/* Right Primary Action Button */}
          <div className="flex flex-wrap items-center gap-2">
            {publishedSuccess && (
              <Link href="/handover">
                <Button variant="secondary" size="sm">
                  View Handover →
                </Button>
              </Link>
            )}

            <Button
              variant="approve"
              onClick={handleApproveHandover}
              disabled={!isReviewer || isSubmitting}
              isLoading={isSubmitting}
              title={
                isReviewer
                  ? "Approve draft and publish role-scoped handover"
                  : "Switch to Reviewer (Prof. Deshmukh) above to approve"
              }
            >
              ✓ Approve &amp; Publish Handover →
            </Button>
          </div>
        </div>

        {/* ================================================================== */}
        {/* BODY CONTENT: FIGURE 4 VIEW VS FIGURE 3 VIEW                       */}
        {/* ================================================================== */}
        <div className="p-5 space-y-6">
          {/* Conflict Resolution Card when unresolved conflict exists */}
          {conflictClaim && (
            <ConflictResolutionCard
              claim={conflictClaim}
              isReviewer={isReviewer}
              cleanMode
              onResolve={handleResolveConflict}
              isLoading={isSubmitting}
            />
          )}

          {viewMode === "claims" ? (
            /* -------------------------------------------------------------- */
            /* TAB 1: ALL HANDOVER CLAIMS (FIGURE 4 TWO-COLUMN VIEW)          */
            /* -------------------------------------------------------------- */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Section-Grouped Colour-Coded Claim Rows */}
              <div className="lg:col-span-8 space-y-6">
                {sections.map((sec) => {
                  const secClaims = visibleClaims.filter(
                    (c) => getSectionForClaim(c) === sec.key
                  );
                  if (secClaims.length === 0) return null;

                  return (
                    <div key={sec.key} className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h2 className="text-sm font-bold text-slate-800">
                          {sec.label}
                        </h2>
                        <span className="text-xs text-slate-500">
                          {secClaims.length} item
                          {secClaims.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {secClaims.map((claim) => (
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
                  );
                })}

                {visibleClaims.length === 0 && (
                  <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                    <p className="text-sm text-slate-600">
                      No claims match this filter.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedStateFilter("all")}
                    >
                      Show all claims
                    </Button>
                  </div>
                )}
              </div>

              {/* Right Column: Evidence Legend & Score Breakdown (Figure 4) */}
              <div className="lg:col-span-4 space-y-4">
                {/* Confidence Score Breakdown */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">
                      Confidence Score
                    </span>
                    <span className="bg-teal-700 text-white rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-default">
                      {confidenceScore}%
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <div className="flex justify-between text-slate-700 mb-1">
                        <span>Citation Coverage</span>
                        <span className="font-semibold text-slate-900">
                          {Math.round(
                            (confidence?.citation_coverage ?? 0.85) * 100
                          )}
                          %
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-teal-600 rounded-full"
                          style={{
                            width: `${Math.round(
                              (confidence?.citation_coverage ?? 0.85) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-700 mb-1">
                        <span>Corroboration</span>
                        <span className="font-semibold text-slate-900">
                          {Math.round(
                            (confidence?.corroboration_rate ?? 0.65) * 100
                          )}
                          %
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{
                            width: `${Math.round(
                              (confidence?.corroboration_rate ?? 0.65) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-700 mb-1">
                        <span>Freshness</span>
                        <span className="font-semibold text-slate-900">
                          {Math.round(
                            (confidence?.freshness_rate ?? 0.78) * 100
                          )}
                          %
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{
                            width: `${Math.round(
                              (confidence?.freshness_rate ?? 0.78) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-700 mb-1">
                        <span>Non-Conflict</span>
                        <span className="font-semibold text-slate-900">
                          {Math.round(
                            (confidence?.conflict_free_rate ?? 0.9) * 100
                          )}
                          %
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-purple-600 rounded-full"
                          style={{
                            width: `${Math.round(
                              (confidence?.conflict_free_rate ?? 0.9) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evidence Legend Filter */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                  <span className="text-xs font-semibold text-slate-700 block mb-2">
                    Filter by Evidence Type
                  </span>

                  <div className="space-y-1 text-xs">
                    {[
                      {
                        key: "all",
                        label: "All Claims",
                        dot: "bg-slate-400",
                        count: stateCounts.all,
                      },
                      {
                        key: "corroborated",
                        label: "Corroborated (2+ sources)",
                        dot: "bg-emerald-500",
                        count: stateCounts.corroborated,
                      },
                      {
                        key: "single_source",
                        label: "Single-source",
                        dot: "bg-amber-500",
                        count: stateCounts.single_source,
                      },
                      {
                        key: "attested",
                        label: "Attested (Interview)",
                        dot: "bg-blue-500",
                        count: stateCounts.attested,
                      },
                      {
                        key: "stale",
                        label: "Stale (> 6 months)",
                        dot: "bg-orange-500",
                        count: stateCounts.stale,
                      },
                      {
                        key: "conflicting",
                        label: "Conflicting",
                        dot: "bg-purple-500",
                        count: stateCounts.conflicting,
                      },
                      {
                        key: "unsupported",
                        label: "Unsupported Gap",
                        dot: "bg-rose-500",
                        count: stateCounts.unsupported,
                      },
                      ...(audienceRole === "incoming_intern"
                        ? [
                            {
                              key: "restricted",
                              label: "Restricted",
                              dot: "bg-slate-500",
                              count: stateCounts.restricted,
                            },
                          ]
                        : []),
                    ].map((item) => {
                      const active = selectedStateFilter === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setSelectedStateFilter(item.key)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                            active
                              ? "bg-teal-50 text-teal-900 font-semibold border border-teal-200"
                              : "text-slate-700 hover:bg-slate-100 border border-transparent"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.dot}`}
                            />
                            <span>{item.label}</span>
                          </span>
                          <span className="text-slate-500 font-medium">
                            {item.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* -------------------------------------------------------------- */
            /* TAB 2: VERSION HISTORY & DIFF (EXACT 3-COLUMN FIGURE 3 VIEW)   */
            /* -------------------------------------------------------------- */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* COLUMN 1: VERSION HISTORY (lg:col-span-3) */}
              <div className="lg:col-span-3 space-y-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-sm font-bold text-slate-900">
                      Version History
                    </span>
                    <GitCompare className="w-4 h-4 text-teal-700" />
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* v2.0 */}
                    <button
                      type="button"
                      onClick={() => handleSelectSnapshot("v2.0")}
                      className={`w-full p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                        activeVersionLabel === "v2.0"
                          ? "bg-emerald-50 border-emerald-400 text-slate-900 shadow-sm"
                          : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-800">v2.0</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 cursor-default">
                          Approved
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Approved handover ready for incoming members.
                      </p>
                    </button>

                    {/* v1.1 */}
                    <button
                      type="button"
                      onClick={() => handleSelectSnapshot("v1.1")}
                      className={`w-full p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                        activeVersionLabel === "v1.1"
                          ? "bg-teal-50 border-teal-400 text-slate-900 shadow-sm"
                          : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-teal-800">v1.1</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-800 cursor-default">
                          After Interview
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Gap interview answers added (84% confidence).
                      </p>
                    </button>

                    {/* v1.0 */}
                    <button
                      type="button"
                      onClick={() => handleSelectSnapshot("v1.0")}
                      className={`w-full p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                        activeVersionLabel === "v1.0"
                          ? "bg-slate-100 border-slate-400 text-slate-900 shadow-sm"
                          : "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">v1.0</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 cursor-default">
                          Initial
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Initial draft generated from project files.
                      </p>
                    </button>
                  </div>
                </div>
              </div>

              {/* COLUMN 2: DIFF VIEW & SELECTABLE CLAIMS (lg:col-span-6) */}
              <div className="lg:col-span-6 space-y-4">
                {diff && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <span className="text-sm font-bold text-slate-900">
                        Diff View ({fromVersion} → {toVersion})
                      </span>
                      <span className="text-xs font-semibold text-emerald-700">
                        +8% Confidence (76% → 84%)
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900">
                        <span className="font-semibold">- Old:</span> Rationale
                        missing for Redis session cache
                      </div>
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                        <span className="font-semibold">+ New:</span> Redis
                        chosen due to PostgreSQL 1,200 concurrent user limit
                        (Attested)
                      </div>
                      <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900">
                        ⚡ Registration date differs: March 15 (Chat) vs. March
                        20 (Planning Doc)
                      </div>
                    </div>
                  </div>
                )}

                {/* Selectable Claims List */}
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">
                      Claims in {activeVersionLabel} ({visibleClaims.length})
                    </span>
                    <span className="text-xs text-slate-500">
                      Click any claim to act on it
                    </span>
                  </div>

                  <div className="divide-y divide-slate-200">
                    {visibleClaims.map((claim) => {
                      const isSelected = selectedClaim?.id === claim.id;

                      return (
                        <div
                          key={claim.id}
                          onClick={() => {
                            setSelectedClaimId(claim.id);
                            setIsEditingSelected(false);
                          }}
                          className={`p-3.5 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                            isSelected
                              ? "bg-teal-50/70"
                              : "bg-white hover:bg-slate-50"
                          }`}
                        >
                          <p className="text-xs sm:text-sm text-slate-900 font-medium line-clamp-2 flex-1">
                            {claim.text}
                          </p>

                          <div className="flex items-center gap-2 shrink-0">
                            <EvidenceBadge
                              state={claim.evidence_state}
                              size="sm"
                            />
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize border cursor-default select-none ${
                                claim.review?.status === "approved"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : claim.review?.status === "rejected"
                                  ? "bg-rose-50 text-rose-800 border-rose-200"
                                  : claim.review?.status === "redacted"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {claim.review?.status || "pending"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* COLUMN 3: ACTIONS PANEL (lg:col-span-3 — Figure 3) */}
              <div className="lg:col-span-3 space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="border-b border-slate-200 pb-2">
                    <span className="text-sm font-bold text-slate-900 block">
                      Actions
                    </span>
                    <span className="text-xs text-slate-500">
                      Review selected claim
                    </span>
                  </div>

                  {selectedClaim && (
                    <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs space-y-1.5">
                      <span className="text-slate-500 font-medium block">
                        Selected Claim:
                      </span>
                      <p className="text-slate-900 leading-relaxed">
                        &ldquo;{selectedClaim.text}&rdquo;
                      </p>
                    </div>
                  )}

                  {isEditingSelected && selectedClaim ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2.5 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          onClick={() => setIsEditingSelected(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            handleReviewClaim(
                              selectedClaim.id,
                              "edited",
                              editText.trim()
                            );
                            setIsEditingSelected(false);
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        variant="approve"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          selectedClaim &&
                          handleReviewClaim(selectedClaim.id, "approved")
                        }
                        disabled={!isReviewer || isSubmitting || !selectedClaim}
                        leftIcon={<Check className="w-4 h-4" />}
                      >
                        Approve
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          if (!selectedClaim) return;
                          setEditText(selectedClaim.text);
                          setIsEditingSelected(true);
                        }}
                        disabled={!isReviewer || isSubmitting || !selectedClaim}
                        leftIcon={<Edit3 className="w-4 h-4" />}
                      >
                        Request Revision
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          selectedClaim &&
                          handleReviewClaim(selectedClaim.id, "redacted")
                        }
                        disabled={!isReviewer || isSubmitting || !selectedClaim}
                        leftIcon={<Scissors className="w-4 h-4" />}
                      >
                        Redact
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          selectedClaim &&
                          handleReviewClaim(selectedClaim.id, "rejected")
                        }
                        disabled={!isReviewer || isSubmitting || !selectedClaim}
                        leftIcon={<XCircle className="w-4 h-4" />}
                      >
                        Reject
                      </Button>
                    </div>
                  )}

                  {/* Placeholder toggle */}
                  <div className="pt-3 border-t border-slate-200">
                    <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showRestrictedPlaceholders}
                        onChange={(e) =>
                          setShowRestrictedPlaceholders(e.target.checked)
                        }
                        className="mt-0.5 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                      />
                      <span>
                        Show &ldquo;Restricted: request access&rdquo; cards in
                        Intern view
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Link */}
      <div className="flex justify-end pt-2">
        <Link href="/handover" className="w-full sm:w-auto">
          <Button
            variant="secondary"
            className="w-full sm:w-auto"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Continue to Final Handover
          </Button>
        </Link>
      </div>

      {/* Source Citation Popover Modal */}
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
