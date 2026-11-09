"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  Shield,
  Users,
  UserX,
  ChevronDown,
  Check,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { useRole } from "./RoleContext";
import type { Role } from "@/types/echobridge.types";

interface PersonaOption {
  role: Role;
  name: string;
  jobTitle: string;
  label: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  workspacePath: string;
  workspaceLabel: string;
  permissionPill: string;
  permissionPillColor: string;
  dotColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PERSONA_OPTIONS: PersonaOption[] = [
  {
    role: "departing_member",
    name: "Aarav",
    jobTitle: "Lead Dev",
    label: "1. Departing Member (Aarav — Lead Dev)",
    subtitle: "Connects sources & answers Gap-Interview",
    badge: "Departing Lead",
    badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    workspacePath: "/connect",
    workspaceLabel: "Connect & Gap-Interview",
    permissionPill: "No Self-Approval",
    permissionPillColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    dotColor: "bg-amber-400",
    icon: UserX,
  },
  {
    role: "reviewer",
    name: "Prof. Deshmukh",
    jobTitle: "Mentor",
    label: "2. Reviewer / Approver (Prof. Deshmukh — Mentor)",
    subtitle: "Verifies claims, resolves conflicts & approves",
    badge: "Mentor Reviewer",
    badgeColor: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    workspacePath: "/review",
    workspaceLabel: "Review & Approval",
    permissionPill: "Approval Authority",
    permissionPillColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dotColor: "bg-emerald-400",
    icon: Shield,
  },
  {
    role: "incoming_lead",
    name: "Riya",
    jobTitle: "Full Access",
    label: "3. Incoming Team Lead (Riya — Full Access)",
    subtitle: "Receives full handover + Finance scope",
    badge: "Incoming Lead",
    badgeColor: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    workspacePath: "/handover",
    workspaceLabel: "Full Handover Plan",
    permissionPill: "Finance Access",
    permissionPillColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    dotColor: "bg-indigo-400",
    icon: UserCheck,
  },
  {
    role: "incoming_intern",
    name: "Kabir",
    jobTitle: "Restricted Access",
    label: "4. Incoming Intern (Kabir — Restricted Access)",
    subtitle: "Receives intern handover (Finance hidden)",
    badge: "Incoming Intern",
    badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    workspacePath: "/handover",
    workspaceLabel: "Intern Handover Plan",
    permissionPill: "Finance Restricted",
    permissionPillColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    dotColor: "bg-cyan-400",
    icon: Users,
  },
];

export function RoleSwitcherBar() {
  const { currentRole, switchRole, bannerInfo } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const currentOpt =
    PERSONA_OPTIONS.find((opt) => opt.role === currentRole) || PERSONA_OPTIONS[1];

  // Close dropdown on outside click or escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectRole = (role: Role) => {
    switchRole(role);
    setIsOpen(false);
  };

  const handleSwitchAndGo = (e: React.MouseEvent, opt: PersonaOption) => {
    e.stopPropagation();
    switchRole(opt.role);
    setIsOpen(false);
    router.push(opt.workspacePath);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-2">
        {/* Compact Single-Line Permission Pill inside Navbar */}
        <span
          className={`hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border transition-colors select-none ${currentOpt.permissionPillColor}`}
          title={bannerInfo.scopeNotice}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${currentOpt.dotColor}`} />
          <span>{currentOpt.permissionPill}</span>
        </span>

        {/* Compact Role Selector Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border-subtle hover:border-accent-primary/40 text-xs font-mono transition-all select-none shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <span className="text-text-muted hidden sm:inline">Viewing as:</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${currentOpt.badgeColor}`}
          >
            {currentOpt.badge}
          </span>
          <span className="font-semibold text-text-primary">{currentOpt.name}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Clean Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-88 sm:w-96 rounded-xl bg-surface border border-border-subtle shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-border-subtle mb-2 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted block">
                Simulate Persona
              </span>
              <span className="text-xs text-text-secondary">
                Experience EchoBridge from 4 authentic roles
              </span>
            </div>
            <ShieldAlert className="w-4 h-4 text-accent-cyan" />
          </div>

          <div className="space-y-1.5">
            {PERSONA_OPTIONS.map((opt) => {
              const isActive = currentRole === opt.role;
              const Icon = opt.icon;

              return (
                <div
                  key={opt.role}
                  onClick={() => handleSelectRole(opt.role)}
                  className={`group p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    isActive
                      ? "bg-accent-primary/10 border-accent-primary/40 text-text-primary"
                      : "bg-canvas/50 border-border-subtle hover:bg-surface-hover hover:border-border-subtle"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-md border ${
                          isActive
                            ? "bg-accent-primary/20 border-accent-primary/40 text-accent-cyan"
                            : "bg-surface border-border-subtle text-text-muted group-hover:text-text-primary"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-text-primary">
                            {opt.label}
                          </span>
                          {isActive && (
                            <Check className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 ${opt.badgeColor}`}
                    >
                      {opt.badge}
                    </span>
                  </div>

                  <p className="text-[11px] text-text-secondary pl-7 leading-relaxed">
                    {opt.subtitle}
                  </p>

                  <div className="pl-7 pt-1 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-text-muted">
                      {opt.permissionPill}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleSwitchAndGo(e, opt)}
                      className="text-[10px] font-mono font-bold text-accent-cyan hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/20 transition-colors"
                      title={`Switch to ${opt.name} and navigate to ${opt.workspaceLabel}`}
                    >
                      <span>Workspace</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-3 pt-2.5 pb-1 mt-2 border-t border-border-subtle text-[10px] font-mono text-text-muted flex items-center justify-between">
            <span>Enforces Dual-Barrier RBAC &amp; ADR-007</span>
            <span className="text-accent-primary font-bold">1-Click Fast Switch</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Kept for backward compatibility if any legacy consumer imports RoleScopeBanner.
 * The full-width stacked banner is deprecated in UI Phase 1 in favor of the navbar pill.
 */
export function RoleScopeBanner() {
  return null;
}
