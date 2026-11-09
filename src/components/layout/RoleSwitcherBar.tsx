"use client";

import React from "react";
import { UserCheck, Shield, Users, UserX, ChevronDown } from "lucide-react";
import { useRole } from "./RoleContext";
import type { Role } from "@/types/echobridge.types";
import { ALL_ROLES, PERSONA_PROFILES } from "@/types/echobridge.types";

const roleIconMap: Record<Role, React.ComponentType<{ className?: string }>> = {
  departing_member: UserX,
  reviewer: Shield,
  incoming_lead: UserCheck,
  incoming_intern: Users,
};

export function RoleSwitcherBar() {
  const { currentRole, switchRole } = useRole();

  return (
    <div className="flex items-center gap-1.5 p-1 rounded-lg bg-surface border border-border-subtle text-xs font-mono">
      <span className="hidden xl:inline-block px-2 text-[10px] text-text-muted font-bold tracking-wider uppercase">
        Judge Role:
      </span>

      {ALL_ROLES.map((role) => {
        const profile = PERSONA_PROFILES[role];
        const isActive = currentRole === role;
        const Icon = roleIconMap[role];

        return (
          <button
            key={role}
            type="button"
            onClick={() => switchRole(role)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all select-none focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
              isActive
                ? "bg-accent-primary text-white font-bold shadow-sm shadow-indigo-500/30"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
            }`}
            title={`Switch to ${profile.title} (${profile.name})`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline-block">{profile.name}</span>
            <span className="inline-block sm:hidden text-[10px]">
              {profile.badge.split(" ")[0]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function RoleScopeBanner() {
  const { bannerInfo, currentProfile } = useRole();

  return (
    <div
      role="region"
      aria-label="Active Persona and Scope"
      className={`w-full py-2 px-4 md:px-8 border-b text-xs flex flex-wrap items-center justify-between gap-2 transition-colors ${bannerInfo.borderClass}`}
    >
      <div className="flex items-center gap-2">
        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-black/40 border border-current">
          {bannerInfo.badge}
        </span>
        <span className="font-semibold text-text-primary">
          {currentProfile.name} ({currentProfile.title}):
        </span>
        <span className="opacity-90">{bannerInfo.scopeNotice}</span>
      </div>

      <div className="flex items-center gap-3 text-[11px] font-mono shrink-0">
        <span className="flex items-center gap-1">
          <span
            className={`w-2 h-2 rounded-full ${
              bannerInfo.canApprove ? "bg-emerald-400" : "bg-rose-400"
            }`}
          />
          {bannerInfo.canApprove ? "Approval Authority" : "No Self-Approval"}
        </span>

        <span className="flex items-center gap-1">
          <span
            className={`w-2 h-2 rounded-full ${
              bannerInfo.canViewConfidentialFinance
                ? "bg-emerald-400"
                : "bg-slate-400"
            }`}
          />
          {bannerInfo.canViewConfidentialFinance
            ? "Finance Access"
            : "Finance Restricted"}
        </span>
      </div>
    </div>
  );
}
