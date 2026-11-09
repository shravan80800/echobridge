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

## 4. Current Task
- **Active Task ID:** `TASK-006`
- **Task Name:** Build Synthetic `CampusConnect` Dataset with All 8 Planted Traps
- **Target Files:** `src/services/seed/campus-connect.seed.ts`

## 5. Planted Traps Implementation Tracker (`CampusConnect` Verification)
*(Update each trap status from `PENDING` $\rightarrow$ `SEEDED` $\rightarrow$ `VERIFIED` as tasks progress)*

| Trap # | Planted Trap Description | Target Service / UI | Current Status |
| :--- | :--- | :--- | :--- |
| **Trap 1** | Decision in chat (15 Mar) contradicted by planning doc (20 Mar) | `conflict.service.ts` $\rightarrow$ Purple `CONFLICTING` side-by-side card | `PENDING` |
| **Trap 2** | Key rationale for choosing Redis over Postgres exists nowhere | `interview.service.ts` $\rightarrow$ Red `UNSUPPORTED` $\rightarrow$ Blue `ATTESTED` | `PENDING` |
| **Trap 3** | Deployment Runbook last updated 9 months ago (>6m threshold) | `date-freshness.ts` $\rightarrow$ Orange `STALE` badge | `PENDING` |
| **Trap 4** | Hard-coded Stripe/SendGrid API key & personal phone number | `redaction.service.ts` $\rightarrow$ Masked in chunk, stored in Quarantine Vault | `PENDING` |
| **Trap 5** | Confidential Finance Folder restricted to Team Lead role | `rbac.service.ts` $\rightarrow$ Absent from Intern view (`Restricted` placeholder) | `PENDING` |
| **Trap 6** | Prompt-injection text (`"Ignore previous instructions..."`) in doc | `injection.service.ts` $\rightarrow$ Flagged for reviewer & stripped from prompt | `PENDING` |
| **Trap 7** | Unanswerable question (`"Who owns the domain renewal?"`) | `generator.service.ts` $\rightarrow$ Outputs `"Insufficient evidence"` (Red) | `PENDING` |
| **Trap 8** | Claim mixing public architecture doc & restricted finance source | `rbac.service.ts` $\rightarrow$ Dropped from Intern view by Post-Generation Guard | `PENDING` |

## 6. Known Issues & Blockers
- None currently. Note for `TASK-005`: Ensure the repository layer automatically falls back to the in-memory `CampusConnect` seed store if `SUPABASE_URL` or `GEMINI_API_KEY` are not yet set in `.env.local` or Vercel Preview.

## 7. Next Step
1. Complete `TASK-001` (Initialize Next.js 15 project, TypeScript, Tailwind CSS, Lucide icons, Vitest, Playwright, and npm scripts).
2. Run `npm run typecheck` and `npm run build` to verify clean initialization, then advance to `TASK-002`.
