"use strict";
/**
 * Atomic Claim Card
 * Implements docs/DESIGN.md Section 5.3, docs/PRD.md Section 5, and TASKS.md TASK-016.
 *
 * Renders an atomic claim with its 4px left-border EvidenceState color, accessible EvidenceBadge,
 * side-by-side Purple conflict matrix, zero-leak restricted placeholder, and interactive source popovers.
 */

"use client";

import React from "react";
import type { Chunk, ClaimRecord, EvidenceRecord } from "@/types/echobridge.types";
import { Card } from "@/components/ui/Card";
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
    if (
      isUnsupported &&
      claim.text.toLowerCase().includes("redis")
    ) {
      return "Trap 2: Missing Redis Rationale";
    }
    if (claim.evidence_state === "stale") return "Trap 3: Outdated Runbook";
    if (
      claim.text.toLowerCase().includes("budget") ||
      claim.text.toLowerCase().includes("sponsorship")
    ) {
      return "Trap 5: Confidential Finance";
    }
    if (
      isUnsupported &&
      claim.text.toLowerCase().includes("domain")
    ) {
      return "Trap 7: Unanswerable Domain Question";
    }
    if (isRestricted) return "Trap 5 & 8: RBAC Isolation";
    return null;
  };

  const trapLabel = getTrapBadge();

  return (
    <Card
      evidenceState={claim.evidence_state}
      className={`p-5 transition-all shadow-md hover:border-subtle/80 ${className}`}
    >
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-subtle/60 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-text-muted text-[11px] font-semibold">
            {claim.id}
          </span>
          <EvidenceBadge state={claim.evidence_state} size="sm" />
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase bg-surface-hover text-text-secondary border border-subtle">
            {claim.claim_type.replace("_", " ")}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-surface-hover text-text-muted">
            {claim.section.replace("_", " ")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {trapLabel && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              🎯 {trapLabel}
            </span>
          )}

          {/* ACL Scope Pill */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
              claim.audience_acl?.length === 1 &&
              claim.audience_acl[0] === "incoming_lead"
                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                : "bg-surface-hover text-text-muted border border-subtle"
            }`}
          >
            {claim.audience_acl?.length === 1 &&
            claim.audience_acl[0] === "incoming_lead" ? (
              <>
                <Lock className="w-3 h-3 text-red-400" /> LEAD ONLY
              </>
            ) : (
              "LEAD + INTERN"
            )}
          </span>
        </div>
      </div>

      {/* Claim Body Content */}
      <div className="pt-3">
        {/* State 1: Restricted Zero-Leak Placeholder */}
        {isRestricted ? (
          <div className="p-4 rounded-xl bg-canvas/60 border border-dashed border-subtle flex items-center gap-3 text-text-muted font-mono text-xs">
            <Lock className="w-4 h-4 text-text-muted shrink-0" />
            <div>
              <span className="font-semibold text-text-secondary block">
                Restricted: request access
              </span>
              <span className="text-[11px] text-text-muted">
                This item cites confidential materials outside the Intern permission scope. No topic, source, or title is disclosed.
              </span>
            </div>
          </div>
        ) : isConflicting && claim.conflict_pair ? (
          /* State 2: Conflicting Purple Side-by-Side Matrix */
          <div className="space-y-3">
            <p className="text-sm font-semibold text-text-primary leading-relaxed">
              {claim.text}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Side A */}
              <div className="p-3.5 rounded-xl bg-canvas border border-purple-500/30 font-mono text-xs space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between text-purple-400 text-[11px] font-bold">
                  <span>Source A: {claim.conflict_pair.side_a.author}</span>
                  <span>
                    {new Date(
                      claim.conflict_pair.side_a.timestamp
                    ).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-text-primary font-sans text-xs">
                  &quot;{claim.conflict_pair.side_a.value}&quot;
                </div>
                <div className="text-[10px] text-text-muted">
                  Source: {claim.conflict_pair.side_a.source_id}
                </div>
              </div>

              {/* Side B */}
              <div className="p-3.5 rounded-xl bg-canvas border border-purple-500/30 font-mono text-xs space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between text-purple-400 text-[11px] font-bold">
                  <span>Source B: {claim.conflict_pair.side_b.author}</span>
                  <span>
                    {new Date(
                      claim.conflict_pair.side_b.timestamp
                    ).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-text-primary font-sans text-xs">
                  &quot;{claim.conflict_pair.side_b.value}&quot;
                </div>
                <div className="text-[10px] text-text-muted">
                  Source: {claim.conflict_pair.side_b.source_id}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* State 3: Standard Claim Statement */
          <div>
            <p className="text-sm font-medium text-text-primary leading-relaxed">
              {claim.text}
            </p>

            {/* Unsupported Red Gap Callout */}
            {isUnsupported && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <FileQuestion className="w-4 h-4 shrink-0" />
                <span>
                  Knowledge Gap: No supporting evidence in ingested sources.
                  Scheduled for Stage 4 Gap-Interview.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Source Citation Badges Row (when evidence exists) */}
        {!isRestricted && claim.evidence && claim.evidence.length > 0 && (
          <div className="mt-4 pt-3 border-t border-subtle/50 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] font-mono text-text-muted flex items-center gap-1">
              <LinkIcon className="w-3 h-3 text-indigo-400" />
              Citations:
            </span>

            {claim.evidence.map((ev) => {
              const chunk = getChunk(ev.chunk_id);
              return (
                <button
                  key={ev.id}
                  onClick={() =>
                    onInspectEvidence?.(ev, chunk, claim.text)
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-hover hover:bg-canvas border border-subtle text-text-secondary hover:text-indigo-400 transition-colors font-mono text-[11px] group cursor-pointer shadow-sm"
                  title="Click to inspect verbatim quote inside chunk"
                >
                  <span className="text-indigo-400 group-hover:underline">
                    {ev.source_id}
                  </span>
                  <span className="text-subtle">•</span>
                  <span className="text-text-muted">{ev.author}</span>
                  {ev.is_verbatim_verified ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-0.5" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-amber-400 ml-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
