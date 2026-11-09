import { describe, it, expect, beforeEach } from "vitest";
import { repository } from "@/lib/supabase/repository";
import {
  logAuditEvent,
  getAuditTrail,
  logRoleSwitch,
} from "@/services/workflow/audit.service";
import { GET, POST } from "@/app/api/audit/route";
import { NextRequest } from "next/server";
import {
  ROLE_PERMISSION_BANNERS,
  type RolePermissionBannerInfo,
} from "@/components/layout/RoleContext";
import { ALL_ROLES } from "@/types/echobridge.types";

describe("Audit Trail Service & Role Permissions", () => {
  beforeEach(() => {
    repository.resetInMemoryStore(false);
  });

  it("logs an audit event with timestamp and generated ID", async () => {
    const event = await logAuditEvent({
      project_id: "CampusConnect",
      actor_role: "reviewer",
      actor_name: "Prof. Deshmukh",
      event_type: "handover_approved",
      details_json: { version: "v2.0", audience: "incoming_lead" },
    });

    expect(event.id).toMatch(/^AUD-/);
    expect(event.event_type).toBe("handover_approved");
    expect(event.actor_role).toBe("reviewer");
    expect(event.created_at).toBeDefined();

    const trail = await getAuditTrail("CampusConnect");
    expect(trail).toHaveLength(1);
    expect(trail[0].id).toBe(event.id);
  });

  it("records role_switched event when switching personas", async () => {
    const event = await logRoleSwitch(
      "departing_member",
      "incoming_intern",
      "Kabir Das",
      "CampusConnect"
    );

    expect(event.event_type).toBe("role_switched");
    expect(event.actor_role).toBe("incoming_intern");
    expect(event.details_json.previous_role).toBe("departing_member");
    expect(event.details_json.new_role).toBe("incoming_intern");
  });

  it("handles GET /api/audit route handler", async () => {
    await logAuditEvent({
      project_id: "CampusConnect",
      actor_role: "departing_member",
      actor_name: "Aarav Sharma",
      event_type: "source_connected",
      details_json: { count: 8 },
    });

    const request = new NextRequest("http://localhost:3000/api/audit?projectId=CampusConnect");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.events).toHaveLength(1);
    expect(body.events[0].event_type).toBe("source_connected");
  });

  it("handles POST /api/audit route handler for valid payload", async () => {
    const request = new NextRequest("http://localhost:3000/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: "CampusConnect",
        actor_role: "reviewer",
        actor_name: "Prof. Deshmukh",
        event_type: "claim_reviewed",
        details_json: { claim_id: "CLM-001", action: "approved" },
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.event.event_type).toBe("claim_reviewed");
  });

  it("handles POST /api/audit validation error when fields are missing", async () => {
    const request = new NextRequest("http://localhost:3000/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: "CampusConnect",
        // missing actor_role, actor_name, event_type
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("enforces strict role permission configurations across all personas", () => {
    for (const role of ALL_ROLES) {
      const banner = ROLE_PERMISSION_BANNERS[role];
      expect(banner).toBeDefined();
      expect(banner.badge.length).toBeGreaterThan(0);
      expect(banner.scopeNotice.length).toBeGreaterThan(0);
    }

    // Reviewer is the ONLY persona with approval authority
    expect(ROLE_PERMISSION_BANNERS.reviewer.canApprove).toBe(true);
    expect(ROLE_PERMISSION_BANNERS.departing_member.canApprove).toBe(false);
    expect(ROLE_PERMISSION_BANNERS.incoming_lead.canApprove).toBe(false);
    expect(ROLE_PERMISSION_BANNERS.incoming_intern.canApprove).toBe(false);

    // Incoming Intern is the ONLY persona with confidential finance data withheld
    expect(ROLE_PERMISSION_BANNERS.incoming_intern.canViewConfidentialFinance).toBe(
      false
    );
    expect(ROLE_PERMISSION_BANNERS.incoming_lead.canViewConfidentialFinance).toBe(
      true
    );
    expect(ROLE_PERMISSION_BANNERS.reviewer.canViewConfidentialFinance).toBe(true);
  });
});
