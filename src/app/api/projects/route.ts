/**
 * Projects Listing, Removal & Full Pipeline Reset API Route Handler
 * Lists active handover workspaces, removes custom imported workspaces,
 * and resets the pipeline cleanly back to the CampusConnect baseline seed.
 */

import { NextRequest, NextResponse } from "next/server";
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId")?.trim() || "";

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "projectId query parameter is required." },
        { status: 400 }
      );
    }

    if (projectId === "all" || projectId === "CampusConnect") {
      await repository.resetAllWorkspaces();
      const projects = await repository.listProjects();
      return NextResponse.json({
        success: true,
        activeProjectId: "CampusConnect",
        projects,
        message: "Pipeline reset cleanly to the fresh CampusConnect demo baseline.",
      });
    }

    await repository.deleteProjectWorkspace(projectId);
    const projects = await repository.listProjects();

    return NextResponse.json({
      success: true,
      activeProjectId: "CampusConnect",
      deletedProjectId: projectId,
      projects,
      message: `Workspace "${projectId}" removed.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to reset/delete project",
      },
      { status: 500 }
    );
  }
}
