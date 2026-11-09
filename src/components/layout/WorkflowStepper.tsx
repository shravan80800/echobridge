"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Upload,
  Cpu,
  ShieldAlert,
  HelpCircle,
  FileCheck2,
  Send,
  BarChart2,
} from "lucide-react";

interface Step {
  num: number | string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const steps: Step[] = [
  { num: 1, label: "Connect", href: "/connect", icon: Upload },
  { num: 2, label: "Reconstruct", href: "/connect", icon: Cpu },
  { num: 3, label: "Verify", href: "/draft", icon: ShieldAlert },
  { num: 4, label: "Gap-Interview", href: "/gap-interview", icon: HelpCircle },
  { num: 5, label: "Review", href: "/review", icon: FileCheck2 },
  { num: 6, label: "Handover", href: "/handover", icon: Send },
];

export function WorkflowStepper() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Workflow Navigation"
      className="hidden lg:flex items-center gap-1 text-xs font-mono"
    >
      {steps.map((step, idx) => {
        const isActive =
          pathname === step.href ||
          (step.href === "/gap-interview" && (pathname === "/gap-interview" || pathname === "/interview")) ||
          (step.href === "/connect" && (pathname === "/connect" || pathname === "/"));
        const Icon = step.icon;

        return (
          <React.Fragment key={step.label}>
            <Link
              href={step.href}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all select-none ${
                isActive
                  ? "bg-surface-hover text-accent-cyan border border-accent-cyan/30 font-bold"
                  : "text-text-muted hover:text-text-primary hover:bg-surface/50"
              }`}
            >
              <span className="text-[10px] opacity-75">{step.num}.</span>
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{step.label}</span>
            </Link>

            {idx < steps.length - 1 && (
              <span className="text-border-subtle select-none">→</span>
            )}
          </React.Fragment>
        );
      })}

      <div className="h-4 w-[1px] bg-border-subtle mx-1.5" />

      {/* Metrics Scorecard Link */}
      <Link
        href="/metrics"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all select-none ${
          pathname === "/metrics"
            ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/40 font-bold"
            : "text-accent-primary/80 hover:text-accent-primary hover:bg-surface/50"
        }`}
        title="Live 8-Trap Calibration Scorecard"
      >
        <BarChart2 className="w-3.5 h-3.5 shrink-0" />
        <span>8 Traps</span>
      </Link>
    </nav>
  );
}
