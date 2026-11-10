import { NextRequest, NextResponse } from "next/server";
import { getAuditTrail, logAuditEvent } from "@/services/workflow/audit.service";
import type { AuditEventType, Role } from "@/types/echobridge.types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get("projectId") || "CampusConnect";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const events = await getAuditTrail(projectId, limit);
    return NextResponse.json({ success: true, events });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch audit events",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id = "CampusConnect",
      actor_role,
      actor_name,
      event_type,
      details_json = {},
    } = body;

    if (!actor_role || !actor_name || !event_type) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: actor_role, actor_name, event_type",
        },
        { status: 400 }
      );
    }

    const event = await logAuditEvent({
      project_id,
      actor_role: actor_role as Role,
      actor_name,
      event_type: event_type as AuditEventType,
      details_json,
    });

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to log audit event",
      },
      { status: 500 }
    );
  }
}
