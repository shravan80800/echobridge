"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, History } from "lucide-react";
import { WorkflowStepper } from "./WorkflowStepper";
import { RoleSwitcherBar } from "./RoleSwitcherBar";
import { useRole } from "./RoleContext";

export function Navbar() {
  const { toggleAuditDrawer } = useRole();

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Primary Row */}
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Left: Clean Brand Title */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="h-8 w-8 rounded-lg bg-teal-700 flex items-center justify-center text-white shadow-sm group-hover:bg-teal-800 transition-colors shrink-0">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              EchoBridge
            </span>
          </Link>

          {/* Center (Desktop): 4 Plain-English Workflow Steps */}
          <WorkflowStepper />

          {/* Right: Clean Role Dropdown + Activity Log Icon Button */}
          <div className="flex items-center gap-2 shrink-0">
            <RoleSwitcherBar />

            <button
              type="button"
              onClick={toggleAuditDrawer}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-600 hover:text-slate-900 transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-1"
              title="Activity Log"
              aria-label="Open Activity Log"
            >
              <History className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Scrollable Strip (< md) */}
        <div className="md:hidden border-t border-slate-100">
          <WorkflowStepper mobile />
        </div>
      </div>
    </header>
  );
}
