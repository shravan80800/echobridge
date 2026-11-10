"use client";

import React from "react";
import type { ConfidenceBreakdown } from "@/types/echobridge.types";
import { ShieldCheck, FileCheck, Clock, AlertTriangle } from "lucide-react";

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
    weights,
  } = confidence;

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5 ${className}`}
    >
      {/* Top Row: Title + Signature Teal Confidence Pill */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-slate-900">
              Handover Confidence
            </h3>
            {audienceRole && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 cursor-default select-none">
                {audienceRole === "incoming_lead"
                  ? "Team Lead View"
                  : "Intern View"}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent score based on citations, corroboration, freshness, and conflicts
          </p>
        </div>

        <span className="bg-teal-700 text-white rounded-full px-3.5 py-1 text-xs font-semibold cursor-default select-none shrink-0">
          Confidence {total_score}%
        </span>
      </div>

      {/* 4 Component Progress Bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-sans">
        {/* 1. Citation Coverage */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between text-slate-700">
            <span className="flex items-center gap-1.5 font-medium">
              <FileCheck className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              Citation Coverage
            </span>
            <span className="font-bold text-slate-900">
              {Math.round(citation_coverage * 100)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, citation_coverage * 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500">
            Weight: {Math.round(weights.citation_coverage * 100)}%
          </div>
        </div>

        {/* 2. Corroboration */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between text-slate-700">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              Corroboration
            </span>
            <span className="font-bold text-slate-900">
              {Math.round(corroboration_rate * 100)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, corroboration_rate * 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500">
            Weight: {Math.round(weights.corroboration_rate * 100)}%
          </div>
        </div>

        {/* 3. Freshness */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between text-slate-700">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              Freshness
            </span>
            <span className="font-bold text-slate-900">
              {Math.round(freshness_rate * 100)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, freshness_rate * 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500">
            Weight: {Math.round(weights.freshness_rate * 100)}%
          </div>
        </div>

        {/* 4. Non-Conflict */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between text-slate-700">
            <span className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              Non-Conflict
            </span>
            <span className="font-bold text-slate-900">
              {Math.round(conflict_free_rate * 100)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, conflict_free_rate * 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500">
            Weight: {Math.round(weights.conflict_free_rate * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
}
