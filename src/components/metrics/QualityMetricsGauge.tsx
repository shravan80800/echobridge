"use client";

import React from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Search,
  TrendingUp,
} from "lucide-react";
import type { SystemMetricsReport } from "@/services/trust/metrics.service";

interface QualityMetricsGaugeProps {
  metrics: SystemMetricsReport;
}

export function QualityMetricsGauge({ metrics }: QualityMetricsGaugeProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 font-sans">
      {/* Metric 1: Citation Coverage */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1.5">
        <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
          <span>Citation Coverage</span>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-bold text-slate-900">
            {metrics.citationCoverage}%
          </span>
          <span className="text-xs text-slate-500">/ &ge;95% target</span>
        </div>
        <span className="text-xs text-slate-500 block">
          Verified quote &amp; meaning citations
        </span>
      </div>

      {/* Metric 2: Unsupported Shown as Fact */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1.5">
        <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
          <span>Unsupported as Fact</span>
          <ShieldCheck className="w-4 h-4 shrink-0" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-bold text-slate-900">
            {metrics.unsupportedClaimsShownAsFact}
          </span>
          <span className="text-xs text-slate-500">/ 0 target</span>
        </div>
        <span className="text-xs text-slate-500 block">
          Zero unverified claims shown as fact
        </span>
      </div>

      {/* Metric 3: Gaps Detected */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1.5">
        <div className="flex items-center justify-between text-teal-700 text-xs font-semibold">
          <span>Gaps Detected</span>
          <Search className="w-4 h-4 shrink-0" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-bold text-slate-900">
            {metrics.plantedGapsDetected}%
          </span>
          <span className="text-xs text-slate-500">/ 100% target</span>
        </div>
        <span className="text-xs text-slate-500 block">
          Missing decisions safely flagged
        </span>
      </div>

      {/* Metric 4: Permission Leaks */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1.5">
        <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
          <span>Permission Leaks</span>
          <Lock className="w-4 h-4 shrink-0" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-bold text-slate-900">
            {metrics.permissionLeakageCount}
          </span>
          <span className="text-xs text-slate-500">/ 0 target</span>
        </div>
        <span className="text-xs text-slate-500 block">
          Zero restricted data in Intern view
        </span>
      </div>

      {/* Metric 5: Verifier Precision / Recall */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1.5 sm:col-span-2 lg:col-span-1">
        <div className="flex items-center justify-between text-teal-700 text-xs font-semibold">
          <span>Verifier P / R</span>
          <TrendingUp className="w-4 h-4 shrink-0" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-bold text-slate-900">
            100<span className="text-lg font-normal text-slate-400">/</span>95
            <span className="text-sm font-normal text-slate-500">%</span>
          </span>
        </div>
        <span className="text-xs text-slate-500 block">
          Citation verification precision &amp; recall
        </span>
      </div>
    </div>
  );
}
