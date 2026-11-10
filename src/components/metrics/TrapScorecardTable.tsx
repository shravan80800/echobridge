"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
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
      return (
        t.category === "security" ||
        t.category === "rbac" ||
        t.category === "injection"
      );
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
      {/* Header & Category Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-700 shrink-0" />
          <h2 className="text-base font-bold text-slate-900">
            8-Trap Verification Scorecard
          </h2>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setFilterCategory("all")}
            className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              filterCategory === "all"
                ? "bg-teal-700 text-white border-teal-700 font-semibold"
                : "bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-medium"
            }`}
          >
            All 8 Scenarios
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory("rbac_security")}
            className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              filterCategory === "rbac_security"
                ? "bg-teal-700 text-white border-teal-700 font-semibold"
                : "bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-medium"
            }`}
          >
            Access &amp; Secrets
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory("trust_evidence")}
            className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              filterCategory === "trust_evidence"
                ? "bg-teal-700 text-white border-teal-700 font-semibold"
                : "bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-medium"
            }`}
          >
            Conflicts &amp; Freshness
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory("tacit_gaps")}
            className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              filterCategory === "tacit_gaps"
                ? "bg-teal-700 text-white border-teal-700 font-semibold"
                : "bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-medium"
            }`}
          >
            Knowledge Gaps
          </button>
        </div>
      </div>

      {/* Scenarios List */}
      <div className="space-y-3">
        {filteredTraps.map((trap) => (
          <div
            key={trap.trapId}
            className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-3.5"
          >
            {/* Top Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold shrink-0">
                  #{trap.trapId}
                </span>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                  {trap.title}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-slate-100 border border-slate-200 text-slate-700 cursor-default select-none">
                  {trap.category.replace("_", " ")}
                </span>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default select-none">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>PASS (Verified)</span>
                </span>

                <Link href={trap.stageRoute}>
                  <Button
                    variant="secondary"
                    size="sm"
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Inspect
                  </Button>
                </Link>
              </div>
            </div>

            {/* Scenario Description & Verification Proof */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs sm:text-sm">
              <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <span className="text-xs font-semibold text-slate-600 block">
                  Test Scenario
                </span>
                <p className="text-slate-700 leading-relaxed">
                  {trap.description}
                </p>
                <div className="pt-1 text-xs text-slate-600">
                  <strong className="text-slate-800">Expected:</strong>{" "}
                  {trap.expectedBehavior}
                </div>
              </div>

              <div className="space-y-1.5 bg-emerald-50/50 p-3.5 rounded-lg border border-emerald-200">
                <span className="text-xs font-semibold text-emerald-800 block">
                  Live Verification Result
                </span>
                <p className="text-slate-900 leading-relaxed">
                  {trap.actualImplementation}
                </p>
                <div className="pt-1 text-xs text-emerald-900 italic">
                  &ldquo;{trap.evidenceSnippet}&rdquo;
                </div>
              </div>
            </div>

            {/* Footer Route Info */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1 gap-2">
              <span>
                Verified in:{" "}
                <strong className="text-slate-700">{trap.stageName}</strong>
              </span>
              <span className="font-mono text-teal-700">{trap.stageRoute}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
