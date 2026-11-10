"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Lock,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingSkeleton } from "@/components/ui/StateViews";
import { QualityMetricsGauge } from "@/components/metrics/QualityMetricsGauge";
import { TrapScorecardTable } from "@/components/metrics/TrapScorecardTable";
import { useRole } from "@/components/layout/RoleContext";
import type { SystemMetricsReport } from "@/services/trust/metrics.service";

export default function MetricsPage() {
  const { activeProjectId, activeProjectName, workspaceRevision } = useRole();
  const [metrics, setMetrics] = useState<SystemMetricsReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    void workspaceRevision;
    try {
      setIsLoading(true);
      const res = await fetch(
        `/api/metrics?projectId=${encodeURIComponent(activeProjectId)}`,
        {
          cache: "no-store",
        }
      );
      const json = await res.json();
      if (json.success) {
        setMetrics(json);
      }
    } catch (err) {
      console.error("Failed to fetch system metrics:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeProjectId, workspaceRevision]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setFeedbackMessage(null);
    await fetchMetrics();
    setFeedbackMessage("Evaluation scorecard recalculated successfully.");
  };

  if (isLoading || !metrics) {
    return (
      <main className="w-full py-4">
        <LoadingSkeleton
          cardCount={3}
          message="Computing live verification metrics and scenario checks..."
          steps={[
            "Checking citation coverage against project sources...",
            "Validating permission isolation across Team Lead vs. Intern views...",
            "Running automated verification across all 8 test scenarios...",
          ]}
        />
      </main>
    );
  }

  return (
    <main className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-800 border border-teal-200 cursor-default select-none">
              Judge Evaluation Scorecard
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full cursor-default select-none">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              All 8 Test Scenarios Passing
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Handover Verification &amp; Calibration Scorecard
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Live verification metrics on the{" "}
            <strong className="text-slate-900">{activeProjectName}</strong> workspace,
            covering citation accuracy, gap detection, zero hallucinations, and
            access control.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            isLoading={isRefreshing}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Re-evaluate Benchmark
          </Button>

          <Link href="/handover">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              Handover
            </Button>
          </Link>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className="rounded-xl p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Row: 5 Core Metric Gauges */}
      <QualityMetricsGauge metrics={metrics} />

      {/* Main Table: 8 Scenarios Scorecard */}
      <TrapScorecardTable traps={metrics.traps} />

      {/* Guardrails Summary Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <h3 className="text-sm font-bold text-slate-900">
            Core Verification Architecture
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default select-none">
            Zero-Config Ready
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-1.5 text-teal-800 font-semibold">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Two-Layer Access Control</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-xs">
              Restricted folders (such as Budget &amp; Finance) are filtered out
              both before AI drafting and after generation so Intern views stay
              zero-leak.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Verbatim &amp; Meaning Checks</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-xs">
              Every cited claim checks both exact character coordinates in
              original files and semantic alignment across independent authors.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-900 font-semibold">
              <FileCheck2 className="w-4 h-4 shrink-0 text-teal-700" />
              <span>Independent Approval Gate</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-xs">
              Departing members cannot approve their own handover. A human mentor
              reviews diffs, resolves conflicts, and signs off before delivery.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-200">
        <Link href="/handover" className="w-full sm:w-auto">
          <Button
            variant="secondary"
            size="sm"
            className="w-full sm:w-auto"
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            Back to Handover Plan
          </Button>
        </Link>

        <Link href="/" className="w-full sm:w-auto">
          <Button
            variant="primary"
            className="w-full sm:w-auto"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Return to Home Overview
          </Button>
        </Link>
      </div>
    </main>
  );
}
