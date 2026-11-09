import { describe, it, expect, beforeEach } from "vitest";
import { repository } from "@/lib/supabase/repository";
import type {
  Chunk,
  DraftVersion,
  ClaimRecord,
  GapQuestion,
  Receipt,
  Source,
} from "@/types/echobridge.types";
import { CONFIDENCE_WEIGHTS } from "@/types/echobridge.types";

describe("EchoBridge Dual-Mode Repository (In-Memory Fallback)", () => {
  const projectId = "CampusConnect";

  beforeEach(() => {
    repository.resetInMemoryStore(false);
  });

  it("reports fallback in-memory mode when Supabase env vars are unset or placeholders", () => {
    // In local test suite, Supabase env vars are not set to real instances
    expect(repository.isConfigured()).toBe(false);
  });

  it("retrieves the default initialized CampusConnect project", async () => {
    const project = await repository.getProject(projectId);
    expect(project).toBeDefined();
    expect(project?.id).toBe("CampusConnect");
    expect(project?.freshness_threshold_days).toBe(180);
  });

  it("enforces Pre-Model RBAC: withholds restricted chunks from intern audience", async () => {
    const publicChunk: Chunk = {
      id: "CHK-PUB-1",
      project_id: projectId,
      source_id: "SRC-1",
      content: "Next.js 15 App Router deployment guide.",
      author: "Maya",
      chunk_timestamp: "2026-03-01T10:00:00Z",
      allowed_roles: ["incoming_lead", "incoming_intern"],
      injection_flagged: false,
      redaction_count: 0,
    };

    const financeChunk: Chunk = {
      id: "CHK-FIN-1",
      project_id: projectId,
      source_id: "SRC-2",
      content: "Confidential sponsorship budget and club bank account signatories.",
      author: "Aarav",
      chunk_timestamp: "2026-03-02T10:00:00Z",
      allowed_roles: ["incoming_lead"], // Restricted to Team Lead only
      injection_flagged: false,
      redaction_count: 0,
    };

    await repository.createChunks([publicChunk, financeChunk]);

    // Team Lead retrieval receives BOTH public and finance chunks
    const leadChunks = await repository.searchChunksForAudience(
      projectId,
      "incoming_lead"
    );
    expect(leadChunks.map((c) => c.id)).toContain("CHK-PUB-1");
    expect(leadChunks.map((c) => c.id)).toContain("CHK-FIN-1");

    // Intern retrieval receives ONLY public chunk (Pre-Model RBAC barrier)
    const internChunks = await repository.searchChunksForAudience(
      projectId,
      "incoming_intern"
    );
    expect(internChunks.map((c) => c.id)).toContain("CHK-PUB-1");
    expect(internChunks.map((c) => c.id)).not.toContain("CHK-FIN-1");
  });

  it("persists draft versions and claims per audience", async () => {
    const sampleClaim: ClaimRecord = {
      id: "CLM-001",
      draft_version_id: "DV-1",
      project_id: projectId,
      audience_role: "incoming_lead",
      section: "architecture",
      claim_type: "decision",
      text: "Supabase pgvector handles 768-dim embeddings.",
      evidence_state: "corroborated",
      evidence: [],
      audience_acl: ["incoming_lead", "incoming_intern"],
      review: { status: "pending" },
    };

    const sampleDraft: DraftVersion = {
      id: "DV-1",
      project_id: projectId,
      audience_role: "incoming_lead",
      version_label: "v1.0",
      confidence: {
        total_score: 91,
        citation_coverage: 0.96,
        corroboration_rate: 0.8,
        freshness_rate: 0.95,
        conflict_rate: 0.05,
        conflict_free_rate: 0.95,
        weights: CONFIDENCE_WEIGHTS,
      },
      status: "draft",
      claims: [sampleClaim],
      created_at: new Date().toISOString(),
    };

    await repository.saveDraftVersion(sampleDraft);

    const fetched = await repository.getDraftVersion(
      projectId,
      "incoming_lead",
      "v1.0"
    );
    expect(fetched).toBeDefined();
    expect(fetched?.version_label).toBe("v1.0");
    expect(fetched?.claims).toHaveLength(1);
    expect(fetched?.claims[0].id).toBe("CLM-001");
  });

  it("updates claim review status and reviewer details", async () => {
    const claim: ClaimRecord = {
      id: "CLM-002",
      draft_version_id: "DV-1",
      project_id: projectId,
      audience_role: "incoming_lead",
      section: "decisions",
      claim_type: "decision",
      text: "Initial draft text before review.",
      evidence_state: "single_source",
      evidence: [],
      audience_acl: ["incoming_lead"],
      review: { status: "pending" },
    };

    const draft: DraftVersion = {
      id: "DV-1",
      project_id: projectId,
      audience_role: "incoming_lead",
      version_label: "v1.0",
      confidence: {
        total_score: 80,
        citation_coverage: 0.8,
        corroboration_rate: 0.6,
        freshness_rate: 0.8,
        conflict_rate: 0,
        conflict_free_rate: 1,
        weights: CONFIDENCE_WEIGHTS,
      },
      status: "draft",
      claims: [claim],
      created_at: new Date().toISOString(),
    };

    await repository.saveDraftVersion(draft);

    const updated = await repository.updateClaimReview("CLM-002", {
      status: "approved",
      reviewer_id: "USR-REV-1",
      reviewer_name: "Prof. Deshmukh",
      edited_text: "Refined approved text.",
    });

    expect(updated).toBeDefined();
    expect(updated?.review.status).toBe("approved");
    expect(updated?.review.reviewer_name).toBe("Prof. Deshmukh");
    expect(updated?.text).toBe("Refined approved text.");
  });

  it("handles gap question answering and transitions associated claim to attested", async () => {
    const gapClaim: ClaimRecord = {
      id: "CLM-RED-GAP",
      draft_version_id: "DV-1",
      project_id: projectId,
      audience_role: "incoming_lead",
      section: "architecture",
      claim_type: "decision",
      text: "Redis was selected for session caching.",
      evidence_state: "unsupported",
      evidence: [],
      audience_acl: ["incoming_lead"],
      review: { status: "pending" },
    };

    const question: GapQuestion = {
      id: "GAP-001",
      project_id: projectId,
      claim_id: "CLM-RED-GAP",
      question_text: "Why was Redis chosen over Postgres for caching?",
      context_summary: "No source mentions why Redis was selected.",
      status: "pending",
    };

    repository.seedInitialData({
      claims: [gapClaim],
      gapQuestions: [question],
    });

    const answered = await repository.answerGapQuestion(
      "GAP-001",
      "Free hosting tier limited postgres connections; Redis had dedicated memory.",
      "Aarav"
    );

    expect(answered?.status).toBe("answered");
    expect(answered?.answered_by).toBe("Aarav");

    // Associated claim must transition to 'attested' (ADR-006)
    const claims = await repository.getClaimsForAudience(
      projectId,
      "incoming_lead"
    );
    const updatedClaim = claims.find((c) => c.id === "CLM-RED-GAP");
    expect(updatedClaim?.evidence_state).toBe("attested");
    expect(updatedClaim?.text).toContain("Attested:");
  });

  it("handles sudden exit simulation by assigning fallback contact", async () => {
    const question: GapQuestion = {
      id: "GAP-SUDDEN-EXIT",
      project_id: projectId,
      claim_id: "CLM-99",
      question_text: "Who owns domain renewal?",
      context_summary: "Unwritten ownership",
      status: "pending",
    };

    repository.seedInitialData({ gapQuestions: [question] });

    const skipped = await repository.skipGapQuestionSuddenExit(
      "GAP-SUDDEN-EXIT",
      "Prof. Deshmukh"
    );

    expect(skipped?.status).toBe("skipped_sudden_exit");
    expect(skipped?.assigned_contact_if_unanswered).toBe("Prof. Deshmukh");
  });

  it("logs and retrieves audit events in reverse chronological order", async () => {
    await repository.logAuditEvent({
      project_id: projectId,
      actor_role: "departing_member",
      actor_name: "Aarav",
      event_type: "source_connected",
      details_json: { source_count: 5 },
    });

    await repository.logAuditEvent({
      project_id: projectId,
      actor_role: "reviewer",
      actor_name: "Prof. Deshmukh",
      event_type: "handover_approved",
      details_json: { version: "v2.0" },
    });

    const events = await repository.listAuditEvents(projectId);
    expect(events).toHaveLength(2);
    // Most recent event first
    expect(events[0].event_type).toBe("handover_approved");
    expect(events[1].event_type).toBe("source_connected");
  });
});
