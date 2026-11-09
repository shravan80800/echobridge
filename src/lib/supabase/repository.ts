/**
 * EchoBridge Dual-Mode Repository
 * Implements ADR-002: Supabase PostgreSQL + pgvector primary store with
 * zero-config deterministic in-memory fallback for Vercel preview & GitHub evaluation.
 */

import type {
  Project,
  Source,
  Chunk,
  QuarantinedSecret,
  DraftVersion,
  ClaimRecord,
  ClaimReviewRecord,
  GapQuestion,
  Receipt,
  AuditEvent,
  AudienceRole,
  VersionLabel,
} from "@/types/echobridge.types";
import { isSupabaseConfigured } from "./client";
import { getSupabaseServerClient } from "./server";

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

export class EchoBridgeRepository {
  // In-Memory storage structures for zero-config mode
  private projects = new Map<string, Project>();
  private sources = new Map<string, Source>();
  private chunks = new Map<string, Chunk>();
  private secrets = new Map<string, QuarantinedSecret>();
  private drafts = new Map<string, DraftVersion>();
  private claims = new Map<string, ClaimRecord>();
  private gapQuestions = new Map<string, GapQuestion>();
  private receipts = new Map<string, Receipt>();
  private auditEvents: AuditEvent[] = [];

  constructor() {
    this.initDefaultProject();
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
   * Returns whether the repository is currently connected to Supabase
   * or running in the zero-config fallback in-memory mode.
   */
  public isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  // ==========================================================================
  // Projects
  // ==========================================================================

  public async getProject(projectId: string): Promise<Project | null> {
    if (this.isConfigured()) {
      const client = getSupabaseServerClient();
      if (client) {
        const { data, error } = await client
          .from("projects")
          .select("*")
          .eq("id", projectId)
          .single();
        if (!error && data) return data as Project;
      }
    }
    return this.projects.get(projectId) || null;
  }

  public async listProjects(): Promise<Project[]> {
    if (this.isConfigured()) {
      const client = getSupabaseServerClient();
      if (client) {
        const { data, error } = await client.from("projects").select("*");
        if (!error && data) return data as Project[];
      }
    }
    return Array.from(this.projects.values());
  }

  public async createProject(project: Project): Promise<Project> {
    if (this.isConfigured()) {
      const client = getSupabaseServerClient();
      if (client) {
        await client.from("projects").upsert(project);
      }
    }
    this.projects.set(project.id, project);
    return project;
  }

  // ==========================================================================
  // Sources
  // ==========================================================================

  public async listSources(projectId: string): Promise<Source[]> {
    if (this.isConfigured()) {
      const client = getSupabaseServerClient();
      if (client) {
        const { data, error } = await client
          .from("sources")
          .select("*")
          .eq("project_id", projectId);
        if (!error && data) return data as Source[];
      }
    }
    return Array.from(this.sources.values()).filter(
      (s) => s.project_id === projectId
    );
  }

  public async createSource(source: Source): Promise<Source> {
    if (this.isConfigured()) {
      const client = getSupabaseServerClient();
      if (client) {
        await client.from("sources").upsert(source);
      }
    }
    this.sources.set(source.id, source);
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
      const client = getSupabaseServerClient();
      if (client) {
        let query = client.from("chunks").select("*").eq("project_id", projectId);
        if (audienceRole) {
          query = query.contains("allowed_roles", [audienceRole]);
        }
        const { data, error } = await query;
        if (!error && data) return data as Chunk[];
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
    if (this.isConfigured()) {
      const client = getSupabaseServerClient();
      if (client) {
        await client.from("chunks").upsert(chunks);
      }
    }
    for (const chunk of chunks) {
      this.chunks.set(chunk.id, chunk);
    }
    return chunks;
  }

  /**
   * Pre-Model RBAC Retrieval: Filters chunks strictly where filter_role is in allowed_roles.
   * If search text is provided, performs substring matching on content.
   */
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
  // Quarantined Secrets & Prompt Injections (Trap 4 & 6)
  // ==========================================================================

  public async listSecrets(projectId: string): Promise<QuarantinedSecret[]> {
    if (this.isConfigured()) {
      const client = getSupabaseServerClient();
      if (client) {
        const { data, error } = await client
          .from("quarantined_secrets")
          .select("*")
          .eq("project_id", projectId);
        if (!error && data) return data as QuarantinedSecret[];
      }
    }
    return Array.from(this.secrets.values()).filter(
      (s) => s.project_id === projectId
    );
  }

  public async createSecret(
    secret: QuarantinedSecret
  ): Promise<QuarantinedSecret> {
    if (this.isConfigured()) {
      const client = getSupabaseServerClient();
      if (client) {
        await client.from("quarantined_secrets").upsert(secret);
      }
    }
    this.secrets.set(secret.id, secret);
    return secret;
  }

  // ==========================================================================
  // Draft Versions & Claims (Stage 3 & 5)
  // ==========================================================================

  public async getDraftVersion(
    projectId: string,
    audienceRole: AudienceRole,
    versionLabel?: VersionLabel
  ): Promise<DraftVersion | null> {
    const allDrafts = Array.from(this.drafts.values()).filter(
      (d) => d.project_id === projectId && d.audience_role === audienceRole
    );

    if (versionLabel) {
      const match = allDrafts.find((d) => d.version_label === versionLabel);
      if (match) {
        match.claims = await this.getClaimsForAudience(
          projectId,
          audienceRole,
          match.id
        );
        return match;
      }
      return null;
    }

    // Default to the latest version by label priority (v2.0 > v1.1 > v1.0)
    const priority: Record<VersionLabel, number> = {
      "v2.0": 3,
      "v1.1": 2,
      "v1.0": 1,
    };

    allDrafts.sort(
      (a, b) => (priority[b.version_label] || 0) - (priority[a.version_label] || 0)
    );

    const latest = allDrafts[0] || null;
    if (latest) {
      latest.claims = await this.getClaimsForAudience(
        projectId,
        audienceRole,
        latest.id
      );
    }
    return latest;
  }

  public async saveDraftVersion(draft: DraftVersion): Promise<DraftVersion> {
    this.drafts.set(draft.id, draft);
    for (const claim of draft.claims) {
      this.claims.set(claim.id, claim);
    }

    if (this.isConfigured()) {
      const client = getSupabaseServerClient();
      if (client) {
        await client.from("draft_versions").upsert({
          id: draft.id,
          project_id: draft.project_id,
          audience_role: draft.audience_role,
          version_label: draft.version_label,
          confidence_score: draft.confidence.total_score,
          citation_coverage: draft.confidence.citation_coverage,
          corroboration_rate: draft.confidence.corroboration_rate,
          freshness_rate: draft.confidence.freshness_rate,
          conflict_rate: draft.confidence.conflict_rate,
          status: draft.status,
          created_at: draft.created_at,
        });

        for (const claim of draft.claims) {
          await client.from("claims").upsert({
            id: claim.id,
            draft_version_id: claim.draft_version_id,
            project_id: claim.project_id,
            audience_role: claim.audience_role,
            section: claim.section,
            claim_type: claim.claim_type,
            text: claim.text,
            evidence_state: claim.evidence_state,
            audience_acl: claim.audience_acl,
            conflict_pair_json: claim.conflict_pair || null,
            review_status: claim.review.status,
            reviewer_id: claim.review.reviewer_id || null,
            reviewer_name: claim.review.reviewer_name || null,
            edited_text: claim.review.edited_text || null,
            reviewed_at: claim.review.reviewed_at || null,
            planted_trap_id: claim.planted_trap_id || null,
          });
        }
      }
    }

    return draft;
  }

  public async getClaimsForAudience(
    projectId: string,
    audienceRole: AudienceRole,
    draftVersionId?: string
  ): Promise<ClaimRecord[]> {
    return Array.from(this.claims.values()).filter((c) => {
      const projectMatch = c.project_id === projectId;
      const roleMatch = c.audience_role === audienceRole;
      const draftMatch = draftVersionId
        ? c.draft_version_id === draftVersionId
        : true;
      return projectMatch && roleMatch && draftMatch;
    });
  }

  public async updateClaimReview(
    claimId: string,
    review: ClaimReviewRecord
  ): Promise<ClaimRecord | null> {
    const claim = this.claims.get(claimId);
    if (!claim) return null;

    claim.review = {
      ...claim.review,
      ...review,
      reviewed_at: review.reviewed_at || new Date().toISOString(),
    };

    if (review.edited_text) {
      claim.text = review.edited_text;
    }

    this.claims.set(claimId, claim);
    return claim;
  }

  // ==========================================================================
  // Gap Questions (Stage 4)
  // ==========================================================================

  public async listGapQuestions(projectId: string): Promise<GapQuestion[]> {
    return Array.from(this.gapQuestions.values()).filter(
      (g) => g.project_id === projectId
    );
  }

  public async answerGapQuestion(
    questionId: string,
    answerText: string,
    answeredBy: string
  ): Promise<GapQuestion | null> {
    const question = this.gapQuestions.get(questionId);
    if (!question) return null;

    question.answer_text = answerText;
    question.answered_by = answeredBy;
    question.answered_at = new Date().toISOString();
    question.status = "answered";

    this.gapQuestions.set(questionId, question);

    // If associated claim exists, transition its evidence state to 'attested'
    const claim = this.claims.get(question.claim_id);
    if (claim) {
      claim.evidence_state = "attested";
      claim.text = `${claim.text} [Attested: ${answerText}]`;
      this.claims.set(claim.id, claim);
    }

    return question;
  }

  public async skipGapQuestionSuddenExit(
    questionId: string,
    assignedContact: string
  ): Promise<GapQuestion | null> {
    const question = this.gapQuestions.get(questionId);
    if (!question) return null;

    question.assigned_contact_if_unanswered = assignedContact;
    question.status = "skipped_sudden_exit";

    this.gapQuestions.set(questionId, question);
    return question;
  }

  // ==========================================================================
  // Receipts & Comprehension Check (Stage 6)
  // ==========================================================================

  public async getReceipt(
    projectId: string,
    audienceRole: AudienceRole
  ): Promise<Receipt | null> {
    const all = Array.from(this.receipts.values()).filter(
      (r) => r.project_id === projectId && r.audience_role === audienceRole
    );
    return all[0] || null;
  }

  public async saveReceipt(receipt: Receipt): Promise<Receipt> {
    this.receipts.set(receipt.id, receipt);
    return receipt;
  }

  // ==========================================================================
  // Immutable Audit Log
  // ==========================================================================

  public async listAuditEvents(
    projectId: string,
    limit = 50
  ): Promise<AuditEvent[]> {
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
    return fullEvent;
  }

  // ==========================================================================
  // Seed & Reset Utilities (For TASK-006 & Testing)
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

  public resetInMemoryStore(): void {
    this.projects.clear();
    this.sources.clear();
    this.chunks.clear();
    this.secrets.clear();
    this.drafts.clear();
    this.claims.clear();
    this.gapQuestions.clear();
    this.receipts.clear();
    this.auditEvents = [];
    this.initDefaultProject();
  }
}

// Global singleton repository
export const repository = new EchoBridgeRepository();
