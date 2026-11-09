"use client";

import React, { useState } from "react";
import {
  GitCompare,
  CheckCircle2,
  Calendar,
  User,
  FileText,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import type { ClaimRecord, ConflictPair } from "@/types/echobridge.types";
import { Button } from "@/components/ui/Button";

interface ConflictResolutionCardProps {
  claim: ClaimRecord;
  isReviewer: boolean;
  onResolve: (
    claimId: string,
    winningSide: "side_a" | "side_b" | "custom",
    customText?: string
  ) => Promise<void>;
  isLoading?: boolean;
}

export function ConflictResolutionCard({
  claim,
  isReviewer,
  onResolve,
  isLoading = false,
}: ConflictResolutionCardProps) {
  const [selectedWinner, setSelectedWinner] = useState<"side_a" | "side_b" | "custom">("side_b");
  const [customText, setCustomText] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  const conflictPair = claim.conflict_pair;
  if (!conflictPair) return null;

  const isResolved =
    !!conflictPair.resolved_winner || claim.evidence_state === "corroborated";

  const handleResolve = async (side: "side_a" | "side_b" | "custom") => {
    try {
      setIsResolving(true);
      await onResolve(claim.id, side, side === "custom" ? customText : undefined);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div
      className={`rounded-xl border p-4 md:p-5 transition-all ${
        isResolved
          ? "border-emerald-500/40 bg-surface shadow-md shadow-emerald-950/20"
          : "border-purple-500/40 bg-purple-950/10 shadow-lg shadow-purple-950/20"
      }`}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <GitCompare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-300">
                Trap 1: Authoritative Conflict Resolution
              </span>
              {isResolved ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Resolved
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-500/20 text-purple-400 border border-purple-500/40 animate-pulse">
                  Unresolved Conflict
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Attribute: <code className="font-mono text-text-primary">{conflictPair.entity_attribute}</code>
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono text-text-muted">
          Rule: Never pick a silent winner (ADR-007)
        </span>
      </div>

      {/* Side-by-Side Comparison Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        {/* Side A: Slack Chat Discussion */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            conflictPair.resolved_winner === "side_a"
              ? "border-emerald-500/50 bg-emerald-950/20"
              : "border-border-subtle bg-canvas/60"
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border-subtle pb-2 mb-2">
            <span className="text-[11px] font-mono font-bold uppercase text-text-muted flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
              Side A (Chat Discussion)
            </span>
            <span className="text-[10px] font-mono text-text-muted">
              {conflictPair.side_a.source_id}
            </span>
          </div>

          <p className="text-sm font-semibold text-text-primary mb-2">
            &quot;{conflictPair.side_a.value}&quot;
          </p>

          <div className="space-y-1 text-[11px] font-mono text-text-secondary">
            <div className="flex items-center gap-1.5">
              <User className="w-3 h-3 text-text-muted" />
              <span>Author: {conflictPair.side_a.author}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-text-muted" />
              <span>Date: {new Date(conflictPair.side_a.timestamp).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-text-muted" />
              <span className="truncate">Source: {conflictPair.side_a.source_title}</span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-border-subtle/50 text-[11px] text-text-muted italic">
            Quoted span: &quot;{conflictPair.side_a.quoted_span}&quot;
          </div>
        </div>

        {/* Side B: Planning Document v1.2 (Mentor Preferred) */}
        <div
          className={`p-3.5 rounded-xl border transition-all ${
            conflictPair.resolved_winner === "side_b"
              ? "border-emerald-500/50 bg-emerald-950/20"
              : "border-accent-primary/40 bg-indigo-950/10"
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border-subtle pb-2 mb-2">
            <span className="text-[11px] font-mono font-bold uppercase text-accent-cyan flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-accent-cyan" />
              Side B (Planning Document)
            </span>
            <span className="text-[10px] font-mono text-accent-cyan font-bold">
              [Authoritative]
            </span>
          </div>

          <p className="text-sm font-semibold text-text-primary mb-2">
            &quot;{conflictPair.side_b.value}&quot;
          </p>

          <div className="space-y-1 text-[11px] font-mono text-text-secondary">
            <div className="flex items-center gap-1.5">
              <User className="w-3 h-3 text-text-muted" />
              <span>Author: {conflictPair.side_b.author}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-text-muted" />
              <span>Date: {new Date(conflictPair.side_b.timestamp).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-text-muted" />
              <span className="truncate">Source: {conflictPair.side_b.source_title}</span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-border-subtle/50 text-[11px] text-accent-cyan/80 italic">
            Quoted span: &quot;{conflictPair.side_b.quoted_span}&quot;
          </div>
        </div>
      </div>

      {/* Resolution Actions (Reviewer Only) */}
      {isResolved ? (
        <div className="rounded-lg p-3 bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Resolved in favour of <strong>Side B ({conflictPair.resolved_winner === "side_b" ? "March 20th Planning Doc" : conflictPair.resolved_winner})</strong> by Prof. Deshmukh. Claim transitioned to <strong>Corroborated</strong>.
            </span>
          </div>
          {isReviewer && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleResolve("side_b")}
              disabled={isLoading || isResolving}
              className="text-xs h-7 text-emerald-300 hover:text-emerald-100"
            >
              Re-confirm
            </Button>
          )}
        </div>
      ) : isReviewer ? (
        <div className="space-y-3 pt-2 border-t border-border-subtle">
          <span className="text-xs font-mono text-text-secondary block">
            Reviewer Decision: Select the official version to publish in Draft v2.0:
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleResolve("side_b")}
              isLoading={isResolving && selectedWinner === "side_b"}
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Approve Side B (March 20th - Planning Doc)
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleResolve("side_a")}
              isLoading={isResolving && selectedWinner === "side_a"}
              disabled={isLoading}
              className="text-xs"
            >
              Approve Side A (March 15th - Chat)
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg p-3 bg-canvas border border-border-subtle text-text-secondary text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-text-muted shrink-0" />
          <span>
            Only <strong>Prof. Deshmukh (Reviewer)</strong> has authority to resolve conflicting claims before publishing.
          </span>
        </div>
      )}
    </div>
  );
}
