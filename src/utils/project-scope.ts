import type { AudienceRole, VersionLabel } from "@/types/echobridge.types";

/**
 * Returns a stable uppercase slug for non-default projects so draft/claim/gap IDs
 * never collide with CampusConnect seed rows in PostgreSQL or in-memory maps.
 */
export function getProjectTag(projectId: string): string {
  if (!projectId || projectId === "CampusConnect") return "";
  const cleaned = projectId
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  return cleaned ? `${cleaned}-` : "";
}

export function buildDraftVersionId(
  projectId: string,
  audienceRole: AudienceRole,
  versionLabel: VersionLabel
): string {
  const roleTag = audienceRole === "incoming_lead" ? "LEAD" : "INT";
  const prefix = getProjectTag(projectId);
  return `DFT-${prefix}${roleTag}-${versionLabel}`;
}

export function buildScopedClaimId(
  prefix: "CLM-CUSTOM" | "CLM-GEN",
  projectId: string,
  audienceRole: AudienceRole,
  suffix: string | number
): string {
  const roleTag = audienceRole === "incoming_lead" ? "LEAD" : "INT";
  const tag = getProjectTag(projectId);
  return `${prefix}-${tag}${roleTag}-${suffix}`;
}

export function buildScopedGapId(projectId: string, index: number): string {
  const tag = getProjectTag(projectId);
  return `GAP-${tag}${String(index).padStart(2, "0")}`;
}
