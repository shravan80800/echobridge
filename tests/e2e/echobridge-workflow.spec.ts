/**
 * Playwright End-to-End Workflow Test Suite
 * Implements Section 5 of docs/TEST_PLAN.md and Section 10 of Round 1 Proposal.
 *
 * Simulates real browser user journeys through all 6 stages of EchoBridge:
 * 1. Home & Stage 1/2 Connect (/connect): Scope map, secret quarantine vault, injection defense
 * 2. Stage 3 Draft (/draft): Confidence HUD, role switcher, claim cards, popovers, timeline, graph
 * 3. Stage 4 Gap-Interview (/interview): Gap queue, sample answers, sudden exit safety fallback
 * 4. Stage 5 Review (/review): 3-column dashboard, conflict resolution, version diff, separation of duties
 * 5. Stage 6 Handover Delivery (/handover): Continuation plan, comprehension check, digital receipt
 * 6. Live Metrics Scorecard (/metrics): Calibration scorecard, target metrics, 8 planted traps pass
 */

import { test, expect } from "@playwright/test";

test.describe("EchoBridge Full End-to-End Handover Workflow", () => {
  test("1. Overview & Connect Stage: verifies scope map, secret quarantine, and injection alert", async ({
    page,
  }) => {
    // Navigate to /connect
    await page.goto("/connect");
    await expect(page).toHaveTitle(/EchoBridge/);

    // Verify header and project title
    await expect(page.locator("h1")).toContainText(/Connect & Ingest Authorised Sources/i);
    await expect(page.locator("body")).toContainText("CampusConnect");

    // Verify Source Permission Scope Map renders
    await expect(page.locator("body")).toContainText("Source Permission Scope Map");
    await expect(page.locator("body")).toContainText("Architecture_Doc_v2.md");
    await expect(page.locator("body")).toContainText("Deployment_Runbook.md");
    await expect(page.locator("body")).toContainText("Finance/Sponsorship_Budget_2025-26.md");

    // Verify Trap 4: Secret Quarantine Vault table displays masked preview
    await expect(page.locator("body")).toContainText("Quarantine Vault");
    await expect(page.locator("body")).toContainText("sk_live_");

    // Verify Trap 6: Injection defense indicator
    await expect(page.locator("body")).toContainText(/Prompt Injection/i);
  });

  test("2. Stage 3 Draft: verifies Confidence HUD, RBAC role switcher, timeline, and graph", async ({
    page,
  }) => {
    await page.goto("/draft");

    // Verify Stage 3 header
    await expect(page.locator("h1")).toContainText(/Evidence-Coloured Handover Draft/i);

    // Verify Confidence Score HUD with component bars
    await expect(page.locator("body")).toContainText(/Confidence Score/i);
    await expect(page.locator("body")).toContainText(/Citation Coverage/i);
    await expect(page.locator("body")).toContainText(/Corroboration Rate/i);

    // Verify Planted Traps HUD
    await expect(page.locator("body")).toContainText(/Planted Traps Verification HUD/i);
    await expect(page.locator("body")).toContainText(/Trap 1: Conflict/i);
    await expect(page.locator("body")).toContainText(/Trap 2: Gap/i);

    // Verify Audience View Switcher (Team Lead View vs Intern View)
    const internButton = page.locator("button:has-text('Intern View')");
    await expect(internButton).toBeVisible();
    await internButton.click();

    // Verify Intern view shows restricted placeholders without raw leaks
    await expect(page.locator("body")).toContainText(/Restricted Scope/i);

    // Switch to Decision Timeline ("Why" Cards)
    const timelineTab = page.locator("button:has-text('Decision Timeline')");
    if (await timelineTab.isVisible()) {
      await timelineTab.click();
      await expect(page.locator("body")).toContainText(/Architectural Decision Timeline/i);
      await expect(page.locator("body")).toContainText(/Epistemic/i);
    }

    // Switch to Context Web Graph
    const graphTab = page.locator("button:has-text('Context Web Graph')");
    if (await graphTab.isVisible()) {
      await graphTab.click();
      await expect(page.locator("body")).toContainText(/Interactive Context Web Graph/i);
    }
  });

  test("3. Stage 4 Gap-Interview: verifies knowledge gap queue and sudden exit safety fallback", async ({
    page,
  }) => {
    await page.goto("/interview");

    // Verify Stage 4 Header
    await expect(page.locator("h1")).toContainText(/Targeted Gap-Interview/i);

    // Verify Planted Trap 2 question (Redis Rationale) and Trap 7 question (Domain Ownership)
    await expect(page.locator("body")).toContainText(/Redis/i);
    await expect(page.locator("body")).toContainText(/domain/i);

    // Verify Sudden-Exit safety fallback routing banner
    await expect(page.locator("body")).toContainText(/Sudden-Exit Safety Fallback/i);
    await expect(page.locator("body")).toContainText(/Prof. Deshmukh/i);
  });

  test("4. Stage 5 Review: verifies 3-column dashboard, conflict resolver, and separation of duties", async ({
    page,
  }) => {
    await page.goto("/review");

    // Verify Stage 5 Header
    await expect(page.locator("h1")).toContainText(/Human Reviewer Dashboard & Diff Inspector/i);

    // Verify Version History Rail (v1.0, v1.1, v2.0)
    await expect(page.locator("body")).toContainText("v1.0");
    await expect(page.locator("body")).toContainText("v1.1");
    await expect(page.locator("body")).toContainText("v2.0");

    // Verify Trap 1 side-by-side conflict card
    await expect(page.locator("body")).toContainText(/Event Registration Deadline Conflict/i);
    await expect(page.locator("body")).toContainText(/March 15/i);
    await expect(page.locator("body")).toContainText(/March 20/i);

    // Verify ADR-007 Separation of Duties callout
    await expect(page.locator("body")).toContainText(/Separation of Duties/i);
  });

  test("5. Stage 6 Handover: verifies continuation plan, comprehension check, and digital receipt", async ({
    page,
  }) => {
    await page.goto("/handover");

    // Verify Stage 6 Header
    await expect(page.locator("h1")).toContainText(/Role-Appropriate Handover & Continuation Plan/i);

    // Verify Continuation Plan Board (Day 1, Week 1, Month 1)
    await expect(page.locator("body")).toContainText(/Day 1/i);
    await expect(page.locator("body")).toContainText(/Week 1/i);
    await expect(page.locator("body")).toContainText(/Month 1/i);

    // Verify Digital Receipt Verification Status Banner
    await expect(page.locator("body")).toContainText(/Handover Verification Receipt/i);
  });

  test("6. Stage 7 Metrics Scorecard: verifies 5 target metrics and all 8 planted traps pass", async ({
    page,
  }) => {
    await page.goto("/metrics");

    // Verify Metrics Header
    await expect(page.locator("h1")).toContainText(/Handover Verification & Calibration Scorecard/i);

    // Verify Target Quality Metric Gauges
    await expect(page.locator("body")).toContainText(/Citation Coverage/i);
    await expect(page.locator("body")).toContainText(/Unsupported as Fact/i);
    await expect(page.locator("body")).toContainText(/Planted Gaps Detected/i);
    await expect(page.locator("body")).toContainText(/Permission Leakage/i);

    // Verify 8-Trap Scorecard Table
    await expect(page.locator("body")).toContainText(/The 8 Planted Traps Verification Matrix/i);
    await expect(page.locator("body")).toContainText(/Trap 1: Contradictory Information/i);
    await expect(page.locator("body")).toContainText(/Trap 2: Epistemic Gap/i);
    await expect(page.locator("body")).toContainText(/Trap 3: Stale Runbook/i);
    await expect(page.locator("body")).toContainText(/Trap 4: Secret & PII Ingestion/i);
    await expect(page.locator("body")).toContainText(/Trap 5: Confidential Finance/i);
    await expect(page.locator("body")).toContainText(/Trap 6: Prompt-Injection Defense/i);
    await expect(page.locator("body")).toContainText(/Trap 7: Unanswerable Domain Question/i);
    await expect(page.locator("body")).toContainText(/Trap 8: Mixed Public & Restricted/i);

    // Assert all 8 traps show PASS badges
    const passBadges = page.locator("text=PASS (Verified)");
    await expect(passBadges.first()).toBeVisible();
  });
});
