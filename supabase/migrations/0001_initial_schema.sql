-- ============================================================================
-- EchoBridge Initial Schema (Supabase PostgreSQL + pgvector)
-- Migration: 0001_initial_schema.sql
-- In accordance with docs/ARCHITECTURE.md Section 4
-- ============================================================================

-- Enable pgvector extension for 768-dim embeddings from text-embedding-004
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Projects
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  freshness_threshold_days INTEGER NOT NULL DEFAULT 180,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Sources (Ingested Authorised Source Files/Exports)
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('document', 'git_repo', 'chat_export', 'task_board', 'runbook', 'finance_folder')),
  author TEXT NOT NULL,
  source_timestamp TIMESTAMPTZ NOT NULL,
  allowed_roles TEXT[] NOT NULL DEFAULT ARRAY['incoming_lead', 'incoming_intern'],
  raw_hash TEXT,
  file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Chunks (Sanitized/Redacted Content Chunks + Vector Embeddings)
CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  chunk_timestamp TIMESTAMPTZ NOT NULL,
  allowed_roles TEXT[] NOT NULL DEFAULT ARRAY['incoming_lead', 'incoming_intern'],
  embedding vector(768),
  injection_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  redaction_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for role-based metadata filtering
CREATE INDEX IF NOT EXISTS chunks_allowed_roles_idx ON chunks USING GIN (allowed_roles);

-- 4. Quarantined Secrets (Masked previews + Encrypted Originals for Reviewer)
CREATE TABLE IF NOT EXISTS quarantined_secrets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  chunk_id TEXT REFERENCES chunks(id) ON DELETE SET NULL,
  secret_type TEXT NOT NULL CHECK (secret_type IN ('api_key', 'phone', 'email', 'password', 'prompt_injection')),
  masked_preview TEXT NOT NULL,
  original_encrypted TEXT,
  reviewer_status TEXT NOT NULL DEFAULT 'quarantined' CHECK (reviewer_status IN ('quarantined', 'retained_metadata', 'purged')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Entities (Extracted key architectural decisions, owners, tasks, risks)
CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('decision', 'person', 'task', 'dependency', 'risk')),
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_chunk_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Draft Versions (Handover Versions v1.0, v1.1, v2.0 per audience)
CREATE TABLE IF NOT EXISTS draft_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  audience_role TEXT NOT NULL CHECK (audience_role IN ('incoming_lead', 'incoming_intern')),
  version_label TEXT NOT NULL CHECK (version_label IN ('v1.0', 'v1.1', 'v2.0')),
  confidence_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
  citation_coverage NUMERIC(5, 4) NOT NULL DEFAULT 0,
  corroboration_rate NUMERIC(5, 4) NOT NULL DEFAULT 0,
  freshness_rate NUMERIC(5, 4) NOT NULL DEFAULT 0,
  conflict_rate NUMERIC(5, 4) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'gap_interview_complete', 'approved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Claims (Atomic statements with Evidence States and Review Status)
CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  draft_version_id TEXT NOT NULL REFERENCES draft_versions(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  audience_role TEXT NOT NULL CHECK (audience_role IN ('incoming_lead', 'incoming_intern')),
  section TEXT NOT NULL CHECK (section IN ('architecture', 'decisions', 'tasks_dependencies', 'contacts_ownership', 'onboarding_day1', 'onboarding_week1', 'onboarding_month1')),
  claim_type TEXT NOT NULL CHECK (claim_type IN ('decision', 'owner', 'risk', 'dependency', 'next_action', 'contact')),
  text TEXT NOT NULL,
  evidence_state TEXT NOT NULL CHECK (evidence_state IN ('corroborated', 'single_source', 'attested', 'stale', 'conflicting', 'unsupported', 'restricted')),
  audience_acl TEXT[] NOT NULL DEFAULT ARRAY['incoming_lead', 'incoming_intern'],
  conflict_pair_json JSONB,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'edited', 'redacted', 'rejected')),
  reviewer_id TEXT,
  reviewer_name TEXT,
  edited_text TEXT,
  reviewed_at TIMESTAMPTZ,
  planted_trap_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Claim Evidence (Citations tying atomic claims to verbatim chunks)
CREATE TABLE IF NOT EXISTS claim_evidence (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  chunk_id TEXT NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_title TEXT NOT NULL,
  author TEXT NOT NULL,
  evidence_timestamp TIMESTAMPTZ NOT NULL,
  quoted_span TEXT NOT NULL,
  source_link TEXT,
  is_verbatim_verified BOOLEAN NOT NULL DEFAULT FALSE,
  entailment_verdict TEXT NOT NULL DEFAULT 'unsupported' CHECK (entailment_verdict IN ('supported', 'contradicted', 'unsupported')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Gap Questions (Targeted questions for departing member in Stage 4)
CREATE TABLE IF NOT EXISTS gap_questions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  context_summary TEXT NOT NULL,
  answer_text TEXT,
  answered_by TEXT,
  answered_at TIMESTAMPTZ,
  assigned_contact_if_unanswered TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'skipped_sudden_exit')),
  planted_trap_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Receipts (Signed transfer acknowledgment + Comprehension Check score in Stage 6)
CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  draft_version_id TEXT NOT NULL REFERENCES draft_versions(id) ON DELETE CASCADE,
  audience_role TEXT NOT NULL CHECK (audience_role IN ('incoming_lead', 'incoming_intern')),
  incoming_user_name TEXT NOT NULL,
  comprehension_score INTEGER NOT NULL,
  comprehension_passed BOOLEAN NOT NULL DEFAULT FALSE,
  answers_json JSONB,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Audit Events (Immutable audit trail for compliance and evaluation)
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('departing_member', 'reviewer', 'incoming_lead', 'incoming_intern')),
  actor_name TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'source_connected',
    'secret_quarantined',
    'injection_flagged',
    'draft_generated',
    'access_denied_guard',
    'gap_answered',
    'claim_reviewed',
    'handover_approved',
    'receipt_acknowledged',
    'role_switched'
  )),
  details_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_events_project_created_idx ON audit_events(project_id, created_at DESC);

-- ============================================================================
-- RPC: Role-Filtered Vector Search
-- Filters by allowed_roles before computing cosine similarity
-- ============================================================================
CREATE OR REPLACE FUNCTION match_chunks_with_role_filter(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_role text
)
RETURNS TABLE (
  id text,
  project_id text,
  source_id text,
  content text,
  author text,
  chunk_timestamp timestamptz,
  allowed_roles text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.project_id,
    c.source_id,
    c.content,
    c.author,
    c.chunk_timestamp,
    c.allowed_roles,
    (1 - (c.embedding <=> query_embedding))::float AS similarity
  FROM chunks c
  WHERE filter_role = ANY(c.allowed_roles)
    AND (1 - (c.embedding <=> query_embedding)) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
