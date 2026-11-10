"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Edit3,
  EyeOff,
  XCircle,
  Shield,
  Lock,
} from "lucide-react";
import type { ClaimRecord, ReviewStatus } from "@/types/echobridge.types";
import { Button } from "@/components/ui/Button";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";

interface ClaimReviewActionPanelProps {
  selectedClaim: ClaimRecord | null;
  isReviewer: boolean;
  actorRoleName: string;
  cleanMode?: boolean;
  onReviewClaim: (
    claimId: string,
    action: ReviewStatus,
    editedText?: string
  ) => Promise<void>;
  onApproveHandover: () => Promise<void>;
  isLoading?: boolean;
}

export function ClaimReviewActionPanel({
  selectedClaim,
  isReviewer,
  actorRoleName,
  cleanMode = false,
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
      {/* Reviewer / Separation Banner */}
      {!isReviewer ? (
        <div className="rounded-xl p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-amber-900">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              {cleanMode
                ? "Reviewer Approval Required"
                : "Separation of Duties (ADR-007)"}
            </span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            Active persona is{" "}
            <strong className="text-slate-900">{actorRoleName}</strong>. Only a
            mentor or reviewer can approve edits or publish the handover.
          </p>
        </div>
      ) : (
        <div className="rounded-xl p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            Authorized Reviewer: <strong>{actorRoleName}</strong>
          </span>
        </div>
      )}

      {/* Selected Claim Inspection Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <span className="text-sm font-semibold text-slate-900">
            Actions
          </span>
          {selectedClaim && (
            <EvidenceBadge state={selectedClaim.evidence_state} size="sm" />
          )}
        </div>

        {selectedClaim ? (
          <div className="space-y-3">
            {isEditing ? (
              <div className="space-y-2.5">
                <label className="text-xs font-medium text-slate-700 block">
                  Edit Statement
                </label>
                <textarea
                  rows={3}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full p-2.5 text-sm rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={!editText.trim() || isLoading}
                  >
                    Save Edit
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                {selectedClaim.text}
              </p>
            )}

            {/* Current Review Status */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-500 font-medium">Review Status:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border cursor-default select-none ${
                  selectedClaim.review?.status === "approved"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : selectedClaim.review?.status === "edited"
                    ? "bg-blue-50 text-blue-800 border-blue-200"
                    : selectedClaim.review?.status === "redacted"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : selectedClaim.review?.status === "rejected"
                    ? "bg-rose-50 text-rose-800 border-rose-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {selectedClaim.review?.status || "pending"}
              </span>
            </div>

            {/* Reviewer Action Buttons */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
              <Button
                variant="approve"
                size="sm"
                onClick={() => onReviewClaim(selectedClaim.id, "approved")}
                disabled={!isReviewer || isLoading}
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                className="w-full"
              >
                Approve
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleStartEdit}
                disabled={!isReviewer || isLoading}
                leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                className="w-full"
              >
                {cleanMode ? "Request Revision" : "Edit"}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => onReviewClaim(selectedClaim.id, "redacted")}
                disabled={!isReviewer || isLoading}
                leftIcon={<EyeOff className="w-3.5 h-3.5" />}
                className="w-full"
              >
                Redact
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => onReviewClaim(selectedClaim.id, "rejected")}
                disabled={!isReviewer || isLoading}
                leftIcon={<XCircle className="w-3.5 h-3.5" />}
                className="w-full"
              >
                Reject
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center py-4">
            Select any claim on the left to inspect or apply actions.
          </p>
        )}
      </div>

      {/* Big Handover Final Approval CTA */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
        <div>
          <span className="text-sm font-semibold text-emerald-900 block">
            Publish Handover
          </span>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Publishing creates the approved handover version and delivers
            role-scoped continuation plans to incoming team members.
          </p>
        </div>

        <Button
          variant="approve"
          onClick={handleApproveHandoverClick}
          disabled={!isReviewer || isLoading || isApprovingHandover}
          isLoading={isApprovingHandover}
          className="w-full"
        >
          {!isReviewer ? (
            <>
              <Lock className="w-4 h-4 mr-1.5" />
              Locked (Reviewer Only)
            </>
          ) : cleanMode ? (
            "✓ Approve & Publish Handover →"
          ) : (
            "Approve & Publish Handover (v2.0)"
          )}
        </Button>
      </div>
    </div>
  );
}
