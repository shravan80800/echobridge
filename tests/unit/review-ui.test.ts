import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ConflictResolutionCard } from "@/components/review/ConflictResolutionCard";
import { VersionDiffViewer } from "@/components/review/VersionDiffViewer";
import { ClaimReviewActionPanel } from "@/components/review/ClaimReviewActionPanel";
import type { ClaimRecord } from "@/types/echobridge.types";
import type { VersionDiffSummary } from "@/services/workflow/review.service";

describe("Stage 5 UI: Reviewer Dashboard, Diff Inspector & Conflict Resolution (TASK-020)", () => {
  const conflictingClaim: ClaimRecord = {
    id: "CLM-TRAP-1",
    draft_version_id: "DV-LEAD-V1.0",
    project_id: "CampusConnect",
    audience_role: "incoming_lead",
    section: "decisions",
    claim_type: "decision",
    text: "Event registration deadline conflict between chat discussion (15 Mar) and planning document (20 Mar).",
    evidence_state: "conflicting",
    evidence: [],
    audience_acl: ["incoming_lead", "incoming_intern"],
    planted_trap_id: 1,
    review: { status: "pending" },
    conflict_pair: {
      entity_attribute: "event_registration_deadline",
      side_a: {
        value: "15 Mar 2026 at midnight",
        author: "Maya Patel",
        timestamp: "2026-03-02T16:00:00Z",
        source_id: "SRC-CHAT-03",
        source_title: "Team Chat March",
        quoted_span: "event registration closes on March 15th at midnight",
        chunk_id: "CHK-03",
      },
      side_b: {
        value: "20 Mar 2026 to allow late entries",
        author: "Aarav Sharma",
        timestamp: "2026-03-10T09:00:00Z",
        source_id: "SRC-PLAN-04",
        source_title: "Planning Doc v1.2",
        quoted_span: "event registration closes on March 20th to allow late entries",
        chunk_id: "CHK-04",
      },
    },
  };

  const sampleDiff: VersionDiffSummary = {
    fromVersion: "v1.0",
    toVersion: "v1.1",
    audienceRole: "incoming_lead",
    addedCount: 0,
    removedCount: 0,
    modifiedCount: 1,
    unchangedCount: 8,
    totalCount: 9,
    confidenceScoreChange: {
      from: 76,
      to: 84,
      delta: 8,
    },
    items: [
      {
        claimId: "CLM-TRAP-2",
        changeType: "modified",
        textDiff: {
          oldText: "Redis was chosen over Postgres for caching session data.",
          newText:
            "Redis was chosen over Postgres for caching session data. [Attested by Aarav: Free hosting tier connection limits].",
          isModified: true,
        },
        stateDiff: {
          oldState: "unsupported",
          newState: "attested",
          isModified: true,
        },
        reviewDiff: {
          oldStatus: "pending",
          newStatus: "pending",
          isModified: false,
        },
      },
    ],
  };

  describe("ConflictResolutionCard", () => {
    it("renders Side A and Side B side-by-side with authors and timestamps", () => {
      const html = renderToStaticMarkup(
        React.createElement(ConflictResolutionCard, {
          claim: conflictingClaim,
          isReviewer: true,
          onResolve: async () => {},
        })
      );

      expect(html).toContain("Trap 1: Authoritative Conflict Resolution");
      expect(html).toContain("Side A (Chat Discussion)");
      expect(html).toContain("15 Mar 2026 at midnight");
      expect(html).toContain("Maya Patel");
      expect(html).toContain("Side B (Planning Document)");
      expect(html).toContain("20 Mar 2026 to allow late entries");
      expect(html).toContain("Aarav Sharma");
      expect(html).toContain("Approve Side B (March 20th - Planning Doc)");
    });

    it("displays message restricting conflict resolution when not reviewer", () => {
      const html = renderToStaticMarkup(
        React.createElement(ConflictResolutionCard, {
          claim: conflictingClaim,
          isReviewer: false, // Departing lead / read-only
          onResolve: async () => {},
        })
      );

      expect(html).toContain("Only");
      expect(html).toContain("Prof. Deshmukh (Reviewer)");
      expect(html).toContain("has authority to resolve conflicting claims");
      expect(html).not.toContain("Approve Side B (March 20th - Planning Doc)");
    });
  });

  describe("VersionDiffViewer", () => {
    it("renders diff statistics banner and inline Git-style changes", () => {
      const html = renderToStaticMarkup(
        React.createElement(VersionDiffViewer, {
          diff: sampleDiff,
          fromVersion: "v1.0",
          toVersion: "v1.1",
          onSelectVersions: () => {},
        })
      );

      expect(html).toContain("Modified Claims");
      expect(html).toContain("~1");
      expect(html).toContain("Confidence Delta");
      expect(html).toContain("84%");
      expect(html).toContain("+8%");
      expect(html).toContain("v1.0:");
      expect(html).toContain("v1.1:");
      expect(html).toContain("UNSUPPORTED GAP");
      expect(html).toContain("ATTESTED");
    });
  });

  describe("ClaimReviewActionPanel", () => {
    it("renders separation of duties banner and locked button for departing lead", () => {
      const html = renderToStaticMarkup(
        React.createElement(ClaimReviewActionPanel, {
          selectedClaim: conflictingClaim,
          isReviewer: false,
          actorRoleName: "Aarav Sharma (Departing Lead)",
          onReviewClaim: async () => {},
          onApproveHandover: async () => {},
        })
      );

      expect(html).toContain("Separation of Duties (ADR-007)");
      expect(html).toContain("Aarav Sharma (Departing Lead)");
      expect(html).toContain("Locked (Reviewer Only)");
    });

    it("renders authorized reviewer actions and active approval CTA for reviewer", () => {
      const html = renderToStaticMarkup(
        React.createElement(ClaimReviewActionPanel, {
          selectedClaim: conflictingClaim,
          isReviewer: true,
          actorRoleName: "Prof. Deshmukh (Mentor Reviewer)",
          onReviewClaim: async () => {},
          onApproveHandover: async () => {},
        })
      );

      expect(html).toContain("Authorized Reviewer:");
      expect(html).toContain("Prof. Deshmukh (Mentor Reviewer)");
      expect(html).toContain("Approve");
      expect(html).toContain("Edit");
      expect(html).toContain("Redact");
      expect(html).toContain("Reject");
      expect(html).toContain("Approve &amp; Publish Handover (v2.0)");
    });
  });
});
