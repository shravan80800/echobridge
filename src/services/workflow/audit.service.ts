/**
 * Audit Trail Service
 * Implements immutable audit logging for security compliance and evaluation.
 * Aligned with docs/SECURITY.md Section 6 and docs/ARCHITECTURE.md Section 4.
 */

import type { AuditEvent, AuditEventType, Role } from "@/types/echobridge.types";
import { repository } from "@/lib/supabase/repository";

export async function logAuditEvent(
  event: Omit<AuditEvent, "id" | "created_at">
): Promise<AuditEvent> {
  return repository.logAuditEvent(event);
}

export async function getAuditTrail(
  projectId = "CampusConnect",
  limit = 50
): Promise<AuditEvent[]> {
  return repository.listAuditEvents(projectId, limit);
}

export async function logRoleSwitch(
  fromRole: Role,
  toRole: Role,
  actorName: string,
  projectId = "CampusConnect"
): Promise<AuditEvent> {
  return logAuditEvent({
    project_id: projectId,
    actor_role: toRole,
    actor_name: actorName,
    event_type: "role_switched",
    details_json: {
      previous_role: fromRole,
      new_role: toRole,
      timestamp: new Date().toISOString(),
    },
  });
}
