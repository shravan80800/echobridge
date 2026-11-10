"use client";

import React from "react";
import type {
  Chunk,
  ClaimRecord,
  EvidenceRecord,
  EvidenceState,
} from "@/types/echobridge.types";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import { Lock, FileQuestion } from "lucide-react";

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

const rowSurfaceColors: Record<EvidenceState, string> = {
  corroborated: "bg-emerald-50/40 border-l-emerald-500",
  single_source: "bg-amber-50/40 border-l-amber-500",
  attested: "bg-blue-50/40 border-l-blue-500",
  stale: "bg-orange-50/40 border-l-orange-500",
  conflicting: "bg-purple-50/40 border-l-purple-500",
  unsupported: "bg-rose-50/40 border-l-rose-500",
  restricted: "bg-slate-100 border-l-slate-400 border-dashed",
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

  const primaryEvidence =
    claim.evidence && claim.evidence.length > 0 ? claim.evidence[0] : null;
  const primaryChunk = primaryEvidence
    ? getChunk(primaryEvidence.chunk_id)
    : undefined;

  // Restricted placeholder in Intern view (Zero-leak)
  if (isRestricted) {
    return (
      <div
        className={`rounded-lg p-3.5 sm:p-4 border border-slate-300 border-l-4 border-l-slate-400 border-dashed bg-slate-100 flex flex-wrap items-center justify-between gap-3 ${className}`}
      >
        <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
          <Lock className="w-4 h-4 text-slate-500 shrink-0" />
          <span>Restricted: request access</span>
        </div>
        <EvidenceBadge state="restricted" size="sm" />
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg p-3.5 sm:p-4 border border-slate-200 border-l-4 transition-all ${
        rowSurfaceColors[claim.evidence_state] || "bg-white border-l-slate-400"
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        {/* Left: Plain, Readable Statement + Optional Conflict / Gap Detail */}
        <div className="flex-1 space-y-2.5 min-w-0">
          <p className="text-slate-900 text-sm sm:text-base font-medium leading-relaxed">
            {claim.text}
          </p>

          {/* Conflicting Side-by-Side Comparison Box */}
          {isConflicting && claim.conflict_pair && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 rounded-lg bg-white border border-purple-200 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2 text-purple-800 font-semibold">
                  <span>Option A: {claim.conflict_pair.side_a.author}</span>
                  <span className="text-slate-500 font-normal">
                    {new Date(
                      claim.conflict_pair.side_a.timestamp
                    ).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-800 font-medium">
                  &ldquo;{claim.conflict_pair.side_a.value}&rdquo;
                </p>
                <span className="text-slate-500 block">
                  {claim.conflict_pair.side_a.source_title || "Team Chat"}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-white border border-purple-200 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2 text-purple-800 font-semibold">
                  <span>Option B: {claim.conflict_pair.side_b.author}</span>
                  <span className="text-slate-500 font-normal">
                    {new Date(
                      claim.conflict_pair.side_b.timestamp
                    ).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-800 font-medium">
                  &ldquo;{claim.conflict_pair.side_b.value}&rdquo;
                </p>
                <span className="text-slate-500 block">
                  {claim.conflict_pair.side_b.source_title || "Planning Doc"}
                </span>
              </div>
            </div>
          )}

          {/* Unsupported Red Gap Callout */}
          {isUnsupported && (
            <div className="px-3 py-2 rounded-lg bg-white/80 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <FileQuestion className="w-4 h-4 shrink-0 text-rose-600" />
              <span>
                No supporting quote found in project files — queued for Gap Interview.
              </span>
            </div>
          )}
        </div>

        {/* Right Side: Non-Clickable EvidenceBadge + Clickable source button */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <EvidenceBadge state={claim.evidence_state} size="sm" />

          {primaryEvidence ? (
            <button
              type="button"
              onClick={() =>
                onInspectEvidence?.(primaryEvidence, primaryChunk, claim.text)
              }
              className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm cursor-pointer transition-colors"
              title="View quoted source evidence"
            >
              <span>🔗 source</span>
              {claim.evidence && claim.evidence.length > 1 && (
                <span className="text-[11px] text-slate-500 font-normal">
                  +{claim.evidence.length - 1}
                </span>
              )}
            </button>
          ) : (
            <span className="text-xs text-slate-500 px-2 py-0.5 rounded-full bg-white/70 border border-slate-200 cursor-default select-none">
              No source
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
