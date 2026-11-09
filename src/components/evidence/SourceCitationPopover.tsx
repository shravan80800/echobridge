"use strict";
/**
 * Source Citation Popover & Verbatim Quote Inspector
 * Implements docs/DESIGN.md Section 5.3 and TASKS.md TASK-016.
 *
 * Displays the full source context with the exact cited `quoted_span` highlighted
 * in glowing indigo alongside Layer A (Verbatim) and Layer B (Entailment) status badges.
 */

"use client";

import React from "react";
import type { Chunk, EvidenceRecord } from "@/types/echobridge.types";
import { Modal } from "@/components/ui/Modal";
import {
  FileText,
  User,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  ExternalLink,
} from "lucide-react";
import { findSpanLocation } from "@/utils/text-matching";

interface SourceCitationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: EvidenceRecord | null;
  chunk?: Chunk | null;
  claimText?: string;
}

export function SourceCitationPopover({
  isOpen,
  onClose,
  evidence,
  chunk,
  claimText,
}: SourceCitationPopoverProps) {
  if (!isOpen || !evidence) return null;

  const chunkContent = chunk?.content || evidence.quoted_span;
  const spanLocation = findSpanLocation(evidence.quoted_span, chunkContent);

  // Split chunk content to highlight quoted span cleanly
  let beforeSpan = "";
  let highlightedSpan = evidence.quoted_span;
  let afterSpan = "";

  if (spanLocation) {
    beforeSpan = chunkContent.slice(0, spanLocation.start);
    highlightedSpan = chunkContent.slice(spanLocation.start, spanLocation.end);
    afterSpan = chunkContent.slice(spanLocation.end);
  } else {
    // If location not found by index, find first occurrence
    const idx = chunkContent.indexOf(evidence.quoted_span);
    if (idx !== -1) {
      beforeSpan = chunkContent.slice(0, idx);
      highlightedSpan = chunkContent.slice(idx, idx + evidence.quoted_span.length);
      afterSpan = chunkContent.slice(idx + evidence.quoted_span.length);
    } else {
      highlightedSpan = chunkContent;
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Source Evidence & Citation Inspector"
      description="Inspect verbatim quote grounding and two-layer verification checks inside the source chunk."
      maxWidth="xl"
    >
      <div className="space-y-4 text-xs font-sans">
        {/* Claim Context Header */}
        {claimText && (
          <div className="p-3 rounded-lg bg-canvas border border-subtle">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block mb-1">
              Handover Claim Being Verified:
            </span>
            <p className="text-text-primary font-medium text-xs leading-relaxed">
              &quot;{claimText}&quot;
            </p>
          </div>
        )}

        {/* Two-Layer Verification Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Layer A Badge */}
          <div
            className={`p-2.5 rounded-lg border flex items-center gap-2.5 ${
              evidence.is_verbatim_verified
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            {evidence.is_verbatim_verified ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0" />
            )}
            <div>
              <div className="font-mono font-bold text-[11px]">
                Layer A: Verbatim Span Match
              </div>
              <div className="text-[10px] opacity-90">
                {evidence.is_verbatim_verified
                  ? "Quote exists verbatim inside cited source chunk"
                  : "Quote not found or altered from original chunk"}
              </div>
            </div>
          </div>

          {/* Layer B Badge */}
          <div
            className={`p-2.5 rounded-lg border flex items-center gap-2.5 ${
              evidence.entailment_verdict === "supported"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : evidence.entailment_verdict === "contradicted"
                  ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            }`}
          >
            {evidence.entailment_verdict === "supported" ? (
              <ShieldCheck className="w-4 h-4 shrink-0" />
            ) : evidence.entailment_verdict === "contradicted" ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <div>
              <div className="font-mono font-bold text-[11px]">
                Layer B: Semantic Entailment
              </div>
              <div className="text-[10px] opacity-90 uppercase">
                Verdict: {evidence.entailment_verdict}
              </div>
            </div>
          </div>
        </div>

        {/* Source Metadata Rail */}
        <div className="flex flex-wrap items-center gap-3 py-2 px-3 rounded-lg bg-surface-hover/50 border border-subtle text-[11px] text-text-secondary font-mono">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>{evidence.source_id}</span>
          </div>

          <span className="text-subtle">•</span>

          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-text-muted" />
            <span>Author: {evidence.author}</span>
          </div>

          <span className="text-subtle">•</span>

          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-text-muted" />
            <span>
              {new Date(evidence.evidence_timestamp).toLocaleDateString()}
            </span>
          </div>

          {chunk && (
            <>
              <span className="text-subtle">•</span>
              <div className="flex items-center gap-1 text-[10px] text-text-muted">
                <span>Chunk: {chunk.id}</span>
              </div>
            </>
          )}
        </div>

        {/* Highlighted Chunk Text Box */}
        <div>
          <div className="flex items-center justify-between text-[10px] font-mono text-text-muted mb-1.5">
            <span>FULL CHUNK CONTEXT (VERBATIM HIGHLIGHT):</span>
            {spanLocation && (
              <span>
                Span Offset: [{spanLocation.start}..{spanLocation.end}]
              </span>
            )}
          </div>

          <div className="p-4 rounded-xl bg-canvas border border-subtle font-mono text-xs leading-relaxed text-text-secondary whitespace-pre-wrap select-text">
            <span>{beforeSpan}</span>
            <mark className="bg-indigo-500/25 text-indigo-200 border-b-2 border-indigo-400 px-1 py-0.5 rounded font-mono font-semibold shadow-sm">
              {highlightedSpan}
            </mark>
            <span>{afterSpan}</span>
          </div>
        </div>

        {/* Quoted Span Callout */}
        <div className="p-3 rounded-lg bg-surface border border-subtle text-[11px]">
          <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider block mb-0.5">
            Verified Quoted Span:
          </span>
          <p className="font-mono text-text-primary italic">
            &quot;{evidence.quoted_span}&quot;
          </p>
        </div>
      </div>
    </Modal>
  );
}
