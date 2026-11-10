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
} from "lucide-react";
import { findSpanLocation } from "@/utils/text-matching";

interface SourceCitationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: EvidenceRecord | null;
  chunk?: Chunk | null;
  claimText?: string;
}

const SOURCE_NAMES: Record<string, string> = {
  "SRC-ARCH-01": "Architecture Doc v2",
  "SRC-GIT-02": "GitHub PR #12 Export",
  "SRC-CHAT-03": "Team Chat Export (March)",
  "SRC-PLAN-04": "Event Planning Doc",
  "SRC-RUNBOOK-05": "Deployment Runbook",
  "SRC-FIN-06": "Finance & Sponsorship Folder",
  "SRC-BACKLOG-07": "Feature Backlog Notes",
  "SRC-TASK-08": "Sprint Task Board",
};

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

  let beforeSpan = "";
  let highlightedSpan = evidence.quoted_span;
  let afterSpan = "";

  if (spanLocation) {
    beforeSpan = chunkContent.slice(0, spanLocation.start);
    highlightedSpan = chunkContent.slice(spanLocation.start, spanLocation.end);
    afterSpan = chunkContent.slice(spanLocation.end);
  } else {
    const idx = chunkContent.indexOf(evidence.quoted_span);
    if (idx !== -1) {
      beforeSpan = chunkContent.slice(0, idx);
      highlightedSpan = chunkContent.slice(
        idx,
        idx + evidence.quoted_span.length
      );
      afterSpan = chunkContent.slice(idx + evidence.quoted_span.length);
    } else {
      highlightedSpan = chunkContent;
    }
  }

  const documentName = SOURCE_NAMES[evidence.source_id] || evidence.source_id;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Source Citation Inspector"
      description="Inspect the exact source file, author, date, and highlighted quote supporting this claim."
      maxWidth="xl"
    >
      <div className="space-y-4 text-sm font-sans">
        {/* Claim Context */}
        {claimText && (
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-xs font-medium text-slate-500 block mb-1">
              Claim in Handover
            </span>
            <p className="text-slate-900 font-semibold text-sm leading-relaxed">
              &ldquo;{claimText}&rdquo;
            </p>
          </div>
        )}

        {/* Source Metadata Rail */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5 px-3.5 rounded-lg bg-teal-50/70 border border-teal-200 text-xs text-slate-800">
          <div className="flex items-center gap-1.5 font-semibold text-teal-900">
            <FileText className="w-4 h-4 text-teal-700 shrink-0" />
            <span>{documentName}</span>
          </div>

          <span className="text-slate-300 hidden sm:inline">|</span>

          <div className="flex items-center gap-1.5 text-slate-700">
            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Author: {evidence.author}</span>
          </div>

          <span className="text-slate-300 hidden sm:inline">|</span>

          <div className="flex items-center gap-1.5 text-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>
              {new Date(evidence.evidence_timestamp).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Two Verification Checks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div
            className={`p-3 rounded-lg border flex items-center gap-2.5 ${
              evidence.is_verbatim_verified
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            {evidence.is_verbatim_verified ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <div>
              <div className="font-semibold text-xs">Exact Quote Match</div>
              <div className="text-xs opacity-80">
                {evidence.is_verbatim_verified
                  ? "Quote matches original source word-for-word"
                  : "Quote differs from source excerpt"}
              </div>
            </div>
          </div>

          <div
            className={`p-3 rounded-lg border flex items-center gap-2.5 ${
              evidence.entailment_verdict === "supported"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : evidence.entailment_verdict === "contradicted"
                  ? "bg-purple-50 border-purple-200 text-purple-900"
                  : "bg-amber-50 border-amber-200 text-amber-900"
            }`}
          >
            {evidence.entailment_verdict === "supported" ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <div>
              <div className="font-semibold text-xs">Meaning Check</div>
              <div className="text-xs opacity-80 capitalize">
                Status: {evidence.entailment_verdict}
              </div>
            </div>
          </div>
        </div>

        {/* Highlighted Chunk Context */}
        <div>
          <span className="text-xs font-medium text-slate-600 block mb-1.5">
            Source Excerpt (Highlighted Quote)
          </span>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap select-text">
            <span>{beforeSpan}</span>
            <mark className="bg-teal-100 text-teal-950 border-b-2 border-teal-600 px-1 py-0.5 rounded font-semibold">
              {highlightedSpan}
            </mark>
            <span>{afterSpan}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
