"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Edit3,
  EyeOff,
  XCircle,
  Shield,
  Lock,
  Sparkles,
  ArrowRight,
  Send,
  AlertTriangle,
} from "lucide-react";
import type { ClaimRecord, ReviewStatus } from "@/types/echobridge.types";
import { Button } from "@/components/ui/Button";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";

interface ClaimReviewActionPanelProps {
  selectedClaim: ClaimRecord | null;
  isReviewer: boolean;
  actorRoleName: string;
  onReviewClaim: (claimId: string, action: ReviewStatus, editedText?: string) => Promise<void>;
  onApproveHandover: () => Promise<void>;
  isLoading?: boolean;
}

export function ClaimReviewActionPanel({
  selectedClaim,
  isReviewer,
  actorRoleName,
  onReviewClaim,
  onApproveHandover,
  isLoading = false,
}: ClaimReviewActionPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [isApprovingHandover, setIsApprovingHandover] = useState(false);

  const handleStartEdit = () => {
    if (!selectedClaim) return;
    setEditText(selectedClaim.text);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedClaim || !editText.trim()) return;
    await onReviewClaim(selectedClaim.id, "edited", editText.trim());
    setIsEditing(false);
  };

  const handleApproveHandoverClick = async () => {
    try {
      setIsApprovingHandover(true);
      await onApproveHandover();
    } finally {
      setIsApprovingHandover(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Separation of Duties Banner (ADR-007) */}
      {!isReviewer ? (
        <div className="rounded-xl p-4 bg-rose-950/20 border border-rose-500/40 text-rose-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-300 uppercase font-mono">
            <Lock className="w-4 h-4 text-rose-400" />
            <span>Separation of Duties (ADR-007)</span>
          </div>
          <p className="text-text-secondary leading-relaxed">
            Active persona is <strong className="text-text-primary font-mono">{actorRoleName}</strong>. Review mutations and final publication are strictly restricted to the human Reviewer.
          </p>
          <div className="pt-1 text-[11px] font-mono text-accent-cyan">
            Tip: Use the top bar Judge Role Switcher to switch to <strong>Reviewer (Prof. Deshmukh)</strong>.
          </div>
        </div>
      ) : (
        <div className="rounded-xl p-3 bg-emerald-950/20 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Authorized Reviewer: <strong>{actorRoleName}</strong>
          </span>
        </div>
      )}

      {/* Selected Claim Review Card */}
      <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
          <span className="text-xs font-mono font-bold uppercase text-text-primary">
            Claim Inspection
          </span>
          {selectedClaim && (
            <EvidenceBadge state={selectedClaim.evidence_state} size="sm" />
          )}
        </div>

        {selectedClaim ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
              <span>ID: {selectedClaim.id}</span>
              <span className="capitalize">{selectedClaim.section}</span>
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <label className="text-[11px] font-mono text-accent-cyan block">
                  Edit Claim Statement:
                </label>
                <textarea
                  rows={3}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full p-2.5 text-xs font-mono rounded-lg bg-canvas border border-border-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    className="text-xs h-7 px-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={!editText.trim() || isLoading}
                    className="text-xs h-7 px-3 bg-indigo-600 hover:bg-indigo-500"
                  >
                    Save Edit
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-primary leading-relaxed font-sans bg-canvas/40 p-3 rounded-lg border border-border-subtle">
                {selectedClaim.text}
              </p>
            )}

            {/* Current Review Status */}
            <div className="flex items-center justify-between text-[11px] font-mono pt-1">
              <span className="text-text-muted">Review Status:</span>
              <span
                className={`px-2 py-0.5 rounded font-bold uppercase ${
                  selectedClaim.review?.status === "approved"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : selectedClaim.review?.status === "edited"
                    ? "bg-indigo-500/20 text-indigo-300"
                    : selectedClaim.review?.status === "redacted"
                    ? "bg-amber-500/20 text-amber-300"
                    : selectedClaim.review?.status === "rejected"
                    ? "bg-rose-500/20 text-rose-400"
                    : "bg-surface-hover text-text-secondary"
                }`}
              >
                {selectedClaim.review?.status || "pending"}
              </span>
            </div>

            {/* Reviewer Action Buttons */}
            <div className="pt-2 border-t border-border-subtle/60 grid grid-cols-2 gap-2">
              <Button
                variant="approve"
                size="sm"
                onClick={() => onReviewClaim(selectedClaim.id, "approved")}
                disabled={!isReviewer || isLoading}
                className="text-xs w-full"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Approve
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleStartEdit}
                disabled={!isReviewer || isLoading}
                className="text-xs w-full"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1" />
                Edit
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReviewClaim(selectedClaim.id, "redacted")}
                disabled={!isReviewer || isLoading}
                className="text-xs w-full text-amber-300 hover:bg-amber-500/10"
              >
                <EyeOff className="w-3.5 h-3.5 mr-1" />
                Redact
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => onReviewClaim(selectedClaim.id, "rejected")}
                disabled={!isReviewer || isLoading}
                className="text-xs w-full"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-text-muted font-mono text-center py-4">
            Select any claim card to inspect details and apply review actions.
          </p>
        )}
      </div>

      {/* Big Handover Final Approval CTA */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-4 space-y-3">
        <div>
          <span className="text-xs font-mono font-bold uppercase text-emerald-400 block">
            Final Handover Publication
          </span>
          <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
            Approving generates <strong className="text-text-primary font-mono">DraftVersion v2.0</strong>, recalculates final confidence, and publishes role-specific onboarding plans for incoming leads and interns.
          </p>
        </div>

        <Button
          variant="approve"
          size="md"
          onClick={handleApproveHandoverClick}
          disabled={!isReviewer || isLoading || isApprovingHandover}
          isLoading={isApprovingHandover}
          className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/40"
        >
          {!isReviewer ? (
            <>
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Locked (Reviewer Only)
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Approve & Publish Handover (v2.0)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
