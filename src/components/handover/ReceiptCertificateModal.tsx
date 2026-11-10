"use client";

import React, { useState } from "react";
import { Award, ShieldCheck } from "lucide-react";
import type { Receipt } from "@/types/echobridge.types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { getFullVerificationKey } from "@/utils/verification-key";

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
  approverName = "Prof. Deshmukh — Faculty Mentor",
}: ReceiptCertificateModalProps) {
  const [copied, setCopied] = useState(false);

  if (!receipt) return null;

  const fullKey = getFullVerificationKey(receipt);
  const roleLabel =
    receipt.audience_role === "incoming_lead"
      ? "Incoming Team Lead"
      : "Incoming Intern";
  const displayApprover =
    approverName === "Prof. Deshmukh (Project Mentor)"
      ? "Prof. Deshmukh — Faculty Mentor"
      : approverName;

  const handleCopyFullKey = () => {
    navigator.clipboard.writeText(fullKey);
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
      title="Official Handover Verification Certificate"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Printable Certificate Card */}
        <div className="rounded-xl border-2 border-emerald-300 bg-white p-6 space-y-5 shadow-sm">
          {/* Certificate Header & Seal */}
          <div className="flex flex-col items-center text-center space-y-2 border-b border-slate-200 pb-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-600 text-white shadow-sm mb-1">
              <Award className="w-6 h-6" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>EchoBridge Verified Transfer Seal</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">
              Official Handover Verification Certificate
            </h3>
            <p className="text-xs font-mono text-slate-500">
              Receipt ID: <span className="font-semibold text-slate-700">{receipt.id}</span>
            </p>
          </div>

          {/* 2-Column Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
            <div className="rounded-lg bg-slate-50/80 border border-slate-200 p-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Project
              </span>
              <span className="font-semibold text-slate-900 mt-0.5 block">
                {projectName}
              </span>
            </div>

            <div className="rounded-lg bg-slate-50/80 border border-slate-200 p-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Recipient &amp; Role
              </span>
              <span className="font-semibold text-slate-900 mt-0.5 block">
                {receipt.incoming_user_name} ({roleLabel})
              </span>
            </div>

            <div className="rounded-lg bg-slate-50/80 border border-slate-200 p-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Approved By
              </span>
              <span className="font-medium text-slate-900 mt-0.5 block">
                {displayApprover}
              </span>
            </div>

            <div className="rounded-lg bg-slate-50/80 border border-slate-200 p-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Draft Version
              </span>
              <span className="font-medium text-slate-900 mt-0.5 block">
                v2.0 Approved ({receipt.draft_version_id})
              </span>
            </div>

            <div className="rounded-lg bg-emerald-50/70 border border-emerald-200 p-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                Risk Comprehension Score
              </span>
              <span className="font-bold text-emerald-700 mt-0.5 block">
                {receipt.comprehension_score}% — Verified
              </span>
            </div>

            <div className="rounded-lg bg-slate-50/80 border border-slate-200 p-3">
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Timestamp
              </span>
              <span className="font-medium text-slate-800 mt-0.5 block">
                {new Date(receipt.acknowledged_at).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Full Un-Truncated Cryptographic Signature Block */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                Cryptographic Verification Key (Full SHA-256)
              </span>
              <span className="text-[11px] font-medium text-emerald-700">
                Tamper-Evident Transfer Signature
              </span>
            </div>

            <div className="font-mono text-xs sm:text-sm bg-white p-3 rounded-lg border border-slate-200 text-slate-900 break-all select-all leading-relaxed">
              {fullKey}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyFullKey}
            >
              {copied ? "✓ Copied Full Verification Key!" : "📋 Copy Full Verification Key"}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
            >
              🖨️ Print Certificate
            </Button>
          </div>

          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
