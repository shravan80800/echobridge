"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { Role, PersonaProfile, Project } from "@/types/echobridge.types";
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

export const DEFAULT_CAMPUSCONNECT_PROJECT: Project = {
  id: "CampusConnect",
  name: "CampusConnect",
  description:
    "Synthetic multi-modal college event club portal benchmark workspace.",
  freshness_threshold_days: 180,
  created_at: "2026-03-01T00:00:00Z",
};

const STORAGE_PROJECT_ID_KEY = "echobridge_active_project_id";
const STORAGE_PROJECT_NAME_KEY = "echobridge_active_project_name";

interface RoleContextValue {
  currentRole: Role;
  currentProfile: PersonaProfile;
  bannerInfo: RolePermissionBannerInfo;
  switchRole: (role: Role) => void;
  isAuditDrawerOpen: boolean;
  toggleAuditDrawer: () => void;
  openAuditDrawer: () => void;
  closeAuditDrawer: () => void;
  activeProjectId: string;
  activeProjectName: string;
  projects: Project[];
  workspaceRevision: number;
  refreshProjects: () => Promise<Project[]>;
  setActiveProject: (projectId: string, projectName?: string) => void;
  deleteProject: (projectId: string) => Promise<void>;
  resetAllWorkspaces: () => Promise<void>;
}

const DEFAULT_ROLE_CONTEXT: RoleContextValue = {
  currentRole: "reviewer",
  currentProfile: PERSONA_PROFILES.reviewer,
  bannerInfo: ROLE_PERMISSION_BANNERS.reviewer,
  switchRole: () => {},
  isAuditDrawerOpen: false,
  toggleAuditDrawer: () => {},
  openAuditDrawer: () => {},
  closeAuditDrawer: () => {},
  activeProjectId: "CampusConnect",
  activeProjectName: "CampusConnect",
  projects: [DEFAULT_CAMPUSCONNECT_PROJECT],
  workspaceRevision: 0,
  refreshProjects: async () => [DEFAULT_CAMPUSCONNECT_PROJECT],
  setActiveProject: () => {},
  deleteProject: async () => {},
  resetAllWorkspaces: async () => {},
};

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

function clearProjectStorage(): void {
  try {
    localStorage.removeItem(STORAGE_PROJECT_ID_KEY);
    localStorage.removeItem(STORAGE_PROJECT_NAME_KEY);
  } catch {
    // Ignore storage failure
  }
}

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRole] = useState<Role>("reviewer");
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string>("CampusConnect");
  const [activeProjectName, setActiveProjectName] =
    useState<string>("CampusConnect");
  const [projects, setProjects] = useState<Project[]>([
    DEFAULT_CAMPUSCONNECT_PROJECT,
  ]);
  const [workspaceRevision, setWorkspaceRevision] = useState<number>(0);

  const refreshProjects = useCallback(async (): Promise<Project[]> => {
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const json = await res.json();
      if (json?.success && Array.isArray(json.projects) && json.projects.length > 0) {
        const fetched = json.projects as Project[];
        setProjects(fetched);
        return fetched;
      }
    } catch {
      // Keep current projects list cleanly in offline/test contexts
    }
    return [DEFAULT_CAMPUSCONNECT_PROJECT];
  }, []);

  useEffect(() => {
    let initialProjectId = "CampusConnect";
    try {
      const storedRole = localStorage.getItem("echobridge_role") as Role | null;
      if (
        storedRole &&
        [
          "departing_member",
          "reviewer",
          "incoming_lead",
          "incoming_intern",
        ].includes(storedRole)
      ) {
        setCurrentRole(storedRole);
      }

      const storedProjectId = localStorage.getItem(STORAGE_PROJECT_ID_KEY);
      const storedProjectName = localStorage.getItem(STORAGE_PROJECT_NAME_KEY);
      if (storedProjectId && storedProjectId.trim()) {
        initialProjectId = storedProjectId.trim();
        setActiveProjectId(initialProjectId);
        setActiveProjectName(storedProjectName?.trim() || initialProjectId);
      }
    } catch {
      // Ignore in non-browser/restricted environments
    }

    refreshProjects().then((fetched) => {
      const matched = fetched.find((p) => p.id === initialProjectId);
      if (matched) {
        setActiveProjectName(matched.name);
        try {
          localStorage.setItem(STORAGE_PROJECT_NAME_KEY, matched.name);
        } catch {
          // Ignore storage error
        }
      } else if (
        initialProjectId !== "CampusConnect" &&
        fetched.some((p) => p.id === "CampusConnect")
      ) {
        // Fallback safely if ephemeral workspace expired across cold restarts
        setActiveProjectId("CampusConnect");
        setActiveProjectName("CampusConnect");
        try {
          localStorage.setItem(STORAGE_PROJECT_ID_KEY, "CampusConnect");
          localStorage.setItem(STORAGE_PROJECT_NAME_KEY, "CampusConnect");
        } catch {
          // Ignore storage error
        }
      }
    });
  }, [refreshProjects]);

  const setActiveProject = useCallback(
    (projectId: string, projectName?: string) => {
      const nextId = projectId?.trim() || "CampusConnect";
      const matched = projects.find((p) => p.id === nextId);
      const nextName = projectName?.trim() || matched?.name || nextId;

      setActiveProjectId(nextId);
      setActiveProjectName(nextName);

      if (nextId === "CampusConnect") {
        clearProjectStorage();
      } else {
        try {
          localStorage.setItem(STORAGE_PROJECT_ID_KEY, nextId);
          localStorage.setItem(STORAGE_PROJECT_NAME_KEY, nextName);
        } catch {
          // Ignore storage failure
        }
      }
    },
    [projects]
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      if (!projectId || projectId === "CampusConnect") return;
      try {
        const res = await fetch(
          `/api/projects?projectId=${encodeURIComponent(projectId)}`,
          { method: "DELETE", cache: "no-store" }
        );
        const json = await res.json();
        if (json?.success && Array.isArray(json.projects)) {
          setProjects(json.projects as Project[]);
        } else {
          setProjects((prev) => prev.filter((p) => p.id !== projectId));
        }

        if (activeProjectId === projectId) {
          clearProjectStorage();
          setActiveProjectId("CampusConnect");
          setActiveProjectName("CampusConnect");
          setWorkspaceRevision((v) => v + 1);
        }
      } catch {
        // Ignore network hiccup
      }
    },
    [activeProjectId]
  );

  const resetAllWorkspaces = useCallback(async () => {
    try {
      const res = await fetch("/api/projects?projectId=all", {
        method: "DELETE",
        cache: "no-store",
      });
      const json = await res.json();
      if (json?.success && Array.isArray(json.projects)) {
        setProjects(json.projects as Project[]);
      } else {
        setProjects([DEFAULT_CAMPUSCONNECT_PROJECT]);
      }
    } catch {
      setProjects([DEFAULT_CAMPUSCONNECT_PROJECT]);
    } finally {
      clearProjectStorage();
      setActiveProjectId("CampusConnect");
      setActiveProjectName("CampusConnect");
      setWorkspaceRevision((v) => v + 1);
    }
  }, []);

  const switchRole = (newRole: Role) => {
    const prevRole = currentRole;
    setCurrentRole(newRole);

    try {
      localStorage.setItem("echobridge_role", newRole);
      document.cookie = `echobridge_role=${newRole}; path=/; max-age=86400; SameSite=Lax`;

      fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: activeProjectId,
          actor_role: newRole,
          actor_name: PERSONA_PROFILES[newRole].name,
          event_type: "role_switched",
          details_json: {
            from_role: prevRole,
            to_role: newRole,
            project_id: activeProjectId,
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
        activeProjectId,
        activeProjectName,
        projects,
        workspaceRevision,
        refreshProjects,
        setActiveProject,
        deleteProject,
        resetAllWorkspaces,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  const context = useContext(RoleContext);
  return context ?? DEFAULT_ROLE_CONTEXT;
}
