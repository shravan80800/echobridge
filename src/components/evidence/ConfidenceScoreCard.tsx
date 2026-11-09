"use strict";
/**
 * Transparent Confidence Score HUD
 * Implements docs/PRD.md Section 5, docs/DESIGN.md Section 5.2, and TASKS.md TASK-016.
 *
 * Displays transparent evidence quality heuristic (not black-box probability)
 * with individual progress bars for the 4 formula components:
 * 40% Citation Coverage + 25% Corroboration Rate + 15% Freshness Rate + 20% Non-Conflict Rate.
 */

"use client";

import React from "react";
import type { ConfidenceBreakdown } from "@/types/echobridge.types";
import {
  ShieldCheck,
  FileCheck,
  Clock,
  AlertTriangle,
  Info,
} from "lucide-react";

interface ConfidenceScoreCardProps {
  confidence: ConfidenceBreakdown;
  className?: string;
  audienceRole?: "incoming_lead" | "incoming_intern";
}

export function ConfidenceScoreCard({
  confidence,
  className = "",
  audienceRole,
}: ConfidenceScoreCardProps) {
  const {
    total_score,
    citation_coverage,
    corroboration_rate,
    freshness_rate,
    conflict_free_rate,
    conflict_rate,
    weights,
  } = confidence;

  // Determine score color tier
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 60) return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    return "text-rose-400 border-rose-500/30 bg-rose-500/10";
  };

  const getScoreRadialBorder = (score: number) => {
    if (score >= 80) return "#10B981";
    if (score >= 60) return "#F59E0B";
    return "#EF4444";
  };

  return (
    <div
      className={`rounded-xl border border-subtle bg-surface p-5 shadow-lg relative overflow-hidden ${className}`}
    >
      {/* Top Subtle Glow */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500 opacity-60" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Overall Score HUD */}
        <div className="flex items-center gap-5">
          {/* Circular / Large Score Badge */}
          <div
            className={`w-20 h-20 rounded-2xl border flex flex-col items-center justify-center font-mono shadow-inner shrink-0 ${getScoreColor(
              total_score
            )}`}
          >
            <span className="text-3xl font-extrabold tracking-tight">
              {total_score}
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-text-muted">
              / 100
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                Confidence Score HUD
              </span>
              {audienceRole && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-surface-hover text-text-secondary border border-subtle">
                  {audienceRole === "incoming_lead" ? "Team Lead View" : "Intern View"}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-text-primary mt-0.5">
              Evidence Quality Heuristic
            </h3>
            <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-text-muted shrink-0" />
              <span>
                Calculated deterministically from 4 formula components (not a black-box probability).
              </span>
            </p>
          </div>
        </div>

        {/* Right: 4 Component Progress Bars */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 flex-1 max-w-2xl font-mono text-xs">
          {/* 1. Citation Coverage (40%) */}
          <div className="p-2.5 rounded-lg bg-canvas/70 border border-subtle">
            <div className="flex items-center justify-between text-text-secondary mb-1">
              <span className="flex items-center gap-1 text-[11px]">
                <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
                Coverage
              </span>
              <span className="text-indigo-400 font-bold">
                {Math.round(citation_coverage * 100)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, citation_coverage * 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-text-muted mt-1 text-right">
              Weight: {Math.round(weights.citation_coverage * 100)}%
            </div>
          </div>

          {/* 2. Corroboration Rate (25%) */}
          <div className="p-2.5 rounded-lg bg-canvas/70 border border-subtle">
            <div className="flex items-center justify-between text-text-secondary mb-1">
              <span className="flex items-center gap-1 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Corroborated
              </span>
              <span className="text-emerald-400 font-bold">
                {Math.round(corroboration_rate * 100)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, corroboration_rate * 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-text-muted mt-1 text-right">
              Weight: {Math.round(weights.corroboration_rate * 100)}%
            </div>
          </div>

          {/* 3. Freshness Rate (15%) */}
          <div className="p-2.5 rounded-lg bg-canvas/70 border border-subtle">
            <div className="flex items-center justify-between text-text-secondary mb-1">
              <span className="flex items-center gap-1 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Freshness
              </span>
              <span className="text-amber-400 font-bold">
                {Math.round(freshness_rate * 100)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, freshness_rate * 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-text-muted mt-1 text-right">
              Weight: {Math.round(weights.freshness_rate * 100)}%
            </div>
          </div>

          {/* 4. Conflict-Free Rate (20%) */}
          <div className="p-2.5 rounded-lg bg-canvas/70 border border-subtle">
            <div className="flex items-center justify-between text-text-secondary mb-1">
              <span className="flex items-center gap-1 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-purple-400" />
                No-Conflict
              </span>
              <span className="text-purple-400 font-bold">
                {Math.round(conflict_free_rate * 100)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, conflict_free_rate * 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-text-muted mt-1 text-right">
              Weight: {Math.round(weights.conflict_free_rate * 100)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
