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
} from "lucide-react";
import { useRole } from "./RoleContext";
import type { Role } from "@/types/echobridge.types";

interface PersonaOption {
  role: Role;
  name: string;
  shortName: string;
  shortRole: string;
  label: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  workspacePath: string;
  workspaceLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PERSONA_OPTIONS: PersonaOption[] = [
  {
    role: "departing_member",
    name: "Aarav",
    shortName: "Aarav",
    shortRole: "Departing",
    label: "Aarav Sharma — Departing Developer",
    subtitle: "Connects project files and answers gap questions.",
    badge: "Departing",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    workspacePath: "/connect",
    workspaceLabel: "Open Sources",
    icon: UserX,
  },
  {
    role: "reviewer",
    name: "Prof. Deshmukh",
    shortName: "Deshmukh",
    shortRole: "Mentor",
    label: "Prof. Deshmukh — Mentor / Approver",
    subtitle: "Checks citations, resolves conflicts, and approves.",
    badge: "Mentor",
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
    workspacePath: "/review",
    workspaceLabel: "Open Review",
    icon: Shield,
  },
  {
    role: "incoming_lead",
    name: "Riya",
    shortName: "Riya",
    shortRole: "Team Lead",
    label: "Riya Patel — Incoming Team Lead",
    subtitle: "Receives full handover including budget and finance.",
    badge: "Team Lead",
    badgeColor: "bg-blue-50 text-blue-800 border-blue-200",
    workspacePath: "/handover",
    workspaceLabel: "View Handover",
    icon: UserCheck,
  },
  {
    role: "incoming_intern",
    name: "Kabir",
    shortName: "Kabir",
    shortRole: "Intern",
    label: "Kabir Mehta — Incoming Intern",
    subtitle: "Receives onboarding plan with finance hidden.",
    badge: "Intern",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-300",
    workspacePath: "/handover",
    workspaceLabel: "View Handover",
    icon: Users,
  },
];

export function RoleSwitcherBar() {
  const { currentRole, switchRole } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const currentOpt =
    PERSONA_OPTIONS.find((opt) => opt.role === currentRole) ||
    PERSONA_OPTIONS[1];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
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
      {/* Clean White Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-3 min-h-[36px] rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-xs sm:text-sm font-sans text-slate-800 shadow-sm cursor-pointer transition-colors select-none whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-1"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="text-slate-500 font-normal">Role:</span>
        <span className="font-semibold text-slate-900 sm:hidden">
          {currentOpt.shortName}
        </span>
        <span className="hidden sm:inline font-semibold text-slate-900">
          {currentOpt.name} ({currentOpt.shortRole})
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Clean Light Mode Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl bg-white border border-slate-200 shadow-lg p-2 z-50">
          <div className="px-2.5 py-2 border-b border-slate-100 mb-1.5">
            <span className="text-xs font-semibold text-slate-900 block">
              Switch Active Role
            </span>
            <span className="text-xs text-slate-500">
              Preview access permissions and handover views
            </span>
          </div>

          <div className="space-y-1">
            {PERSONA_OPTIONS.map((opt) => {
              const isActive = currentRole === opt.role;
              const Icon = opt.icon;

              return (
                <div
                  key={opt.role}
                  onClick={() => handleSelectRole(opt.role)}
                  className={`p-2.5 rounded-lg border transition-colors cursor-pointer flex flex-col gap-1.5 ${
                    isActive
                      ? "bg-teal-50/70 border-teal-200"
                      : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? "text-teal-700" : "text-slate-500"
                        }`}
                      />
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {opt.label}
                      </span>
                      {isActive && (
                        <Check className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                      )}
                    </div>

                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0 cursor-default ${opt.badgeColor}`}
                    >
                      {opt.badge}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 pl-6 leading-snug">
                    {opt.subtitle}
                  </p>

                  <div className="pl-6 pt-0.5">
                    <button
                      type="button"
                      onClick={(e) => handleSwitchAndGo(e, opt)}
                      className="text-xs font-medium text-teal-700 hover:text-teal-800 inline-flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span>{opt.workspaceLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Kept for backward compatibility if any legacy consumer imports RoleScopeBanner.
 */
export function RoleScopeBanner() {
  return null;
}
