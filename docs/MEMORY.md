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

## 4. Current Task
- **Active Task ID:** `TASK-002`
- **Task Name:** Configure Modern Tech Dark Theme & Typography (`DESIGN.md`)
- **Target Files:** `src/app/globals.css`, `src/app/layout.tsx`, `tailwind.config.ts`

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
