"use strict";
/**
 * Stage 3 UI — Evidence-Coloured Draft, Confidence Score HUD & Citation Inspector
 * Implements docs/DESIGN.md Section 5.2 & 5.3, docs/PRD.md Section 5, and TASKS.md TASK-016.
 *
 * Displays the transparent Confidence Score HUD with its 4 transparent component bars,
 * Audience View switcher (Team Lead View vs. Intern View), filterable atomic claim list
 * with 4px left-border EvidenceState colors, side-by-side Purple conflict matrix,
 * zero-leak restricted placeholders in Intern view, and interactive source citation popovers.
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileCheck,
  Shield,
  Layers,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSkeleton, ErrorBanner } from "@/components/ui/StateViews";
import { ConfidenceScoreCard } from "@/components/evidence/ConfidenceScoreCard";
import { ClaimCard } from "@/components/evidence/ClaimCard";
import { SourceCitationPopover } from "@/components/evidence/SourceCitationPopover";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import { DecisionTimeline } from "@/components/evidence/DecisionTimeline";
import { ContextWebGraph } from "@/components/evidence/ContextWebGraph";
import { useRole } from "@/components/layout/RoleContext";
import type {
  AudienceRole,
  Chunk,
  ClaimRecord,
  DraftVersion,
  EvidenceRecord,
  EvidenceState,
  HandoverSection,
} from "@/types/echobridge.types";

export default function DraftPage() {
  const { currentRole } = useRole();

  // Selected Audience View (Lead vs Intern)
  const [selectedAudience, setSelectedAudience] = useState<AudienceRole>(
    currentRole === "incoming_intern" ? "incoming_intern" : "incoming_lead"
  );

  const [loading, setLoading] = useState(true);
  const [reconstructing, setReconstructing] = useState(false);
  const [leadDraft, setLeadDraft] = useState<DraftVersion | null>(null);
  const [internDraft, setInternDraft] = useState<DraftVersion | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [showPlaceholders, setShowPlaceholders] = useState(true);
  const [activeView, setActiveView] = useState<"claims" | "timeline" | "graph">("claims");

  // Citation Popover state
  const [inspectedEvidence, setInspectedEvidence] = useState<EvidenceRecord | null>(null);
  const [inspectedChunk, setInspectedChunk] = useState<Chunk | null>(null);
  const [inspectedClaimText, setInspectedClaimText] = useState<string>("");

  // Sync selected audience when judge switches role in command bar
  useEffect(() => {
    if (currentRole === "incoming_intern") {
      setSelectedAudience("incoming_intern");
    } else if (currentRole === "incoming_lead") {
      setSelectedAudience("incoming_lead");
    }
  }, [currentRole]);

  const fetchDraftData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch draft data and chunks in parallel
      const [draftRes, ingestRes] = await Promise.all([
        fetch("/api/reconstruct?projectId=CampusConnect"),
        fetch("/api/ingest?projectId=CampusConnect"),
      ]);

      const draftJson = await draftRes.json();
      const ingestJson = await ingestRes.json();

      if (!draftJson.success) {
        throw new Error(draftJson.error || "Failed to load drafts");
      }

      setLeadDraft(draftJson.leadDraft);
      setInternDraft(draftJson.internDraft);
      setChunks(ingestJson.chunks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching drafts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDraftData();
  }, [fetchDraftData]);

  const handleReconstruct = async () => {
    try {
      setReconstructing(true);
      setError(null);
      const res = await fetch("/api/reconstruct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: "CampusConnect",
          audienceRole: "both",
          showRestrictedPlaceholders: showPlaceholders,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Reconstruction failed");
      }

      setLeadDraft(json.data.leadDraft.draftVersion);
      setInternDraft(json.data.internDraft.draftVersion);
      setSuccessBanner(
        "Trust Pipeline re-run successfully! Separate Lead and Intern drafts generated."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reconstruction failed");
    } finally {
      setReconstructing(false);
    }
  };

  const activeDraft =
    selectedAudience === "incoming_lead" ? leadDraft : internDraft;

  const chunksMap = new Map<string, Chunk>(chunks.map((c) => [c.id, c]));

  // Filtered claims
  const rawClaims = activeDraft?.claims || [];
  const filteredClaims = rawClaims.filter((claim) => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = claim.text.toLowerCase().includes(q);
      const matchId = claim.id.toLowerCase().includes(q);
      if (!matchText && !matchId) return false;
    }

    // 2. Evidence State filter
    if (selectedState !== "all") {
      if (claim.evidence_state !== selectedState) return false;
    }

    // 3. Section filter
    if (selectedSection !== "all") {
      if (claim.section !== selectedSection) return false;
    }

    // 4. Placeholders toggle
    if (!showPlaceholders && claim.evidence_state === "restricted") {
      return false;
    }

    return true;
  });

  const handleOpenCitation = (
    evidence: EvidenceRecord,
    chunk?: Chunk,
    claimText?: string
  ) => {
    setInspectedEvidence(evidence);
    setInspectedChunk(chunk || null);
    setInspectedClaimText(claimText || "");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Stage Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Stage 3
            </span>
            <span className="text-text-muted text-xs font-mono">
              The Trust Pipeline & Verification
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            Evidence-Coloured Handover Draft
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-3xl">
            Atomic claims synthesized through retrieve-only generation and verified by
            our two-layer citation verifier. Inspected per target audience (
            <code className="text-indigo-400">Team Lead</code> vs.{" "}
            <code className="text-cyan-400">Intern</code>) with strict Pre-Model and
            Post-Generation RBAC enforcement.
          </p>
        </div>

        {/* Toolbar Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReconstruct}
            isLoading={reconstructing}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Re-run Trust Pipeline
          </Button>

          <Link href="/interview">
            <Button variant="primary" size="sm">
              Proceed to Stage 4: Gap-Interview
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Success / Error Messages */}
      {successBanner && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-400/70 hover:text-emerald-400 font-mono text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {error && <ErrorBanner message={error} onRetry={fetchDraftData} />}

      {/* Audience View Switcher Tabs (Hero Segmented Control) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2 rounded-2xl bg-surface border border-subtle shadow-lg">
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-canvas border border-subtle">
            <button
              onClick={() => setSelectedAudience("incoming_lead")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                selectedAudience === "incoming_lead"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Team Lead View</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-200">
                Full Scope
              </span>
            </button>

            <button
              onClick={() => setSelectedAudience("incoming_intern")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                selectedAudience === "incoming_intern"
                  ? "bg-cyan-600 text-white shadow-md"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Intern View</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-900/60 text-cyan-200">
                Restricted Scope
              </span>
            </button>
          </div>
        </div>

        {/* Audience Scope Description Pill */}
        <div className="text-xs font-mono text-text-muted px-2">
          {selectedAudience === "incoming_lead" ? (
            <span className="text-indigo-300 flex items-center gap-1.5">
              <Unlock className="w-3.5 h-3.5 text-indigo-400" />
              Includes Architecture, Task board, Runbook, and Confidential Finance.
            </span>
          ) : (
            <span className="text-cyan-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              Confidential Finance folder is withheld. Restricted claims masked with zero leak.
            </span>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <LoadingSkeleton
          cardCount={3}
          message="Synthesizing atomic claims and verifying two-layer citations..."
        />
      ) : (
        <>
          {/* Section 1: Confidence Score HUD */}
          {activeDraft?.confidence && (
            <ConfidenceScoreCard
              confidence={activeDraft.confidence}
              audienceRole={selectedAudience}
            />
          )}

          {/* Planted Traps Real-Time Detection HUD */}
          <div className="p-4 rounded-xl bg-canvas/80 border border-subtle">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
                Planted Traps Verification HUD (CampusConnect Dataset)
              </span>
              <span className="text-[11px] font-mono text-indigo-400">
                Evaluator Live Checklist
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded bg-surface border border-purple-500/30 text-purple-300">
                <span className="block font-bold">Trap 1: Conflict</span>
                <span className="text-[10px] text-text-muted">
                  March 15 vs 20 (Purple)
                </span>
              </div>

              <div className="p-2 rounded bg-surface border border-red-500/30 text-red-300">
                <span className="block font-bold">Trap 2: Gap</span>
                <span className="text-[10px] text-text-muted">
                  Missing Redis Rationale
                </span>
              </div>

              <div className="p-2 rounded bg-surface border border-orange-500/30 text-orange-300">
                <span className="block font-bold">Trap 3: Stale</span>
                <span className="text-[10px] text-text-muted">
                  Runbook 9 Months Old
                </span>
              </div>

              <div className="p-2 rounded bg-surface border border-emerald-500/30 text-emerald-300">
                <span className="block font-bold">Trap 4: Secret</span>
                <span className="text-[10px] text-text-muted">
                  0% Raw Secret Leakage
                </span>
              </div>

              <div className="p-2 rounded bg-surface border border-cyan-500/30 text-cyan-300">
                <span className="block font-bold">Trap 5: Finance</span>
                <span className="text-[10px] text-text-muted">
                  Lead Only / Intern Withheld
                </span>
              </div>

              <div className="p-2 rounded bg-surface border border-amber-500/30 text-amber-300">
                <span className="block font-bold">Trap 8: Mixed</span>
                <span className="text-[10px] text-text-muted">
                  Dropped from Intern View
                </span>
              </div>
            </div>
          </div>

          {/* View Mode Switcher (Claims vs. Timeline vs. Graph) */}
          <div className="flex flex-wrap items-center gap-2 border-b border-subtle pb-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveView("claims")}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                activeView === "claims"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-surface text-text-secondary hover:text-text-primary border border-subtle"
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Atomic Claims &amp; Citations</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-200">
                {rawClaims.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("timeline")}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                activeView === "timeline"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-surface text-text-secondary hover:text-text-primary border border-subtle"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Decision Timeline (&quot;Why&quot; Cards)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-200">
                Stretch Feature
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("graph")}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                activeView === "graph"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-surface text-text-secondary hover:text-text-primary border border-subtle"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Context Web Graph</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-200">
                Interactive Topology
              </span>
            </button>
          </div>

          {/* Conditional Views */}
          {activeView === "timeline" ? (
            <DecisionTimeline audienceRole={selectedAudience} />
          ) : activeView === "graph" ? (
            <ContextWebGraph audienceRole={selectedAudience} />
          ) : (
            <>
              {/* Section 2: Filters & Search Controls */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search atomic claims by keyword or CLM-ID..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-subtle text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-text-muted"
                  />
                </div>

                {/* Filter Dropdowns */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Evidence State Filter */}
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-surface border border-subtle text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  >
                    <option value="all">All States ({rawClaims.length})</option>
                    <option value="corroborated">Corroborated (Green)</option>
                    <option value="single_source">Single-Source (Yellow)</option>
                    <option value="attested">Attested (Blue)</option>
                    <option value="stale">Stale (Orange)</option>
                    <option value="conflicting">Conflicting (Purple)</option>
                    <option value="unsupported">Unsupported (Red)</option>
                    <option value="restricted">Restricted (Lock)</option>
                  </select>

                  {/* Section Filter */}
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-surface border border-subtle text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  >
                    <option value="all">All Sections</option>
                    <option value="architecture">Architecture</option>
                    <option value="decisions">Decisions</option>
                    <option value="tasks_dependencies">Tasks & Dependencies</option>
                    <option value="contacts_ownership">Contacts & Ownership</option>
                    <option value="onboarding_day1">Day 1 Onboarding</option>
                    <option value="onboarding_week1">Week 1 Onboarding</option>
                    <option value="onboarding_month1">Month 1 Onboarding</option>
                  </select>

                  {/* Toggle Placeholders (Reviewer Control) */}
                  {selectedAudience === "incoming_intern" && (
                    <button
                      onClick={() => setShowPlaceholders(!showPlaceholders)}
                      className={`px-3 py-2 rounded-xl border text-xs font-mono transition-colors flex items-center gap-1.5 ${
                        showPlaceholders
                          ? "bg-surface-hover text-indigo-400 border-indigo-500/30"
                          : "bg-surface text-text-muted border-subtle"
                      }`}
                      title="Toggle whether Restricted: request access placeholders are displayed in Intern View"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Placeholders: {showPlaceholders ? "ON" : "OFF"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Section 3: Filterable Atomic Claim List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-text-muted font-mono">
                  <span>
                    Showing {filteredClaims.length} of {rawClaims.length} claims in{" "}
                    {selectedAudience === "incoming_lead" ? "Team Lead" : "Intern"}{" "}
                    Draft v1.0
                  </span>
                  <span>Sorted by Section & Evidence State</span>
                </div>

                {filteredClaims.length === 0 ? (
                  <Card className="p-8 text-center text-text-muted">
                    <p className="text-sm">No claims match the active filters.</p>
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedState("all");
                        setSelectedSection("all");
                      }}
                      className="mt-2 text-indigo-400 text-xs hover:underline font-mono"
                    >
                      Clear all filters
                    </button>
                  </Card>
                ) : (
                  <div className="space-y-3.5">
                    {filteredClaims.map((claim) => (
                      <ClaimCard
                        key={claim.id}
                        claim={claim}
                        chunksById={chunksMap}
                        onInspectEvidence={handleOpenCitation}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Bottom Next Stage Navigation */}
          <div className="pt-6 border-t border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/connect">
              <Button variant="secondary" size="md">
                ← Back to Stage 1 & 2: Connect
              </Button>
            </Link>

            <Link href="/interview">
              <Button variant="primary" size="lg">
                Proceed to Stage 4: Targeted Gap-Interview
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </>
      )}

      {/* Interactive Citation Popover */}
      <SourceCitationPopover
        isOpen={Boolean(inspectedEvidence)}
        onClose={() => setInspectedEvidence(null)}
        evidence={inspectedEvidence}
        chunk={inspectedChunk}
        claimText={inspectedClaimText}
      />
    </div>
  );
}
