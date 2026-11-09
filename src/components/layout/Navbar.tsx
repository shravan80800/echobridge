"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Terminal, BarChart2 } from "lucide-react";
import { WorkflowStepper } from "./WorkflowStepper";
import { RoleSwitcherBar } from "./RoleSwitcherBar";
import { useRole } from "./RoleContext";

export function Navbar() {
  const { toggleAuditDrawer } = useRole();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-subtle bg-surface/85 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 md:px-8 max-w-7xl mx-auto gap-4">
        {/* Left: Brand & Subtle CampusConnect Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-accent-primary to-accent-cyan flex items-center justify-center text-white shadow-glow group-hover:scale-105 transition-transform shrink-0">
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

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-canvas border border-border-subtle text-[11px] font-mono text-text-secondary select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>CampusConnect</span>
            <span className="text-text-muted hidden md:inline">[Demo]</span>
          </div>
        </div>

        {/* Center: Minimal 6-Step Horizontal Stepper */}
        <WorkflowStepper />

        {/* Right: Subtle Metrics Link + Compact Role Dropdown + Audit Log Drawer Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Subtle Metrics Link */}
          <Link
            href="/metrics"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all select-none ${
              pathname === "/metrics"
                ? "bg-accent-primary/20 text-accent-cyan border-accent-cyan/40 font-bold"
                : "bg-surface hover:bg-surface-hover border-border-subtle text-text-secondary hover:text-text-primary"
            }`}
            title="Inspect 8 Planted Traps & Calibration Metrics"
          >
            <BarChart2 className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
            <span className="hidden sm:inline">Metrics</span>
          </Link>

          {/* Compact Role Selector Dropdown */}
          <RoleSwitcherBar />

          {/* Audit Log Drawer Icon Button */}
          <button
            type="button"
            onClick={toggleAuditDrawer}
            className="flex items-center gap-1.5 p-2 rounded-lg bg-surface hover:bg-surface-hover border border-border-subtle text-text-secondary hover:text-accent-cyan transition-colors text-xs font-mono select-none focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
            title="Open Immutable Audit Trail Drawer"
            aria-label="Open Audit Log Drawer"
          >
            <Terminal className="w-4 h-4 text-accent-cyan" />
            <span className="sr-only">Open Audit Trail</span>
          </button>
        </div>
      </div>
    </header>
  );
}
