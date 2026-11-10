"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Shield,
  Lock,
  Unlock,
  CheckCircle2,
  Search,
  FileText,
  Layers,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingSkeleton, ErrorBanner } from "@/components/ui/StateViews";
import { ClaimCard } from "@/components/evidence/ClaimCard";
import { SourceCitationPopover } from "@/components/evidence/SourceCitationPopover";
import { DecisionTimeline } from "@/components/evidence/DecisionTimeline";
import { ContextWebGraph } from "@/components/evidence/ContextWebGraph";
import { useRole } from "@/components/layout/RoleContext";
import type {
  AudienceRole,
  Chunk,
  ClaimRecord,
  DraftVersion,
  EvidenceRecord,
} from "@/types/echobridge.types";

export default function DraftPage() {
  const { currentRole } = useRole();

  const [selectedAudience, setSelectedAudience] = useState<AudienceRole>(
    currentRole === "incoming_intern" ? "incoming_intern" : "incoming_lead"
  );

  const [loading, setLoading] = useState(true);
  const [leadDraft, setLeadDraft] = useState<DraftVersion | null>(null);
  const [internDraft, setInternDraft] = useState<DraftVersion | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"draft" | "timeline" | "graph">(
    "draft"
  );

  const [inspectedEvidence, setInspectedEvidence] =
    useState<EvidenceRecord | null>(null);
  const [inspectedChunk, setInspectedChunk] = useState<Chunk | null>(null);
  const [inspectedClaimText, setInspectedClaimText] = useState<string>("");

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

      const [draftRes, ingestRes] = await Promise.all([
        fetch("/api/reconstruct?projectId=CampusConnect", { cache: "no-store" }),
        fetch("/api/ingest?projectId=CampusConnect", { cache: "no-store" }),
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

  const activeDraft =
    selectedAudience === "incoming_lead" ? leadDraft : internDraft;

  const chunksMap = new Map<string, Chunk>(chunks.map((c) => [c.id, c]));
  const rawClaims = activeDraft?.claims || [];

  const filteredClaims = rawClaims.filter((claim) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!claim.text.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (selectedState !== "all" && claim.evidence_state !== selectedState) {
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

  const stateCounts: Record<string, number> = {
    all: rawClaims.length,
    corroborated: rawClaims.filter((c) => c.evidence_state === "corroborated")
      .length,
    single_source: rawClaims.filter((c) => c.evidence_state === "single_source")
      .length,
    attested: rawClaims.filter((c) => c.evidence_state === "attested").length,
    stale: rawClaims.filter((c) => c.evidence_state === "stale").length,
    conflicting: rawClaims.filter((c) => c.evidence_state === "conflicting")
      .length,
    unsupported: rawClaims.filter((c) => c.evidence_state === "unsupported")
      .length,
    restricted: rawClaims.filter((c) => c.evidence_state === "restricted")
      .length,
  };

  const handleOpenCitation = (
    evidence: EvidenceRecord,
    chunk?: Chunk,
    claimText?: string
  ) => {
    setInspectedEvidence(evidence);
    setInspectedChunk(chunk || null);
    setInspectedClaimText(claimText || "");
  };

  const confidence = activeDraft?.confidence;
  const totalScore = confidence?.total_score ?? 76;

  return (
    <main className="w-full space-y-6">
      {/* ==================================================================== */}
      {/* 1. CLEAN PAGE HEADER                                                 */}
      {/* ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Evidence-Verified Handover Draft
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Review how every statement is backed by exact project quotes, dates, and access permissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link href="/interview">
            <Button variant="primary">Continue to Gap Interview →</Button>
          </Link>

          <Link href="/review">
            <Button variant="secondary">Go to Review &amp; Approve →</Button>
          </Link>
        </div>
      </div>

      {/* Audience Scope Switcher & Notice Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          {selectedAudience === "incoming_lead" ? (
            <span className="inline-flex items-center gap-2 text-slate-800 font-medium">
              <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Team Lead View:</strong> Includes architecture, operations, and confidential budget notes.
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-slate-800 font-medium">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Intern View:</strong> Restricted financial documents are hidden automatically.
              </span>
            </span>
          )}
        </div>

        {/* Segmented Control */}
        <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 border border-slate-200 text-xs shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setSelectedAudience("incoming_lead")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              selectedAudience === "incoming_lead"
                ? "bg-white text-slate-900 font-semibold shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-teal-700" />
            <span>Team Lead View</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedAudience("incoming_intern")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              selectedAudience === "incoming_intern"
                ? "bg-white text-slate-900 font-semibold shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-amber-700" />
            <span>Intern View</span>
          </button>
        </div>
      </div>

      {/* Banners */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 font-semibold text-xs cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && <ErrorBanner message={error} onRetry={fetchDraftData} />}

      {/* ==================================================================== */}
      {/* 2. VIEW SWITCHER TABS & SEARCH                                       */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("draft")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-colors cursor-pointer ${
              activeTab === "draft"
                ? "bg-teal-700 text-white border-teal-700 font-semibold shadow-sm"
                : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Handover Draft</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === "draft"
                  ? "bg-teal-800 text-teal-100"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {rawClaims.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-colors cursor-pointer ${
              activeTab === "timeline"
                ? "bg-teal-700 text-white border-teal-700 font-semibold shadow-sm"
                : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Decision Timeline</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("graph")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium border transition-colors cursor-pointer ${
              activeTab === "graph"
                ? "bg-teal-700 text-white border-teal-700 font-semibold shadow-sm"
                : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Knowledge Connections</span>
          </button>
        </div>

        {activeTab === "draft" && (
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search claims..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 placeholder:text-slate-400"
            />
          </div>
        )}
      </div>

      {/* Loading or Active Content */}
      {loading ? (
        <LoadingSkeleton
          cardCount={3}
          message="Loading verified claims and source citations..."
        />
      ) : activeTab === "timeline" ? (
        <DecisionTimeline audienceRole={selectedAudience} />
      ) : activeTab === "graph" ? (
        <ContextWebGraph audienceRole={selectedAudience} />
      ) : (
        /* ================================================================== */
        /* TAB 1: FIGURE 4 TWO-COLUMN LAYOUT                                  */
        /* ================================================================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Clean Colour-Coded Claim Rows Grouped by Section */}
          <div className="lg:col-span-8 space-y-6">
            {sections.map((sec) => {
              const secClaims = filteredClaims.filter(
                (c) => getSectionForClaim(c) === sec.key
              );
              if (secClaims.length === 0) return null;

              return (
                <div
                  key={sec.key}
                  className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h2 className="text-sm font-bold text-slate-900">
                      {sec.label}
                    </h2>
                    <span className="text-xs text-slate-500">
                      {secClaims.length} item{secClaims.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {secClaims.map((claim) => (
                      <ClaimCard
                        key={claim.id}
                        claim={claim}
                        chunksById={chunksMap}
                        cleanMode
                        onInspectEvidence={handleOpenCitation}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {filteredClaims.length === 0 && (
              <div className="p-8 rounded-xl bg-white border border-slate-200 text-center space-y-3 shadow-sm">
                <p className="text-sm text-slate-600">
                  No claims match the current filter.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSelectedState("all");
                    setSearchQuery("");
                  }}
                >
                  Reset filters
                </Button>
              </div>
            )}
          </div>

          {/* Right Sticky Sidebar: Confidence Pill + Evidence Legend */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">
            {/* Confidence Score Card */}
            <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-bold text-slate-900 block">
                    Confidence Score
                  </span>
                  <span className="text-xs text-slate-500">
                    Based on verified citations
                  </span>
                </div>

                <span className="bg-teal-700 text-white rounded-full px-3.5 py-1 text-xs font-semibold cursor-default select-none">
                  Confidence {totalScore}%
                </span>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <div className="flex justify-between text-slate-700 mb-1">
                    <span>Citation Coverage</span>
                    <span className="font-semibold text-slate-900">
                      {Math.round((confidence?.citation_coverage ?? 0.82) * 100)}
                      %
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-teal-600 rounded-full"
                      style={{
                        width: `${Math.round(
                          (confidence?.citation_coverage ?? 0.82) * 100
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
                        (confidence?.corroboration_rate ?? 0.55) * 100
                      )}
                      %
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{
                        width: `${Math.round(
                          (confidence?.corroboration_rate ?? 0.55) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-700 mb-1">
                    <span>Freshness</span>
                    <span className="font-semibold text-slate-900">
                      {Math.round((confidence?.freshness_rate ?? 0.73) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{
                        width: `${Math.round(
                          (confidence?.freshness_rate ?? 0.73) * 100
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
                        (confidence?.conflict_free_rate ?? 0.91) * 100
                      )}
                      %
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{
                        width: `${Math.round(
                          (confidence?.conflict_free_rate ?? 0.91) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Evidence Legend Filter Box */}
            <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2.5">
              <span className="text-sm font-bold text-slate-900 block">
                Evidence Legend
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
                    label: "Attested",
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
                    label: "Unsupported",
                    dot: "bg-rose-500",
                    count: stateCounts.unsupported,
                  },
                  ...(selectedAudience === "incoming_intern"
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
                  const active = selectedState === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedState(item.key)}
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
      )}

      {/* Interactive Citation Popover */}
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
