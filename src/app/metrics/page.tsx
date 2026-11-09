"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BarChart2,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Layers,
  Lock,
  Cpu,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSkeleton } from "@/components/ui/StateViews";
import { QualityMetricsGauge } from "@/components/metrics/QualityMetricsGauge";
import { TrapScorecardTable } from "@/components/metrics/TrapScorecardTable";
import type { SystemMetricsReport } from "@/services/trust/metrics.service";

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<SystemMetricsReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/metrics?projectId=CampusConnect");
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
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setFeedbackMessage(null);
    await fetchMetrics();
    setFeedbackMessage("Live evaluation benchmark re-calculated successfully.");
  };

  if (isLoading || !metrics) {
    return (
      <main className="min-h-screen bg-canvas px-4 py-8 md:px-8 max-w-7xl mx-auto">
        <LoadingSkeleton
          cardCount={3}
          message="Computing Real-Time Calibration & 8-Trap Evaluation Scorecard..."
          steps={[
            "Checking citation coverage against labeled CampusConnect ground truth...",
            "Validating permission isolation across Team Lead vs. Intern views...",
            "Running automated verification checks across all 8 planted traps...",
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
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-accent-primary/20 border border-accent-primary/40 text-accent-cyan uppercase">
              Evaluation &amp; Calibration Dashboard
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 inline" />
              All 8 Planted Traps Passing
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
            Handover Verification &amp; Calibration Scorecard
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl">
            Live evaluation metrics on the synthetic <strong className="text-text-primary font-mono">CampusConnect</strong> benchmark dataset. Evaluates citation coverage, zero hallucinations, privacy leakage, and all 8 planted traps.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            isLoading={isRefreshing}
            className="text-xs font-mono"
            title="Re-run live verification checks"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Re-evaluate Benchmark
          </Button>

          <Link href="/handover">
            <Button variant="ghost" size="sm" className="text-xs text-text-secondary">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Stage 6: Handover
            </Button>
          </Link>
        </div>
      </div>

      {/* Feedback Alert Toast */}
      {feedbackMessage && (
        <div className="rounded-xl p-3.5 bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="font-mono text-xs text-emerald-400 hover:text-emerald-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 5 Core Metric Gauges (Section 10 of Round 1 Proposal) */}
      <QualityMetricsGauge metrics={metrics} />

      {/* 8-Trap Verification Table */}
      <TrapScorecardTable traps={metrics.traps} />

      {/* Technical Architecture & Rigor Summary Card */}
      <Card className="p-5 bg-surface border-border-subtle space-y-4">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-accent-cyan" />
            <h3 className="text-xs font-mono font-bold uppercase text-text-primary">
              EchoBridge Technical Guardrails Architecture
            </h3>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            Zero-Config Demonstration Mode Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
          <div className="p-3.5 rounded-lg bg-canvas border border-border-subtle space-y-1.5">
            <div className="flex items-center gap-1.5 text-accent-cyan font-semibold font-mono">
              <Lock className="w-3.5 h-3.5" />
              <span>Two-Barrier RBAC Privacy</span>
            </div>
            <p className="text-text-secondary leading-relaxed text-[11px]">
              <strong>Barrier 1 (Pre-Model):</strong> Chunks outside the recipient&apos;s role scope (e.g. Finance Folder) are filtered out before calling Gemini.<br />
              <strong>Barrier 2 (Post-Generation):</strong> Any claim citing a restricted chunk is purged and replaced with a zero-leak &quot;Restricted: request access&quot; placeholder.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-canvas border border-border-subtle space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Two-Layer Verifier &amp; Author Independence</span>
            </div>
            <p className="text-text-secondary leading-relaxed text-[11px]">
              <strong>Layer A:</strong> Verbatim quote span checker confirms exact character coordinates.<br />
              <strong>Layer B:</strong> Semantic entailment judge prevents contradictions.<br />
              <strong>Author Independence:</strong> 2+ sources must have different authors and neither copies the other (ADR-005).
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-canvas border border-border-subtle space-y-1.5">
            <div className="flex items-center gap-1.5 text-indigo-400 font-semibold font-mono">
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Separation of Duties (ADR-007)</span>
            </div>
            <p className="text-text-secondary leading-relaxed text-[11px]">
              The departing member can never approve a handover (HTTP 403 Forbidden). Only the human Reviewer holds approval authority to create DraftVersion v2.0 and publish role-appropriate continuation plans.
            </p>
          </div>
        </div>
      </Card>

      {/* Bottom Navigation Toolbar */}
      <div className="flex items-center justify-between pt-6 border-t border-border-subtle">
        <Link href="/handover">
          <Button variant="ghost" size="sm" className="text-xs text-text-secondary">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to Stage 6: Handover Delivery
          </Button>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-text-muted hidden md:inline">
            Return to application overview
          </span>
          <Link href="/">
            <Button variant="primary" size="md" className="text-xs">
              <span>Return to Home Overview</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
