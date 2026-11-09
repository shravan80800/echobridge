"use client";

import React from "react";
import Link from "next/link";
import {
  Upload,
  Cpu,
  ShieldCheck,
  HelpCircle,
  FileCheck2,
  Send,
  BarChart2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Database,
  Lock,
  Layers,
} from "lucide-react";
import { useRole } from "@/components/layout/RoleContext";
import { Button } from "@/components/ui/Button";

interface StageCard {
  step: number;
  title: string;
  href: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  roleHighlight: string;
  badge: string;
}

const stageCards: StageCard[] = [
  {
    step: 1,
    title: "Connect Sources",
    href: "/connect",
    description:
      "Inspect authorised project sources, ACL scopes, and confirm permissions for Incoming Lead vs. Intern.",
    icon: Upload,
    roleHighlight: "Admin / Departing Lead",
    badge: "Stage 1",
  },
  {
    step: 2,
    title: "Parse & Redact",
    href: "/connect",
    description:
      "Review secret & PII quarantine vault (Trap 4) and prompt-injection detection alerts (Trap 6).",
    icon: Cpu,
    roleHighlight: "Security Pipeline",
    badge: "Stage 2",
  },
  {
    step: 3,
    title: "Verify & Draft",
    href: "/draft",
    description:
      "Inspect evidence-coloured claims, verbatim quote popovers, and the transparent Confidence Score HUD.",
    icon: ShieldCheck,
    roleHighlight: "Audience-Scoped",
    badge: "Stage 3",
  },
  {
    step: 4,
    title: "Gap-Interview",
    href: "/gap-interview",
    description:
      "Answer unwritten rationale (Redis choice in Trap 2) to turn Red gaps into Blue Attested evidence.",
    icon: HelpCircle,
    roleHighlight: "Departing Lead Only",
    badge: "Stage 4",
  },
  {
    step: 5,
    title: "Reviewer Diff & Approval",
    href: "/review",
    description:
      "Inspect version diffs (v1.0 -> v1.1 -> v2.0), resolve Purple conflicts (Trap 1), and approve per role.",
    icon: FileCheck2,
    roleHighlight: "Reviewer / Mentor Only",
    badge: "Stage 5",
  },
  {
    step: 6,
    title: "Handover & Receipt",
    href: "/handover",
    description:
      "Delivers Day 1 / Week 1 / Month 1 continuation plan, Critical Risk Quiz, and signed transfer receipt.",
    icon: Send,
    roleHighlight: "Incoming Member",
    badge: "Stage 6",
  },
];

export default function HomePage() {
  const { currentRole, currentProfile, switchRole } = useRole();

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-6 md:p-12 max-w-7xl mx-auto space-y-12">
      {/* Hero Section */}
      <section className="w-full bg-glass rounded-2xl p-8 md:p-12 border border-white/10 shadow-glow relative overflow-hidden">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
            <span className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
            <span>CAMPUSCONNECT DEMO PROJECT LOADED</span>
            <span>•</span>
            <span>ZERO-CONFIG READY</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-text-primary leading-tight">
            Every claim cited. Every access controlled.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-accent-cyan">
              Nothing lost when people leave.
            </span>
          </h1>

          <p className="text-text-secondary text-sm md:text-base leading-relaxed">
            EchoBridge reconstructs project state from authorised sources, verifies
            claims with two-layer citation checks, interviews departing leads on
            unwritten gaps, and shares nothing until a human reviewer approves each
            role-specific view.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link href="/connect">
              <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Explore CampusConnect Pipeline
              </Button>
            </Link>

            <Link href="/metrics">
              <Button
                variant="secondary"
                leftIcon={<BarChart2 className="w-4 h-4 text-accent-cyan" />}
              >
                Inspect 8 Planted Traps
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Live System KPIs */}
      <section className="w-full grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-surface border border-border-subtle">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Sources</span>
            <Database className="w-4 h-4 text-accent-cyan" />
          </div>
          <div className="text-2xl font-bold text-text-primary">8 Sources</div>
          <p className="text-[11px] text-text-secondary mt-1">
            Git, chat, runbook, finance folder
          </p>
        </div>

        <div className="p-5 rounded-xl bg-surface border border-border-subtle">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Sanitized Chunks</span>
            <Layers className="w-4 h-4 text-accent-primary" />
          </div>
          <div className="text-2xl font-bold text-text-primary">10 Chunks</div>
          <p className="text-[11px] text-text-secondary mt-1">
            Pre-Model RBAC role metadata attached
          </p>
        </div>

        <div className="p-5 rounded-xl bg-surface border border-border-subtle">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Planted Traps</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-text-primary">8 of 8 Seeded</div>
          <p className="text-[11px] text-text-secondary mt-1">
            100% testable across all 4 roles
          </p>
        </div>

        <div className="p-5 rounded-xl bg-surface border border-border-subtle">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Draft Snapshots</span>
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-text-primary">v1.0 → v1.1 → v2.0</div>
          <p className="text-[11px] text-text-secondary mt-1">
            Lead and Intern audience versions
          </p>
        </div>
      </section>

      {/* 6 Workflow Stages Quick-Jump Grid */}
      <section className="w-full space-y-6">
        <div className="flex items-center justify-between border-b border-border-subtle pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              The 6 Workflow Stages
            </h2>
            <p className="text-xs font-mono text-text-muted mt-0.5">
              Follow the end-to-end trust pipeline from connection to signed receipt
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {stageCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.step}
                href={card.href}
                className="group p-6 rounded-xl bg-surface border border-border-subtle hover:border-accent-primary/50 hover:bg-surface-hover transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-accent-cyan px-2 py-0.5 rounded bg-accent-cyan/10 border border-accent-cyan/20">
                      {card.badge}
                    </span>
                    <span className="text-[11px] font-mono text-text-muted">
                      {card.roleHighlight}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-canvas border border-border-subtle text-accent-primary group-hover:scale-110 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                      {card.title}
                    </h3>
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-border-subtle/50 flex items-center justify-between text-xs text-accent-primary font-mono group-hover:translate-x-1 transition-transform">
                  <span>Enter Stage {card.step}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Judge Persona Testing Guide */}
      <section className="w-full p-8 rounded-xl bg-surface border border-border-subtle space-y-6">
        <div className="border-b border-border-subtle pb-4">
          <h2 className="text-lg font-bold text-text-primary">
            Judge Evaluation Guide: Test the 4 Personas
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Use the 1-Click Judge Role Switcher in the top command bar to evaluate
            role separation and server-side RBAC enforcement:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div
            onClick={() => switchRole("departing_member")}
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
              currentRole === "departing_member"
                ? "border-amber-500 bg-amber-500/10"
                : "border-border-subtle bg-canvas hover:border-amber-500/50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-amber-400">1. Departing Lead (Aarav)</span>
              {currentRole === "departing_member" && (
                <span className="text-[10px] text-amber-400 font-bold">ACTIVE</span>
              )}
            </div>
            <p className="text-text-secondary text-[11px] font-sans">
              Test Stage 4 (`/gap-interview`) by answering why Redis was chosen
              (Trap 2), turning Red into Blue Attested evidence. Notice self-approval
              on `/review` is strictly blocked.
            </p>
          </div>

          <div
            onClick={() => switchRole("reviewer")}
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
              currentRole === "reviewer"
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-border-subtle bg-canvas hover:border-emerald-500/50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-emerald-400">
                2. Reviewer / Mentor (Prof. Deshmukh)
              </span>
              {currentRole === "reviewer" && (
                <span className="text-[10px] text-emerald-400 font-bold">ACTIVE</span>
              )}
            </div>
            <p className="text-text-secondary text-[11px] font-sans">
              Test Stage 5 (`/review`) with full approval rights. Compare version diffs
              (v1.0 vs. v1.1), inspect the Quarantine Vault (Trap 4 & 6), resolve the
              deadline conflict (Trap 1), and approve v2.0.
            </p>
          </div>

          <div
            onClick={() => switchRole("incoming_lead")}
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
              currentRole === "incoming_lead"
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-border-subtle bg-canvas hover:border-indigo-500/50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-indigo-400">
                3. Incoming Team Lead (Riya)
              </span>
              {currentRole === "incoming_lead" && (
                <span className="text-[10px] text-indigo-400 font-bold">ACTIVE</span>
              )}
            </div>
            <p className="text-text-secondary text-[11px] font-sans">
              Test Stage 6 (`/handover`) with highest privileges. Inspect confidential
              club budget figures (Trap 5), complete the 3-question quiz, and sign the
              transfer receipt.
            </p>
          </div>

          <div
            onClick={() => switchRole("incoming_intern")}
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
              currentRole === "incoming_intern"
                ? "border-cyan-500 bg-cyan-500/10"
                : "border-border-subtle bg-canvas hover:border-cyan-500/50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-cyan-400">4. Incoming Intern (Kabir)</span>
              {currentRole === "incoming_intern" && (
                <span className="text-[10px] text-cyan-400 font-bold">ACTIVE</span>
              )}
            </div>
            <p className="text-text-secondary text-[11px] font-sans">
              Test Stage 3 (`/draft`) and Stage 6 (`/handover`). Confidential finance
              data (Trap 5) and mixed claims (Trap 8) are 100% withheld and replaced
              with &quot;Restricted: request access&quot;.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
