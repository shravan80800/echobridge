# Project Memory (`MEMORY.md`)

> **Purpose:** This file tracks the **live project state** of EchoBridge (whereas `DECISIONS.md` stores permanent architectural decisions).  
> **AI Agent Instruction:** Read this file before starting any task, and update `Current Status`, `Completed Tasks`, `Current Task`, `Known Issues`, and `Next Step` immediately after finishing and verifying each `TASK-XXX`.

## 1. Current Status
- **Phase:** Phase 1 — Project Initialization, Design Tokens & Core Types (Ready to start implementation)
- **Active Environment:** Local Development $\rightarrow$ GitHub $\rightarrow$ Vercel Preview / Production
- **Demo Dataset State:** `CampusConnect` synthetic dataset specified in `PRD.md` and `TASKS.md` (8 planted traps ready to be seeded in `TASK-006`).
- **Active Stack:** Next.js 15 (App Router) + TypeScript + Tailwind CSS + Supabase PostgreSQL (`pgvector`) + Google Gemini (`gemini-2.5-flash` & `text-embedding-004`).

## 2. Completed Milestones & Documentation
- [x] `docs/PRD.md` — Product scope, 3 personas, 6 workflow stages, Confidence Score formula, and 8 planted traps defined.
- [x] `docs/ARCHITECTURE.md` — Unified Next.js + Supabase (`pgvector`) + Gemini stack, 11-table schema, and folder structure locked in.
- [x] `docs/DESIGN.md` — Modern techy dark-first design system (`#090D16` / `#111827` / `#6366F1` / `#06B6D4`) and 7-state accessible `EvidenceBadge` tokens defined.
- [x] `docs/RULES.md` — AI coding guardrails, Vibe Coding Loop, and RBAC/Verifier rules established.
- [x] `TASKS.md` — 9 phases (`TASK-001` through `TASK-026`) decomposed into vertical slices.
- [x] `docs/DECISIONS.md` — `ADR-001` through `ADR-008` recorded.

## 3. Completed Implementation Tasks
- [x] `TASK-001: Initialize Next.js 15 App Router Project & Tooling` — Scaffolded Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v3, Lucide React, Google Gen AI SDK, Supabase JS, ESLint, and Vitest. Documentation files organized into `docs/` and `.env.example` created. Builds and typechecks cleanly.
- [x] `TASK-002: Configure Modern Tech Dark Theme & Typography (DESIGN.md)` — Configured Inter (`font-sans`) and JetBrains Mono (`font-mono`), surface tokens (`#090D16`, `#111827`, `#1E293B`), accents (`#6366F1`, `#06B6D4`), all 7 Evidence State tokens with triple-signal visual attributes, glass panel and radial top-glow styles, and updated home shell preview. All unit tests, lint, and build checks passing.
- [x] `TASK-003: Define Strict EchoBridge Domain Interfaces` — Authored strict TypeScript types and interfaces in `src/types/echobridge.types.ts` covering the 11 database schema tables, 4 user roles, 2 audience scopes, 7 evidence states, Confidence Score formula weights, 8 planted traps verification, and audit event types. Verified with comprehensive unit test suite.
- [x] `TASK-004: Build Core Reusable UI Primitives & Accessible EvidenceBadge` — Built `Button` (5 variants, 3 sizes, loading state), `Card` (with automatic 4px left-border accent for EvidenceStates), accessible `Modal` (with backdrop blur and escape-key handling), `StateViews` (`LoadingSkeleton`, `EmptyState`, `ErrorBanner`), and `EvidenceBadge` enforcing triple-signal accessibility (Colour + Lucide Icon with data-icon + Monospace Label). All 17 unit tests passing.
- [x] `TASK-005: Create Supabase PostgreSQL + pgvector Migration & Client Layer` — Authored 11-table PostgreSQL schema in `supabase/migrations/0001_initial_schema.sql` with `vector(768)` and `match_chunks_with_role_filter` RPC. Implemented dual-mode repository (`src/lib/supabase/repository.ts`) with seamless fallback in-memory store, role-filtered chunk retrieval (Pre-Model RBAC), claim review updates, gap-interview state transitions (`attested`), sudden exit support, and audit event logging. All 25 unit tests passing.
- [x] `TASK-006: Build Synthetic CampusConnect Dataset with All 8 Planted Traps` — Authored realistic `CampusConnect` student club benchmark dataset in `src/services/seed/campus-connect.seed.ts` embedding all 8 planted traps (Trap 1 Purple conflict, Trap 2 Red gap -> Blue attested, Trap 3 Orange stale, Trap 4 quarantined secrets with 0 raw leak, Trap 5 confidential finance role isolation, Trap 6 prompt injection flagged, Trap 7 unanswerable domain question, Trap 8 mixed claim Post-Generation drop). Wired seed loader into `EchoBridgeRepository`. All 36 unit tests passing.
- [x] `TASK-007: Implement Audit Trail Service & Global Judge Role Switcher Bar` — Implemented `audit.service.ts` and `/api/audit` route handler for immutable audit logging. Built `RoleContext`, `Navbar`, `WorkflowStepper` (6 stages + metrics link), `RoleSwitcherBar` (4 personas with dynamic permission banners), and `AuditLogDrawer` (terminal slide-over). Updated Home landing page with live KPIs, quick-jump cards, and judge evaluation guide. All 42 unit tests passing.
- [x] `TASK-008: Implement Secret & PII Redaction Engine (redaction.service.ts)` — Implemented regex and heuristic redaction for Stripe keys, generic API keys, Google API keys, GitHub tokens, Slack tokens, Bearer tokens, DB/passwords, international phone numbers, and emails in `src/services/ingestion/redaction.service.ts`. Generates masked previews (`sk_live_••••eyA9`), creates `QuarantinedSecret` records, prevents raw secret leakage into chunks or prompts, and logs security audit events. Verified with 8 unit tests in `tests/unit/redaction.test.ts`. All 50 tests passing.
- [x] `TASK-009: Implement Prompt-Injection Detector & Stripper (injection.service.ts)` — Implemented detection of untrusted instruction override patterns (`ignore previous instructions`, `system override`, `disregard rubric`, `mark all claims corroborated`, `auto-approve all`, turn delimiters). Strips malicious spans from model-bound chunk text while preserving authentic engineering context, provides optional placeholder replacement mode, creates typed `QuarantinedSecret` records for the Quarantine Vault, and emits immutable `injection_flagged` audit events. Verified with 11 unit tests in `tests/unit/injection.test.ts` including end-to-end Planted Trap 6 verification. All 61 tests passing.
- [x] `TASK-010: Build Source Parser, Chunker & /api/ingest Endpoint` — Implemented multi-modal source parser in `src/services/ingestion/parser.service.ts` supporting Markdown docs, chat exports, task boards, and confidential finance folders. Automatically enforces pre-model ACL scope isolation (restricting finance/confidential to `incoming_lead`). Integrated pre-embedding secret redaction and prompt-injection stripping. Built `src/lib/gemini/client.ts` with 768-dim `text-embedding-004` and deterministic normalized unit vector fallback. Implemented `GET` and `POST` `/api/ingest` route handlers. Verified with 14 unit tests across parser and API route suites. All 75 tests passing.
- [x] `TASK-011: Build Stage 1 & 2 UI — Source Connection, ACL Scope Map & Quarantine Vault (/connect)` — Built `/connect` page with source inventory table, dynamic KPI counters, Source Permission Scope Map (highlighting Trap 1, 3, 4, 5, 6), `RedactionQuarantineTable` with category filters (Keys & Creds, PII, Injections), Pre-Model vs. Post-Generation RBAC architecture card, custom source ingestion modal, and one-click reconstruction trigger. Verified with unit tests in `tests/unit/quarantine-table.test.ts`. All 79 tests passing.

## 4. Current Task
- **Active Task ID:** `TASK-012`
- **Task Name:** Implement Pre-Model & Post-Generation RBAC Guard (`rbac.service.ts`)
- **Target Files:** `src/services/trust/rbac.service.ts`, `tests/unit/rbac.test.ts`

## 5. Planted Traps Implementation Tracker (`CampusConnect` Verification)
*(Update each trap status from `PENDING` $\rightarrow$ `SEEDED` $\rightarrow$ `VERIFIED` as tasks progress)*

| Trap # | Planted Trap Description | Target Service / UI | Current Status |
| :--- | :--- | :--- | :--- |
| **Trap 1** | Decision in chat (15 Mar) contradicted by planning doc (20 Mar) | `conflict.service.ts` $\rightarrow$ Purple `CONFLICTING` side-by-side card | `SEEDED` |
| **Trap 2** | Key rationale for choosing Redis over Postgres exists nowhere | `interview.service.ts` $\rightarrow$ Red `UNSUPPORTED` $\rightarrow$ Blue `ATTESTED` | `SEEDED` |
| **Trap 3** | Deployment Runbook last updated 9 months ago (>6m threshold) | `date-freshness.ts` $\rightarrow$ Orange `STALE` badge | `SEEDED` |
| **Trap 4** | Hard-coded Stripe/SendGrid API key & personal phone number | `redaction.service.ts` $\rightarrow$ Masked in chunk, stored in Quarantine Vault | `VERIFIED` |
| **Trap 5** | Confidential Finance Folder restricted to Team Lead role | `rbac.service.ts` $\rightarrow$ Absent from Intern view (`Restricted` placeholder) | `SEEDED` |
| **Trap 6** | Prompt-injection text (`"Ignore previous instructions..."`) in doc | `injection.service.ts` $\rightarrow$ Flagged for reviewer & stripped from prompt | `VERIFIED` |
| **Trap 7** | Unanswerable question (`"Who owns the domain renewal?"`) | `generator.service.ts` $\rightarrow$ Outputs `"Insufficient evidence"` (Red) | `SEEDED` |
| **Trap 8** | Claim mixing public architecture doc & restricted finance source | `rbac.service.ts` $\rightarrow$ Dropped from Intern view by Post-Generation Guard | `SEEDED` |

## 6. Known Issues & Blockers
- None currently. Dual-mode repository with automatic `CampusConnect` seed fallback ensures full zero-config demo resilience on Vercel preview and GitHub clones.

## 7. Next Step
1. Execute `TASK-012` (Implement Pre-Model and Post-Generation RBAC Guards in `src/services/trust/rbac.service.ts` and test against Trap 5 and Trap 8 in `tests/unit/rbac.test.ts`).
2. Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` to verify clean operation.
