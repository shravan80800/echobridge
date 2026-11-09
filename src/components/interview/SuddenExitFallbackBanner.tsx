"use client";

import React, { useState } from "react";
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

  const handleSimulate = async () => {
    await onSimulateSuddenExit(customContact || assignedFallbackContact);
    setShowConfig(false);
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        isSuddenExitActive
          ? "border-rose-500/40 bg-rose-950/20 shadow-lg shadow-rose-950/20"
          : "border-border-subtle bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg shrink-0 ${
              isSuddenExitActive
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : "bg-surface-hover text-text-muted border border-border-subtle"
            }`}
          >
            {isSuddenExitActive ? (
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            ) : (
              <UserX className="w-5 h-5 text-text-secondary" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text-primary">
                Sudden Exit Safety Handler (ADR-006)
              </h3>
              {isSuddenExitActive && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/40">
                  Fallback Mode Active
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              {isSuddenExitActive ? (
                <>
                  Departing member was unavailable. <strong className="text-rose-300 font-mono">{unansweredCount}</strong> knowledge gap(s) were preserved as <span className="text-rose-400 font-mono font-semibold">RED (UNSUPPORTED)</span> and automatically routed to faculty mentor <strong className="text-text-primary font-mono">{assignedFallbackContact}</strong>.
                </>
              ) : (
                <>
                  If the departing lead has abruptly departed without completing the interview, trigger this safety fallback to retain open gaps as Red and route follow-ups to a designated mentor.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isSuddenExitActive ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={onReset}
              disabled={isLoading}
              className="text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset Mode
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowConfig(!showConfig)}
              disabled={isLoading}
              className="text-xs"
            >
              <UserX className="w-3.5 h-3.5 mr-1.5" />
              Simulate Sudden Exit
            </Button>
          )}
        </div>
      </div>

      {/* Expandable Fallback Contact Configuration */}
      {!isSuddenExitActive && showConfig && (
        <div className="mt-4 pt-3 border-t border-border-subtle flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="flex-1">
            <label className="block text-[11px] font-mono text-text-muted mb-1">
              Designated Fallback Contact / Mentor:
            </label>
            <input
              type="text"
              value={customContact}
              onChange={(e) => setCustomContact(e.target.value)}
              placeholder="e.g. Prof. Deshmukh (Faculty Mentor, CS Dept)"
              className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-canvas border border-border-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            />
          </div>
          <div className="flex items-end gap-2 pt-2 md:pt-0">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleSimulate}
              isLoading={isLoading}
              className="text-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Confirm & Route Gaps
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfig(false)}
              disabled={isLoading}
              className="text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
