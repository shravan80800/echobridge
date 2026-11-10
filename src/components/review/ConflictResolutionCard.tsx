"use client";

import React, { useState } from "react";
import {
  GitCompare,
  CheckCircle2,
  Calendar,
  User,
  FileText,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import type { ClaimRecord } from "@/types/echobridge.types";
import { Button } from "@/components/ui/Button";

interface ConflictResolutionCardProps {
  claim: ClaimRecord;
  isReviewer: boolean;
  cleanMode?: boolean;
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
  cleanMode = false,
  onResolve,
  isLoading = false,
}: ConflictResolutionCardProps) {
  const [selectedWinner, setSelectedWinner] = useState<
    "side_a" | "side_b" | "custom"
  >("side_b");
  const [isResolving, setIsResolving] = useState(false);

  const conflictPair = claim.conflict_pair;
  if (!conflictPair) return null;

  const isResolved =
    !!conflictPair.resolved_winner || claim.evidence_state === "corroborated";

  const handleResolve = async (side: "side_a" | "side_b" | "custom") => {
    try {
      setSelectedWinner(side);
      setIsResolving(true);
      await onResolve(claim.id, side);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 transition-all shadow-sm ${
        isResolved
          ? "border-emerald-200 bg-emerald-50/40"
          : "border-purple-200 bg-purple-50/40"
      }`}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-purple-100 text-purple-800 border border-purple-200 shrink-0">
            <GitCompare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                {cleanMode
                  ? "Conflicting Dates Detected — Choose Official Version"
                  : "Trap 1: Authoritative Conflict Resolution"}
              </span>
              {isResolved ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default select-none">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Resolved</span>
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200 cursor-default select-none">
                  Needs Reviewer Decision
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {cleanMode
                ? "Two project files state different deadlines. Choose which date is official."
                : `Attribute: ${conflictPair.entity_attribute}`}
            </p>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        {/* Side A: Chat Discussion */}
        <div
          className={`p-4 rounded-xl border bg-white transition-all ${
            conflictPair.resolved_winner === "side_a"
              ? "border-emerald-500 ring-1 ring-emerald-500/20"
              : "border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2.5">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              {cleanMode ? "Option A (Team Chat)" : "Side A (Chat Discussion)"}
            </span>
          </div>

          <p className="text-sm font-semibold text-slate-900 mb-2.5">
            &ldquo;{conflictPair.side_a.value}&rdquo;
          </p>

          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Author: {conflictPair.side_a.author}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Date:{" "}
                {new Date(
                  conflictPair.side_a.timestamp
                ).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                Source: {conflictPair.side_a.source_title}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500 italic">
            &ldquo;{conflictPair.side_a.quoted_span}&rdquo;
          </div>
        </div>

        {/* Side B: Planning Document */}
        <div
          className={`p-4 rounded-xl border bg-white transition-all ${
            conflictPair.resolved_winner === "side_b"
              ? "border-emerald-500 ring-1 ring-emerald-500/20"
              : "border-teal-300"
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2.5">
            <span className="text-xs font-semibold text-teal-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              {cleanMode
                ? "Option B (Planning Doc)"
                : "Side B (Planning Document)"}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-teal-50 text-teal-800 border border-teal-200 cursor-default select-none">
              Newer Source
            </span>
          </div>

          <p className="text-sm font-semibold text-slate-900 mb-2.5">
            &ldquo;{conflictPair.side_b.value}&rdquo;
          </p>

          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Author: {conflictPair.side_b.author}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Date:{" "}
                {new Date(
                  conflictPair.side_b.timestamp
                ).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                Source: {conflictPair.side_b.source_title}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500 italic">
            &ldquo;{conflictPair.side_b.quoted_span}&rdquo;
          </div>
        </div>
      </div>

      {/* Resolution Actions (Reviewer Only) */}
      {isResolved ? (
        <div className="rounded-lg p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              Resolved in favour of{" "}
              <strong>
                {conflictPair.resolved_winner === "side_a"
                  ? "March 15th (Team Chat)"
                  : "March 20th (Planning Doc)"}
              </strong>{" "}
              by Prof. Deshmukh.
            </span>
          </div>
          {isReviewer && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleResolve("side_b")}
              disabled={isLoading || isResolving}
            >
              Re-confirm
            </Button>
          )}
        </div>
      ) : isReviewer ? (
        <div className="space-y-2.5 pt-2 border-t border-slate-200">
          <span className="text-xs font-medium text-slate-700 block">
            Select the official version to include in the approved handover:
          </span>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="approve"
              size="sm"
              onClick={() => handleResolve("side_b")}
              isLoading={isResolving && selectedWinner === "side_b"}
              disabled={isLoading}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              {cleanMode
                ? "Approve March 20th (Planning Doc)"
                : "Approve Side B (March 20th - Planning Doc)"}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleResolve("side_a")}
              isLoading={isResolving && selectedWinner === "side_a"}
              disabled={isLoading}
            >
              {cleanMode
                ? "Approve March 15th (Team Chat)"
                : "Approve Side A (March 15th - Chat)"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg p-3 bg-white border border-slate-200 text-slate-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
          <span>
            Only <strong>Prof. Deshmukh (Reviewer)</strong> has authority to
            resolve conflicting claims before publishing.
          </span>
        </div>
      )}
    </div>
  );
}
