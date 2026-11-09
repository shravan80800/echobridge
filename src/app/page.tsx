"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Upload,
  Cpu,
  ShieldCheck,
  HelpCircle,
  FileCheck2,
  Send,
  BarChart2,
  ArrowRight,
  Shield,
  UserX,
  Users,
  UserCheck,
  Lock,
  Unlock,
  CheckCircle2,
} from "lucide-react";
import { useRole } from "@/components/layout/RoleContext";
import { Button } from "@/components/ui/Button";
import type { Role } from "@/types/echobridge.types";

interface PipelineStage {
  step: number;
  label: string;
  subtitle: string;
  note: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const pipelineStages: PipelineStage[] = [
  {
    step: 1,
    label: "Connect",
    subtitle: "Sources & Quarantine",
    note: "Redacts keys & PII (Trap 4)",
    href: "/connect",
    icon: Upload,
  },
  {
    step: 2,
    label: "Reconstruct",
    subtitle: "Retrieve-Only Extract",
    note: "Pre-Model RBAC (Trap 5)",
    href: "/connect",
    icon: Cpu,
  },
  {
    step: 3,
    label: "Verify",
    subtitle: "Two-Layer Citations",
    note: "Author independence rule",
    href: "/draft",
    icon: ShieldCheck,
  },
  {
    step: 4,
    label: "Gap-Interview",
    subtitle: "Targeted Questions",
    note: "Red gaps → Blue Attested",
    href: "/interview",
    icon: HelpCircle,
  },
  {
    step: 5,
    label: "Review",
    subtitle: "Human Approval Gate",
    note: "Conflict matrix & ADR-007",
    href: "/review",
    icon: FileCheck2,
  },
  {
    step: 6,
    label: "Handover",
    subtitle: "Plan & Digital Receipt",
    note: "Quiz + SHA-256 certificate",
    href: "/handover",
    icon: Send,
  },
];

export default function HomePage() {
  const { currentRole, switchRole } = useRole();
  const router = useRouter();

  const handleOpenRole = (role: Role, path: string) => {
    switchRole(role);
    router.push(path);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-4 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-12">
      {/* ==================================================================== */}
      {/* PART A: HERO SECTION                                                 */}
      {/* ==================================================================== */}
      <section className="w-full text-center max-w-4xl mx-auto space-y-6 pt-4 md:pt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-accent-primary/10 text-accent-cyan border border-accent-primary/20 select-none">
          <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
          <span>CAMPUSCONNECT BENCHMARK LOADED</span>
          <span>•</span>
          <span>ZERO-CONFIG READY</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-text-primary leading-[1.15]">
          Every claim cited. Every access controlled.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary via-indigo-400 to-accent-cyan block sm:inline">
            Nothing lost when people leave.
          </span>
        </h1>

        <p className="text-text-secondary text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
          EchoBridge reconstructs project knowledge from authorised sources, verifies
          claims with two-layer citations, conducts targeted Gap-Interviews with
          departing leads, and requires human mentor approval before publishing
          role-scoped handover packages.
        </p>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={() => handleOpenRole("departing_member", "/connect")}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Start Guided Walkthrough
          </Button>

          <Link href="/metrics">
            <Button
              variant="secondary"
              size="lg"
              leftIcon={<BarChart2 className="w-4 h-4 text-accent-cyan" />}
            >
              Inspect 8 Planted Traps
            </Button>
          </Link>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* PART B: CHOOSE YOUR ROLE CARD GRID (3 SIMPLE CARDS)                  */}
      {/* ==================================================================== */}
      <section className="w-full space-y-4">
        <div className="text-center max-w-xl mx-auto mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            Choose Your Role to Explore
          </h2>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Experience the platform through distinct security clearances and responsibilities
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Departing Developer */}
          <div
            className={`p-6 rounded-2xl bg-surface border transition-all flex flex-col justify-between ${
              currentRole === "departing_member"
                ? "border-amber-500/50 shadow-glow"
                : "border-border-subtle hover:border-amber-500/30"
            }`}
          >
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  DEPARTING LEAD
                </span>
                <span className="text-[10px] font-mono text-text-muted">Stage 1 &amp; 4</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    Departing Developer
                  </h3>
                  <span className="text-xs font-mono text-text-muted">
                    Aarav Sharma — Lead Dev
                  </span>
                </div>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                Connect sources &amp; complete the 5-minute Gap-Interview to preserve unwritten rationale.
              </p>

              <div className="pt-2 border-t border-border-subtle/60 space-y-1.5 text-[11px] font-mono text-text-muted">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400">✦</span>
                  <span>Ingest Git PRs, docs, and chat logs</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400">✦</span>
                  <span>Answer Redis rationale gap (Trap 2)</span>
                </div>
                <div className="flex items-center gap-2 text-rose-400">
                  <span>✕</span>
                  <span>Self-approval strictly blocked (403)</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-center text-xs font-mono text-amber-300 hover:text-white hover:bg-amber-500/20 border-amber-500/30"
                onClick={() => handleOpenRole("departing_member", "/connect")}
              >
                Open as Departing Lead (Aarav) →
              </Button>
            </div>
          </div>

          {/* Card 2: Reviewer / Mentor */}
          <div
            className={`p-6 rounded-2xl bg-surface border transition-all flex flex-col justify-between ${
              currentRole === "reviewer"
                ? "border-emerald-500/50 shadow-glow"
                : "border-border-subtle hover:border-emerald-500/30"
            }`}
          >
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  MENTOR APPROVER
                </span>
                <span className="text-[10px] font-mono text-text-muted">Stage 5</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    Reviewer / Mentor
                  </h3>
                  <span className="text-xs font-mono text-text-muted">
                    Prof. Deshmukh — Approver
                  </span>
                </div>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                Inspect evidence colours, resolve timeline conflicts, and approve published views.
              </p>

              <div className="pt-2 border-t border-border-subtle/60 space-y-1.5 text-[11px] font-mono text-text-muted">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✦</span>
                  <span>Inspect Quarantine Vault (Trap 4)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✦</span>
                  <span>Resolve registration conflict (Trap 1)</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <span>✓</span>
                  <span>Sole authority to publish v2.0 handover</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-center text-xs font-mono text-emerald-300 hover:text-white hover:bg-emerald-500/20 border-emerald-500/30"
                onClick={() => handleOpenRole("reviewer", "/review")}
              >
                Open as Reviewer (Prof. Deshmukh) →
              </Button>
            </div>
          </div>

          {/* Card 3: Incoming Successor (Lead or Intern) */}
          <div
            className={`p-6 rounded-2xl bg-surface border transition-all flex flex-col justify-between ${
              currentRole === "incoming_lead" || currentRole === "incoming_intern"
                ? "border-accent-primary/50 shadow-glow"
                : "border-border-subtle hover:border-accent-primary/30"
            }`}
          >
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-accent-primary/10 text-accent-cyan border border-accent-primary/20">
                  ROLE-SCOPED RECIPIENTS
                </span>
                <span className="text-[10px] font-mono text-text-muted">Stage 3 &amp; 6</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    Incoming Successor
                  </h3>
                  <span className="text-xs font-mono text-text-muted">
                    Riya (Lead) or Kabir (Intern)
                  </span>
                </div>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                View role-filtered Day 1, Week 1, Month 1 plan, pass risk quiz &amp; acknowledge receipt.
              </p>

              <div className="pt-2 border-t border-border-subtle/60 space-y-1.5 text-[11px] font-mono text-text-muted">
                <div className="flex items-center gap-2">
                  <Unlock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Lead: Sees Finance folder ($3,500)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Intern: Finance is 100% withheld</span>
                </div>
                <div className="flex items-center gap-2 text-accent-cyan">
                  <span>✦</span>
                  <span>Anti-blind risk quiz &amp; SHA-256 receipt</span>
                </div>
              </div>
            </div>

            <div className="pt-6 grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="justify-center text-[11px] font-mono text-indigo-300 hover:text-white hover:bg-indigo-500/20 border-indigo-500/30 px-2"
                onClick={() => handleOpenRole("incoming_lead", "/handover")}
              >
                Lead (Riya) →
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="justify-center text-[11px] font-mono text-cyan-300 hover:text-white hover:bg-cyan-500/20 border-cyan-500/30 px-2"
                onClick={() => handleOpenRole("incoming_intern", "/handover")}
              >
                Intern (Kabir) →
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* PART C: VISUAL 6-STAGE PIPELINE BAR (MATCHING FIGURE 1)              */}
      {/* ==================================================================== */}
      <section className="w-full p-6 sm:p-8 rounded-2xl bg-surface border border-border-subtle space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary tracking-tight">
              The 6-Stage Epistemic Handover Pipeline
            </h2>
            <p className="text-xs font-mono text-text-muted mt-0.5">
              Figure 1 Architecture — From multi-modal ingestion to cryptographic sign-off
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Dual-Barrier RBAC Active</span>
          </div>
        </div>

        {/* 6-Stage Horizontal Visual Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {pipelineStages.map((stage) => {
            const Icon = stage.icon;

            return (
              <Link
                key={stage.step}
                href={stage.href}
                className="group p-3.5 rounded-xl bg-canvas/70 border border-border-subtle hover:border-accent-primary/50 hover:bg-surface-hover transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-accent-cyan px-1.5 py-0.2 rounded bg-accent-cyan/10 border border-accent-cyan/20">
                      Stage {stage.step}
                    </span>
                    <Icon className="w-3.5 h-3.5 text-text-muted group-hover:text-accent-primary transition-colors" />
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-text-primary group-hover:text-accent-primary transition-colors">
                      {stage.label}
                    </h3>
                    <p className="text-[11px] text-text-secondary mt-0.5 leading-snug">
                      {stage.subtitle}
                    </p>
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-border-subtle/50">
                  <span className="text-[10px] font-mono text-text-muted block leading-tight">
                    {stage.note}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom Bar: Single Direct Link to Metrics */}
        <div className="pt-4 border-t border-border-subtle/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-text-muted">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>188 Automated Tests Verified • Zero Unapproved Disclosures</span>
          </div>

          <Link
            href="/metrics"
            className="text-accent-cyan hover:text-white font-bold flex items-center gap-1.5 group transition-colors"
          >
            <span>View 8 Planted Traps &amp; Evaluation Metrics (/metrics)</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </main>
  );
}
