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
} from "lucide-react";

interface Step {
  num: number;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const steps: Step[] = [
  { num: 1, label: "Connect", href: "/connect", icon: Upload },
  { num: 2, label: "Reconstruct", href: "/connect", icon: Cpu },
  { num: 3, label: "Verify", href: "/draft", icon: ShieldAlert },
  { num: 4, label: "Gap-Interview", href: "/interview", icon: HelpCircle },
  { num: 5, label: "Review", href: "/review", icon: FileCheck2 },
  { num: 6, label: "Handover", href: "/handover", icon: Send },
];

export function WorkflowStepper() {
  const pathname = usePathname();

  const isStepActive = (step: Step) => {
    if (step.num === 4) {
      return pathname === "/interview" || pathname === "/gap-interview";
    }
    if (step.num === 1 || step.num === 2) {
      return pathname === "/connect";
    }
    if (step.num === 3) {
      return pathname === "/draft";
    }
    if (step.num === 5) {
      return pathname === "/review";
    }
    if (step.num === 6) {
      return pathname === "/handover";
    }
    return pathname === step.href;
  };

  return (
    <nav
      aria-label="Workflow Stepper"
      className="hidden lg:flex items-center gap-1 text-xs font-mono"
    >
      {steps.map((step, idx) => {
        const isActive = isStepActive(step);
        const Icon = step.icon;

        return (
          <React.Fragment key={step.num}>
            <Link
              href={step.href}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all select-none ${
                isActive
                  ? "bg-accent-primary/20 text-accent-cyan border border-accent-cyan/30 font-bold"
                  : "text-text-muted hover:text-text-primary hover:bg-surface/60"
              }`}
              title={`Stage ${step.num}: ${step.label}`}
            >
              <span className="text-[10px] opacity-70">{step.num}.</span>
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">{step.label}</span>
            </Link>

            {idx < steps.length - 1 && (
              <span className="text-border-subtle/80 select-none text-[11px] px-0.5">
                →
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
