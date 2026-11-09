"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
  Shield,
  Lock,
  GitCompare,
  HelpCircle,
  FileQuestion,
  AlertTriangle,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { TrapVerificationResult } from "@/services/trust/metrics.service";
import { Button } from "@/components/ui/Button";

interface TrapScorecardTableProps {
  traps: TrapVerificationResult[];
}

export function TrapScorecardTable({ traps }: TrapScorecardTableProps) {
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const filteredTraps = traps.filter((t) => {
    if (filterCategory === "all") return true;
    if (filterCategory === "rbac_security") {
      return t.category === "security" || t.category === "rbac" || t.category === "injection";
    }
    if (filterCategory === "trust_evidence") {
      return t.category === "conflict" || t.category === "staleness";
    }
    if (filterCategory === "tacit_gaps") {
      return t.category === "tacit_gap";
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Table Header & Category Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-cyan" />
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-text-primary">
            The 8 Planted Traps Verification Matrix &amp; 8-Trap Verification Scorecard
          </h2>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => setFilterCategory("all")}
            className={`px-2.5 py-1 rounded-md transition-all ${
              filterCategory === "all"
                ? "bg-accent-primary text-white font-bold"
                : "bg-surface text-text-secondary hover:text-text-primary border border-border-subtle"
            }`}
          >
            All 8 Traps (8)
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory("rbac_security")}
            className={`px-2.5 py-1 rounded-md transition-all ${
              filterCategory === "rbac_security"
                ? "bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40"
                : "bg-surface text-text-secondary hover:text-text-primary border border-border-subtle"
            }`}
          >
            RBAC &amp; Security (4, 5, 6, 8)
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory("trust_evidence")}
            className={`px-2.5 py-1 rounded-md transition-all ${
              filterCategory === "trust_evidence"
                ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40"
                : "bg-surface text-text-secondary hover:text-text-primary border border-border-subtle"
            }`}
          >
            Conflict &amp; Stale (1, 3)
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory("tacit_gaps")}
            className={`px-2.5 py-1 rounded-md transition-all ${
              filterCategory === "tacit_gaps"
                ? "bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40"
                : "bg-surface text-text-secondary hover:text-text-primary border border-border-subtle"
            }`}
          >
            Tacit Gaps (2, 7)
          </button>
        </div>
      </div>

      {/* Traps Cards List */}
      <div className="space-y-3">
        {filteredTraps.map((trap) => (
          <div
            key={trap.trapId}
            className="rounded-xl border border-border-subtle bg-surface p-4 md:p-5 transition-all hover:border-accent-cyan/40 space-y-3"
          >
            {/* Top Row: Trap Title & Status Pill */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle/50 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold">
                  #{trap.trapId}
                </span>
                <h3 className="text-sm font-semibold text-text-primary">
                  {trap.title}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-canvas border border-border-subtle text-text-muted">
                  {trap.category}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>PASS (Verified)</span>
                </span>

                <Link href={trap.stageRoute}>
                  <Button variant="secondary" size="sm" className="text-xs h-7 px-2.5 font-mono">
                    <span>Inspect Live</span>
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Description & Implementation Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              <div className="space-y-1 bg-canvas/40 p-3 rounded-lg border border-border-subtle">
                <span className="text-[10px] font-mono uppercase text-text-muted font-bold block">
                  Planted Benchmark Challenge:
                </span>
                <p className="text-text-secondary leading-relaxed">
                  {trap.description}
                </p>
                <div className="pt-1 text-[11px] font-mono text-accent-cyan/90">
                  Expected: {trap.expectedBehavior}
                </div>
              </div>

              <div className="space-y-1 bg-emerald-950/10 p-3 rounded-lg border border-emerald-500/20">
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">
                  EchoBridge Live Verification Proof:
                </span>
                <p className="text-text-primary leading-relaxed">
                  {trap.actualImplementation}
                </p>
                <div className="pt-1 text-[11px] font-mono text-emerald-300/90 italic">
                  &quot;{trap.evidenceSnippet}&quot;
                </div>
              </div>
            </div>

            {/* Stage Location Pill */}
            <div className="flex items-center justify-between text-[11px] font-mono text-text-muted pt-1">
              <span>Verified in: <strong className="text-text-secondary">{trap.stageName}</strong></span>
              <span className="text-accent-cyan">Route: {trap.stageRoute}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
