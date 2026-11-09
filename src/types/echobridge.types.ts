/**
 * EchoBridge Domain Types & Interfaces
 * Defined in accordance with docs/PRD.md, docs/ARCHITECTURE.md, and docs/SECURITY.md
 */

// ============================================================================
// 1. Roles & Personas
// ============================================================================

export type Role =
  | "departing_member"
  | "reviewer"
  | "incoming_lead"
  | "incoming_intern";

export type AudienceRole = "incoming_lead" | "incoming_intern";

export interface PersonaProfile {
  role: Role;
  name: string;
  title: string;
  badge: string;
  description: string;
}

export const ALL_ROLES: readonly Role[] = [
  "departing_member",
  "reviewer",
  "incoming_lead",
  "incoming_intern",
] as const;

export const AUDIENCE_ROLES: readonly AudienceRole[] = [
  "incoming_lead",
  "incoming_intern",
] as const;

export const PERSONA_PROFILES: Record<Role, PersonaProfile> = {
  departing_member: {
    role: "departing_member",
    name: "Aarav",
    title: "Lead Developer (Graduating)",
    badge: "Departing Lead",
    description:
      "Connects sources, reviews auto-draft, answers unwritten rationale in Gap-Interview. Strictly prohibited from approving the handover.",
  },
  reviewer: {
    role: "reviewer",
    name: "Prof. Deshmukh",
    title: "Project Mentor / Approver",
    badge: "Mentor Reviewer",
    description:
      "Holds sole approval authority. Inspects Quarantine Vault, compares version diffs, resolves conflicts, and approves each audience view.",
  },
  incoming_lead: {
    role: "incoming_lead",
    name: "Riya",
    title: "Incoming Team Lead",
    badge: "Incoming Lead",
    description:
      "Full-privilege recipient. Receives architecture, active PRs, credentials/contacts, and confidential finance folder claims.",
  },
  incoming_intern: {
    role: "incoming_intern",
    name: "Kabir",
    title: "Incoming Intern",
    badge: "Incoming Intern",
    description:
      "Scoped recipient. Confidential sources are excluded pre-model and post-generation; restricted items appear only as generic placeholders.",
  },
} as const;

// ============================================================================
// 2. Sources & Ingestion
// ============================================================================

export type SourceType =
  | "document"
  | "git_repo"
  | "chat_export"
  | "task_board"
  | "runbook"
  | "finance_folder";

export interface Source {
  id: string;
  project_id: string;
  title: string;
  source_type: SourceType;
  author: string;
  source_timestamp: string;
  allowed_roles: AudienceRole[];
  raw_hash?: string;
  file_path?: string;
  created_at: string;
}

export interface Chunk {
  id: string;
  project_id: string;
  source_id: string;
  content: string; // Sanitized/redacted text
  author: string;
  chunk_timestamp: string;
  allowed_roles: AudienceRole[];
  embedding?: number[]; // 768-dim vector from text-embedding-004
  injection_flagged: boolean;
  redaction_count: number;
}

export type SecretType =
  | "api_key"
  | "phone"
  | "email"
  | "password"
  | "prompt_injection";

export type QuarantinedSecretStatus =
  | "quarantined"
  | "retained_metadata"
  | "purged";

export interface QuarantinedSecret {
  id: string;
  project_id: string;
  source_id: string;
  chunk_id: string;
  secret_type: SecretType;
  masked_preview: string;
  original_encrypted?: string;
  reviewer_status: QuarantinedSecretStatus;
  detected_at: string;
}

export type EntityType =
  | "decision"
  | "person"
  | "task"
  | "dependency"
  | "risk";

export interface ExtractedEntity {
  id: string;
  project_id: string;
  entity_type: EntityType;
  name: string;
  summary: string;
  source_chunk_ids: string[];
}

// ============================================================================
// 3. Evidence States & Citation Models
// ============================================================================

export type EvidenceState =
  | "corroborated"
  | "single_source"
  | "attested"
  | "stale"
  | "conflicting"
  | "unsupported"
  | "restricted";

export const EVIDENCE_STATES: readonly EvidenceState[] = [
  "corroborated",
  "single_source",
  "attested",
  "stale",
  "conflicting",
  "unsupported",
  "restricted",
] as const;

export type EntailmentVerdict = "supported" | "contradicted" | "unsupported";

export interface EvidenceRecord {
  id?: string;
  claim_id?: string;
  chunk_id: string;
  source_id: string;
  source_type: SourceType;
  source_title: string;
  author: string;
  evidence_timestamp: string;
  quoted_span: string; // Exact verbatim quote from the chunk
  source_link?: string;
  is_verbatim_verified: boolean;
  entailment_verdict: EntailmentVerdict;
}

export interface ConflictSide {
  value: string;
  author: string;
  timestamp: string;
  source_id: string;
  source_title: string;
  quoted_span: string;
  chunk_id: string;
}

export interface ConflictPair {
  entity_attribute: string; // e.g. "event_registration_deadline"
  side_a: ConflictSide;
  side_b: ConflictSide;
  resolved_winner?: "side_a" | "side_b" | "custom";
  custom_resolution?: string;
}

// ============================================================================
// 4. Claims, Reviews & Draft Versions
// ============================================================================

export type ClaimType =
  | "decision"
  | "owner"
  | "risk"
  | "dependency"
  | "next_action"
  | "contact";

export type HandoverSection =
  | "architecture"
  | "decisions"
  | "tasks_dependencies"
  | "contacts_ownership"
  | "onboarding_day1"
  | "onboarding_week1"
  | "onboarding_month1";

export type ReviewStatus =
  | "pending"
  | "approved"
  | "edited"
  | "redacted"
  | "rejected";

export interface ClaimReviewRecord {
  status: ReviewStatus;
  reviewer_id?: string;
  reviewer_name?: string;
  edited_text?: string;
  reviewed_at?: string;
  notes?: string;
}

export interface ClaimRecord {
  id: string;
  draft_version_id: string;
  project_id: string;
  audience_role: AudienceRole;
  section: HandoverSection;
  claim_type: ClaimType;
  text: string;
  evidence_state: EvidenceState;
  evidence: EvidenceRecord[];
  audience_acl: AudienceRole[]; // Intersection of all cited chunks' allowed_roles
  conflict_pair?: ConflictPair;
  review: ClaimReviewRecord;
  planted_trap_id?: number; // 1 to 8 if linked to CampusConnect test trap
  created_at?: string;
}

// ============================================================================
// 5. Confidence Score Heuristic
// ============================================================================

export interface ConfidenceWeights {
  citation_coverage: number; // 0.40
  corroboration_rate: number; // 0.25
  freshness_rate: number; // 0.15
  conflict_free_rate: number; // 0.20
}

export const CONFIDENCE_WEIGHTS: ConfidenceWeights = {
  citation_coverage: 0.4,
  corroboration_rate: 0.25,
  freshness_rate: 0.15,
  conflict_free_rate: 0.2,
};

export interface ConfidenceBreakdown {
  total_score: number; // 0 to 100
  citation_coverage: number; // 0.0 to 1.0 (>= 95% target)
  corroboration_rate: number; // 0.0 to 1.0 (Green independent sources)
  freshness_rate: number; // 0.0 to 1.0 (within 180 days threshold)
  conflict_rate: number; // 0.0 to 1.0 (percentage of conflicting claims)
  conflict_free_rate: number; // 1.0 - conflict_rate
  weights: ConfidenceWeights;
}

export type VersionLabel = "v1.0" | "v1.1" | "v2.0";
export type DraftStatus = "draft" | "gap_interview_complete" | "approved";

export interface DraftVersion {
  id: string;
  project_id: string;
  audience_role: AudienceRole;
  version_label: VersionLabel;
  confidence: ConfidenceBreakdown;
  status: DraftStatus;
  claims: ClaimRecord[];
  created_at: string;
  updated_at?: string;
}

// ============================================================================
// 6. Stage 4: Gap-Interview
// ============================================================================

export type GapQuestionStatus = "pending" | "answered" | "skipped_sudden_exit";

export interface GapQuestion {
  id: string;
  project_id: string;
  claim_id: string;
  question_text: string;
  context_summary: string;
  answer_text?: string;
  answered_by?: string;
  answered_at?: string;
  assigned_contact_if_unanswered?: string;
  status: GapQuestionStatus;
  planted_trap_id?: number;
}

// ============================================================================
// 7. Stage 6: Comprehension Check & Receipt
// ============================================================================

export interface ComprehensionQuestion {
  id: string;
  question: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
  related_risk_claim_id?: string;
}

export interface ReceiptAnswer {
  question_id: string;
  selected_index: number;
  is_correct: boolean;
}

export interface Receipt {
  id: string;
  project_id: string;
  draft_version_id: string;
  audience_role: AudienceRole;
  incoming_user_name: string;
  comprehension_score: number;
  comprehension_passed: boolean;
  answers?: ReceiptAnswer[];
  acknowledged_at: string;
  receipt_hash?: string;
}

// ============================================================================
// 8. Immutable Audit Log
// ============================================================================

export type AuditEventType =
  | "source_connected"
  | "secret_quarantined"
  | "injection_flagged"
  | "draft_generated"
  | "access_denied_guard"
  | "gap_answered"
  | "claim_reviewed"
  | "handover_approved"
  | "receipt_acknowledged"
  | "role_switched";

export interface AuditEvent {
  id: string;
  project_id: string;
  actor_role: Role;
  actor_name: string;
  event_type: AuditEventType;
  details_json: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// 9. Project & Planted Traps Verification
// ============================================================================

export interface Project {
  id: string;
  name: string;
  description: string;
  freshness_threshold_days: number; // default 180 (6 months)
  created_at: string;
}

export type PlantedTrapStatus = "pending" | "seeded" | "verified" | "failed";

export interface PlantedTrapVerification {
  trap_id: number;
  name: string;
  description: string;
  expected_behavior: string;
  status: PlantedTrapStatus;
  evidence_claim_id?: string;
  target_route: string;
  verification_details?: string;
}
