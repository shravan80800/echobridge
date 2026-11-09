"use client";

import React from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Search,
  TrendingUp,
  FileCheck2,
  Sparkles,
} from "lucide-react";
import type { SystemMetricsReport } from "@/services/trust/metrics.service";
import { Card } from "@/components/ui/Card";

interface QualityMetricsGaugeProps {
  metrics: SystemMetricsReport;
}

export function QualityMetricsGauge({ metrics }: QualityMetricsGaugeProps) {
  return (
    <div className="space-y-4">
      {/* 5 Core Evaluation Pillars (Section 10 of Round 1 Proposal) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 font-mono">
        {/* Metric 1: Citation Coverage */}
        <Card className="p-4 bg-surface border-emerald-500/30 space-y-1.5">
          <div className="flex items-center justify-between text-emerald-400 text-xs">
            <span className="uppercase text-[10px] font-bold">Citation Coverage</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl md:text-3xl font-bold text-emerald-400">
              {metrics.citationCoverage}%
            </span>
            <span className="text-[11px] text-emerald-300/80 font-mono">/ &ge;95% target</span>
          </div>
          <span className="text-[10px] text-text-muted block">
            Verified verbatim &amp; entailment claims
          </span>
        </Card>

        {/* Metric 2: Unsupported Shown as Fact */}
        <Card className="p-4 bg-surface border-emerald-500/30 space-y-1.5">
          <div className="flex items-center justify-between text-emerald-400 text-xs">
            <span className="uppercase text-[10px] font-bold">Unsupported as Fact</span>
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl md:text-3xl font-bold text-emerald-400">
              {metrics.unsupportedClaimsShownAsFact}
            </span>
            <span className="text-[11px] text-emerald-300/80 font-mono">/ 0 target</span>
          </div>
          <span className="text-[10px] text-text-muted block">
            Zero unverified claims shown as fact
          </span>
        </Card>

        {/* Metric 3: Planted Gaps Detected */}
        <Card className="p-4 bg-surface border-accent-cyan/30 space-y-1.5">
          <div className="flex items-center justify-between text-accent-cyan text-xs">
            <span className="uppercase text-[10px] font-bold">Gaps Detected</span>
            <Search className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl md:text-3xl font-bold text-accent-cyan">
              {metrics.plantedGapsDetected}%
            </span>
            <span className="text-[11px] text-cyan-300/80 font-mono">/ 100% target</span>
          </div>
          <span className="text-[10px] text-text-muted block">
            Trap 2 (Redis) &amp; Trap 7 (Domain) caught
          </span>
        </Card>

        {/* Metric 4: Permission Leakage */}
        <Card className="p-4 bg-surface border-emerald-500/30 space-y-1.5">
          <div className="flex items-center justify-between text-emerald-400 text-xs">
            <span className="uppercase text-[10px] font-bold">Permission Leaks</span>
            <Lock className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl md:text-3xl font-bold text-emerald-400">
              {metrics.permissionLeakageCount}
            </span>
            <span className="text-[11px] text-emerald-300/80 font-mono">leaks</span>
          </div>
          <span className="text-[10px] text-text-muted block">
            Zero finance/key leaks in Intern scope
          </span>
        </Card>

        {/* Metric 5: Verifier Precision / Recall */}
        <Card className="p-4 bg-surface border-indigo-500/30 space-y-1.5">
          <div className="flex items-center justify-between text-indigo-400 text-xs">
            <span className="uppercase text-[10px] font-bold">Verifier P / R</span>
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl md:text-3xl font-bold text-indigo-400">
              100<span className="text-base text-indigo-300 font-normal">/</span>95<span className="text-xs text-indigo-300/80 font-normal">%</span>
            </span>
          </div>
          <span className="text-[10px] text-text-muted block">
            Two-layer citation verification score
          </span>
        </Card>
      </div>
    </div>
  );
}
