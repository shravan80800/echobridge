"use client";

import React, { useState } from "react";
import {
  GitCompare,
  Plus,
  Minus,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import type { VersionDiffSummary } from "@/services/workflow/review.service";
import type { VersionLabel } from "@/types/echobridge.types";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";

interface VersionDiffViewerProps {
  diff: VersionDiffSummary | null;
  fromVersion: VersionLabel;
  toVersion: VersionLabel;
  onSelectVersions: (from: VersionLabel, to: VersionLabel) => void;
  hideClaimIds?: boolean;
  isLoading?: boolean;
}

export function VersionDiffViewer({
  diff,
  fromVersion,
  toVersion,
  onSelectVersions,
  hideClaimIds = false,
}: VersionDiffViewerProps) {
  const [filterMode, setFilterMode] = useState<"all" | "modified" | "unchanged">(
    "all"
  );

  if (!diff) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 text-sm">
        No version diff available for {fromVersion} → {toVersion}.
      </div>
    );
  }

  const items = diff.items.filter((item) => {
    if (filterMode === "modified")
      return (
        item.changeType === "modified" ||
        item.changeType === "added" ||
        item.changeType === "removed"
      );
    if (filterMode === "unchanged") return item.changeType === "unchanged";
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Controls & Version Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-teal-700 shrink-0" />
          <span className="text-sm font-semibold text-slate-900">
            Version Comparison
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => onSelectVersions("v1.0", "v1.1")}
            className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              fromVersion === "v1.0" && toVersion === "v1.1"
                ? "bg-teal-700 text-white border-teal-700 font-semibold shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-medium"
            }`}
          >
            v1.0 → v1.1 (After Interview)
          </button>

          <button
            type="button"
            onClick={() => onSelectVersions("v1.1", "v2.0")}
            className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              fromVersion === "v1.1" && toVersion === "v2.0"
                ? "bg-teal-700 text-white border-teal-700 font-semibold shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-medium"
            }`}
          >
            v1.1 → v2.0 (Reviewer Edits)
          </button>

          <button
            type="button"
            onClick={() => onSelectVersions("v1.0", "v2.0")}
            className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              fromVersion === "v1.0" && toVersion === "v2.0"
                ? "bg-teal-700 text-white border-teal-700 font-semibold shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-medium"
            }`}
          >
            v1.0 → v2.0 (All Changes)
          </button>
        </div>
      </div>

      {/* Diff Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block">
            Modified Claims
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-amber-700">
              ~{diff.modifiedCount}
            </span>
            <span className="text-xs text-slate-500">claims</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block">
            Added Claims
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-emerald-700">
              +{diff.addedCount}
            </span>
            <span className="text-xs text-slate-500">claims</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block">
            Removed Claims
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-rose-700">
              -{diff.removedCount}
            </span>
            <span className="text-xs text-slate-500">claims</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 block">
            Unchanged Claims
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-slate-700">
              ={diff.unchangedCount}
            </span>
            <span className="text-xs text-slate-500">claims</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 shadow-sm col-span-2 md:col-span-1">
          <span className="text-xs font-semibold text-teal-800 block">
            Confidence Delta
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-bold text-teal-900">
              {diff.confidenceScoreChange.to}%
            </span>
            <span className="text-xs text-emerald-700 font-semibold inline-flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5 shrink-0" />
              {diff.confidenceScoreChange.delta >= 0
                ? `+${diff.confidenceScoreChange.delta}%`
                : `${diff.confidenceScoreChange.delta}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterMode === "all"
                ? "bg-teal-50 text-teal-800 border border-teal-200 font-semibold"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All ({diff.totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("modified")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterMode === "modified"
                ? "bg-amber-50 text-amber-800 border border-amber-200 font-semibold"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Changes Only (
            {diff.modifiedCount + diff.addedCount + diff.removedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("unchanged")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filterMode === "unchanged"
                ? "bg-slate-200 text-slate-900 font-semibold"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Unchanged ({diff.unchangedCount})
          </button>
        </div>

        <span className="text-xs text-slate-500">
          Showing {items.length} claim(s)
        </span>
      </div>

      {/* Inline Diff List */}
      <div className="space-y-3">
        {items.map((item) => {
          const isModified = item.changeType === "modified";
          const isAdded = item.changeType === "added";
          const isRemoved = item.changeType === "removed";

          return (
            <div
              key={item.claimId}
              className={`rounded-xl border p-4 bg-white shadow-sm ${
                isModified
                  ? "border-amber-300"
                  : isAdded
                  ? "border-emerald-300"
                  : isRemoved
                  ? "border-rose-300"
                  : "border-slate-200"
              }`}
            >
              {/* Diff Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border cursor-default select-none ${
                      isModified
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : isAdded
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : isRemoved
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {item.changeType}
                  </span>
                  {!hideClaimIds && (
                    <span className="text-xs font-mono text-slate-500">
                      {item.claimId}
                    </span>
                  )}
                </div>

                {/* State Transition Indicator */}
                {isModified && item.stateDiff?.isModified && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <EvidenceBadge state={item.stateDiff.oldState} size="sm" />
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <EvidenceBadge state={item.stateDiff.newState} size="sm" />
                  </div>
                )}

                {item.newClaim && !item.stateDiff?.isModified && (
                  <EvidenceBadge
                    state={item.newClaim.evidence_state}
                    size="sm"
                  />
                )}
              </div>

              {/* Text Diff Body */}
              <div className="space-y-2 text-xs sm:text-sm">
                {isModified ? (
                  <>
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2">
                      <Minus className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <span className="text-xs text-rose-700 font-semibold block mb-0.5">
                          {diff.fromVersion}:
                        </span>
                        <span>{item.textDiff?.oldText}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2">
                      <Plus className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <span className="text-xs text-emerald-700 font-semibold block mb-0.5">
                          {diff.toVersion}:
                        </span>
                        <span>{item.textDiff?.newText}</span>
                      </div>
                    </div>
                  </>
                ) : isAdded ? (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2">
                    <Plus className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span>{item.textDiff?.newText}</span>
                    </div>
                  </div>
                ) : isRemoved ? (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 line-through flex items-start gap-2">
                    <Minus className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span>{item.textDiff?.oldText}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
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
