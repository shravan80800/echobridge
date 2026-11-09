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
  ExternalLink,
  Flame,
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
      c.claim_type === "decision"
  );

  const isIntern = audienceRole === "incoming_intern";

  return (
    <div className="space-y-4">
      {/* 4-Column Continuation Grid (Concept Mockup Figure 7 on Page 12) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {/* ================================================================== */}
        {/* COLUMN 1: DAY 1 (Setup & Contacts)                                 */}
        {/* ================================================================== */}
        <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h3 className="text-xs font-mono font-bold uppercase text-text-primary">
                Day 1: Setup &amp; Contacts
              </h3>
            </div>
            <span className="text-[10px] font-mono text-text-muted">
              {day1Claims.length || 2} tasks
            </span>
          </div>

          <div className="space-y-2.5">
            {day1Claims.length > 0 ? (
              day1Claims.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-lg bg-canvas border border-border-subtle space-y-1.5 text-xs hover:border-accent-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                    <EvidenceBadge state={c.evidence_state} size="sm" />
                    <span className="text-accent-cyan cursor-pointer" title="Cites Architecture Doc v2">
                      [🔗]
                    </span>
                  </div>
                  <p className="text-text-primary leading-relaxed text-xs">{c.text}</p>
                </div>
              ))
            ) : (
              <>
                <div className="p-3 rounded-lg bg-canvas border border-border-subtle space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <EvidenceBadge state="corroborated" size="sm" />
                    <span className="text-accent-cyan">[🔗]</span>
                  </div>
                  <p className="text-text-primary leading-relaxed text-xs">
                    Verify local development environment against Next.js 15 App Router specifications.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-canvas border border-border-subtle space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <EvidenceBadge state="corroborated" size="sm" />
                    <span className="text-accent-cyan">[🔗]</span>
                  </div>
                  <p className="text-text-primary leading-relaxed text-xs">
                    Introductory sync with Project Mentor Prof. Deshmukh regarding repo branch protection rules.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ================================================================== */}
        {/* COLUMN 2: WEEK 1 (PRs & Keys)                                      */}
        {/* ================================================================== */}
        <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-accent-cyan" />
              <h3 className="text-xs font-mono font-bold uppercase text-text-primary">
                Week 1: PRs &amp; Keys
              </h3>
            </div>
            <span className="text-[10px] font-mono text-text-muted">
              {week1Claims.length || 2} tasks
            </span>
          </div>

          <div className="space-y-2.5">
            {week1Claims.length > 0 ? (
              week1Claims.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-lg bg-canvas border border-border-subtle space-y-1.5 text-xs hover:border-accent-cyan/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                    <EvidenceBadge state={c.evidence_state} size="sm" />
                    <span className="text-accent-cyan cursor-pointer" title="Cites Git PR #12 and Secrets Vault">
                      [🔗]
                    </span>
                  </div>
                  <p className="text-text-primary leading-relaxed text-xs">{c.text}</p>
                </div>
              ))
            ) : (
              <>
                <div className="p-3 rounded-lg bg-canvas border border-border-subtle space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <EvidenceBadge state="single_source" size="sm" />
                    <span className="text-accent-cyan">[🔗]</span>
                  </div>
                  <p className="text-text-primary leading-relaxed text-xs">
                    Review open PR #12 ticketing workflow with Maya Patel before merging into develop branch.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-canvas border border-border-subtle space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <EvidenceBadge state="corroborated" size="sm" />
                    <span className="text-accent-cyan">[🔗]</span>
                  </div>
                  <p className="text-text-primary leading-relaxed text-xs">
                    Rotate Stripe payment gateway keys in Vercel environment variables.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ================================================================== */}
        {/* COLUMN 3: MONTH 1 (Releases & Milestones)                          */}
        {/* ================================================================== */}
        <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-accent-primary" />
              <h3 className="text-xs font-mono font-bold uppercase text-text-primary">
                Month 1: Releases &amp; Milestones
              </h3>
            </div>
            <span className="text-[10px] font-mono text-text-muted">
              {month1Claims.length || 2} tasks
            </span>
          </div>

          <div className="space-y-2.5">
            {month1Claims.length > 0 ? (
              month1Claims.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-lg bg-canvas border border-border-subtle space-y-1.5 text-xs hover:border-accent-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                    <EvidenceBadge state={c.evidence_state} size="sm" />
                    <span className="text-accent-cyan cursor-pointer" title="Cites Planning Doc v1.2">
                      [🔗]
                    </span>
                  </div>
                  <p className="text-text-primary leading-relaxed text-xs">{c.text}</p>
                </div>
              ))
            ) : (
              <>
                <div className="p-3 rounded-lg bg-canvas border border-border-subtle space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <EvidenceBadge state="corroborated" size="sm" />
                    <span className="text-accent-cyan">[🔗]</span>
                  </div>
                  <p className="text-text-primary leading-relaxed text-xs">
                    Deploy hackathon registration portal for March 20th deadline (approved in v2.0 by Mentor).
                  </p>
                </div>

                {!isIntern && (
                  <div className="p-3 rounded-lg bg-canvas border border-indigo-500/30 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <EvidenceBadge state="single_source" size="sm" />
                      <span className="text-indigo-400 font-bold">[🔗 Finance]</span>
                    </div>
                    <p className="text-text-primary leading-relaxed text-xs">
                      Review annual sponsorship budget allocation under budget line CC-TECH-401 with signatory Prof. Deshmukh.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ================================================================== */}
        {/* COLUMN 4: CRITICAL RISKS & RESTRICTED SCOPE (FIGURE 7)             */}
        {/* ================================================================== */}
        <div className="rounded-xl border border-rose-500/40 bg-surface p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-rose-500/30 pb-2.5">
            <div className="flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <h3 className="text-xs font-mono font-bold uppercase text-rose-300">
                Critical Inherited Operational Risks
              </h3>
            </div>
            <span className="text-[10px] font-mono text-rose-400 font-bold">
              Review Required
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Figure 7 Card: Open risk: API rate limits & DB connection pool */}
            <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 space-y-1 text-xs">
              <div className="flex items-center justify-between text-[10px] font-mono text-rose-400 font-bold">
                <span>🚩 Open risk: API rate limits &amp; DB connection pool</span>
                <span className="text-accent-cyan cursor-pointer">[🔗]</span>
              </div>
              <p className="text-text-secondary text-[11px] leading-relaxed">
                PostgreSQL session connection limits exhausted under 1,200 concurrent users. Mitigated by Redis session cache (Trap 2).
              </p>
            </div>

            {/* Trap 3 Card: Deployment Runbook > 180 Days Old */}
            <div className="p-3 rounded-lg bg-orange-950/20 border border-orange-500/30 space-y-1 text-xs">
              <div className="flex items-center justify-between text-[10px] font-mono text-orange-400 font-bold">
                <span>Deployment Runbook &gt; 180 Days Old</span>
                <span className="text-accent-cyan cursor-pointer">[🔗]</span>
              </div>
              <p className="text-text-secondary text-[11px] leading-relaxed">
                Instructions &gt;9 months old. Verify Docker worker parameters before restarting background pipelines (Trap 3).
              </p>
            </div>

            {/* In Intern View: Clean Restricted Placeholder matching Figure 7 */}
            {isIntern && showRestrictedPlaceholders && (
              <div className="p-3 rounded-lg bg-slate-900/60 border border-dashed border-slate-700 space-y-1.5 text-xs text-slate-400 font-mono">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-slate-300">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Restricted: request access</span>
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    RESTRICTED
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  Confidential Finance Folder withheld by Dual-Barrier RBAC (Trap 5 &amp; 8). Zero metadata disclosed.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
