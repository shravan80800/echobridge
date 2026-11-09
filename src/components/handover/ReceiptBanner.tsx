"use client";

import React, { useState } from "react";
import {
  FileCheck2,
  ShieldCheck,
  AlertCircle,
  Award,
  Copy,
  Check,
  ExternalLink,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Receipt } from "@/types/echobridge.types";

interface ReceiptBannerProps {
  receipt: Receipt | null;
  recipientName: string;
  recipientRoleName: string;
  onOpenQuizModal: () => void;
  onOpenCertificateModal: () => void;
  isIncomingRole: boolean;
}

export function ReceiptBanner({
  receipt,
  recipientName,
  recipientRoleName,
  onOpenQuizModal,
  onOpenCertificateModal,
  isIncomingRole,
}: ReceiptBannerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyHash = () => {
    if (!receipt?.receipt_hash) return;
    navigator.clipboard.writeText(receipt.receipt_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (receipt) {
    return (
      <div className="rounded-xl border border-emerald-500/50 bg-emerald-950/20 p-4 md:p-5 shadow-lg shadow-emerald-950/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                  Handover Verification Receipt • Verified Transfer Acknowledged
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Comprehension: {receipt.comprehension_score}%
                </span>
              </div>

              <h2 className="text-sm md:text-base font-semibold text-text-primary">
                Handover acknowledged by {receipt.incoming_user_name} ({recipientRoleName})
              </h2>

              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-text-secondary pt-0.5">
                <span>Date: {new Date(receipt.acknowledged_at).toLocaleDateString()}</span>
                <span>•</span>
                <div className="flex items-center gap-1.5 bg-canvas px-2 py-0.5 rounded border border-border-subtle">
                  <span className="text-text-muted">Sig:</span>
                  <span className="text-emerald-300 truncate max-w-[180px] md:max-w-xs font-mono">
                    {receipt.receipt_hash || "0x9f2a..."}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyHash}
                    className="text-text-muted hover:text-text-primary ml-1"
                    title="Copy full cryptographic SHA-256 hash"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <Button
              variant="approve"
              size="sm"
              onClick={onOpenCertificateModal}
              className="text-xs font-mono bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/30"
            >
              <Award className="w-3.5 h-3.5 mr-1.5" />
              View Certificate
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-950/15 p-4 md:p-5 shadow-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                Handover Verification Receipt • Receipt: Not Yet Acknowledged
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Anti-Blind Click Guard
              </span>
            </div>

            <h2 className="text-sm md:text-base font-semibold text-text-primary">
              Transfer pending verification by {recipientName} ({recipientRoleName})
            </h2>

            <p className="text-xs text-text-secondary leading-relaxed max-w-2xl">
              EchoBridge requires the incoming member to verify critical project risks (deadline conflict resolution, Redis caching constraint, stale runbook) before issuing a signed transfer receipt.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <Button
            variant="approve"
            size="md"
            onClick={onOpenQuizModal}
            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40"
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            Verify &amp; Acknowledge Receipt
          </Button>
        </div>
      </div>
    </div>
  );
}
