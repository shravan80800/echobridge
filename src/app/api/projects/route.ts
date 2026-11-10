/**
 * Projects Listing API Route Handler
 * Lists all active handover workspaces (always including default "CampusConnect"
 * plus any isolated live GitHub / Google Doc project workspaces).
 */

import { NextResponse } from "next/server";
import { repository } from "@/lib/supabase/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const projects = await repository.listProjects();
    return NextResponse.json({
      success: true,
      projects,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list projects",
      },
      { status: 500 }
    );
  }
}
