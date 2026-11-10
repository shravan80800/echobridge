"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Step {
  num: number;
  label: string;
  href: string;
  matchPaths: string[];
}

const steps: Step[] = [
  {
    num: 1,
    label: "1. Sources",
    href: "/connect",
    matchPaths: ["/connect"],
  },
  {
    num: 2,
    label: "2. Gap Interview",
    href: "/interview",
    matchPaths: ["/interview", "/gap-interview"],
  },
  {
    num: 3,
    label: "3. Review & Approve",
    href: "/review",
    matchPaths: ["/review", "/draft"],
  },
  {
    num: 4,
    label: "4. Final Handover",
    href: "/handover",
    matchPaths: ["/handover"],
  },
];

interface WorkflowStepperProps {
  mobile?: boolean;
}

export function WorkflowStepper({ mobile = false }: WorkflowStepperProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={mobile ? "Mobile Workflow Navigation" : "Workflow Stepper"}
      className={
        mobile
          ? "flex md:hidden items-center gap-1.5 overflow-x-auto scrollbar-none whitespace-nowrap py-1.5"
          : "hidden md:flex items-center gap-1 text-xs font-sans"
      }
    >
      {steps.map((step) => {
        const isActive = step.matchPaths.includes(pathname);

        return (
          <Link
            key={step.num}
            href={step.href}
            className={`px-2.5 py-1.5 rounded-lg text-xs transition-colors select-none whitespace-nowrap ${
              isActive
                ? "bg-teal-50 text-teal-800 border border-teal-200 font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent font-medium"
            }`}
          >
            {step.label}
          </Link>
        );
      })}
    </nav>
  );
}
