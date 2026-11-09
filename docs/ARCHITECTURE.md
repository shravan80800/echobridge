# Architecture Document (`ARCHITECTURE.md`)

## 1. High-Level System Overview
**EchoBridge** is built as a unified, full-stack **Next.js (App Router) + TypeScript** application deployed on **Vercel** and backed by **Supabase (PostgreSQL + `pgvector`)** and the **Google Gemini API (`@google/genai`)**.

To guarantee a frictionless evaluation experience for hackathon judges (both on the live **Vercel URL** and when cloned locally from **GitHub**), EchoBridge supports:
1. **Live Production Mode (Supabase + Gemini API):** Full relational + vector persistence in Supabase PostgreSQL (`pgvector`) with real-time Gemini 2.5 Flash generation and entailment verification.
2. **Instant Judge Demo Mode (Pre-Seeded `CampusConnect` State + 1-Click Role Switcher):** Pre-loaded with the synthetic `CampusConnect` repository, chat exports, runbook, and finance folder so judges visiting the Vercel URL can immediately test all 6 workflow stages, inspect the 8 planted traps, and switch between `Departing Lead`, `Reviewer (Faculty Mentor)`, `Incoming Team Lead`, and `Incoming Intern` with zero setup friction.

## 2. Technology Stack

| Layer | Choice | Purpose & Rationale |
| :--- | :--- | :--- |
| **Frontend & UI** | Next.js 15 (App Router), React 19, TypeScript | Unified full-stack framework with native Vercel deployment, Server Components, and strict end-to-end type safety. |
| **Styling & Visuals** | Tailwind CSS, Lucide React, React Flow (Stretch) | Consistent design tokens for the 6 Evidence States, accessible badges (colour + icon + label), side-by-side diff view, and optional Context Web graph. |
| **Backend & API** | Next.js Route Handlers (`/api/*`) & Server Actions | Serverless execution for ingestion, secret redaction, RBAC enforcement, Trust Pipeline orchestration, and audit logging. |
| **Relational + Vector Store** | Supabase PostgreSQL + `pgvector` | Single source of truth storing relational entities (`projects`, `sources`, `chunks`, `claims`, `draft_versions`, `reviews`, `receipts`, `audit_events`) alongside 768-dim vector embeddings with SQL-level `audience_acl` metadata filtering. |
| **AI & Trust Pipeline** | Google Gemini (`gemini-2.5-flash` + `text-embedding-004`) via `@google/genai` | Fast, low-latency structured JSON generation (`temperature: 0`), semantic entailment verification, targeted gap-interview generation, and 768-dimension chunk embeddings. |
| **Auth & RBAC** | Supabase Auth + Server-Verified HTTP-Only Demo Session Cookie | Enforces strict server-side role permissions (`departing_member`, `reviewer`, `incoming_lead`, `incoming_intern`) plus a 1-click Judge Role Switcher bar. |
| **Testing** | Vitest (Unit/Integration) + Playwright (E2E) | Automated verification of redaction regexes, independence rules, confidence score math, and end-to-end tests for all 8 planted traps. |
| **Hosting & CI/CD** | GitHub + Vercel | Automatic Preview deployments on every branch push and Production deployment on `main`. |

## 3. End-to-End Architecture & Data Flow

```text
Authorised Sources (Docs, Git Export, Chat/Task Board, Finance Folder)
   │
   ▼
[Stage 1: Connect & Scope Confirmation] ──► Imports Source ACLs (public, club_internal, lead_only, finance_restricted)
   │
   ▼
[Stage 2: Parse, Redact & Index Service]
   ├──► Secret & PII Redactor (Masks API keys, phones, emails -> Quarantines originals)
   ├──► Prompt-Injection Guard (Flags & strips "ignore previous instructions" patterns)
   └──► Chunker + Embedder (`text-embedding-004`) ──► Stores in Supabase `chunks` table with `allowed_roles[]`
   │
   ▼
[Stage 3: Permission-Scoped Trust Pipeline (Run separately per Target Audience: Team Lead vs. Intern)]
   ├──► 1. Pre-Model RBAC Filter: SQL query fetches ONLY chunks where `target_role = ANY(allowed_roles)`
   ├──► 2. Retrieve-Only Generation (`gemini-2.5-flash`, temp=0): Emits Atomic Claims + `chunk_id` + `quoted_span`
   ├──► 3. Two-Layer Citation Checker:
   │       ├─► Layer A (Deterministic): Verifies `quoted_span` exists verbatim in cited chunk & ACL is valid
   │       └─► Layer B (Semantic Judge): Verifies chunk entails claim; checks Author Independence Rule
   ├──► 4. Conflict & Staleness Detector: Flags Purple conflicts (side-by-side) & Orange stale claims (>6 months)
   └──► 5. Post-Generation Guard: Re-verifies `claim.audience_acl`; replaces restricted items in Intern View with `"Restricted: request access"`
   │
   ▼
[Stage 4: Targeted Gap-Interview]
   └──► Generates 5–10 questions for Red (`Unsupported`) & critical Yellow (`Single-source`) claims
   └──► Departing member submits answers ──► Stored as Blue (`Attested`) evidence ( creates Draft `v1.1` )
   │
   ▼
[Stage 5: Human Review & Version Diff (`Reviewer` Only)]
   └──► Reviewer compares `v1.0` vs `v1.1`, resolves conflicts, edits/redacts/rejects claims, approves per role (`v2.0`)
   │
   ▼
[Stage 6: Role-Appropriate Handover & Receipt]
   └──► Incoming Lead / Intern views approved role plan (Day 1, Week 1, Month 1), passes Risk Comprehension Check, signs Receipt
```

## 4. Database Schema (Supabase PostgreSQL + `pgvector`)

All tables live in `supabase/migrations/0001_initial_schema.sql`:

1. **`projects`**: `id`, `name` (e.g., `"CampusConnect"`), `description`, `freshness_threshold_days` (default `180`), `created_at`
2. **`sources`**: `id`, `project_id`, `title`, `source_type` (`document` | `git_repo` | `chat_export` | `task_board` | `runbook` | `finance_folder`), `author`, `source_timestamp`, `allowed_roles` (`text[]`, e.g., `['incoming_lead', 'incoming_intern']` or `['incoming_lead']`), `raw_hash`, `created_at`
3. **`chunks`**: `id`, `project_id`, `source_id`, `content` (redacted text), `author`, `chunk_timestamp`, `allowed_roles` (`text[]`), `embedding` (`vector(768)`), `injection_flagged` (`boolean`), `redaction_count` (`int`)
4. **`quarantined_secrets`**: `id`, `project_id`, `source_id`, `chunk_id`, `secret_type` (`api_key` | `phone` | `email` | `password` | `prompt_injection`), `masked_preview`, `original_encrypted`, `reviewer_status` (`quarantined` | `retained_metadata` | `purged`), `detected_at`
5. **`entities`**: `id`, `project_id`, `entity_type` (`decision` | `person` | `task` | `dependency` | `risk`), `name`, `summary`, `source_chunk_ids` (`uuid[]`)
6. **`draft_versions`**: `id`, `project_id`, `audience_role` (`incoming_lead` | `incoming_intern`), `version_label` (`v1.0` | `v1.1` | `v2.0`), `confidence_score` (`numeric`), `citation_coverage` (`numeric`), `corroboration_rate` (`numeric`), `freshness_rate` (`numeric`), `conflict_rate` (`numeric`), `status` (`draft` | `gap_interview_complete` | `approved`), `created_at`
7. **`claims`**: `id`, `draft_version_id`, `project_id`, `audience_role`, `section` (`architecture` | `decisions` | `tasks_dependencies` | `contacts_ownership` | `onboarding_day1` | `onboarding_week1` | `onboarding_month1`), `claim_type` (`decision` | `owner` | `risk` | `dependency` | `next_action` | `contact`), `text`, `evidence_state` (`corroborated` | `single_source` | `attested` | `stale` | `conflicting` | `unsupported` | `restricted`), `audience_acl` (`text[]`), `conflict_pair_json` (`jsonb`), `review_status` (`pending` | `approved` | `edited` | `redacted` | `rejected`), `reviewer_id`, `edited_text`, `reviewed_at`
8. **`claim_evidence`**: `id`, `claim_id`, `chunk_id`, `source_id`, `source_type`, `author`, `evidence_timestamp`, `quoted_span`, `source_link`, `is_verbatim_verified` (`boolean`), `entailment_verdict` (`supported` | `contradicted` | `unsupported`)
9. **`gap_questions`**: `id`, `project_id`, `claim_id`, `question_text`, `context_summary`, `answer_text`, `answered_by`, `answered_at`, `assigned_contact_if_unanswered`, `status` (`pending` | `answered` | `skipped_sudden_exit`)
10. **`receipts`**: `id`, `project_id`, `draft_version_id`, `audience_role`, `incoming_user_name`, `comprehension_score` (`int`), `comprehension_passed` (`boolean`), `acknowledged_at`
11. **`audit_events`**: `id`, `project_id`, `actor_role`, `actor_name`, `event_type` (`source_connected` | `secret_quarantined` | `injection_flagged` | `draft_generated` | `access_denied_guard` | `gap_answered` | `claim_reviewed` | `handover_approved` | `receipt_acknowledged`), `details_json` (`jsonb`), `created_at`

## 5. Project Folder Structure

```text
echobridge/
│
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DESIGN.md
│   ├── RULES.md
│   ├── DECISIONS.md
│   ├── MEMORY.md
│   ├── TEST_PLAN.md
│   └── SECURITY.md
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout + Judge Demo Role Switcher Banner + Audit Drawer
│   │   ├── page.tsx                   # Landing & Project Overview (CampusConnect Status + 6-Stage Stepper)
│   │   ├── connect/page.tsx           # Stage 1 & 2: Source Connection, ACL Scope Map & Redaction Quarantine
│   │   ├── draft/page.tsx             # Stage 3: Evidence-Coloured Handover Draft + Confidence Score Breakdown
│   │   ├── gap-interview/page.tsx     # Stage 4: Targeted Gap-Interview UI for Departing Member
│   │   ├── review/page.tsx            # Stage 5: Reviewer Approval Dashboard, Side-by-Side Diff & Conflict Resolver
│   │   ├── handover/page.tsx          # Stage 6: Role-Filtered Handover (Lead vs Intern), Day1/Week1/Month1 + Receipt
│   │   ├── metrics/page.tsx           # Calibration & Trap Verification Scorecard (8 Planted Traps Live Check)
│   │   └── api/
│   │       ├── ingest/route.ts        # POST: Parse, redact secrets/injections, chunk & index sources
│   │       ├── reconstruct/route.ts   # POST: Run audience-scoped retrieval, Gemini generation & 2-layer checker
│   │       ├── gap-interview/route.ts # GET/POST: Fetch gap questions & submit Blue Attested answers (creates v1.1)
│   │       ├── review/route.ts        # POST: Reviewer approve/edit/redact/reject claim & publish v2.0
│   │       ├── handover/route.ts      # GET/POST: Fetch role-scoped handover & submit comprehension receipt
│   │       └── audit/route.ts         # GET: Retrieve immutable audit trail
│   │
│   ├── components/
│   │   ├── layout/                    # Navbar, WorkflowStepper, RoleSwitcherBar, AuditLogDrawer
│   │   ├── evidence/                  # EvidenceBadge, ClaimCard, SourceCitationPopover, ConfidenceScoreCard
│   │   ├── review/                    # VersionDiffViewer, ConflictResolutionCard, RedactionQuarantineTable
│   │   ├── interview/                 # GapQuestionCard, SuddenExitFallbackBanner
│   │   ├── handover/                  # OnboardingTimeline (Day 1, Week 1, Month 1), ComprehensionQuizModal, ReceiptBanner
│   │   └── ui/                        # Reusable Button, Card, Badge, Modal, Tabs, EmptyState, Alert
│   │
│   ├── services/
│   │   ├── ingestion/
│   │   │   ├── parser.service.ts      # Parses Markdown docs, Git JSON/text exports, Chat & Task exports
│   │   │   ├── redaction.service.ts   # Regex + heuristic detector for API keys, phones, emails & credentials
│   │   │   └── injection.service.ts   # Detects & strips prompt-injection instructions ("ignore previous...")
│   │   ├── trust/
│   │   │   ├── rbac.service.ts        # Pre-model chunk ACL filter & Post-generation claim guard
│   │   │   ├── generator.service.ts   # Retrieve-only Gemini structured claim generation per audience
│   │   │   ├── verifier.service.ts    # Deterministic verbatim span check + Semantic entailment + Independence rule
│   │   │   ├── conflict.service.ts    # Entity/attribute contradiction detector & freshness (>6m) staleness checker
│   │   │   └── confidence.service.ts  # Computes transparent 4-part Confidence Score heuristic
│   │   ├── workflow/
│   │   │   ├── interview.service.ts   # Gap question generator & Blue Attested claim updater
│   │   │   ├── review.service.ts      # Version snapshot manager (v1.0 -> v1.1 -> v2.0) & diff calculator
│   │   │   └── audit.service.ts       # Append-only audit logger
│   │   └── seed/
│   │       └── campus-connect.seed.ts # Complete synthetic CampusConnect dataset with all 8 planted traps
│   │
│   ├── lib/
│   │   ├── supabase/                  # Supabase server & client initializers + fallback in-memory store for zero-config demo
│   │   └── gemini/                    # Google GenAI (`@google/genai`) client wrapper with structured schema helpers
│   │
│   ├── types/
│   │   └── echobridge.types.ts        # Strict TypeScript interfaces for Claim, EvidenceState, Chunk, Role, Review, Audit
│   │
│   └── utils/
│       ├── text-matching.ts           # Normalized verbatim substring matcher for deterministic citation checking
│       └── date-freshness.ts          # Timestamp comparison utilities for 6-month staleness detection
│
├── supabase/
│   └── migrations/
│       └── 0001_initial_schema.sql    # Full PostgreSQL + pgvector schema
│
├── tests/
│   ├── unit/                          # Vitest unit tests (redaction, independence rule, confidence score, RBAC guard)
│   ├── integration/                   # Pipeline tests verifying the 8 planted traps on CampusConnect data
│   └── e2e/                           # Playwright browser tests across Departing Lead, Reviewer, Lead & Intern views
│
├── TASKS.md
├── README.md
├── .env.example
├── .gitignore
└── package.json
```

## 6. Strict Architectural Rules (Enforced Across All Phases)
1. **UI Components Never Contain Business or Database Logic:** Components in `src/components/` and pages in `src/app/` only render state and invoke functions from `src/services/` or `/api/*` routes.
2. **Pre-Model AND Post-Generation RBAC Enforcement:**
   - Retrieval for an audience (`incoming_lead` vs. `incoming_intern`) MUST filter chunks by `allowed_roles` *before* building the LLM prompt context. Restricted chunks (such as the `Finance Folder`) must never enter the model context for the Intern draft.
   - After generation, `rbac.service.ts` re-computes `claim.audience_acl` as the intersection of all cited chunks' `allowed_roles`. Any claim citing a chunk outside the target audience's scope is immediately dropped and logged to `audit_events`.
3. **Strict Author Independence Rule for Green (`Corroborated`) State:**
   - Two cited chunks count as independent ONLY if `chunkA.author !== chunkB.author` AND neither chunk copies or quotes the other. Multiple chunks by the same author (e.g., a chat message and a doc both written by the departing lead) count as **1 source** (`Single-source` Yellow).
4. **Never Silently Pick a Winner on Conflicts:**
   - When two chunks disagree on the same entity/attribute (e.g., event registration closing on March 15 in chat vs. March 20 in the planning doc), `conflict.service.ts` marks the claim as `Conflicting` (Purple) and preserves both values, authors, and timestamps side-by-side for the human Reviewer.
5. **Departing Member Cannot Approve the Handover:**
   - Server-side authorization in `/api/review` rejects any approval request where `actor_role === 'departing_member'`. Only `reviewer` (Project Lead / Faculty Mentor) can transition a draft version to `approved`.
6. **Zero-Config Resilience on Vercel & GitHub:**
   - While Supabase + Gemini API power live dynamic runs, `campus-connect.seed.ts` provides a deterministic, pre-computed snapshot fallback so that if an evaluator clones the repo without API keys or visits the live Vercel link during rate-limiting, the entire `CampusConnect` workflow and all 8 planted traps remain 100% interactive and testable.
