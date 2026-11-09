"use strict";
/**
 * Atomic Claim Card — Figure 4 Clean Row Design
 * Implements Figure 4 of Round 1 Proposal and TASKS.md TASK-016.
 *
 * Renders an uncluttered, scannable claim row with 4px left-border EvidenceState color,
 * accessible EvidenceBadge, compact [🔗 source] button, side-by-side conflict comparison,
 * and zero-leak restricted placeholder in Intern Scope.
 */

"use client";

import React from "react";
import type { Chunk, ClaimRecord, EvidenceRecord, EvidenceState } from "@/types/echobridge.types";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import {
  Lock,
  Link as LinkIcon,
  AlertTriangle,
  Clock,
  User,
  CheckCircle2,
  FileQuestion,
  Shield,
  Layers,
} from "lucide-react";

interface ClaimCardProps {
  claim: ClaimRecord;
  chunksById?: Map<string, Chunk> | Record<string, Chunk>;
  onInspectEvidence?: (
    evidence: EvidenceRecord,
    chunk?: Chunk,
    claimText?: string
  ) => void;
  className?: string;
}

const borderColors: Record<EvidenceState, string> = {
  corroborated: "border-l-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10",
  single_source: "border-l-amber-500 bg-amber-500/5 hover:bg-amber-500/10",
  attested: "border-l-cyan-500 bg-cyan-500/5 hover:bg-cyan-500/10",
  stale: "border-l-orange-500 bg-orange-500/5 hover:bg-orange-500/10",
  conflicting: "border-l-purple-500 bg-purple-500/5 hover:bg-purple-500/10",
  unsupported: "border-l-rose-500 bg-rose-500/5 hover:bg-rose-500/10",
  restricted: "border-l-slate-600 bg-slate-900/40 border-dashed",
};

export function ClaimCard({
  claim,
  chunksById,
  onInspectEvidence,
  className = "",
}: ClaimCardProps) {
  const getChunk = (id: string): Chunk | undefined => {
    if (!chunksById) return undefined;
    if (chunksById instanceof Map) return chunksById.get(id);
    return chunksById[id];
  };

  const isRestricted = claim.evidence_state === "restricted";
  const isConflicting = claim.evidence_state === "conflicting";
  const isUnsupported = claim.evidence_state === "unsupported";

  // Identify planted trap tags
  const getTrapBadge = () => {
    if (claim.planted_trap_id) {
      return `Trap ${claim.planted_trap_id}`;
    }
    if (isConflicting) return "Trap 1: Event Timeline Conflict";
    if (isUnsupported && claim.text.toLowerCase().includes("redis")) {
      return "Trap 2: Missing Redis Rationale";
    }
    if (claim.evidence_state === "stale") return "Trap 3: Outdated Runbook";
    if (
      claim.text.toLowerCase().includes("budget") ||
      claim.text.toLowerCase().includes("sponsorship")
    ) {
      return "Trap 5: Confidential Finance";
    }
    if (isUnsupported && claim.text.toLowerCase().includes("domain")) {
      return "Trap 7: Unanswerable Domain Question";
    }
    if (isRestricted) return "Trap 5 & 8: RBAC Isolation";
    return null;
  };

  const trapLabel = getTrapBadge();
  const primaryEvidence = claim.evidence && claim.evidence.length > 0 ? claim.evidence[0] : null;
  const primaryChunk = primaryEvidence ? getChunk(primaryEvidence.chunk_id) : undefined;

  // State 1: Restricted Placeholder in Intern Scope
  if (isRestricted) {
    return (
      <div
        className={`p-3.5 rounded-xl border border-dashed border-border-subtle bg-canvas/40 flex items-center justify-between gap-3 text-text-muted font-mono text-xs transition-all ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <Lock className="w-4 h-4 text-text-muted shrink-0" />
          <span className="font-semibold text-text-secondary">
            Restricted: request access
          </span>
        </div>
        <span className="text-[10px] text-text-muted px-2 py-0.5 rounded bg-surface border border-border-subtle">
          Confidential Finance • Intern Scope
        </span>
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded-xl border border-border-subtle border-l-4 transition-all shadow-sm ${
        borderColors[claim.evidence_state] || "border-l-indigo-500 bg-surface"
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        {/* Left: Claim Statement & Content */}
        <div className="flex-1 space-y-2">
          {/* Main Statement */}
          <p className="text-xs sm:text-sm font-medium text-text-primary leading-relaxed">
            {claim.text}
          </p>

          {/* Conflicting Side-by-Side Purple Comparison Box (Trap 1) */}
          {isConflicting && claim.conflict_pair && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1.5">
              <div className="p-2.5 rounded-lg bg-canvas border border-purple-500/30 text-[11px] font-mono space-y-1">
                <div className="flex items-center justify-between text-purple-300 font-bold text-[10px]">
                  <span>Source A ({claim.conflict_pair.side_a.author})</span>
                  <span>{new Date(claim.conflict_pair.side_a.timestamp).toLocaleDateString()}</span>
                </div>
                <div className="text-text-primary font-sans text-xs">
                  &quot;{claim.conflict_pair.side_a.value}&quot;
                </div>
                <div className="text-[10px] text-text-muted">
                  {claim.conflict_pair.side_a.source_title || claim.conflict_pair.side_a.source_id}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-canvas border border-purple-500/30 text-[11px] font-mono space-y-1">
                <div className="flex items-center justify-between text-purple-300 font-bold text-[10px]">
                  <span>Source B ({claim.conflict_pair.side_b.author})</span>
                  <span>{new Date(claim.conflict_pair.side_b.timestamp).toLocaleDateString()}</span>
                </div>
                <div className="text-text-primary font-sans text-xs">
                  &quot;{claim.conflict_pair.side_b.value}&quot;
                </div>
                <div className="text-[10px] text-text-muted">
                  {claim.conflict_pair.side_b.source_title || claim.conflict_pair.side_b.source_id}
                </div>
              </div>
            </div>
          )}

          {/* Unsupported Red Gap Callout */}
          {isUnsupported && (
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-center gap-2 font-mono">
              <FileQuestion className="w-3.5 h-3.5 shrink-0 text-rose-400" />
              <span>
                Knowledge Gap: No citation in sources. Queued for Stage 4 Gap-Interview.
              </span>
            </div>
          )}
        </div>

        {/* Right Side: Accessible EvidenceBadge + Compact [🔗 source] button */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
          {trapLabel && (
            <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-accent-primary/10 text-accent-cyan border border-accent-primary/20">
              🎯 {trapLabel.split(":")[0]}
            </span>
          )}

          <EvidenceBadge state={claim.evidence_state} size="sm" />

          {/* Compact Source Button */}
          {primaryEvidence ? (
            <button
              type="button"
              onClick={() => onInspectEvidence?.(primaryEvidence, primaryChunk, claim.text)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-hover border border-border-subtle hover:border-accent-cyan text-text-secondary hover:text-accent-cyan transition-colors text-[11px] font-mono shadow-sm cursor-pointer"
              title="Click to view verbatim quotation coordinates"
            >
              <LinkIcon className="w-3 h-3 text-accent-cyan" />
              <span>🔗 source</span>
              {claim.evidence && claim.evidence.length > 1 && (
                <span className="text-[9px] px-1 rounded bg-canvas font-bold">
                  +{claim.evidence.length - 1}
                </span>
              )}
            </button>
          ) : (
            <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded bg-canvas border border-border-subtle">
              no source
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
