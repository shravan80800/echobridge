"use client";

import React, { useState } from "react";
import { Award, ShieldCheck, Check, Copy, Printer } from "lucide-react";
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
      title="Verified Handover Receipt"
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Printable Certificate Card */}
        <div className="rounded-xl border-2 border-emerald-200 bg-white p-6 space-y-5 shadow-sm">
          {/* Certificate Header */}
          <div className="text-center space-y-2 border-b border-slate-100 pb-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 mb-1">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              EchoBridge Handover Certificate
            </h3>
            <p className="text-xs font-medium text-emerald-700">
              Verified Knowledge Transfer Record
            </p>
          </div>

          {/* Certificate Fields */}
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500">Project</span>
              <span className="font-semibold text-slate-900">{projectName}</span>
            </div>

            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500">Recipient</span>
              <span className="font-semibold text-slate-900 text-right">
                {receipt.incoming_user_name} (
                {receipt.audience_role === "incoming_lead"
                  ? "Incoming Team Lead"
                  : "Incoming Intern"}
                )
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500">Approved By</span>
              <span className="text-slate-800">{approverName}</span>
            </div>

            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500">Comprehension Check</span>
              <span className="text-emerald-700 font-semibold">
                {receipt.comprehension_score}% (Passed)
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <span className="text-slate-500">Signed On</span>
              <span className="text-slate-700 text-right">
                {new Date(receipt.acknowledged_at).toLocaleString()}
              </span>
            </div>

            {/* SHA-256 Digital Signature */}
            <div className="pt-1">
              <span className="text-xs font-medium text-slate-500 block mb-1">
                Digital Signature (SHA-256)
              </span>
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs">
                <span className="truncate">{receipt.receipt_hash}</span>
                <button
                  type="button"
                  onClick={handleCopyHash}
                  className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-900 shrink-0 cursor-pointer"
                  title="Copy signature"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Verified Transfer Complete</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-3.5 h-3.5" />}
          >
            Print Receipt
          </Button>

          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
