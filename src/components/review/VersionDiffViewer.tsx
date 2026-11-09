"use client";

import React, { useState } from "react";
import {
  GitCompare,
  Plus,
  Minus,
  CheckCircle2,
  TrendingUp,
  Layers,
  ArrowRight,
  Filter,
  Sparkles,
} from "lucide-react";
import type { VersionDiffSummary, ClaimDiffItem } from "@/services/workflow/review.service";
import type { VersionLabel } from "@/types/echobridge.types";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";

interface VersionDiffViewerProps {
  diff: VersionDiffSummary | null;
  fromVersion: VersionLabel;
  toVersion: VersionLabel;
  onSelectVersions: (from: VersionLabel, to: VersionLabel) => void;
  isLoading?: boolean;
}

export function VersionDiffViewer({
  diff,
  fromVersion,
  toVersion,
  onSelectVersions,
  isLoading = false,
}: VersionDiffViewerProps) {
  const [filterMode, setFilterMode] = useState<"all" | "modified" | "unchanged">("all");

  if (!diff) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface p-8 text-center text-text-muted font-mono text-xs">
        No version diff available for {fromVersion} → {toVersion}.
      </div>
    );
  }

  const items = diff.items.filter((item) => {
    if (filterMode === "modified") return item.changeType === "modified" || item.changeType === "added" || item.changeType === "removed";
    if (filterMode === "unchanged") return item.changeType === "unchanged";
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Controls & Version Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-surface border border-border-subtle">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-accent-cyan" />
          <span className="text-xs font-mono font-bold uppercase text-text-primary">
            Handover Snapshot Comparison:
          </span>
        </div>

        {/* Comparison Presets */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => onSelectVersions("v1.0", "v1.1")}
            className={`px-2.5 py-1 rounded-md transition-all ${
              fromVersion === "v1.0" && toVersion === "v1.1"
                ? "bg-accent-primary text-white font-bold"
                : "bg-canvas text-text-secondary hover:text-text-primary border border-border-subtle"
            }`}
          >
            v1.0 → v1.1 (Gap-Interview)
          </button>

          <button
            type="button"
            onClick={() => onSelectVersions("v1.1", "v2.0")}
            className={`px-2.5 py-1 rounded-md transition-all ${
              fromVersion === "v1.1" && toVersion === "v2.0"
                ? "bg-accent-primary text-white font-bold"
                : "bg-canvas text-text-secondary hover:text-text-primary border border-border-subtle"
            }`}
          >
            v1.1 → v2.0 (Reviewer Approvals)
          </button>

          <button
            type="button"
            onClick={() => onSelectVersions("v1.0", "v2.0")}
            className={`px-2.5 py-1 rounded-md transition-all ${
              fromVersion === "v1.0" && toVersion === "v2.0"
                ? "bg-accent-primary text-white font-bold"
                : "bg-canvas text-text-secondary hover:text-text-primary border border-border-subtle"
            }`}
          >
            v1.0 → v2.0 (Full Lifecycle)
          </button>
        </div>
      </div>

      {/* Diff Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 font-mono">
        <div className="p-3 rounded-xl bg-surface border border-border-subtle">
          <span className="text-[10px] text-text-muted uppercase block">Modified Claims</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-amber-400">~{diff.modifiedCount}</span>
            <span className="text-xs text-text-muted">claims</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface border border-border-subtle">
          <span className="text-[10px] text-text-muted uppercase block">Added Claims</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-emerald-400">+{diff.addedCount}</span>
            <span className="text-xs text-text-muted">claims</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface border border-border-subtle">
          <span className="text-[10px] text-text-muted uppercase block">Removed Claims</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-rose-400">-{diff.removedCount}</span>
            <span className="text-xs text-text-muted">claims</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface border border-border-subtle">
          <span className="text-[10px] text-text-muted uppercase block">Unchanged Claims</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-text-secondary">={diff.unchangedCount}</span>
            <span className="text-xs text-text-muted">claims</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface border border-accent-cyan/30">
          <span className="text-[10px] text-accent-cyan uppercase block font-bold">
            Confidence Delta
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-accent-cyan">
              {diff.confidenceScoreChange.to}%
            </span>
            <span className="text-xs text-emerald-400 font-bold flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5 inline" />
              {diff.confidenceScoreChange.delta >= 0 ? `+${diff.confidenceScoreChange.delta}%` : `${diff.confidenceScoreChange.delta}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
              filterMode === "all"
                ? "bg-surface-hover text-accent-cyan font-bold"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            All Items ({diff.totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("modified")}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
              filterMode === "modified"
                ? "bg-amber-500/20 text-amber-300 font-bold"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Changes Only ({diff.modifiedCount + diff.addedCount + diff.removedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("unchanged")}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
              filterMode === "unchanged"
                ? "bg-surface-hover text-text-secondary font-bold"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Unchanged ({diff.unchangedCount})
          </button>
        </div>

        <span className="text-[11px] font-mono text-text-muted">
          Showing {items.length} claim(s)
        </span>
      </div>

      {/* Git-Style Inline Diff List */}
      <div className="space-y-3">
        {items.map((item) => {
          const isModified = item.changeType === "modified";
          const isAdded = item.changeType === "added";
          const isRemoved = item.changeType === "removed";

          return (
            <div
              key={item.claimId}
              className={`rounded-xl border p-4 transition-all ${
                isModified
                  ? "border-amber-500/30 bg-surface shadow-sm"
                  : isAdded
                  ? "border-emerald-500/30 bg-emerald-950/10"
                  : isRemoved
                  ? "border-rose-500/30 bg-rose-950/10"
                  : "border-border-subtle bg-surface/50 opacity-80"
              }`}
            >
              {/* Diff Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle/60 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      isModified
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : isAdded
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : isRemoved
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : "bg-surface text-text-muted border border-border-subtle"
                    }`}
                  >
                    {item.changeType}
                  </span>
                  <span className="text-xs font-mono text-text-muted">
                    {item.claimId}
                  </span>
                </div>

                {/* State Transition Indicator */}
                {isModified && item.stateDiff?.isModified && (
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <EvidenceBadge state={item.stateDiff.oldState} size="sm" />
                    <ArrowRight className="w-3 h-3 text-text-muted" />
                    <EvidenceBadge state={item.stateDiff.newState} size="sm" />
                  </div>
                )}

                {item.newClaim && !item.stateDiff?.isModified && (
                  <EvidenceBadge state={item.newClaim.evidence_state} size="sm" />
                )}
              </div>

              {/* Text Diff Body */}
              <div className="space-y-2 font-mono text-xs">
                {isModified ? (
                  <>
                    {/* Old Version Line (Red) */}
                    <div className="p-2.5 rounded bg-rose-950/20 border border-rose-500/30 text-rose-300 flex items-start gap-2">
                      <Minus className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <span className="text-[10px] text-rose-400 font-bold block mb-0.5">
                          {diff.fromVersion}:
                        </span>
                        <span>{item.textDiff?.oldText}</span>
                      </div>
                    </div>

                    {/* New Version Line (Green) */}
                    <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 flex items-start gap-2">
                      <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <span className="text-[10px] text-emerald-400 font-bold block mb-0.5">
                          {diff.toVersion}:
                        </span>
                        <span>{item.textDiff?.newText}</span>
                      </div>
                    </div>
                  </>
                ) : isAdded ? (
                  <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 flex items-start gap-2">
                    <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span>{item.textDiff?.newText}</span>
                    </div>
                  </div>
                ) : isRemoved ? (
                  <div className="p-2.5 rounded bg-rose-950/20 border border-rose-500/30 text-rose-300 line-through flex items-start gap-2">
                    <Minus className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span>{item.textDiff?.oldText}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded bg-canvas border border-border-subtle text-text-secondary">
                    <span>{item.textDiff?.newText}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
