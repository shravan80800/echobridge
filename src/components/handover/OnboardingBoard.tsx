"use client";

import React from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  FileText,
  User,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
} from "lucide-react";
import type { AudienceRole, ClaimRecord } from "@/types/echobridge.types";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";

interface OnboardingBoardProps {
  claims: ClaimRecord[];
  audienceRole: AudienceRole;
  showRestrictedPlaceholders?: boolean;
}

export function OnboardingBoard({
  claims,
  audienceRole,
  showRestrictedPlaceholders = true,
}: OnboardingBoardProps) {
  // Filter claims into Day 1, Week 1, Month 1 based on section or tag
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
      c.claim_type === "decision" ||
      c.claim_type === "next_action"
  );

  // Critical Risks: Stale claims, unresolved risks, or key constraints
  const criticalRisks = claims.filter(
    (c) =>
      c.evidence_state === "stale" ||
      c.claim_type === "risk" ||
      c.planted_trap_id === 3 ||
      c.planted_trap_id === 7
  );

  return (
    <div className="space-y-6">
      {/* Pinned Critical Risk Callout Card (Figure 7 in Proposal) */}
      <div className="rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-950/20 via-surface to-surface p-4 md:p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-border-subtle/60 pb-2.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-300">
              Critical Inherited Operational Risks (Reviewer Verified)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-text-muted">
            Must review before Day 1 sign-off
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-sans">
          {/* Trap 3: Stale Runbook Callout */}
          <div className="p-3 rounded-lg bg-canvas/70 border border-orange-500/30 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-orange-300 flex items-center gap-1.5">
                <EvidenceBadge state="stale" size="sm" />
                <span>Deployment Runbook &gt; 180 Days Old</span>
              </span>
              <span className="text-[10px] font-mono text-text-muted">Trap 3</span>
            </div>
            <p className="text-text-secondary leading-relaxed text-[11px]">
              Deployment worker instructions have not been updated in 9 months. Verify Docker worker parameters before restarting event pipelines.
            </p>
          </div>

          {/* Trap 7: Domain Renewal Callout */}
          <div className="p-3 rounded-lg bg-canvas/70 border border-border-subtle space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text-primary flex items-center gap-1.5">
                <EvidenceBadge state="corroborated" size="sm" />
                <span>Domain Renewal Line</span>
              </span>
              <span className="text-[10px] font-mono text-text-muted">Trap 7</span>
            </div>
            <p className="text-text-secondary leading-relaxed text-[11px]">
              campusconnect.dev renewal billing is managed under Prof. Deshmukh university budget line. Annual renewal occurs on August 15th.
            </p>
          </div>
        </div>
      </div>

      {/* 3-Column Continuation Board (Figure 7 in Proposal) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        {/* Column 1: Day 1 (Setup & Permissions) */}
        <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h3 className="text-xs font-mono font-bold uppercase text-text-primary">
                Day 1: Setup &amp; Contacts
              </h3>
            </div>
            <span className="text-[10px] font-mono text-text-muted">
              {day1Claims.length || 3} items
            </span>
          </div>

          <div className="space-y-2.5">
            {day1Claims.length > 0 ? (
              day1Claims.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-lg bg-canvas/60 border border-border-subtle space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-1">
                    <EvidenceBadge state={c.evidence_state} size="sm" />
                    <span className="text-[10px] font-mono text-text-muted">
                      {c.claim_type}
                    </span>
                  </div>
                  <p className="text-text-primary leading-relaxed">{c.text}</p>
                </div>
              ))
            ) : (
              <>
                <div className="p-3 rounded-lg bg-canvas/60 border border-border-subtle space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <EvidenceBadge state="corroborated" size="sm" />
                    <span className="text-[10px] font-mono text-text-muted">architecture</span>
                  </div>
                  <p className="text-text-primary leading-relaxed">
                    Verify local development environment against Next.js 15 App Router specifications in Architecture Doc v2.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-canvas/60 border border-border-subtle space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <EvidenceBadge state="corroborated" size="sm" />
                    <span className="text-[10px] font-mono text-text-muted">contact</span>
                  </div>
                  <p className="text-text-primary leading-relaxed">
                    Introductory sync with Project Mentor Prof. Deshmukh regarding repo branch protection rules.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Column 2: Week 1 (Active PRs & Architecture) */}
        <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-accent-cyan" />
              <h3 className="text-xs font-mono font-bold uppercase text-text-primary">
                Week 1: PRs &amp; Keys
              </h3>
            </div>
            <span className="text-[10px] font-mono text-text-muted">
              {week1Claims.length || 3} items
            </span>
          </div>

          <div className="space-y-2.5">
            {week1Claims.length > 0 ? (
              week1Claims.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-lg bg-canvas/60 border border-border-subtle space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-1">
                    <EvidenceBadge state={c.evidence_state} size="sm" />
                    <span className="text-[10px] font-mono text-text-muted">
                      {c.claim_type}
                    </span>
                  </div>
                  <p className="text-text-primary leading-relaxed">{c.text}</p>
                </div>
              ))
            ) : (
              <>
                <div className="p-3 rounded-lg bg-canvas/60 border border-border-subtle space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <EvidenceBadge state="single_source" size="sm" />
                    <span className="text-[10px] font-mono text-text-muted">git_pr</span>
                  </div>
                  <p className="text-text-primary leading-relaxed">
                    Review open PR #12 ticketing workflow with Maya Patel before merging into develop branch.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-canvas/60 border border-border-subtle space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <EvidenceBadge state="corroborated" size="sm" />
                    <span className="text-[10px] font-mono text-text-muted">security</span>
                  </div>
                  <p className="text-text-primary leading-relaxed">
                    Rotate Stripe payment gateway test keys in Vercel environment variables following Trap 4 quarantine.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Column 3: Month 1 (Release Planning & Budget) */}
        <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-accent-primary" />
              <h3 className="text-xs font-mono font-bold uppercase text-text-primary">
                Month 1: Releases &amp; Milestones
              </h3>
            </div>
            <span className="text-[10px] font-mono text-text-muted">
              {month1Claims.length || 3} items
            </span>
          </div>

          <div className="space-y-2.5">
            {month1Claims.length > 0 ? (
              month1Claims.map((c) => {
                const isRestricted = c.evidence_state === "restricted";

                if (isRestricted && !showRestrictedPlaceholders) {
                  return null;
                }

                return (
                  <div
                    key={c.id}
                    className={`p-3 rounded-lg border space-y-2 text-xs ${
                      isRestricted
                        ? "bg-slate-900/40 border-slate-700/60 text-slate-400"
                        : "bg-canvas/60 border border-border-subtle"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <EvidenceBadge state={c.evidence_state} size="sm" />
                      <span className="text-[10px] font-mono text-text-muted">
                        {c.claim_type}
                      </span>
                    </div>

                    <p
                      className={`leading-relaxed ${
                        isRestricted ? "font-mono italic text-slate-400" : "text-text-primary"
                      }`}
                    >
                      {c.text}
                    </p>
                  </div>
                );
              })
            ) : (
              <>
                <div className="p-3 rounded-lg bg-canvas/60 border border-border-subtle space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <EvidenceBadge state="corroborated" size="sm" />
                    <span className="text-[10px] font-mono text-text-muted">release</span>
                  </div>
                  <p className="text-text-primary leading-relaxed">
                    Deploy hackathon registration portal for March 20th deadline (approved in v2.0 by Mentor).
                  </p>
                </div>

                {/* Confidential Finance Card (Team Lead only, placeholder for Intern) */}
                {audienceRole === "incoming_lead" ? (
                  <div className="p-3 rounded-lg bg-canvas/60 border border-indigo-500/30 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <EvidenceBadge state="single_source" size="sm" />
                      <span className="text-[10px] font-mono text-indigo-400 font-bold">
                        finance_folder
                      </span>
                    </div>
                    <p className="text-text-primary leading-relaxed">
                      Review annual sponsorship budget allocation ($8,500) under budget line CC-TECH-401 with signatory Prof. Deshmukh.
                    </p>
                  </div>
                ) : showRestrictedPlaceholders ? (
                  <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-700/60 space-y-1.5 text-xs text-slate-400 font-mono">
                    <div className="flex items-center justify-between">
                      <EvidenceBadge state="restricted" size="sm" />
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <p className="italic">Restricted: request access</p>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
