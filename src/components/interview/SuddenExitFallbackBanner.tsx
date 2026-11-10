"use client";

import React from "react";
import Link from "next/link";
import { UserX, ShieldAlert, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface SuddenExitFallbackBannerProps {
  isSuddenExitActive: boolean;
  assignedFallbackContact: string;
  unansweredCount: number;
  onSimulateSuddenExit: (fallbackContact: string) => Promise<void>;
  onReset: () => Promise<void>;
  isLoading?: boolean;
}

export function SuddenExitFallbackBanner({
  isSuddenExitActive,
  assignedFallbackContact,
  unansweredCount,
  onSimulateSuddenExit,
  onReset,
  isLoading = false,
}: SuddenExitFallbackBannerProps) {
  const fallbackRecipient =
    assignedFallbackContact || "Prof. Deshmukh (Faculty Mentor, CS Dept)";

  const handleSimulate = async () => {
    await onSimulateSuddenExit(fallbackRecipient);
  };

  return (
    <div
      className={`rounded-xl border p-5 transition-all shadow-sm ${
        isSuddenExitActive
          ? "border-rose-200 bg-rose-50/70"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-lg shrink-0 mt-0.5 border ${
              isSuddenExitActive
                ? "bg-rose-100 text-rose-700 border-rose-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {isSuddenExitActive ? (
              <ShieldAlert className="w-5 h-5" />
            ) : (
              <UserX className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Sudden-Exit Safety Fallback • Sudden Exit Safety Handler (ADR-006)
              </h3>
              {isSuddenExitActive ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200 cursor-default select-none">
                  Fallback Mode Active
                </span>
              ) : (
                <span className="text-xs text-slate-500">
                  Departing person unavailable?
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
              {isSuddenExitActive ? (
                <>
                  Departing member was unavailable.{" "}
                  <strong className="text-rose-800">{unansweredCount}</strong>{" "}
                  unanswered question(s) remain marked as open gaps and routed to{" "}
                  <strong className="text-slate-900">{fallbackRecipient}</strong>.
                </>
              ) : (
                <>
                  If the departing member is unavailable, keep unanswered questions marked as open gaps for{" "}
                  <strong className="text-slate-900">{fallbackRecipient}</strong>.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end md:self-center">
          {isSuddenExitActive ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={onReset}
              disabled={isLoading}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset Mode
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleSimulate}
              disabled={isLoading}
            >
              Simulate Sudden Exit
            </Button>
          )}

          <Link href="/review">
            <Button variant="primary" size="sm">
              Continue to Review &amp; Approval →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
