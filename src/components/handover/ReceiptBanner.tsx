"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  AlertCircle,
  Award,
  Copy,
  Check,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getFullVerificationKey } from "@/utils/verification-key";
import type { Receipt } from "@/types/echobridge.types";

interface ReceiptBannerProps {
  receipt: Receipt | null;
  recipientName: string;
  recipientRoleName: string;
  cleanMode?: boolean;
  onOpenQuizModal: () => void;
  onOpenCertificateModal: () => void;
  onResetReceipt?: () => void;
  isResetting?: boolean;
  isIncomingRole: boolean;
}

export function ReceiptBanner({
  receipt,
  recipientName,
  recipientRoleName,
  cleanMode = false,
  onOpenQuizModal,
  onOpenCertificateModal,
  onResetReceipt,
  isResetting = false,
}: ReceiptBannerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyValue = (val: string) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (receipt) {
    const fullKey = getFullVerificationKey(receipt);
    const totalChecks =
      receipt.answers && receipt.answers.length > 0 ? receipt.answers.length : 3;
    const passedChecks =
      receipt.answers && receipt.answers.length > 0
        ? receipt.answers.filter((a) => a.is_correct).length
        : Math.round((receipt.comprehension_score / 100) * totalChecks);

    if (cleanMode) {
      return (
        <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
          {/* Top Row */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5 sm:mt-0">
                <ShieldCheck className="w-5 h-5" />
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-emerald-950">
                    Verified Handover Receipt Issued
                  </h2>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-default select-none">
                    {passedChecks}/{totalChecks} Passed ({receipt.comprehension_score}%)
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-emerald-900">
                  <span className="font-semibold">{receipt.incoming_user_name}</span>{" "}
                  — {recipientRoleName}{" "}
                  <span className="text-emerald-700 mx-1">•</span>{" "}
                  {new Date(receipt.acknowledged_at).toLocaleDateString()} at{" "}
                  {new Date(receipt.acknowledged_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenCertificateModal}
                leftIcon={<Award className="w-4 h-4 text-emerald-700" />}
              >
                View Official Certificate
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenQuizModal}
                leftIcon={<RefreshCw className="w-3.5 h-3.5 text-teal-700" />}
              >
                Re-acknowledge
              </Button>
              {onResetReceipt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onResetReceipt}
                  isLoading={isResetting}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5 text-slate-600" />}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Bottom Row: Full Un-Truncated SHA-256 Verification Key */}
          <div className="bg-white border border-emerald-200 rounded-lg px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="min-w-0 flex-1 space-y-0.5">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                VERIFICATION KEY (SHA-256):
              </span>
              <code className="block font-mono text-xs sm:text-sm text-slate-900 break-all select-all">
                {fullKey}
              </code>
            </div>

            <button
              type="button"
              onClick={() => handleCopyValue(fullKey)}
              className="shrink-0 self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300 hover:border-emerald-600 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
              title="Copy full SHA-256 verification key"
            >
              {copied ? "✓ Copied!" : "📋 Copy Key"}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5 sm:mt-0" />
          <div className="space-y-0.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                Handover Verification Receipt • Verified Transfer Acknowledged
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-default">
                Comprehension: {receipt.comprehension_score}%
              </span>
            </div>

            <h2 className="text-sm font-semibold text-slate-900">
              Handover acknowledged by {receipt.incoming_user_name} (
              {recipientRoleName})
            </h2>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 pt-0.5">
              <span>
                Date: {new Date(receipt.acknowledged_at).toLocaleDateString()}
              </span>
              <span>•</span>
              <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-emerald-200">
                <span className="text-slate-500 shrink-0">Sig:</span>
                <span className="text-emerald-800 font-mono break-all select-all">
                  {receipt.receipt_hash || fullKey}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyValue(receipt.receipt_hash || fullKey)}
                  className="text-slate-500 hover:text-slate-900 ml-1 shrink-0 cursor-pointer"
                  title="Copy full SHA-256 hash"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 self-start sm:self-center flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenCertificateModal}
            leftIcon={<Award className="w-4 h-4 text-emerald-700" />}
          >
            View Certificate
          </Button>
          {onResetReceipt && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetReceipt}
              isLoading={isResetting}
              leftIcon={<RotateCcw className="w-3.5 h-3.5 text-slate-600" />}
            >
              Reset
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/70 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {cleanMode ? (
        <div className="flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-teal-700 shrink-0" />
          <span className="text-slate-800 font-medium text-sm sm:text-base">
            Receipt: not yet acknowledged
          </span>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-teal-800">
              Handover Verification Receipt • Receipt: Not Yet Acknowledged
            </div>
            <h2 className="text-sm font-semibold text-slate-900">
              Transfer pending verification by {recipientName} (
              {recipientRoleName})
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              Review critical project risks before issuing a signed transfer
              receipt.
            </p>
          </div>
        </div>
      )}

      <div className="shrink-0 self-start sm:self-center">
        <Button
          variant="primary"
          onClick={onOpenQuizModal}
          className="w-full sm:w-auto"
        >
          {cleanMode ? "Acknowledge" : "Verify & Acknowledge Receipt"}
        </Button>
      </div>
    </div>
  );
}
