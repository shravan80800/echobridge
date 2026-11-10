"use client";

import React from "react";
import type { Receipt } from "@/types/echobridge.types";
import {
  buildVerificationMatrix,
  resolveCertificateMetadata,
} from "@/utils/certificate-svg";

export interface HandoverCertificateDocumentProps {
  receipt: Receipt;
  projectName?: string;
  approverName?: string;
  compactPreview?: boolean;
}

function CornerOrnament({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const transformClass = {
    tl: "top-2 left-2",
    tr: "top-2 right-2 rotate-90",
    br: "bottom-2 right-2 rotate-180",
    bl: "bottom-2 left-2 -rotate-90",
  }[position];

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 36 36"
      className={`pointer-events-none absolute w-7 h-7 sm:w-8 sm:h-8 text-amber-600/80 ${transformClass}`}
      fill="none"
    >
      <path d="M2 22V2H22" stroke="currentColor" strokeWidth="1.75" />
      <path d="M7 16V7H16" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
      <circle cx="7" cy="7" r="1.75" fill="#0F766E" />
    </svg>
  );
}

function OfficialTransferSeal() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 112 112"
      className="w-16 h-16 sm:w-20 sm:h-20 print:w-[74px] print:h-[74px] shrink-0"
    >
      <circle
        cx="56"
        cy="56"
        r="50"
        fill="#ECFDF5"
        stroke="#D97706"
        strokeWidth="2.5"
        strokeDasharray="4 2"
      />
      <circle
        cx="56"
        cy="56"
        r="43"
        fill="#FFFFFF"
        stroke="#0F766E"
        strokeWidth="2"
      />
      <circle
        cx="56"
        cy="56"
        r="34"
        fill="#F0FDFA"
        stroke="#D97706"
        strokeWidth="1"
      />
      <path
        d="M56 32L70 38V51C70 61 64 69 56 73C48 69 42 61 42 51V38L56 32Z"
        fill="#059669"
      />
      <path
        d="M49.5 52.5L54 57L63 47.5"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="56"
        y="85"
        textAnchor="middle"
        fontSize="7.2"
        fontWeight="700"
        letterSpacing="1.3"
        fill="#0F766E"
      >
        VERIFIED SEAL
      </text>
    </svg>
  );
}

/**
 * Pure vector certificate document designed for 1-page A4/Letter Landscape printing
 * as well as scaled preview inside ReceiptCertificateModal.
 */
export function HandoverCertificateDocument({
  receipt,
  projectName = "CampusConnect",
  approverName = "Prof. Deshmukh — Faculty Mentor",
  compactPreview = false,
}: HandoverCertificateDocumentProps) {
  const {
    fullKey,
    roleLabel,
    displayApprover,
    formattedDate,
    formattedTime,
  } = resolveCertificateMetadata(receipt, approverName);
  const matrix = buildVerificationMatrix(fullKey);

  return (
    <article
      aria-label="Official Handover Verification Certificate"
      className={`relative w-full bg-[#FFFEFA] text-slate-900 border-[3px] border-teal-900 shadow-sm print:shadow-none ${
        compactPreview ? "p-2 sm:p-2.5" : "p-2.5"
      }`}
    >
      {/* Inner Gold Archival Border */}
      <div className="relative border border-amber-500/75 bg-[#FFFEFA] px-4 py-4 sm:px-8 sm:py-6 print:px-8 print:py-5 overflow-hidden">
        <CornerOrnament position="tl" />
        <CornerOrnament position="tr" />
        <CornerOrnament position="bl" />
        <CornerOrnament position="br" />

        {/* Faint Watermark Crest */}
        <svg
          aria-hidden="true"
          viewBox="0 0 200 200"
          className="pointer-events-none select-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 text-teal-900 opacity-[0.04]"
          fill="none"
        >
          <circle cx="100" cy="100" r="88" stroke="currentColor" strokeWidth="3" />
          <circle
            cx="100"
            cy="100"
            r="72"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="6 4"
          />
          <path
            d="M100 42L144 60V102C144 134 125 156 100 166C75 156 56 134 56 102V60L100 42Z"
            stroke="currentColor"
            strokeWidth="3"
          />
        </svg>

        <div className="relative z-10 flex flex-col justify-between space-y-4 sm:space-y-5 print:space-y-4">
          {/* 1. Formal Registry Header */}
          <header className="text-center space-y-1.5">
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.22em] text-teal-800">
              EchoBridge Knowledge Transfer Registry
            </p>
            <h2 className="font-serif text-xl sm:text-3xl print:text-[28px] font-bold tracking-tight text-slate-900">
              Certificate of Verified Project Handover
            </h2>
            <div className="flex items-center justify-center gap-3 pt-1">
              <span className="h-px w-12 sm:w-20 bg-amber-600/50" />
              <span className="px-2.5 py-0.5 rounded-full border border-teal-800/25 bg-teal-50/80 font-mono text-[10px] sm:text-[11px] font-semibold text-teal-900">
                CERTIFICATE NO. {receipt.id}
              </span>
              <span className="h-px w-12 sm:w-20 bg-amber-600/50" />
            </div>
          </header>

          {/* 2. Recipient Spotlight & Attestation */}
          <section className="text-center space-y-2 print:space-y-1.5">
            <p className="font-serif italic text-xs sm:text-sm text-slate-500">
              This officially certifies that
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <span className="font-serif text-2xl sm:text-3xl print:text-[30px] font-bold text-slate-950 tracking-tight border-b-2 border-amber-500/70 pb-0.5 px-3">
                {receipt.incoming_user_name}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-emerald-50 text-emerald-900 border border-emerald-300">
                {roleLabel}
              </span>
            </div>

            <p className="max-w-2xl mx-auto text-xs sm:text-sm text-slate-700 leading-relaxed pt-1">
              has reviewed all cited handover artifacts, passed the critical
              operational risk comprehension gate with a verified score of{" "}
              <strong className="text-emerald-800">
                {receipt.comprehension_score}%
              </strong>
              , and formally accepted operational ownership of{" "}
              <strong className="text-slate-900">{projectName}</strong>{" "}
              <span className="text-slate-500">
                (Release v2.0 • {receipt.draft_version_id})
              </span>
              .
            </p>
          </section>

          {/* 3. Formal Hairline Metadata Ledger */}
          <section className="grid grid-cols-2 sm:grid-cols-4 border-y border-amber-900/20 divide-y sm:divide-y-0 sm:divide-x divide-amber-900/15 bg-white/80">
            <div className="px-3 py-2 text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Project Scope
              </span>
              <span className="block text-xs sm:text-sm font-semibold text-slate-900 mt-0.5">
                {projectName}
              </span>
            </div>

            <div className="px-3 py-2 text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Approved Draft
              </span>
              <span className="block text-xs sm:text-sm font-semibold text-slate-900 mt-0.5">
                v2.0 ({receipt.draft_version_id})
              </span>
            </div>

            <div className="px-3 py-2 text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Risk Gate Score
              </span>
              <span className="block text-xs sm:text-sm font-bold text-emerald-700 mt-0.5">
                {receipt.comprehension_score}% — Verified
              </span>
            </div>

            <div className="px-3 py-2 text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Issued Timestamp
              </span>
              <span className="block text-xs font-semibold text-slate-900 mt-0.5">
                {formattedDate}
                {formattedTime ? ` • ${formattedTime}` : ""}
              </span>
            </div>
          </section>

          {/* 4. Dual Signatory Block + Official Seal */}
          <section className="grid grid-cols-1 sm:grid-cols-3 items-end gap-4 pt-1 print:grid-cols-3">
            {/* Approver Signature */}
            <div className="text-center space-y-1 px-2">
              <svg
                aria-hidden="true"
                viewBox="0 0 180 34"
                className="w-36 h-7 mx-auto text-teal-900/85"
                fill="none"
              >
                <path
                  d="M14 26C26 10 34 8 36 22C38 28 48 12 58 18C66 22 74 14 86 20C98 25 112 13 132 19C144 22 156 17 166 15"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <div className="border-t border-slate-400 pt-1">
                <p className="text-xs font-semibold text-slate-900">
                  {displayApprover}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                  Approving Authority
                </p>
              </div>
            </div>

            {/* Center Verification Seal */}
            <div className="flex justify-center">
              <OfficialTransferSeal />
            </div>

            {/* Recipient Signature */}
            <div className="text-center space-y-1 px-2">
              <svg
                aria-hidden="true"
                viewBox="0 0 180 34"
                className="w-36 h-7 mx-auto text-teal-900/85"
                fill="none"
              >
                <path
                  d="M20 22C32 11 40 24 50 16C60 8 68 25 80 18C92 12 104 24 120 17C134 12 146 21 162 14"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <div className="border-t border-slate-400 pt-1">
                <p className="text-xs font-semibold text-slate-900">
                  {receipt.incoming_user_name}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                  {roleLabel} • Digitally Signed
                </p>
              </div>
            </div>
          </section>

          {/* 5. Tamper-Evident Full SHA-256 Cryptographic Footer */}
          <footer className="rounded-md border border-teal-900/20 bg-slate-50/90 px-3 py-2 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-teal-900">
                  Cryptographic Verification Key (Full SHA-256)
                </span>
                <span className="text-[9px] sm:text-[10px] font-medium text-emerald-700">
                  Tamper-Evident Handover Record
                </span>
              </div>
              <code className="block font-mono text-[10px] sm:text-[11px] text-slate-900 break-all select-all leading-snug">
                {fullKey}
              </code>
            </div>

            {/* Deterministic 9x9 Verification Fingerprint */}
            <svg
              aria-hidden="true"
              viewBox="0 0 27 27"
              className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded border border-slate-300 bg-white p-0.5"
            >
              {matrix.map((row, r) =>
                row.map((filled, c) =>
                  filled ? (
                    <rect
                      key={`${r}-${c}`}
                      x={c * 3}
                      y={r * 3}
                      width="2.6"
                      height="2.6"
                      rx="0.4"
                      fill={(r + c) % 3 === 0 ? "#059669" : "#0F172A"}
                    />
                  ) : null
                )
              )}
            </svg>
          </footer>
        </div>
      </div>
    </article>
  );
}
