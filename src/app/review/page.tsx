"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileCheck2,
  GitCompare,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  Check,
  Edit3,
  XCircle,
  Scissors,
} from "lucide-react";
import { useRole } from "@/components/layout/RoleContext";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import { Button } from "@/components/ui/Button";
import { LoadingSkeleton } from "@/components/ui/StateViews";
import { ConflictResolutionCard } from "@/components/review/ConflictResolutionCard";
import { VersionDiffViewer } from "@/components/review/VersionDiffViewer";
import type {
  AudienceRole,
  ClaimRecord,
  DraftVersion,
  ReviewStatus,
  VersionLabel,
} from "@/types/echobridge.types";
import type { VersionDiffSummary } from "@/services/workflow/review.service";

export default function ReviewPage() {
  const { currentRole, currentProfile, switchRole } = useRole();
  const [audienceRole, setAudienceRole] = useState<AudienceRole>("incoming_lead");
  const [fromVersion, setFromVersion] = useState<VersionLabel>("v1.0");
  const [toVersion, setToVersion] = useState<VersionLabel>("v1.1");
  const [activeVersionLabel, setActiveVersionLabel] = useState<VersionLabel>("v1.1");

  const [drafts, setDrafts] = useState<DraftVersion[]>([]);
  const [activeDraft, setActiveDraft] = useState<DraftVersion | null>(null);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [conflicts, setConflicts] = useState<ClaimRecord[]>([]);
  const [diff, setDiff] = useState<VersionDiffSummary | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState<string>("");
  const [showRestrictedPlaceholders, setShowRestrictedPlaceholders] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const isReviewer = currentRole === "reviewer";

  // Fetch review data from /api/review
  const fetchReviewData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(
        `/api/review?projectId=CampusConnect&role=${audienceRole}&fromVersion=${fromVersion}&toVersion=${toVersion}`
      );
      const json = await res.json();
      if (json.success) {
        setDrafts(json.drafts || []);
        setConflicts(json.conflicts || []);
        setDiff(json.diff || null);

        const matched = (json.drafts as DraftVersion[]).find(
          (d) => d.version_label === activeVersionLabel
        );
        const current = matched || json.activeDraft || null;
        setActiveDraft(current);

        if (current && current.claims) {
          setClaims(current.claims);
          if (!selectedClaimId && current.claims.length > 0) {
            setSelectedClaimId(current.claims[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load review data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [audienceRole, fromVersion, toVersion, activeVersionLabel, selectedClaimId]);

  useEffect(() => {
    fetchReviewData();
  }, [fetchReviewData]);

  // Review a claim (approve, edit, redact, reject)
  const handleReviewClaim = async (
    claimId: string,
    action: ReviewStatus,
    editedText?: string
  ) => {
    if (!isReviewer) {
      alert("Separation of Duties (ADR-007): Only Prof. Deshmukh (Reviewer) can review or approve claims.");
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
          projectId: "CampusConnect",
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
          `Claim updated to '${action}' by ${currentProfile.name}.`
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

  // Resolve conflict (Trap 1)
  const handleResolveConflict = async (
    claimId: string,
    winningSide: "side_a" | "side_b" | "custom",
    customText?: string
  ) => {
    if (!isReviewer) {
      alert("Only Prof. Deshmukh (Reviewer) has authority to resolve conflicting claims.");
      return;
    }

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
          projectId: "CampusConnect",
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
          `Conflict resolved! Registration deadline set to March 20th. Claim promoted to Corroborated.`
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

  // Final Handover Approval (Creates DraftVersion v2.0)
  const handleApproveHandover = async () => {
    if (!isReviewer) {
      alert("Separation of Duties (ADR-007): Departing members cannot self-approve handovers.");
      return;
    }

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
          projectId: "CampusConnect",
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
        setFeedbackMessage(
          `Handover Approved! DraftVersion v2.0 successfully published with Confidence ${v2.confidence.total_score}%. Handover ready for incoming recipients.`
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

  // Switch snapshot
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
    ) || claims[0] || null;

  const visibleClaims = claims.filter((c) => {
    if (audienceRole === "incoming_intern" && !showRestrictedPlaceholders) {
      return c.evidence_state !== "restricted";
    }
    return true;
  });

  const conflictClaim = conflicts.find((c) => c.evidence_state === "conflicting");
  const confidenceScore = activeDraft?.confidence?.total_score ?? 84;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-canvas px-4 py-8 md:px-8 max-w-7xl mx-auto">
        <LoadingSkeleton
          cardCount={3}
          message="Loading Reviewer Workspace & Version Diffs..."
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas px-4 py-6 md:px-8 max-w-7xl mx-auto space-y-5">
      {/* ==================================================================== */}
      {/* 1. SEPARATION OF DUTIES (ADR-007) BANNER                             */}
      {/* ==================================================================== */}
      {!isReviewer && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Separation of Duties (ADR-007):</strong> As the Departing Member, you can inspect diffs and suggest edits, but cannot approve the handover.
            </span>
          </div>

          <button
            type="button"
            onClick={() => switchRole("reviewer")}
            className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:text-white hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors shrink-0 text-xs font-bold"
          >
            Switch to Reviewer (Prof. Deshmukh) to Approve →
          </button>
        </div>
      )}

      {/* Success / Feedback Banner */}
      {feedbackMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-400/70 hover:text-emerald-400"
          >
            ✕
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. TOP HEADER BAR OF REVIEW WORKSPACE (FIGURE 3)                     */}
      {/* ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-surface border border-border-subtle shadow-sm">
        {/* Title */}
        <div>
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block font-bold">
            Stage 5: Review &amp; Approval
          </span>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Review and Approval: Human Reviewer Dashboard &amp; Diff Inspector
          </h1>
        </div>

        {/* Audience Selector */}
        <div className="flex items-center p-1 rounded-xl bg-canvas border border-border-subtle text-xs font-mono">
          <button
            type="button"
            onClick={() => setAudienceRole("incoming_lead")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              audienceRole === "incoming_lead"
                ? "bg-indigo-600 text-white font-bold shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Team Lead View</span>
          </button>

          <button
            type="button"
            onClick={() => setAudienceRole("incoming_intern")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              audienceRole === "incoming_intern"
                ? "bg-cyan-600 text-white font-bold shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Intern View</span>
          </button>
        </div>

        {/* Confidence Score Pill + Primary Approve & Publish CTA */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Confidence {confidenceScore}%</span>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleApproveHandover}
            disabled={!isReviewer || isSubmitting}
            isLoading={isSubmitting}
            className={`text-xs font-mono ${
              !isReviewer
                ? "opacity-50 cursor-not-allowed bg-slate-800 text-text-muted border-border-subtle"
                : ""
            }`}
            title={
              isReviewer
                ? "Approve Draft and create DraftVersion v2.0"
                : "Departing member cannot approve (ADR-007)"
            }
          >
            {isReviewer ? "Approve & Publish Handover" : "Approval Locked (Reviewer Only)"}
          </Button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. EXACT 3-COLUMN CARD LAYOUT (CONCEPT MOCKUP FIGURE 3)              */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* COLUMN 1: VERSION HISTORY (w-56 / 3 Cols in 12-grid) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="p-3.5 rounded-xl bg-surface border border-border-subtle space-y-3">
            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
                Version History
              </span>
              <GitCompare className="w-4 h-4 text-accent-cyan" />
            </div>

            {/* 3 Version Cards matching Figure 3 */}
            <div className="space-y-2 font-mono text-xs">
              {/* v2.0 */}
              <button
                type="button"
                onClick={() => handleSelectSnapshot("v2.0")}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  activeVersionLabel === "v2.0"
                    ? "bg-emerald-500/15 border-emerald-500/40 text-text-primary shadow-sm"
                    : "bg-canvas border-border-subtle hover:bg-surface-hover text-text-secondary"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400">v2.0</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                    Approved
                  </span>
                </div>
                <p className="text-[11px] text-text-muted mt-1 font-sans">
                  Current / Approved draft published for incoming recipients.
                </p>
              </button>

              {/* v1.1 */}
              <button
                type="button"
                onClick={() => handleSelectSnapshot("v1.1")}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  activeVersionLabel === "v1.1"
                    ? "bg-accent-primary/20 border-accent-primary/50 text-text-primary shadow-sm"
                    : "bg-canvas border-border-subtle hover:bg-surface-hover text-text-secondary"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-accent-cyan">v1.1</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                    After Interview
                  </span>
                </div>
                <p className="text-[11px] text-text-muted mt-1 font-sans">
                  Trap 2 promoted from Red → Blue Attested. Confidence: 84%.
                </p>
              </button>

              {/* v1.0 */}
              <button
                type="button"
                onClick={() => handleSelectSnapshot("v1.0")}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  activeVersionLabel === "v1.0"
                    ? "bg-indigo-500/20 border-indigo-500/50 text-text-primary shadow-sm"
                    : "bg-canvas border-border-subtle hover:bg-surface-hover text-text-secondary"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-400">v1.0</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-canvas text-text-muted border border-border-subtle">
                    Initial
                  </span>
                </div>
                <p className="text-[11px] text-text-muted mt-1 font-sans">
                  Initial auto-draft from ingested sources before interview.
                </p>
              </button>
            </div>
          </div>

          {/* Quick link to Handover Stage */}
          <Link href="/handover">
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-center text-xs font-mono text-accent-cyan hover:text-white"
            >
              Proceed to Handover (Stage 6) →
            </Button>
          </Link>
        </div>

        {/* COLUMN 2: DIFF & CLAIM INSPECTOR (flex-1 / 6 Cols in 12-grid) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Diff Summary View matching Figure 3 */}
          {diff && (
            <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-3">
              <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
                  Diff View: v1.0 → v1.1
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  Confidence Delta: +8% (76% → 84%)
                </span>
              </div>

              <div className="p-3 rounded-lg bg-canvas border border-border-subtle font-mono text-xs space-y-2">
                <div className="text-rose-400">
                  - Rationale missing for Redis session cache (UNSUPPORTED GAP)
                </div>
                <div className="text-emerald-400">
                  + Redis chosen due to PostgreSQL 1,200 concurrent user pool exhaustion (ATTESTED)
                </div>
                <div className="text-purple-300">
                  ⚡ Registration deadline conflict: March 15 (Chat) vs March 20 (Planning Doc)
                </div>
              </div>
            </div>
          )}

          {/* Trap 1: Authoritative Conflict Resolution Card */}
          {conflictClaim && (
            <div className="space-y-1">
              <span className="text-xs font-mono text-purple-400 font-bold block">
                Event Registration Deadline Conflict (March 15 vs March 20)
              </span>
              <ConflictResolutionCard
                claim={conflictClaim}
                isReviewer={isReviewer}
                onResolve={handleResolveConflict}
                isLoading={isSubmitting}
              />
            </div>
          )}

          {/* Claims List for Selected Version */}
          <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-3">
            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
                Claims in {activeVersionLabel} ({visibleClaims.length})
              </span>
              <span className="text-[11px] font-mono text-text-muted">
                Click claim to inspect &amp; act
              </span>
            </div>

            <div className="space-y-2">
              {visibleClaims.map((claim) => {
                const isSelected = selectedClaim?.id === claim.id;

                return (
                  <div
                    key={claim.id}
                    onClick={() => setSelectedClaimId(claim.id)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs ${
                      isSelected
                        ? "bg-accent-primary/10 border-accent-primary shadow-sm"
                        : "bg-canvas border-border-subtle hover:bg-surface-hover"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className="font-mono text-text-muted text-[10px] shrink-0">
                        {claim.id}
                      </span>
                      <p className="text-text-primary font-medium truncate">
                        {claim.text}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <EvidenceBadge state={claim.evidence_state} size="sm" />
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded border uppercase font-bold ${
                          claim.review?.status === "approved"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : claim.review?.status === "rejected"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : claim.review?.status === "redacted"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-canvas text-text-muted border-border-subtle"
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

        {/* COLUMN 3: ACTIONS STACK (w-64 / 3 Cols in 12-grid — Figure 3) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-4 rounded-xl bg-surface border border-border-subtle space-y-4">
            <div className="border-b border-border-subtle pb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted block">
                Actions Panel
              </span>
              <span className="text-[11px] font-mono text-accent-cyan truncate block mt-0.5">
                {selectedClaim ? selectedClaim.id : "No claim selected"}
              </span>
            </div>

            {selectedClaim && (
              <div className="p-2.5 rounded-lg bg-canvas border border-border-subtle text-xs space-y-1">
                <span className="text-[10px] font-mono text-text-muted block uppercase">
                  Selected Claim:
                </span>
                <p className="text-text-primary text-[11px] leading-relaxed line-clamp-3">
                  &ldquo;{selectedClaim.text}&rdquo;
                </p>
              </div>
            )}

            {/* 4 Clean Stacked Action Buttons matching Figure 3 */}
            <div className="space-y-2 font-mono text-xs">
              {/* 1. Approve */}
              <button
                type="button"
                onClick={() =>
                  selectedClaim && handleReviewClaim(selectedClaim.id, "approved")
                }
                disabled={!isReviewer || isSubmitting || !selectedClaim}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Approve</span>
              </button>

              {/* 2. Request Revision / Edit */}
              <button
                type="button"
                onClick={() => {
                  if (!selectedClaim) return;
                  const newText = prompt("Edit claim text:", selectedClaim.text);
                  if (newText) {
                    handleReviewClaim(selectedClaim.id, "edited", newText);
                  }
                }}
                disabled={!isReviewer || isSubmitting || !selectedClaim}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-surface-hover hover:bg-canvas border border-border-subtle text-text-primary font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <span>Request Revision / Edit</span>
              </button>

              {/* 3. Redact */}
              <button
                type="button"
                onClick={() =>
                  selectedClaim && handleReviewClaim(selectedClaim.id, "redacted")
                }
                disabled={!isReviewer || isSubmitting || !selectedClaim}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Scissors className="w-4 h-4 text-amber-400" />
                <span>Redact</span>
              </button>

              {/* 4. Reject */}
              <button
                type="button"
                onClick={() =>
                  selectedClaim && handleReviewClaim(selectedClaim.id, "rejected")
                }
                disabled={!isReviewer || isSubmitting || !selectedClaim}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Reject</span>
              </button>
            </div>

            {/* Toggle Placeholder in Intern View */}
            <div className="pt-2 border-t border-border-subtle">
              <label className="flex items-start gap-2 text-[11px] font-mono text-text-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showRestrictedPlaceholders}
                  onChange={(e) => setShowRestrictedPlaceholders(e.target.checked)}
                  className="mt-0.5 rounded border-border-subtle bg-canvas text-accent-primary focus:ring-accent-primary"
                />
                <span>Show &apos;Restricted: request access&apos; placeholders in Intern View</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
