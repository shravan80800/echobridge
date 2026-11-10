"use client";

import React from "react";
import { Lock } from "lucide-react";
import type { AudienceRole, ClaimRecord } from "@/types/echobridge.types";

interface OnboardingBoardProps {
  claims: ClaimRecord[];
  audienceRole: AudienceRole;
  showRestrictedPlaceholders?: boolean;
  cleanMode?: boolean;
  onInspectSource?: (taskLabel: string, claim?: ClaimRecord) => void;
}

export function OnboardingBoard({
  claims,
  audienceRole,
  showRestrictedPlaceholders = true,
  cleanMode = false,
  onInspectSource,
}: OnboardingBoardProps) {
  const day1Claims = claims.filter(
    (c) =>
      c.section === "onboarding_day1" ||
      c.id.includes("DAY1") ||
      c.text.toLowerCase().includes("day 1") ||
      c.claim_type === "owner" ||
      c.claim_type === "contact"
  );

  const week1Claims = claims.filter(
    (c) =>
      c.section === "onboarding_week1" ||
      c.id.includes("WEEK1") ||
      c.text.toLowerCase().includes("week 1") ||
      c.claim_type === "next_action" ||
      c.claim_type === "dependency"
  );

  const month1Claims = claims.filter(
    (c) =>
      c.section === "onboarding_month1" ||
      c.id.includes("MONTH1") ||
      c.text.toLowerCase().includes("month 1") ||
      c.claim_type === "decision"
  );

  const isIntern = audienceRole === "incoming_intern";

  const day1FallbackTasks = cleanMode
    ? ["Read the architecture overview", "Meet the project mentor"]
    : [
        "Verify local development environment against Next.js 15 App Router specifications.",
        "Introductory sync with Project Mentor Prof. Deshmukh regarding repo branch protection rules.",
      ];

  const week1FallbackTasks = cleanMode
    ? ["Review open pull requests", "Rotate the API keys"]
    : [
        "Review open PR #12 ticketing workflow with Maya Patel before merging into develop branch.",
        "Rotate Stripe payment gateway keys in Vercel environment variables.",
      ];

  const month1FallbackTasks = cleanMode
    ? ["Plan the next release", "Resolve open conflicts"]
    : [
        "Deploy hackathon registration portal for March 20th deadline (approved by Mentor).",
      ];

  const renderProofButton = (
    onClick: () => void,
    ariaLabel: string,
    fallbackColorClass = "hover:bg-slate-100 border-slate-200"
  ) =>
    cleanMode ? (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 bg-teal-50 hover:bg-teal-600 text-teal-800 hover:text-white border border-teal-200 hover:border-teal-600 rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer shadow-sm"
        title="View cited project source"
        aria-label={ariaLabel}
      >
        <span>📄 View Source Proof ↗</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={onClick}
        className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md bg-white border text-xs cursor-pointer transition-colors ${fallbackColorClass}`}
        title="View cited project source"
        aria-label={ariaLabel}
      >
        🔗
      </button>
    );

  const renderTaskCard = (key: string, label: string, claim?: ClaimRecord) => (
    <div
      key={key}
      className={`bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm ${
        cleanMode
          ? "flex flex-col gap-2.5"
          : "flex items-start justify-between gap-2.5"
      }`}
    >
      <p className="text-sm text-slate-800 font-medium leading-snug">{label}</p>
      <div className={cleanMode ? "flex justify-end" : "shrink-0"}>
        {renderProofButton(
          () => onInspectSource?.(label, claim),
          `View source for ${label}`,
          "bg-slate-50 hover:bg-slate-100 border-slate-200"
        )}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2 items-start">
      {/* ================================================================== */}
      {/* COLUMN 1: DAY 1                                                    */}
      {/* ================================================================== */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-200">
          {cleanMode ? "Day 1" : "Day 1: Setup & Contacts"}
        </h3>

        <div className="space-y-2.5">
          {!cleanMode && day1Claims.length > 0
            ? day1Claims
                .filter((c) => c.evidence_state !== "restricted")
                .map((c) => renderTaskCard(c.id, c.text, c))
            : day1FallbackTasks.map((text, idx) =>
                renderTaskCard(`day1-${idx}`, text, day1Claims[idx])
              )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* COLUMN 2: WEEK 1                                                   */}
      {/* ================================================================== */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-200">
          {cleanMode ? "Week 1" : "Week 1: PRs & Keys"}
        </h3>

        <div className="space-y-2.5">
          {!cleanMode && week1Claims.length > 0
            ? week1Claims
                .filter((c) => c.evidence_state !== "restricted")
                .map((c) => renderTaskCard(c.id, c.text, c))
            : week1FallbackTasks.map((text, idx) =>
                renderTaskCard(`week1-${idx}`, text, week1Claims[idx])
              )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* COLUMN 3: MONTH 1                                                  */}
      {/* ================================================================== */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-200">
          {cleanMode ? "Month 1" : "Month 1: Releases & Milestones"}
        </h3>

        <div className="space-y-2.5">
          {!cleanMode && month1Claims.length > 0
            ? month1Claims
                .filter((c) => c.evidence_state !== "restricted")
                .map((c) => renderTaskCard(c.id, c.text, c))
            : month1FallbackTasks.map((text, idx) =>
                renderTaskCard(`month1-${idx}`, text, month1Claims[idx])
              )}

          {!isIntern &&
            renderTaskCard(
              "month1-finance",
              "Review annual sponsorship budget with Prof. Deshmukh"
            )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* COLUMN 4: CRITICAL RISKS & RESTRICTED SCOPE                        */}
      {/* ================================================================== */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-200">
          {cleanMode
            ? "Critical Risks"
            : "Critical Inherited Operational Risks"}
        </h3>

        <div className="space-y-2.5">
          {/* Open Risk Card (Figure 7) */}
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3.5 text-rose-950 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-bold text-rose-950 leading-snug">
                🚩 Open risk: API rate limits &amp; DB connection pool
              </span>
              {!cleanMode &&
                renderProofButton(
                  () => onInspectSource?.("API rate limits & DB connection pool"),
                  "View source for Open risk",
                  "hover:bg-rose-100 border-rose-200"
                )}
            </div>
            <p className="text-xs text-rose-900 leading-relaxed">
              PostgreSQL connection limits hit under heavy traffic; active sessions rely on Redis caching.
            </p>
            {cleanMode && (
              <div className="flex justify-end pt-0.5">
                {renderProofButton(
                  () => onInspectSource?.("API rate limits & DB connection pool"),
                  "View source for Open risk"
                )}
              </div>
            )}
          </div>

          {/* Stale Runbook Warning Card */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3.5 text-orange-950 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs sm:text-sm font-semibold text-orange-950 leading-snug">
                {cleanMode
                  ? "⚠️ Outdated Runbook: Worker restart script (9 months old)"
                  : "Deployment Runbook > 180 Days Old"}
              </span>
              {!cleanMode &&
                renderProofButton(
                  () => onInspectSource?.("Outdated Worker restart script"),
                  "View source for Outdated Runbook",
                  "hover:bg-orange-100 border-orange-200"
                )}
            </div>
            <p className="text-xs text-orange-900 leading-relaxed">
              Verify Docker worker settings before restarting background jobs.
            </p>
            {cleanMode && (
              <div className="flex justify-end pt-0.5">
                {renderProofButton(
                  () => onInspectSource?.("Outdated Worker restart script"),
                  "View source for Outdated Runbook"
                )}
              </div>
            )}
          </div>

          {/* Restricted Placeholder Card (ONLY in Intern View) */}
          {isIntern && showRestrictedPlaceholders && (
            <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg p-3.5 text-slate-700 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-800">
                  <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span>Restricted: request access</span>
                </span>
                {!cleanMode && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-200 text-slate-700">
                    RESTRICTED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                1 confidential section withheld for your role. Contact Prof. Deshmukh to request access.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
