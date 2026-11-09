"use client";

import React, { useState } from "react";
import {
  Award,
  ShieldCheck,
  Check,
  Copy,
  Printer,
  Sparkles,
  ExternalLink,
  QrCode,
} from "lucide-react";
import type { Receipt } from "@/types/echobridge.types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface ReceiptCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: Receipt | null;
  projectName?: string;
  approverName?: string;
}

export function ReceiptCertificateModal({
  isOpen,
  onClose,
  receipt,
  projectName = "CampusConnect",
  approverName = "Prof. Deshmukh (Project Mentor)",
}: ReceiptCertificateModalProps) {
  const [copied, setCopied] = useState(false);

  if (!receipt) return null;

  const handleCopyHash = () => {
    if (!receipt.receipt_hash) return;
    navigator.clipboard.writeText(receipt.receipt_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Verified Knowledge Transfer Certificate"
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Printable Certificate Container */}
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 via-surface to-canvas p-6 md:p-8 relative overflow-hidden shadow-2xl">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Certificate Header */}
          <div className="text-center space-y-2 border-b border-border-subtle pb-5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mb-1">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-lg md:text-xl font-bold tracking-tight text-text-primary uppercase font-mono">
              EchoBridge Transfer Certificate
            </h3>
            <p className="text-xs text-emerald-400 font-mono">
              Cryptographically Verified Knowledge Handover
            </p>
          </div>

          {/* Certificate Fields */}
          <div className="my-6 space-y-3.5 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-border-subtle/50 pb-2">
              <span className="text-text-muted">Project:</span>
              <span className="font-bold text-text-primary">{projectName}</span>
            </div>

            <div className="flex items-center justify-between border-b border-border-subtle/50 pb-2">
              <span className="text-text-muted">Recipient:</span>
              <span className="font-bold text-emerald-300">
                {receipt.incoming_user_name} ({receipt.audience_role === "incoming_lead" ? "Incoming Team Lead" : "Incoming Intern"})
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-border-subtle/50 pb-2">
              <span className="text-text-muted">Approver:</span>
              <span className="text-text-secondary">{approverName}</span>
            </div>

            <div className="flex items-center justify-between border-b border-border-subtle/50 pb-2">
              <span className="text-text-muted">Approved Version:</span>
              <span className="text-accent-cyan font-bold">DraftVersion v2.0 (Final)</span>
            </div>

            <div className="flex items-center justify-between border-b border-border-subtle/50 pb-2">
              <span className="text-text-muted">Risk Comprehension:</span>
              <span className="text-emerald-400 font-bold">
                {receipt.comprehension_score}% (Passed)
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-border-subtle/50 pb-2">
              <span className="text-text-muted">Transfer Date:</span>
              <span className="text-text-secondary">
                {new Date(receipt.acknowledged_at).toUTCString()}
              </span>
            </div>

            {/* Cryptographic Hash */}
            <div className="pt-2">
              <span className="text-[10px] text-text-muted uppercase block mb-1">
                SHA-256 Digital Signature:
              </span>
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-canvas border border-emerald-500/30 text-emerald-300 font-mono text-[11px]">
                <span className="truncate">{receipt.receipt_hash}</span>
                <button
                  type="button"
                  onClick={handleCopyHash}
                  className="p-1 rounded hover:bg-surface text-text-muted hover:text-text-primary shrink-0"
                  title="Copy signature hash"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Verification Stamp Seal */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-border-subtle text-[11px] font-mono text-text-muted">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Tamper-Evident Transfer Record</span>
            </div>
            <div className="px-2 py-0.5 rounded bg-surface border border-border-subtle text-[10px]">
              ID: {receipt.id}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            className="text-xs"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print Certificate
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
