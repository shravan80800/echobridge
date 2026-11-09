"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Terminal } from "lucide-react";
import { WorkflowStepper } from "./WorkflowStepper";
import { RoleSwitcherBar } from "./RoleSwitcherBar";
import { useRole } from "./RoleContext";

export function Navbar() {
  const { toggleAuditDrawer } = useRole();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-subtle bg-surface/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 md:px-8 max-w-7xl mx-auto gap-4">
        {/* Brand & Project Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-accent-primary to-accent-cyan flex items-center justify-center text-white shadow-glow group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-text-primary block leading-none">
                EchoBridge
              </span>
              <span className="text-[10px] font-mono text-accent-cyan tracking-wider uppercase block mt-1">
                Trust Pipeline
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-canvas border border-border-subtle text-[11px] font-mono text-text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>CampusConnect</span>
            <span className="text-text-muted">[Synthetic Demo]</span>
          </div>
        </div>

        {/* Center: 6-Stage Workflow Stepper */}
        <WorkflowStepper />

        {/* Right: 1-Click Role Switcher & Audit Log Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <RoleSwitcherBar />

          <button
            type="button"
            onClick={toggleAuditDrawer}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border-subtle text-text-secondary hover:text-accent-cyan transition-colors text-xs font-mono select-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title="Open Immutable Audit Log Drawer"
            aria-label="Open Audit Log Drawer"
          >
            <Terminal className="w-4 h-4 text-accent-cyan" />
            <span className="hidden lg:inline text-[11px]">Audit</span>
          </button>
        </div>
      </div>
    </header>
  );
}
