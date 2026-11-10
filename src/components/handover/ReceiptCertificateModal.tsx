"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Receipt } from "@/types/echobridge.types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { getFullVerificationKey } from "@/utils/verification-key";
import { HandoverCertificateDocument } from "@/components/handover/HandoverCertificateDocument";

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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const active = Boolean(isOpen && receipt);
    document.body.classList.toggle("printing-certificate", active);
    return () => {
      document.body.classList.remove("printing-certificate");
    };
  }, [isOpen, receipt]);

  if (!receipt || !isOpen) return null;

  const fullKey = getFullVerificationKey(receipt);

  const handleCopyFullKey = () => {
    navigator.clipboard.writeText(fullKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    document.body.classList.add("printing-certificate");
    const previousTitle = document.title;
    document.title = `EchoBridge-Certificate-${receipt.id}`;

    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };

    window.addEventListener("afterprint", restoreTitle);
    window.print();
    setTimeout(restoreTitle, 1500);
  };

  const printablePortal =
    isMounted && typeof document !== "undefined"
      ? createPortal(
          <div id="printable-handover-certificate" className="hidden print:block">
            <HandoverCertificateDocument
              receipt={receipt}
              projectName={projectName}
              approverName={approverName}
            />
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Official Handover Verification Certificate"
        description="1-page landscape vector certificate — ready to print or save directly as PDF."
        maxWidth="3xl"
      >
        <div className="space-y-4">
          <HandoverCertificateDocument
            receipt={receipt}
            projectName={projectName}
            approverName={approverName}
            compactPreview
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyFullKey}
              >
                {copied
                  ? "✓ Copied Full Verification Key!"
                  : "📋 Copy Full Verification Key"}
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handlePrint}
              >
                🖨️ Print / Save Official PDF
              </Button>
            </div>

            <Button variant="secondary" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {printablePortal}
    </>
  );
}
