"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  ShieldCheck,
  MessageSquareMore,
  CheckSquare,
  Send,
  ArrowRight,
  UserX,
  Shield,
  Users,
} from "lucide-react";
import { useRole } from "@/components/layout/RoleContext";
import { Button } from "@/components/ui/Button";
import type { Role } from "@/types/echobridge.types";

interface PipelineStage {
  step: number;
  label: string;
  caption: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const pipelineStages: PipelineStage[] = [
  {
    step: 1,
    label: "1. Connect",
    caption: "Choose project files and folders",
    href: "/connect",
    icon: Upload,
  },
  {
    step: 2,
    label: "2. Reconstruct",
    caption: "Build notes from cited sources",
    href: "/connect",
    icon: FileText,
  },
  {
    step: 3,
    label: "3. Verify",
    caption: "Verify quotes and flag gaps",
    href: "/draft",
    icon: ShieldCheck,
  },
  {
    step: 4,
    label: "4. Gap-Interview",
    caption: "Ask departing member missing details",
    href: "/interview",
    icon: MessageSquareMore,
  },
  {
    step: 5,
    label: "5. Review",
    caption: "Mentor resolves conflicts and approves",
    href: "/review",
    icon: CheckSquare,
  },
  {
    step: 6,
    label: "6. Handover",
    caption: "Share role-scoped plan with receipt",
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
    <main className="w-full space-y-8">
      {/* ==================================================================== */}
      {/* SECTION 1: CLEAN HERO CARD                                           */}
      {/* ==================================================================== */}
      <section className="w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm text-center space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-800 border border-teal-200 cursor-default select-none">
          <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />
          <span>Project: CampusConnect (Student Club Handover)</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight max-w-3xl mx-auto">
          Every claim cited. Every access controlled.{" "}
          <span className="text-teal-700">Nothing lost when people leave.</span>
        </h1>

        <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
          EchoBridge builds a verified handover from your project files, asks
          the departing member only about what&apos;s missing, and lets a mentor
          approve role-based views before sharing.
        </p>

        <div className="pt-1 flex flex-col items-center gap-2">
          <Link
            href="/connect#live-import"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 shadow-sm transition-colors"
          >
            <span>⚡ Import Any Live GitHub Repo or Public Google Doc — Zero OAuth</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </Link>
          <p className="text-xs text-slate-500">
            Works immediately with any public repo or shared Google Doc — secrets and prompt injections are stripped automatically.
          </p>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SECTION 2: 3 CLEAN, ALIGNED ROLE CARDS                               */}
      {/* ==================================================================== */}
      <section className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
            Choose a role to explore
          </h2>
          <p className="text-sm text-slate-500">
            Select a persona to enter their workspace
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {/* Card 1: Departing Member (Aarav) */}
          <div
            className={`p-6 rounded-xl bg-white border shadow-sm flex flex-col justify-between gap-6 transition-colors ${
              currentRole === "departing_member"
                ? "border-teal-600 ring-1 ring-teal-600/20"
                : "border-slate-200"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 cursor-default select-none">
                  Departing Member
                </span>
                <UserX className="w-4 h-4 text-slate-400 shrink-0" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Aarav
                </h3>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                  Connect project files and answer 3 short questions about
                  unwritten decisions.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={() => handleOpenRole("departing_member", "/connect")}
            >
              Start as Departing Member →
            </Button>
          </div>

          {/* Card 2: Reviewer / Mentor (Prof. Deshmukh) */}
          <div
            className={`p-6 rounded-xl bg-white border shadow-sm flex flex-col justify-between gap-6 transition-colors ${
              currentRole === "reviewer"
                ? "border-teal-600 ring-1 ring-teal-600/20"
                : "border-slate-200"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default select-none">
                  Reviewer / Mentor
                </span>
                <Shield className="w-4 h-4 text-slate-400 shrink-0" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Prof. Deshmukh
                </h3>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                  Check source citations, resolve conflicting dates, and approve
                  the handover.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full"
              onClick={() => handleOpenRole("reviewer", "/review")}
            >
              Open Reviewer Workspace →
            </Button>
          </div>

          {/* Card 3: Incoming Member (Riya or Kabir) */}
          <div
            className={`p-6 rounded-xl bg-white border shadow-sm flex flex-col justify-between gap-6 transition-colors ${
              currentRole === "incoming_lead" ||
              currentRole === "incoming_intern"
                ? "border-teal-600 ring-1 ring-teal-600/20"
                : "border-slate-200"
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200 cursor-default select-none">
                  Incoming Member
                </span>
                <Users className="w-4 h-4 text-slate-400 shrink-0" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Riya or Kabir
                </h3>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                  Read your approved Day 1, Week 1, and Month 1 plan and
                  acknowledge receipt.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => handleOpenRole("incoming_lead", "/handover")}
              >
                View as Team Lead (Riya) →
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => handleOpenRole("incoming_intern", "/handover")}
              >
                View as Intern (Kabir) →
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* SECTION 3: CLEAN 6-STEP VISUAL DIAGRAM (PROPOSAL FIGURE 1)           */}
      {/* ==================================================================== */}
      <section className="w-full bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              How EchoBridge Works
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Six clear steps from project files to a signed handover
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {pipelineStages.map((stage) => {
            const Icon = stage.icon;

            return (
              <Link
                key={stage.step}
                href={stage.href}
                className="group p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 transition-colors flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-teal-800">
                    {stage.label}
                  </span>
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-teal-700 transition-colors shrink-0" />
                </div>

                <p className="text-xs text-slate-600 leading-snug">
                  {stage.caption}
                </p>
              </Link>
            );
          })}
        </div>

        {/* Subtle Footer Link for Hackathon Judges */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <Link
            href="/metrics"
            className="text-xs font-medium text-slate-500 hover:text-teal-700 inline-flex items-center gap-1 transition-colors"
          >
            <span>
              For Hackathon Judges: View Automated Evaluation &amp; 8 Test
              Scenarios (/metrics)
            </span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </Link>
        </div>
      </section>
    </main>
  );
}
