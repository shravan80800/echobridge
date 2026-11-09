"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { Role, PersonaProfile } from "@/types/echobridge.types";
import { PERSONA_PROFILES } from "@/types/echobridge.types";

export interface RolePermissionBannerInfo {
  role: Role;
  title: string;
  badge: string;
  scopeNotice: string;
  canApprove: boolean;
  canViewConfidentialFinance: boolean;
  borderClass: string;
}

export const ROLE_PERMISSION_BANNERS: Record<Role, RolePermissionBannerInfo> = {
  departing_member: {
    role: "departing_member",
    title: "Departing Lead (Aarav)",
    badge: "DEPARTING LEAD",
    scopeNotice:
      "Can connect sources, review auto-drafts, and answer unwritten rationale in the Gap-Interview. Self-approval is strictly blocked (HTTP 403 Forbidden).",
    canApprove: false,
    canViewConfidentialFinance: true,
    borderClass: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  },
  reviewer: {
    role: "reviewer",
    title: "Reviewer / Approver (Prof. Deshmukh)",
    badge: "MENTOR APPROVER",
    scopeNotice:
      "Holds sole approval authority. Inspects the Quarantine Vault, compares version diffs (v1.0 -> v1.1 -> v2.0), resolves Purple conflicts, and publishes role-specific handovers.",
    canApprove: true,
    canViewConfidentialFinance: true,
    borderClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  },
  incoming_lead: {
    role: "incoming_lead",
    title: "Incoming Team Lead (Riya)",
    badge: "INCOMING LEAD",
    scopeNotice:
      "Full-privilege view. Receives architecture, active PRs, credentials/contacts, and confidential Finance Folder data alongside Day 1/Week 1/Month 1 continuation plan.",
    canApprove: false,
    canViewConfidentialFinance: true,
    borderClass: "border-indigo-500/30 bg-indigo-500/10 text-indigo-200",
  },
  incoming_intern: {
    role: "incoming_intern",
    title: "Incoming Intern (Kabir)",
    badge: "INCOMING INTERN",
    scopeNotice:
      "Permission-scoped view. Confidential Finance Folder is withheld both pre-model and post-generation; restricted items appear only as generic placeholders.",
    canApprove: false,
    canViewConfidentialFinance: false,
    borderClass: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
  },
};

interface RoleContextValue {
  currentRole: Role;
  currentProfile: PersonaProfile;
  bannerInfo: RolePermissionBannerInfo;
  switchRole: (role: Role) => void;
  isAuditDrawerOpen: boolean;
  toggleAuditDrawer: () => void;
  openAuditDrawer: () => void;
  closeAuditDrawer: () => void;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRole] = useState<Role>("reviewer");
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);

  useEffect(() => {
    // Read persisted role from cookie or localStorage if available
    try {
      const stored = localStorage.getItem("echobridge_role") as Role | null;
      if (
        stored &&
        ["departing_member", "reviewer", "incoming_lead", "incoming_intern"].includes(
          stored
        )
      ) {
        setCurrentRole(stored);
      }
    } catch {
      // Ignore in non-browser/restricted environments
    }
  }, []);

  const switchRole = (newRole: Role) => {
    const prevRole = currentRole;
    setCurrentRole(newRole);

    try {
      localStorage.setItem("echobridge_role", newRole);
      document.cookie = `echobridge_role=${newRole}; path=/; max-age=86400; SameSite=Lax`;

      // Log role_switched event asynchronously
      fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: "CampusConnect",
          actor_role: newRole,
          actor_name: PERSONA_PROFILES[newRole].name,
          event_type: "role_switched",
          details_json: {
            from_role: prevRole,
            to_role: newRole,
            timestamp: new Date().toISOString(),
          },
        }),
      }).catch(() => {
        // Non-blocking in demo mode
      });
    } catch {
      // Non-blocking
    }
  };

  const toggleAuditDrawer = () => setIsAuditDrawerOpen((prev) => !prev);
  const openAuditDrawer = () => setIsAuditDrawerOpen(true);
  const closeAuditDrawer = () => setIsAuditDrawerOpen(false);

  const currentProfile = PERSONA_PROFILES[currentRole];
  const bannerInfo = ROLE_PERMISSION_BANNERS[currentRole];

  return (
    <RoleContext.Provider
      value={{
        currentRole,
        currentProfile,
        bannerInfo,
        switchRole,
        isAuditDrawerOpen,
        toggleAuditDrawer,
        openAuditDrawer,
        closeAuditDrawer,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
