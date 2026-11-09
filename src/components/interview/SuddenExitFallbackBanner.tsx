"use client";

import React, { useState } from "react";
import Link from "next/link";
import { UserX, ShieldAlert, ArrowRight, RotateCcw, CheckCircle2 } from "lucide-react";
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
  const [customContact, setCustomContact] = useState(assignedFallbackContact);
  const [showConfig, setShowConfig] = useState(false);

  const fallbackRecipient = "Prof. Deshmukh (Faculty Mentor, CS Dept)";

  const handleSimulate = async () => {
    await onSimulateSuddenExit(fallbackRecipient);
    setShowConfig(false);
  };

  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${
        isSuddenExitActive
          ? "border-rose-500/40 bg-rose-950/20 shadow-lg shadow-rose-950/20"
          : "border-border-subtle bg-surface"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
              isSuddenExitActive
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : "bg-canvas text-text-secondary border border-border-subtle"
            }`}
          >
            {isSuddenExitActive ? (
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            ) : (
              <UserX className="w-5 h-5 text-text-secondary" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-text-primary">
                Sudden-Exit Safety Fallback • Sudden Exit Safety Handler (ADR-006)
              </h3>
              {isSuddenExitActive ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/40">
                  Fallback Mode Active
                </span>
              ) : (
                <span className="text-[11px] font-mono text-text-muted">
                  Departing person unavailable? (Sudden Exit Mode)
                </span>
              )}
            </div>

            <p className="text-xs text-text-secondary leading-relaxed max-w-2xl">
              {isSuddenExitActive ? (
                <>
                  Departing member was unavailable. <strong className="text-rose-300 font-mono">{unansweredCount}</strong> knowledge gap(s) were preserved as <span className="text-rose-400 font-mono font-semibold">RED (UNSUPPORTED)</span> and safely routed to faculty mentor <strong className="text-text-primary font-mono">{fallbackRecipient}</strong>.
                </>
              ) : (
                <>
                  If the departing lead is suddenly unavailable, trigger this fallback to preserve open gaps as Red and automatically route them to <strong>{fallbackRecipient}</strong>.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end md:self-center">
          {isSuddenExitActive ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={onReset}
              disabled={isLoading}
              className="text-xs font-mono"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset Mode
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSimulate}
              disabled={isLoading}
              className="text-xs font-mono text-rose-300 hover:text-white hover:bg-rose-500/20 border-rose-500/30"
              title="Demonstrates how unanswered gaps stay Red and get assigned to Prof. Deshmukh"
            >
              Simulate Sudden Exit
            </Button>
          )}

          <Link href="/review">
            <Button variant="primary" size="sm" className="text-xs font-mono">
              Continue to Review (Stage 5) →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
