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
} from "lucide-react";
import { useRole } from "@/components/layout/RoleContext";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSkeleton } from "@/components/ui/StateViews";
import { ConflictResolutionCard } from "@/components/review/ConflictResolutionCard";
import { VersionDiffViewer } from "@/components/review/VersionDiffViewer";
import { ClaimReviewActionPanel } from "@/components/review/ClaimReviewActionPanel";
import type {
  AudienceRole,
  ClaimRecord,
  DraftVersion,
  ReviewStatus,
  VersionLabel,
} from "@/types/echobridge.types";
import type { VersionDiffSummary } from "@/services/workflow/review.service";

export default function ReviewPage() {
  const { currentRole, currentProfile } = useRole();
  const [audienceRole, setAudienceRole] = useState<AudienceRole>("incoming_lead");
  const [viewMode, setViewMode] = useState<"claims" | "diff">("claims");
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

        // Active draft priority: matching activeVersionLabel or activeDraft from API
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
        // Refresh diffs
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
        // Refresh full review data
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

  // Version diff selector helper
  const handleSelectVersions = (from: VersionLabel, to: VersionLabel) => {
    setFromVersion(from);
    setToVersion(to);
    setViewMode("diff");
  };

  // Switch snapshot
  const handleSelectSnapshot = (label: VersionLabel) => {
    setActiveVersionLabel(label);
    const target = drafts.find((d) => d.version_label === label);
    if (target) {
      setActiveDraft(target);
      setClaims(target.claims);
    }
    setViewMode("claims");
  };

  const selectedClaim =
    claims.find(
      (c) =>
        c.id === selectedClaimId ||
        c.id.replace(/-V1\.[012]|-V2\.0/g, "") ===
          selectedClaimId.replace(/-V1\.[012]|-V2\.0/g, "")
    ) || claims[0] || null;

  // Filter claims based on placeholder visibility toggle in intern view
  const visibleClaims = claims.filter((c) => {
    if (audienceRole === "incoming_intern" && !showRestrictedPlaceholders) {
      return c.evidence_state !== "restricted";
    }
    return true;
  });

  const conflictClaim = conflicts.find((c) => c.evidence_state === "conflicting");

  if (isLoading) {
    return (
      <main className="min-h-screen bg-canvas px-4 py-8 md:px-8 max-w-7xl mx-auto">
        <LoadingSkeleton
          cardCount={3}
          message="Loading Reviewer Workspace & Version Diffs..."
          steps={[
            "Checking separation of duties access authorization...",
            "Loading snapshots for v1.0, v1.1, and v2.0...",
            "Calculating semantic claim diffs and conflict pairs...",
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
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 uppercase">
              Stage 5 of 6: Human Review & Approval
            </span>
            <span className="text-xs font-mono text-text-muted">
              ADR-007 Reviewer Authority
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
            Reviewer Diff & Handover Approval Dashboard
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl">
            Inspect Git-style diffs between versions, resolve conflicting claims side-by-side, and approve role-appropriate views before publishing to incoming members.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/interview">
            <Button variant="ghost" size="sm" className="text-xs text-text-secondary">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Stage 4: Gap-Interview
            </Button>
          </Link>

          <Link href="/handover">
            <Button variant="approve" size="sm" className="text-xs">
              <span>Stage 6: Handover Delivery</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Role Notice & Separation of Duties Warning */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-surface border border-border-subtle text-xs">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-2 h-2 rounded-full ${
              isReviewer ? "bg-emerald-400" : "bg-rose-400 animate-pulse"
            }`}
          />
          <span className="font-mono text-text-secondary">
            Active Persona:{" "}
            <strong className={isReviewer ? "text-emerald-300" : "text-rose-300"}>
              {currentProfile.name} ({currentProfile.badge})
            </strong>
          </span>
          <span className="text-text-muted">|</span>
          <span className="text-text-muted hidden sm:inline">
            {isReviewer
              ? "Holds sole handover approval authority."
              : "Read-only preview. Departing leads cannot approve handovers (ADR-007)."}
          </span>
        </div>

        {/* Intern Placeholder Visibility Toggle (ADR-004) */}
        {audienceRole === "incoming_intern" && (
          <button
            type="button"
            onClick={() => setShowRestrictedPlaceholders(!showRestrictedPlaceholders)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-canvas border border-border-subtle text-[11px] font-mono text-text-secondary hover:text-text-primary transition-colors"
          >
            {showRestrictedPlaceholders ? (
              <>
                <Eye className="w-3.5 h-3.5 text-accent-cyan" />
                <span>Hide Zero-Leak Placeholders</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-text-muted" />
                <span>Show Zero-Leak Placeholders</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Feedback Alert Toast */}
      {feedbackMessage && (
        <div
          className={`rounded-xl p-3.5 text-xs flex items-center justify-between gap-3 ${
            feedbackMessage.startsWith("Error")
              ? "bg-rose-950/20 border border-rose-500/30 text-rose-200"
              : "bg-emerald-950/20 border border-emerald-500/30 text-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="font-mono text-xs opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3-Column Review Layout (Figure 3 in Proposal) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Rail: Version History & Audience Switcher (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Audience Tab Switcher */}
          <Card className="p-3.5 bg-surface space-y-2.5">
            <span className="text-[11px] font-mono font-bold uppercase text-text-muted block">
              Audience Scope View
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setAudienceRole("incoming_lead")}
                className={`p-2 rounded-lg text-center transition-all ${
                  audienceRole === "incoming_lead"
                    ? "bg-accent-primary text-white font-bold shadow-sm"
                    : "bg-canvas text-text-secondary hover:text-text-primary border border-border-subtle"
                }`}
              >
                Team Lead
              </button>
              <button
                type="button"
                onClick={() => setAudienceRole("incoming_intern")}
                className={`p-2 rounded-lg text-center transition-all ${
                  audienceRole === "incoming_intern"
                    ? "bg-accent-primary text-white font-bold shadow-sm"
                    : "bg-canvas text-text-secondary hover:text-text-primary border border-border-subtle"
                }`}
              >
                Intern
              </button>
            </div>
          </Card>

          {/* View Mode Selector */}
          <Card className="p-3.5 bg-surface space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase text-text-muted block">
              Inspection Mode
            </span>
            <div className="space-y-1.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setViewMode("claims")}
                className={`w-full flex items-center justify-between p-2 rounded-lg transition-all ${
                  viewMode === "claims"
                    ? "bg-surface-hover text-accent-cyan font-bold border border-accent-cyan/30"
                    : "bg-canvas text-text-secondary hover:text-text-primary border border-border-subtle"
                }`}
              >
                <span>Claims Inspector</span>
                <span className="text-[10px] opacity-75">{claims.length} claims</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("diff")}
                className={`w-full flex items-center justify-between p-2 rounded-lg transition-all ${
                  viewMode === "diff"
                    ? "bg-surface-hover text-accent-cyan font-bold border border-accent-cyan/30"
                    : "bg-canvas text-text-secondary hover:text-text-primary border border-border-subtle"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <GitCompare className="w-3.5 h-3.5" />
                  <span>Version Diff Viewer</span>
                </div>
                <span className="text-[10px] text-amber-400 font-bold">
                  ~{diff?.modifiedCount || 1}
                </span>
              </button>
            </div>
          </Card>

          {/* Version History Rail */}
          <Card className="p-3.5 bg-surface space-y-2.5">
            <span className="text-[11px] font-mono font-bold uppercase text-text-muted block">
              Version History Rail
            </span>
            <div className="space-y-2 font-mono text-xs">
              {/* v2.0 Snapshot */}
              <button
                type="button"
                onClick={() => handleSelectSnapshot("v2.0")}
                className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                  activeVersionLabel === "v2.0"
                    ? "border-emerald-500 bg-emerald-950/20 text-emerald-300 font-bold"
                    : "border-border-subtle bg-canvas/40 hover:bg-surface-hover text-text-secondary"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>v2.0 Approved</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                    Final
                  </span>
                </div>
                <span className="text-[11px] text-text-muted font-normal block mt-1">
                  Confidence: 89% (Conflicts Resolved)
                </span>
              </button>

              {/* v1.1 Snapshot */}
              <button
                type="button"
                onClick={() => handleSelectSnapshot("v1.1")}
                className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                  activeVersionLabel === "v1.1"
                    ? "border-blue-500 bg-blue-950/20 text-blue-300 font-bold"
                    : "border-border-subtle bg-canvas/40 hover:bg-surface-hover text-text-secondary"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>v1.1 Gap-Interview</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400">
                    Attested
                  </span>
                </div>
                <span className="text-[11px] text-text-muted font-normal block mt-1">
                  Confidence: 80% (Redis Attested)
                </span>
              </button>

              {/* v1.0 Snapshot */}
              <button
                type="button"
                onClick={() => handleSelectSnapshot("v1.0")}
                className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                  activeVersionLabel === "v1.0"
                    ? "border-indigo-500 bg-indigo-950/20 text-indigo-300 font-bold"
                    : "border-border-subtle bg-canvas/40 hover:bg-surface-hover text-text-secondary"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>v1.0 Initial Draft</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface text-text-muted">
                    Draft
                  </span>
                </div>
                <span className="text-[11px] text-text-muted font-normal block mt-1">
                  Confidence: 76% (Initial Auto-Gen)
                </span>
              </button>
            </div>
          </Card>
        </div>

        {/* Center Panel: Main Inspection Workspace (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {viewMode === "diff" ? (
            <VersionDiffViewer
              diff={diff}
              fromVersion={fromVersion}
              toVersion={toVersion}
              onSelectVersions={handleSelectVersions}
              isLoading={isLoading}
            />
          ) : (
            <div className="space-y-4">
              {/* Trap 1 Conflict Card if present in this view */}
              {conflictClaim && (
                <ConflictResolutionCard
                  claim={conflictClaim}
                  isReviewer={isReviewer}
                  onResolve={handleResolveConflict}
                  isLoading={isSubmitting}
                />
              )}

              {/* Claims List Header */}
              <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase text-text-primary">
                    Claims in {activeVersionLabel} ({audienceRole})
                  </span>
                </div>
                <span className="text-xs font-mono text-text-muted">
                  {visibleClaims.length} total claims
                </span>
              </div>

              {/* Claims List */}
              <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
                {visibleClaims.map((c) => {
                  const isSelected =
                    c.id === selectedClaimId ||
                    c.id.replace(/-V1\.[012]|-V2\.0/g, "") ===
                      selectedClaimId.replace(/-V1\.[012]|-V2\.0/g, "");

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedClaimId(c.id)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all select-none ${
                        isSelected
                          ? "border-accent-cyan bg-surface-hover shadow-md"
                          : "border-border-subtle bg-surface hover:bg-surface-hover/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <EvidenceBadge state={c.evidence_state} size="sm" />

                        <div className="flex items-center gap-2">
                          {c.planted_trap_id && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                              Trap {c.planted_trap_id}
                            </span>
                          )}

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                              c.review?.status === "approved"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : c.review?.status === "edited"
                                ? "bg-indigo-500/20 text-indigo-300"
                                : c.review?.status === "redacted"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-canvas text-text-muted"
                            }`}
                          >
                            {c.review?.status || "pending"}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-text-primary leading-relaxed font-sans line-clamp-3">
                        {c.text}
                      </p>

                      <div className="flex items-center justify-between text-[10px] font-mono text-text-muted mt-2 pt-2 border-t border-border-subtle/50">
                        <span className="capitalize">{c.section}</span>
                        <span>{c.evidence?.length || 0} citation(s)</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Rail: ClaimReviewActionPanel & Final Approval (3 cols) */}
        <div className="lg:col-span-3">
          <ClaimReviewActionPanel
            selectedClaim={selectedClaim}
            isReviewer={isReviewer}
            actorRoleName={`${currentProfile.name} (${currentProfile.badge})`}
            onReviewClaim={handleReviewClaim}
            onApproveHandover={handleApproveHandover}
            isLoading={isSubmitting}
          />
        </div>
      </div>

      {/* Bottom Navigation Toolbar */}
      <div className="flex items-center justify-between pt-6 border-t border-border-subtle">
        <Link href="/interview">
          <Button variant="ghost" size="sm" className="text-xs text-text-secondary">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Stage 4: Gap-Interview
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-text-muted hidden md:inline">
            Stage 6: Onboarding continuation plan & receipt sign-off
          </span>
          <Link href="/handover">
            <Button variant="primary" size="md" className="text-xs">
              <span>Proceed to Stage 6: Handover Delivery</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
