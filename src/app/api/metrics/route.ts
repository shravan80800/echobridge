/**
 * Metrics & Calibration API Route Handler
 * Implements Section 10 of Round 1 Proposal and TASKS.md TASK-022.
 *
 * GET: Computes and returns real-time system metrics, 8-trap verification results,
 *      citation coverage, permission leakage, and audit counts.
 */

import { NextRequest, NextResponse } from "next/server";
import { computeSystemMetrics } from "@/services/trust/metrics.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") || "CampusConnect";

    const report = await computeSystemMetrics(projectId);

    return NextResponse.json({
      success: true,
      ...report,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to compute system metrics",
      },
      { status: 500 }
    );
  }
}
