/**
 * EchoBridge Dual-Mode Repository
 * Implements ADR-002: Supabase PostgreSQL + pgvector primary store with
 * automatic first-run seeding and zero-config in-memory fallback.
 */

import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Project,
  Source,
  Chunk,
  QuarantinedSecret,
  DraftVersion,
  ClaimRecord,
  HandoverSection,
  ClaimType,
  ClaimReviewRecord,
  EvidenceRecord,
  GapQuestion,
  Receipt,
  ReceiptAnswer,
  AuditEvent,
  AudienceRole,
  VersionLabel,
  ReviewStatus,
  SourceType,
  EvidenceState,
  EntailmentVerdict,
} from "@/types/echobridge.types";
import { CONFIDENCE_WEIGHTS } from "@/types/echobridge.types";
import { isSupabaseConfigured } from "./client";
import { getSupabaseServerClient } from "./server";
import {
  getCampusConnectSeedData,
  seedCampusConnectRepository,
} from "@/services/seed/campus-connect.seed";

export interface SeedDataPayload {
  project?: Project;
  sources?: Source[];
  chunks?: Chunk[];
  secrets?: QuarantinedSecret[];
  drafts?: DraftVersion[];
  claims?: ClaimRecord[];
  gapQuestions?: GapQuestion[];
  receipts?: Receipt[];
  auditEvents?: AuditEvent[];
}

const VALID_SQL_SECTIONS = new Set<HandoverSection>([
  "architecture",
  "decisions",
  "tasks_dependencies",
  "contacts_ownership",
  "onboarding_day1",
  "onboarding_week1",
  "onboarding_month1",
]);

const VALID_SQL_CLAIM_TYPES = new Set<ClaimType>([
  "decision",
  "owner",
  "risk",
  "dependency",
  "next_action",
  "contact",
]);

function normalizeSqlSection(section?: string): HandoverSection {
  if (section && VALID_SQL_SECTIONS.has(section as HandoverSection)) {
    return section as HandoverSection;
  }
  const s = (section || "").toLowerCase();
  if (s.includes("decis")) return "decisions";
  if (s.includes("task") || s.includes("depend") || s.includes("operat") || s.includes("runbook")) {
    return "tasks_dependencies";
  }
  if (s.includes("contact") || s.includes("owner") || s.includes("financ") || s.includes("risk")) {
    return "contacts_ownership";
  }
  if (s.includes("day1")) return "onboarding_day1";
  if (s.includes("week1")) return "onboarding_week1";
  if (s.includes("month1")) return "onboarding_month1";
  return "architecture";
}

function normalizeSqlClaimType(claimType?: string): ClaimType {
  if (claimType && VALID_SQL_CLAIM_TYPES.has(claimType as ClaimType)) {
    return claimType as ClaimType;
  }
  return "decision";
}

function normalizeSqlReviewStatus(status?: string): ReviewStatus {
  if (status === "approved" || status === "edited" || status === "redacted" || status === "rejected" || status === "pending") {
    return status;
  }
  if ((status as string) === "edit") return "edited";
  if ((status as string) === "redact") return "redacted";
  if ((status as string) === "approve") return "approved";
  if ((status as string) === "reject") return "rejected";
  return "pending";
}

function sanitizeEmbedding(embedding?: number[]): number[] | null {
  if (
    Array.isArray(embedding) &&
    embedding.length === 768 &&
    embedding.every((n) => typeof n === "number" && Number.isFinite(n))
  ) {
    return embedding;
  }
  return null;
}

export class EchoBridgeRepository {
  // In-Memory storage structures for zero-config fallback & test isolation
  private projects = new Map<string, Project>();
  private sources = new Map<string, Source>();
  private chunks = new Map<string, Chunk>();
  private secrets = new Map<string, QuarantinedSecret>();
  private drafts = new Map<string, DraftVersion>();
  private claims = new Map<string, ClaimRecord>();
  private gapQuestions = new Map<string, GapQuestion>();
  private receipts = new Map<string, Receipt>();
  private auditEvents: AuditEvent[] = [];

  // Track first-run Supabase seeding per project
  private verifiedSeeded = new Set<string>();
  private seedingLocks = new Map<string, Promise<void>>();

  constructor(autoSeed = true) {
    if (autoSeed) {
      this.initDefaultData();
    } else {
      this.initDefaultProject();
    }
  }

  public initDefaultData() {
    this.initDefaultProject();
    seedCampusConnectRepository(this);
  }

  private initDefaultProject() {
    const defaultProject: Project = {
      id: "CampusConnect",
      name: "CampusConnect",
      description:
        "Student Club Event Platform & Ticket Management (Synthetic Benchmark)",
      freshness_threshold_days: 180,
      created_at: new Date().toISOString(),
    };
    this.projects.set(defaultProject.id, defaultProject);
  }

  /**
   * Returns whether Supabase is configured (always false inside Vitest).
   */
  public isConfigured(): boolean {
    if (process.env.VITEST) return false;
    return isSupabaseConfigured();
  }

  // ==========================================================================
  // SQL Serialization & Hydration Helpers
  // ==========================================================================

  private toDraftRow(draft: DraftVersion) {
    return {
      id: draft.id,
      project_id: draft.project_id,
      audience_role: draft.audience_role,
      version_label: draft.version_label,
      confidence_score: Number(draft.confidence.total_score) || 0,
      citation_coverage: Number(draft.confidence.citation_coverage) || 0,
      corroboration_rate: Number(draft.confidence.corroboration_rate) || 0,
      freshness_rate: Number(draft.confidence.freshness_rate) || 0,
      conflict_rate: Number(draft.confidence.conflict_rate) || 0,
      status: draft.status,
      created_at: draft.created_at || new Date().toISOString(),
    };
  }

  private fromDraftRow(
    row: Record<string, unknown>,
    claims: ClaimRecord[]
  ): DraftVersion {
    const conflictRate = Number(row.conflict_rate || 0);
    return {
      id: String(row.id),
      project_id: String(row.project_id),
      audience_role: row.audience_role as AudienceRole,
      version_label: row.version_label as VersionLabel,
      confidence: {
        total_score: Math.round(Number(row.confidence_score || 0)),
        citation_coverage: Number(row.citation_coverage || 0),
        corroboration_rate: Number(row.corroboration_rate || 0),
        freshness_rate: Number(row.freshness_rate || 0),
        conflict_rate: conflictRate,
        conflict_free_rate: Number(Math.max(0, 1 - conflictRate).toFixed(4)),
        weights: CONFIDENCE_WEIGHTS,
      },
      status: row.status as DraftVersion["status"],
      claims,
      created_at: String(row.created_at || new Date().toISOString()),
    };
  }

  private toClaimRow(claim: ClaimRecord, fallbackDraftId?: string) {
    return {
      id: claim.id,
      draft_version_id: claim.draft_version_id || fallbackDraftId || "DV-LEAD-V1.0",
      project_id: claim.project_id || "CampusConnect",
      audience_role: claim.audience_role,
      section: normalizeSqlSection(claim.section),
      claim_type: normalizeSqlClaimType(claim.claim_type),
      text: claim.text,
      evidence_state: claim.evidence_state,
      audience_acl:
        Array.isArray(claim.audience_acl) && claim.audience_acl.length > 0
          ? claim.audience_acl
          : [claim.audience_role],
      conflict_pair_json: claim.conflict_pair || null,
      review_status: normalizeSqlReviewStatus(claim.review?.status),
      reviewer_id: claim.review?.reviewer_id || null,
      reviewer_name: claim.review?.reviewer_name || null,
      edited_text: claim.review?.edited_text || null,
      reviewed_at: claim.review?.reviewed_at || null,
      planted_trap_id: claim.planted_trap_id ?? null,
    };
  }

  private fromClaimRow(
    row: Record<string, unknown>,
    evidenceRows: Record<string, unknown>[]
  ): ClaimRecord {
    const claimId = String(row.id);
    const matchingEvidence: EvidenceRecord[] = evidenceRows
      .filter((e) => String(e.claim_id) === claimId)
      .map((e) => ({
        chunk_id: String(e.chunk_id),
        source_id: String(e.source_id),
        source_type: String(e.source_type || "document") as SourceType,
        source_title: String(e.source_title || ""),
        author: String(e.author || "Unknown"),
        evidence_timestamp: String(
          e.evidence_timestamp || new Date().toISOString()
        ),
        quoted_span: String(e.quoted_span || ""),
        source_link: e.source_link ? String(e.source_link) : undefined,
        is_verbatim_verified: Boolean(e.is_verbatim_verified),
        entailment_verdict: (e.entailment_verdict ||
          "unsupported") as EntailmentVerdict,
      }));

    return {
      id: claimId,
      draft_version_id: String(row.draft_version_id),
      project_id: String(row.project_id),
      audience_role: row.audience_role as AudienceRole,
      section: row.section as HandoverSection,
      claim_type: row.claim_type as ClaimType,
      text: String(row.text),
      evidence_state: row.evidence_state as EvidenceState,
      evidence: matchingEvidence,
      audience_acl: (Array.isArray(row.audience_acl)
        ? row.audience_acl
        : [row.audience_role]) as AudienceRole[],
      conflict_pair: (row.conflict_pair_json as ClaimRecord["conflict_pair"]) || undefined,
      review: {
        status: normalizeSqlReviewStatus(String(row.review_status || "pending")),
        reviewer_id: row.reviewer_id ? String(row.reviewer_id) : undefined,
        reviewer_name: row.reviewer_name ? String(row.reviewer_name) : undefined,
        edited_text: row.edited_text ? String(row.edited_text) : undefined,
        reviewed_at: row.reviewed_at ? String(row.reviewed_at) : undefined,
      },
      planted_trap_id:
        row.planted_trap_id !== null && row.planted_trap_id !== undefined
          ? Number(row.planted_trap_id)
          : undefined,
    };
  }

  private toReceiptRow(receipt: Receipt) {
    return {
      id: receipt.id,
      project_id: receipt.project_id,
      draft_version_id: receipt.draft_version_id,
      audience_role: receipt.audience_role,
      incoming_user_name: receipt.incoming_user_name,
      comprehension_score: receipt.comprehension_score,
      comprehension_passed: receipt.comprehension_passed,
      answers_json: {
        answers: receipt.answers || [],
        receipt_hash: receipt.receipt_hash || "",
      },
      acknowledged_at: receipt.acknowledged_at || new Date().toISOString(),
    };
  }

  private fromReceiptRow(row: Record<string, unknown>): Receipt {
    const rawAnswersJson = row.answers_json;
    let answers: ReceiptAnswer[] = [];
    let receiptHash = "";

    if (Array.isArray(rawAnswersJson)) {
      answers = rawAnswersJson as ReceiptAnswer[];
    } else if (rawAnswersJson && typeof rawAnswersJson === "object") {
      const obj = rawAnswersJson as {
        answers?: ReceiptAnswer[];
        receipt_hash?: string;
      };
      answers = Array.isArray(obj.answers) ? obj.answers : [];
      receiptHash = typeof obj.receipt_hash === "string" ? obj.receipt_hash : "";
    }

    const acknowledgedAt = String(
      row.acknowledged_at || new Date().toISOString()
    );
    const score = Number(row.comprehension_score || 0);

    if (!receiptHash) {
      const payload = [
        String(row.project_id),
        String(row.draft_version_id),
        String(row.audience_role),
        String(row.incoming_user_name),
        acknowledgedAt,
        String(score),
      ].join("::");
      const digest = crypto.createHash("sha256").update(payload).digest("hex");
      receiptHash = `0x${digest.slice(0, 40)}`;
    }

    return {
      id: String(row.id),
      project_id: String(row.project_id),
      draft_version_id: String(row.draft_version_id),
      audience_role: row.audience_role as AudienceRole,
      incoming_user_name: String(row.incoming_user_name),
      comprehension_score: score,
      comprehension_passed: Boolean(row.comprehension_passed),
      answers,
      acknowledged_at: acknowledgedAt,
      receipt_hash: receiptHash,
    };
  }

  private async persistClaimEvidenceRows(
    client: SupabaseClient,
    claims: ClaimRecord[]
  ): Promise<void> {
    if (claims.length === 0) return;

    try {
      const [{ data: existingChunks }, { data: existingSources }] =
        await Promise.all([
          client.from("chunks").select("id"),
          client.from("sources").select("id"),
        ]);

      const validChunkIds = new Set(
        (existingChunks || []).map((c: { id: string }) => c.id)
      );
      const validSourceIds = new Set(
        (existingSources || []).map((s: { id: string }) => s.id)
      );

      const evidenceRows: Record<string, unknown>[] = [];
      for (const claim of claims) {
        (claim.evidence || []).forEach((ev, idx) => {
          if (
            validChunkIds.has(ev.chunk_id) &&
            validSourceIds.has(ev.source_id)
          ) {
            evidenceRows.push({
              id: `${claim.id}-EV-${idx}`,
              claim_id: claim.id,
              chunk_id: ev.chunk_id,
              source_id: ev.source_id,
              source_type: ev.source_type || "document",
              source_title: ev.source_title || "",
              author: ev.author || "Unknown",
              evidence_timestamp:
                ev.evidence_timestamp || new Date().toISOString(),
              quoted_span: ev.quoted_span || "",
              source_link: ev.source_link || null,
              is_verbatim_verified: Boolean(ev.is_verbatim_verified),
              entailment_verdict: ev.entailment_verdict || "supported",
            });
          }
        });
      }

      if (evidenceRows.length > 0) {
        const { error } = await client
          .from("claim_evidence")
          .upsert(evidenceRows, { onConflict: "id" });
        if (error) {
          console.warn(
            "[Supabase] claim_evidence upsert warning:",
            error.message
          );
        }
      }
    } catch (err) {
      console.warn("[Supabase] persistClaimEvidenceRows error:", err);
    }
  }

  // ==========================================================================
  // Automatic First-Run Seeding & Project Initialization
  // ==========================================================================

  private async ensureProjectRecord(
    client: SupabaseClient,
    projectId: string
  ): Promise<void> {
    try {
      const { data: existing } = await client
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .maybeSingle();

      if (!existing) {
        const localProj = this.projects.get(projectId);
        await client.from("projects").upsert({
          id: projectId,
          name: localProj?.name || projectId,
          description:
            localProj?.description || "EchoBridge Handover Workspace",
          freshness_threshold_days:
            localProj?.freshness_threshold_days || 180,
          created_at: localProj?.created_at || new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn("[Supabase] ensureProjectRecord warning:", err);
    }
  }

  public async ensureProjectSeeded(projectId = "CampusConnect"): Promise<void> {
    if (!this.isConfigured()) return;
    if (this.verifiedSeeded.has(projectId)) return;

    const existingLock = this.seedingLocks.get(projectId);
    if (existingLock) {
      await existingLock;
      return;
    }

    const seedPromise = (async () => {
      const client = getSupabaseServerClient();
      if (!client) return;

      try {
        if (projectId !== "CampusConnect") {
          await this.ensureProjectRecord(client, projectId);
          this.verifiedSeeded.add(projectId);
          return;
        }

        const [{ data: projectRow }, { data: draftRows }] = await Promise.all([
          client
            .from("projects")
            .select("id")
            .eq("id", projectId)
            .maybeSingle(),
          client
            .from("draft_versions")
            .select("id")
            .eq("project_id", projectId)
            .limit(1),
        ]);

        if (projectRow && draftRows && draftRows.length > 0) {
          this.verifiedSeeded.add(projectId);
          return;
        }

        await this.seedSupabaseCampusConnect(client);
        this.verifiedSeeded.add(projectId);
      } catch (err) {
        console.warn("[Supabase] Auto first-run seeding fallback:", err);
      } finally {
        this.seedingLocks.delete(projectId);
      }
    })();

    this.seedingLocks.set(projectId, seedPromise);
    await seedPromise;
  }

  private async seedSupabaseCampusConnect(
    client: SupabaseClient
  ): Promise<void> {
    const data = getCampusConnectSeedData();

    // 1. Project
    const { error: projErr } = await client
      .from("projects")
      .upsert(data.project, { onConflict: "id" });
    if (projErr) {
      console.warn("[Supabase] seed projects warning:", projErr.message);
      return;
    }

    // 2. Sources
    const { error: srcErr } = await client
      .from("sources")
      .upsert(data.sources, { onConflict: "id" });
    if (srcErr) console.warn("[Supabase] seed sources warning:", srcErr.message);

    // 3. Chunks (sanitize embedding for pgvector)
    const chunkRows = data.chunks.map((c) => ({
      id: c.id,
      project_id: c.project_id,
      source_id: c.source_id,
      content: c.content,
      author: c.author,
      chunk_timestamp: c.chunk_timestamp,
      allowed_roles: c.allowed_roles,
      embedding: sanitizeEmbedding(c.embedding),
      injection_flagged: c.injection_flagged,
      redaction_count: c.redaction_count,
    }));
    const { error: chkErr } = await client
      .from("chunks")
      .upsert(chunkRows, { onConflict: "id" });
    if (chkErr) console.warn("[Supabase] seed chunks warning:", chkErr.message);

    // 4. Quarantined Secrets
    const { error: secErr } = await client
      .from("quarantined_secrets")
      .upsert(data.secrets, { onConflict: "id" });
    if (secErr) console.warn("[Supabase] seed secrets warning:", secErr.message);

    // 5. Draft Versions
    const draftRows = data.drafts.map((d) => this.toDraftRow(d));
    const { error: dftErr } = await client
      .from("draft_versions")
      .upsert(draftRows, { onConflict: "id" });
    if (dftErr) console.warn("[Supabase] seed drafts warning:", dftErr.message);

    // 6. Claims
    const claimRows = data.claims.map((c) => this.toClaimRow(c));
    const { error: clmErr } = await client
      .from("claims")
      .upsert(claimRows, { onConflict: "id" });
    if (clmErr) console.warn("[Supabase] seed claims warning:", clmErr.message);

    // 7. Claim Evidence
    await this.persistClaimEvidenceRows(client, data.claims);

    // 8. Gap Questions (after claims due to claim_id FK)
    const { error: gapErr } = await client
      .from("gap_questions")
      .upsert(data.gapQuestions, { onConflict: "id" });
    if (gapErr) console.warn("[Supabase] seed gap_questions warning:", gapErr.message);

    // 9. Audit Events
    const { error: audErr } = await client
      .from("audit_events")
      .upsert(data.auditEvents, { onConflict: "id" });
    if (audErr) console.warn("[Supabase] seed audit_events warning:", audErr.message);
  }

  // ==========================================================================
  // Projects
  // ==========================================================================

  public async getProject(projectId: string): Promise<Project | null> {
    if (this.isConfigured()) {
      try {
        await this.ensureProjectSeeded(projectId);
        const client = getSupabaseServerClient();
        if (client) {
          const { data, error } = await client
            .from("projects")
            .select("*")
            .eq("id", projectId)
            .maybeSingle();
          if (!error && data) {
            this.projects.set(projectId, data as Project);
            return data as Project;
          }
        }
      } catch (err) {
        console.warn("[Supabase] getProject fallback:", err);
      }
    }
    return this.projects.get(projectId) || null;
  }

  public async listProjects(): Promise<Project[]> {
    if (this.isConfigured()) {
      try {
        await this.ensureProjectSeeded("CampusConnect");
        const client = getSupabaseServerClient();
        if (client) {
          const { data, error } = await client.from("projects").select("*");
          if (!error && data) return data as Project[];
        }
      } catch (err) {
        console.warn("[Supabase] listProjects fallback:", err);
      }
    }
    return Array.from(this.projects.values());
  }

  public async createProject(project: Project): Promise<Project> {
    this.projects.set(project.id, project);
    if (this.isConfigured()) {
      try {
        const client = getSupabaseServerClient();
        if (client) {
          await client.from("projects").upsert(project, { onConflict: "id" });
        }
      } catch (err) {
        console.warn("[Supabase] createProject warning:", err);
      }
    }
    return project;
  }

  // ==========================================================================
  // Sources
  // ==========================================================================

  public async listSources(projectId: string): Promise<Source[]> {
    if (this.isConfigured()) {
      try {
        await this.ensureProjectSeeded(projectId);
        const client = getSupabaseServerClient();
        if (client) {
          const { data, error } = await client
            .from("sources")
            .select("*")
            .eq("project_id", projectId)
            .order("created_at", { ascending: true });
          if (!error && data && data.length > 0) {
            for (const s of data as Source[]) {
              this.sources.set(s.id, s);
            }
            return data as Source[];
          }
        }
      } catch (err) {
        console.warn("[Supabase] listSources fallback:", err);
      }
    }
    return Array.from(this.sources.values()).filter(
      (s) => s.project_id === projectId
    );
  }

  public async createSource(source: Source): Promise<Source> {
    this.sources.set(source.id, source);
    if (this.isConfigured()) {
      try {
        await this.ensureProjectSeeded(source.project_id);
        const client = getSupabaseServerClient();
        if (client) {
          await this.ensureProjectRecord(client, source.project_id);
          const { error } = await client
            .from("sources")
            .upsert(source, { onConflict: "id" });
          if (error) {
            console.warn("[Supabase] createSource warning:", error.message);
          }
        }
      } catch (err) {
        console.warn("[Supabase] createSource fallback:", err);
      }
    }
    return source;
  }

  // ==========================================================================
  // Chunks & Role-Filtered Retrieval (Pre-Model RBAC Guard)
  // ==========================================================================

  public async listChunks(
    projectId: string,
    audienceRole?: AudienceRole
  ): Promise<Chunk[]> {
    if (this.isConfigured()) {
      try {
        await this.ensureProjectSeeded(projectId);
        const client = getSupabaseServerClient();
        if (client) {
          let query = client
            .from("chunks")
            .select(
              "id, project_id, source_id, content, author, chunk_timestamp, allowed_roles, injection_flagged, redaction_count"
            )
            .eq("project_id", projectId);
          if (audienceRole) {
            query = query.contains("allowed_roles", [audienceRole]);
          }
          const { data, error } = await query;
          if (!error && data) {
            for (const c of data as Chunk[]) {
              this.chunks.set(c.id, c);
            }
            return data as Chunk[];
          }
        }
      } catch (err) {
        console.warn("[Supabase] listChunks fallback:", err);
      }
    }

    const all = Array.from(this.chunks.values()).filter(
      (c) => c.project_id === projectId
    );

    if (audienceRole) {
      return all.filter((c) => c.allowed_roles.includes(audienceRole));
    }
    return all;
  }

  public async createChunks(chunks: Chunk[]): Promise<Chunk[]> {
    for (const chunk of chunks) {
      this.chunks.set(chunk.id, chunk);
    }

    if (this.isConfigured() && chunks.length > 0) {
      try {
        const projectId = chunks[0].project_id;
        await this.ensureProjectSeeded(projectId);
        const client = getSupabaseServerClient();
        if (client) {
          await this.ensureProjectRecord(client, projectId);
          const rows = chunks.map((c) => ({
            id: c.id,
            project_id: c.project_id,
            source_id: c.source_id,
            content: c.content,
            author: c.author,
            chunk_timestamp: c.chunk_timestamp,
            allowed_roles: c.allowed_roles,
            embedding: sanitizeEmbedding(c.embedding),
            injection_flagged: c.injection_flagged,
            redaction_count: c.redaction_count,
          }));
          const { error } = await client
            .from("chunks")
            .upsert(rows, { onConflict: "id" });
          if (error) {
            console.warn("[Supabase] createChunks warning:", error.message);
          }
        }
      } catch (err) {
        console.warn("[Supabase] createChunks fallback:", err);
      }
    }

    return chunks;
  }

  public async searchChunksForAudience(
    projectId: string,
    audienceRole: AudienceRole,
    query?: string
  ): Promise<Chunk[]> {
    const roleChunks = await this.listChunks(projectId, audienceRole);
    if (!query || query.trim() === "") {
      return roleChunks;
    }
    const lowerQuery = query.toLowerCase();
    return roleChunks.filter((c) =>
      c.content.toLowerCase().includes(lowerQuery)
    );
  }

  // ==========================================================================
  // Quarantined Secrets & Prompt Injections
  // ==========================================================================

  public async listSecrets(projectId: string): Promise<QuarantinedSecret[]> {
    if (this.isConfigured()) {
      try {
        await this.ensureProjectSeeded(projectId);
        const client = getSupabaseServerClient();
        if (client) {
          const { data, error } = await client
            .from("quarantined_secrets")
            .select("*")
            .eq("project_id", projectId)
            .order("detected_at", { ascending: true });
          if (!error && data) {
            for (const s of data as QuarantinedSecret[]) {
              this.secrets.set(s.id, s);
            }
            return data as QuarantinedSecret[];
          }
        }
      } catch (err) {
        console.warn("[Supabase] listSecrets fallback:", err);
      }
    }
    return Array.from(this.secrets.values()).filter(
      (s) => s.project_id === projectId
    );
  }

  public async listQuarantinedSecrets(
    projectId: string
  ): Promise<QuarantinedSecret[]> {
    return this.listSecrets(projectId);
  }

  public async createSecret(
    secret: QuarantinedSecret
  ): Promise<QuarantinedSecret> {
    this.secrets.set(secret.id, secret);
    if (this.isConfigured()) {
      try {
        await this.ensureProjectSeeded(secret.project_id);
        const client = getSupabaseServerClient();
        if (client) {
          const { error } = await client
            .from("quarantined_secrets")
            .upsert(secret, { onConflict: "id" });
          if (error) {
            console.warn("[Supabase] createSecret warning:", error.message);
          }
        }
      } catch (err) {
        console.warn("[Supabase] createSecret fallback:", err);
      }
    }
    return secret;
  }

  public async createSecrets(
    secrets: QuarantinedSecret[]
  ): Promise<QuarantinedSecret[]> {
    for (const secret of secrets) {
      this.secrets.set(secret.id, secret);
    }
    if (this.isConfigured() && secrets.length > 0) {
      try {
        const projectId = secrets[0].project_id;
        await this.ensureProjectSeeded(projectId);
        const client = getSupabaseServerClient();
        if (client) {
          const { error } = await client
            .from("quarantined_secrets")
            .upsert(secrets, { onConflict: "id" });
          if (error) {
            console.warn("[Supabase] createSecrets warning:", error.message);
          }
        }
      } catch (err) {
        console.warn("[Supabase] createSecrets fallback:", err);
      }
    }
    return secrets;
  }

  // ==========================================================================
  // Draft Versions & Claims (Stage 3 & 5)
  // ==========================================================================

  public async getDraftVersion(
    projectId: string,
    audienceRole: AudienceRole,
    versionLabel?: VersionLabel
  ): Promise<DraftVersion | null> {
    if (this.isConfigured()) {
      try {
        await this.ensureProjectSeeded(projectId);
        const client = getSupabaseServerClient();
        if (client) {
          let query = client
            .from("draft_versions")
            .select("*")
            .eq("project_id", projectId)
            .eq("audience_role", audienceRole);

          if (versionLabel) {
            query = query.eq("version_label", versionLabel);
          }

          const { data: draftRows, error } = await query.order("created_at", {
            ascending: false,
          });

          if (!error && draftRows && draftRows.length > 0) {
            let selectedRow = draftRows[0];
            if (!versionLabel) {
              const priority: Record<VersionLabel, number> = {
                "v2.0": 3,
                "v1.1": 2,
                "v1.0": 1,
              };
              const sorted = [...draftRows].sort((a, b) => {
                const pDiff =
                  (priority[b.version_label as VersionLabel] || 0) -
                  (priority[a.version_label as VersionLabel] || 0);
                if (pDiff !== 0) return pDiff;
                return String(b.created_at).localeCompare(String(a.created_at));
              });
              selectedRow = sorted[0];
            }

            const draftId = String(selectedRow.id);
            const { data: claimRows } = await client
              .from("claims")
              .select("*")
              .eq("draft_version_id", draftId)
              .order("created_at", { ascending: true });

            const claimIds = (claimRows || []).map((c: { id: string }) => c.id);
            let evidenceRows: Record<string, unknown>[] = [];
            if (claimIds.length > 0) {
              const { data: evData } = await client
                .from("claim_evidence")
                .select("*")
                .in("claim_id", claimIds);
              evidenceRows = (evData || []) as Record<string, unknown>[];
            }

            const hydratedClaims = (claimRows || []).map((row) =>
              this.fromClaimRow(row as Record<string, unknown>, evidenceRows)
            );
            const draft = this.fromDraftRow(
              selectedRow as Record<string, unknown>,
              hydratedClaims
            );

            this.drafts.set(draft.id, draft);
            for (const c of hydratedClaims) {
              this.claims.set(c.id, c);
            }
            return draft;
          }
        }
      } catch (err) {
        console.warn("[Supabase] getDraftVersion fallback:", err);
      }
    }

    // In-memory fallback (always return newest matching draft by created_at DESC)
    const allDrafts = Array.from(this.drafts.values()).filter(
      (d) => d.project_id === projectId && d.audience_role === audienceRole
    );

    if (versionLabel) {
      const matches = allDrafts
        .filter((d) => d.version_label === versionLabel)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      const match = matches[0];
      if (match) {
        const claimsFromStore = await this.getClaimsForAudience(
          projectId,
          audienceRole,
          match.id
        );
        if (claimsFromStore.length > 0) {
          match.claims = claimsFromStore;
        }
        return match;
      }
      return null;
    }

    const priority: Record<VersionLabel, number> = {
      "v2.0": 3,
      "v1.1": 2,
      "v1.0": 1,
    };

    allDrafts.sort((a, b) => {
      const pDiff =
        (priority[b.version_label] || 0) - (priority[a.version_label] || 0);
      if (pDiff !== 0) return pDiff;
      return b.created_at.localeCompare(a.created_at);
    });

    const latest = allDrafts[0] || null;
    if (latest) {
      const claimsFromStore = await this.getClaimsForAudience(
        projectId,
        audienceRole,
        latest.id
      );
      if (claimsFromStore.length > 0) {
        latest.claims = claimsFromStore;
      }
    }
    return latest;
  }

  public async saveDraftVersion(draft: DraftVersion): Promise<DraftVersion> {
    const normalizedClaims = (draft.claims || []).map((c) => ({
      ...c,
      draft_version_id: draft.id,
      project_id: draft.project_id,
      audience_role: draft.audience_role,
    }));

    const storedDraft: DraftVersion = {
      ...draft,
      claims: normalizedClaims,
      created_at: draft.created_at || new Date().toISOString(),
    };

    this.drafts.set(storedDraft.id, storedDraft);
    for (const claim of normalizedClaims) {
      this.claims.set(claim.id, claim);
    }

    if (this.isConfigured()) {
      try {
        const client = getSupabaseServerClient();
        if (client) {
          await this.ensureProjectRecord(client, storedDraft.project_id);

          const { error: dftErr } = await client
            .from("draft_versions")
            .upsert(this.toDraftRow(storedDraft), { onConflict: "id" });

          if (dftErr) {
            console.warn(
              "[Supabase] saveDraftVersion draft upsert warning:",
              dftErr.message
            );
          }

          if (normalizedClaims.length > 0) {
            const claimRows = normalizedClaims.map((c) =>
              this.toClaimRow(c, storedDraft.id)
            );
            const { error: clmErr } = await client
              .from("claims")
              .upsert(claimRows, { onConflict: "id" });

            if (clmErr) {
              console.warn(
                "[Supabase] saveDraftVersion claims upsert warning:",
                clmErr.message
              );
            } else {
              await this.persistClaimEvidenceRows(client, normalizedClaims);
            }
          }
        }
      } catch (err) {
        console.warn("[Supabase] saveDraftVersion fallback:", err);
      }
    }

    return storedDraft;
  }

  public async getClaimsForAudience(
    projectId: string,
    audienceRole: AudienceRole,
    draftVersionId?: string
  ): Promise<ClaimRecord[]> {
    if (this.isConfigured()) {
      try {
        await this.ensureProjectSeeded(projectId);
        const client = getSupabaseServerClient();
        if (client) {
          let query = client
            .from("claims")
            .select("*")
            .eq("project_id", projectId)
            .eq("audience_role", audienceRole);
          if (draftVersionId) {
            query = query.eq("draft_version_id", draftVersionId);
          }
          const { data: claimRows, error } = await query;
          if (!error && claimRows) {
            const claimIds = claimRows.map((c: { id: string }) => c.id);
            let evidenceRows: Record<string, unknown>[] = [];
            if (claimIds.length > 0) {
              const { data: evData } = await client
                .from("claim_evidence")
                .select("*")
                .in("claim_id", claimIds);
              evidenceRows = (evData || []) as Record<string, unknown>[];
            }
            const hydrated = claimRows.map((r) =>
              this.fromClaimRow(r as Record<string, unknown>, evidenceRows)
            );
            for (const c of hydrated) {
              this.claims.set(c.id, c);
            }
            return hydrated;
          }
        }
      } catch (err) {
        console.warn("[Supabase] getClaimsForAudience fallback:", err);
      }
    }

    return Array.from(this.claims.values()).filter((c) => {
      const projectMatch = c.project_id === projectId;
      const roleMatch = c.audience_role === audienceRole;
      const draftMatch = draftVersionId
        ? c.draft_version_id === draftVersionId
        : true;
      return projectMatch && roleMatch && draftMatch;
    });
  }

  public async getClaim(claimId: string): Promise<ClaimRecord | null> {
    if (this.isConfigured()) {
      try {
        const client = getSupabaseServerClient();
        if (client) {
          const { data: exactRow } = await client
            .from("claims")
            .select("*")
            .eq("id", claimId)
            .maybeSingle();
          if (exactRow) {
            const { data: evRows } = await client
              .from("claim_evidence")
              .select("*")
              .eq("claim_id", claimId);
            const claim = this.fromClaimRow(
              exactRow as Record<string, unknown>,
              (evRows || []) as Record<string, unknown>[]
            );
            this.claims.set(claim.id, claim);
            return claim;
          }
        }
      } catch (err) {
        console.warn("[Supabase] getClaim fallback:", err);
      }
    }

    const claim = this.claims.get(claimId);
    if (claim) return claim;
    for (const [id, c] of this.claims.entries()) {
      if (
        id === claimId ||
        id.replace(/-V1\.[012]|-V2\.0/g, "") ===
          claimId.replace(/-V1\.[012]|-V2\.0/g, "")
      ) {
        return c;
      }
    }
    return null;
  }

  public async updateClaimReview(
    claimId: string,
    review: ClaimReviewRecord
  ): Promise<ClaimRecord | null> {
    const claim = await this.getClaim(claimId);
    if (!claim) return null;

    claim.review = {
      ...claim.review,
      ...review,
      status: normalizeSqlReviewStatus(review.status),
      reviewed_at: review.reviewed_at || new Date().toISOString(),
    };

    if (review.edited_text) {
      claim.text = review.edited_text;
    }

    this.claims.set(claim.id, claim);

    if (this.isConfigured()) {
      try {
        const client = getSupabaseServerClient();
        if (client) {
          const { error } = await client
            .from("claims")
            .update({
              review_status: claim.review.status,
              reviewer_id: claim.review.reviewer_id || null,
              reviewer_name: claim.review.reviewer_name || null,
              edited_text: claim.review.edited_text || null,
              reviewed_at: claim.review.reviewed_at,
              text: claim.text,
            })
            .eq("id", claim.id);

          if (error) {
            console.warn("[Supabase] updateClaimReview warning:", error.message);
          }
        }
      } catch (err) {
        console.warn("[Supabase] updateClaimReview fallback:", err);
      }
    }

    return claim;
  }

  // ==========================================================================
  // Gap Questions (Stage 4)
  // ==========================================================================

  public async listGapQuestions(projectId: string): Promise<GapQuestion[]> {
    if (this.isConfigured()) {
      try {
        await this.ensureProjectSeeded(projectId);
        const client = getSupabaseServerClient();
        if (client) {
          const { data, error } = await client
            .from("gap_questions")
            .select("*")
            .eq("project_id", projectId)
            .order("id", { ascending: true });
          if (!error && data) {
            for (const q of data as GapQuestion[]) {
              this.gapQuestions.set(q.id, q);
            }
            return data as GapQuestion[];
          }
        }
      } catch (err) {
        console.warn("[Supabase] listGapQuestions fallback:", err);
      }
    }

    return Array.from(this.gapQuestions.values()).filter(
      (g) => g.project_id === projectId
    );
  }

  public async answerGapQuestion(
    questionId: string,
    answerText: string,
    answeredBy: string
  ): Promise<GapQuestion | null> {
    if (this.isConfigured()) {
      await this.listGapQuestions("CampusConnect");
    }

    let question = this.gapQuestions.get(questionId);
    if (!question) {
      question = Array.from(this.gapQuestions.values()).find(
        (q) =>
          q.id === questionId ||
          (questionId === "GAP-Q-01" &&
            (q.id === "GAP-TRAP-2" || q.planted_trap_id === 2)) ||
          (questionId === "GAP-Q-02" &&
            (q.id === "GAP-TRAP-7" || q.planted_trap_id === 7)) ||
          (questionId === "GAP-Q-03" && q.id === "GAP-003")
      );
    }
    if (!question) return null;

    question.answer_text = answerText;
    question.answered_by = answeredBy;
    question.answered_at = new Date().toISOString();
    question.status = "answered";
    this.gapQuestions.set(question.id, question);

    const claim = await this.getClaim(question.claim_id);
    if (claim) {
      claim.evidence_state = "attested";
      claim.text = `${claim.text.replace(/\s*\[Attested:.*?\]/g, "")} [Attested: ${answerText}]`;
      this.claims.set(claim.id, claim);
    }

    if (this.isConfigured()) {
      try {
        const client = getSupabaseServerClient();
        if (client) {
          await client
            .from("gap_questions")
            .update({
              answer_text: question.answer_text,
              answered_by: question.answered_by,
              answered_at: question.answered_at,
              status: "answered",
            })
            .eq("id", question.id);

          if (claim) {
            await client
              .from("claims")
              .update({
                evidence_state: "attested",
                text: claim.text,
              })
              .eq("id", claim.id);
          }
        }
      } catch (err) {
        console.warn("[Supabase] answerGapQuestion fallback:", err);
      }
    }

    return question;
  }

  public async skipGapQuestionSuddenExit(
    questionId: string,
    assignedContact: string
  ): Promise<GapQuestion | null> {
    if (this.isConfigured()) {
      await this.listGapQuestions("CampusConnect");
    }

    let question = this.gapQuestions.get(questionId);
    if (!question) {
      question = Array.from(this.gapQuestions.values()).find(
        (q) =>
          q.id === questionId ||
          (questionId === "GAP-Q-01" &&
            (q.id === "GAP-TRAP-2" || q.planted_trap_id === 2)) ||
          (questionId === "GAP-Q-02" &&
            (q.id === "GAP-TRAP-7" || q.planted_trap_id === 7)) ||
          (questionId === "GAP-Q-03" && q.id === "GAP-003")
      );
    }
    if (!question) return null;

    question.assigned_contact_if_unanswered = assignedContact;
    question.status = "skipped_sudden_exit";
    this.gapQuestions.set(question.id, question);

    if (this.isConfigured()) {
      try {
        const client = getSupabaseServerClient();
        if (client) {
          await client
            .from("gap_questions")
            .update({
              assigned_contact_if_unanswered: assignedContact,
              status: "skipped_sudden_exit",
            })
            .eq("id", question.id);
        }
      } catch (err) {
        console.warn("[Supabase] skipGapQuestionSuddenExit fallback:", err);
      }
    }

    return question;
  }

  // ==========================================================================
  // Receipts & Comprehension Check (Stage 6)
  // ==========================================================================

  public async getReceipt(
    projectId: string,
    audienceRole: AudienceRole
  ): Promise<Receipt | null> {
    if (this.isConfigured()) {
      try {
        await this.ensureProjectSeeded(projectId);
        const client = getSupabaseServerClient();
        if (client) {
          const { data, error } = await client
            .from("receipts")
            .select("*")
            .eq("project_id", projectId)
            .eq("audience_role", audienceRole)
            .order("acknowledged_at", { ascending: false })
            .limit(1);

          if (!error && data && data.length > 0) {
            const hydrated = this.fromReceiptRow(
              data[0] as Record<string, unknown>
            );
            this.receipts.set(hydrated.id, hydrated);
            return hydrated;
          }
          if (!error && data && data.length === 0) {
            return null;
          }
        }
      } catch (err) {
        console.warn("[Supabase] getReceipt fallback:", err);
      }
    }

    const all = Array.from(this.receipts.values())
      .filter(
        (r) => r.project_id === projectId && r.audience_role === audienceRole
      )
      .sort((a, b) => b.acknowledged_at.localeCompare(a.acknowledged_at));
    return all[0] || null;
  }

  public async saveReceipt(receipt: Receipt): Promise<Receipt> {
    this.receipts.set(receipt.id, receipt);

    if (this.isConfigured()) {
      try {
        await this.ensureProjectSeeded(receipt.project_id);
        const client = getSupabaseServerClient();
        if (client) {
          await this.ensureProjectRecord(client, receipt.project_id);

          // Ensure draft_version_id exists in draft_versions before FK insert
          let validDraftId = receipt.draft_version_id;
          const { data: existingDraft } = await client
            .from("draft_versions")
            .select("id")
            .eq("id", validDraftId)
            .maybeSingle();

          if (!existingDraft) {
            const { data: anyDraft } = await client
              .from("draft_versions")
              .select("id")
              .eq("project_id", receipt.project_id)
              .eq("audience_role", receipt.audience_role)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (anyDraft?.id) {
              validDraftId = String(anyDraft.id);
            }
          }

          const { error } = await client.from("receipts").upsert(
            this.toReceiptRow({
              ...receipt,
              draft_version_id: validDraftId,
            }),
            { onConflict: "id" }
          );

          if (error) {
            console.warn("[Supabase] saveReceipt warning:", error.message);
          }
        }
      } catch (err) {
        console.warn("[Supabase] saveReceipt fallback:", err);
      }
    }

    return receipt;
  }

  public async clearReceipts(
    projectId: string,
    audienceRole?: AudienceRole
  ): Promise<void> {
    for (const [id, r] of this.receipts.entries()) {
      if (
        r.project_id === projectId &&
        (!audienceRole || r.audience_role === audienceRole)
      ) {
        this.receipts.delete(id);
      }
    }

    if (this.isConfigured()) {
      try {
        const client = getSupabaseServerClient();
        if (client) {
          let query = client
            .from("receipts")
            .delete()
            .eq("project_id", projectId);
          if (audienceRole) {
            query = query.eq("audience_role", audienceRole);
          }
          await query;
        }
      } catch (err) {
        console.warn("[Supabase] clearReceipts warning:", err);
      }
    }
  }

  // ==========================================================================
  // Immutable Audit Log
  // ==========================================================================

  public async listAuditEvents(
    projectId: string,
    limit = 50
  ): Promise<AuditEvent[]> {
    if (this.isConfigured()) {
      try {
        await this.ensureProjectSeeded(projectId);
        const client = getSupabaseServerClient();
        if (client) {
          const { data, error } = await client
            .from("audit_events")
            .select("*")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false })
            .limit(limit);

          if (!error && data) {
            return data as AuditEvent[];
          }
        }
      } catch (err) {
        console.warn("[Supabase] listAuditEvents fallback:", err);
      }
    }

    return this.auditEvents
      .filter((e) => e.project_id === projectId)
      .slice(-limit)
      .reverse();
  }

  public async logAuditEvent(
    event: Omit<AuditEvent, "id" | "created_at">
  ): Promise<AuditEvent> {
    const fullEvent: AuditEvent = {
      ...event,
      id: `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };

    this.auditEvents.push(fullEvent);

    if (this.isConfigured()) {
      try {
        const client = getSupabaseServerClient();
        if (client) {
          await this.ensureProjectRecord(client, fullEvent.project_id);
          const { error } = await client.from("audit_events").insert({
            id: fullEvent.id,
            project_id: fullEvent.project_id,
            actor_role: fullEvent.actor_role,
            actor_name: fullEvent.actor_name,
            event_type: fullEvent.event_type,
            details_json: fullEvent.details_json || {},
            created_at: fullEvent.created_at,
          });
          if (error) {
            console.warn("[Supabase] logAuditEvent warning:", error.message);
          }
        }
      } catch (err) {
        console.warn("[Supabase] logAuditEvent fallback:", err);
      }
    }

    return fullEvent;
  }

  // ==========================================================================
  // Seed & Reset Utilities
  // ==========================================================================

  public seedInitialData(data: SeedDataPayload): void {
    if (data.project) this.projects.set(data.project.id, data.project);
    if (data.sources) {
      for (const s of data.sources) this.sources.set(s.id, s);
    }
    if (data.chunks) {
      for (const c of data.chunks) this.chunks.set(c.id, c);
    }
    if (data.secrets) {
      for (const sec of data.secrets) this.secrets.set(sec.id, sec);
    }
    if (data.drafts) {
      for (const d of data.drafts) this.drafts.set(d.id, d);
    }
    if (data.claims) {
      for (const clm of data.claims) this.claims.set(clm.id, clm);
    }
    if (data.gapQuestions) {
      for (const g of data.gapQuestions) this.gapQuestions.set(g.id, g);
    }
    if (data.receipts) {
      for (const r of data.receipts) this.receipts.set(r.id, r);
    }
    if (data.auditEvents) {
      this.auditEvents.push(...data.auditEvents);
    }
  }

  public resetInMemoryStore(reSeed = true): void {
    this.projects.clear();
    this.sources.clear();
    this.chunks.clear();
    this.secrets.clear();
    this.drafts.clear();
    this.claims.clear();
    this.gapQuestions.clear();
    this.receipts.clear();
    this.auditEvents = [];
    this.verifiedSeeded.clear();
    if (reSeed) {
      this.initDefaultData();
    } else {
      this.initDefaultProject();
    }
  }

  /**
   * Full Reset for Reload Seed: resets BOTH in-memory store and Supabase tables
   * for the specified project back to the clean CampusConnect baseline.
   */
  public async resetProjectStore(projectId = "CampusConnect"): Promise<void> {
    this.resetInMemoryStore(true);

    if (!this.isConfigured()) return;

    const client = getSupabaseServerClient();
    if (!client) return;

    try {
      await client.from("receipts").delete().eq("project_id", projectId);
      await client.from("audit_events").delete().eq("project_id", projectId);
      await client.from("gap_questions").delete().eq("project_id", projectId);
      await client.from("claims").delete().eq("project_id", projectId);
      await client.from("draft_versions").delete().eq("project_id", projectId);
      await client
        .from("quarantined_secrets")
        .delete()
        .eq("project_id", projectId);
      await client.from("chunks").delete().eq("project_id", projectId);
      await client.from("sources").delete().eq("project_id", projectId);

      this.verifiedSeeded.delete(projectId);
      if (projectId === "CampusConnect") {
        await this.seedSupabaseCampusConnect(client);
        this.verifiedSeeded.add(projectId);
      }
    } catch (err) {
      console.warn("[Supabase] resetProjectStore warning:", err);
    }
  }
}

// Global singleton repository
export const repository = new EchoBridgeRepository();
