# Architecture Decision Records (`DECISIONS.md`)

> **Purpose:** This file records permanent architectural and domain decisions for **EchoBridge**.  
> **AI Coding Rule:** Antigravity / Cursor must NEVER override or reverse any decision in this file without an explicit human update to this document.

## ADR-001: Unified Next.js Full-Stack on Vercel Instead of Separate React + FastAPI Servers
- **Status:** Accepted
- **Decision:** Build EchoBridge as a unified **Next.js 15 (App Router) + TypeScript** application deployed on **Vercel**, placing all backend ingestion, redaction, RBAC, and verification services inside `src/services/` and Next.js Route Handlers (`src/app/api/*`).
- **Reason:**
  1. Deploying a single Next.js repository to Vercel provides instant Preview and Production URLs without CORS mismatches or managing two separate hosting providers.
  2. Sharing strict TypeScript interfaces (`src/types/echobridge.types.ts`) across the UI, API routes, and Trust Pipeline prevents schema drift during AI-assisted coding.

## ADR-002: Supabase PostgreSQL (`pgvector`) + Zero-Config Deterministic Seed Fallback
- **Status:** Accepted
- **Decision:** Use **Supabase PostgreSQL + `pgvector`** as the primary relational and vector store, paired with an automatic fallback to a deterministic, pre-seeded in-memory store (`src/services/seed/campus-connect.seed.ts`) when environment variables are absent.
- **Reason:**
  1. Local SQLite files and local ChromaDB directories do not persist across Vercel serverless cold starts, and Python `chromadb` binaries exceed Vercel bundle limits.
  2. Supabase PostgreSQL (`pgvector`) executes vector similarity search and `allowed_roles` metadata filtering in a single ACID database alongside `claims`, `draft_versions`, `reviews`, and `audit_events` (fulfilling the Round 1 Proposal's *"PostgreSQL if time permits"* target).
  3. The automatic `CampusConnect` seed fallback guarantees that any hackathon judge clicking the live Vercel URL or cloning the GitHub repo locally without API keys can immediately test all 6 stages and 8 planted traps with zero configuration errors.

## ADR-003: Google Gemini (`gemini-2.5-flash` + `text-embedding-004`) for the Trust Pipeline
- **Status:** Accepted
- **Decision:** Use **Google Gemini (`gemini-2.5-flash`)** with `temperature: 0` and native Structured Outputs (`responseSchema`) for retrieve-only claim generation, semantic entailment verification, and targeted gap-interview generation, plus **`text-embedding-004`** (768 dimensions) for chunk embeddings.
- **Reason:**
  1. Single-provider simplicity: one `GEMINI_API_KEY` powers both structured generation and vector embeddings.
  2. Ultra-low latency ensures multi-step verification finishes well within Vercel serverless execution timeouts.
  3. Native JSON Schema enforcement prevents malformed responses and forces every generated claim to include `chunk_id` and `quoted_span` fields.

## ADR-004: Separate Pre-Model Filtered Generation Per Audience + Post-Generation Guard
- **Status:** Accepted
- **Decision:** Never generate a single shared handover draft and filter it afterward. Instead:
  1. Compute the target audience's allowed chunk set *before* calling the LLM (`Access = Role AND Source Permissions`).
  2. Generate separate drafts for `incoming_lead` and `incoming_intern`.
  3. Run a deterministic **Post-Generation Guard** (`rbac.service.ts`) that re-checks every claim's `audience_acl` (the intersection of all cited chunks' `allowed_roles`) and drops any claim citing a restricted chunk, replacing it in the Intern View with a generic `"Restricted: request access"` placeholder.
- **Reason:**
  1. Filtering a single draft after generation risks leaking confidential context when a single sentence blends a public chunk with a restricted one (Trap 8).
  2. Enforcing access both before and after generation guarantees zero permission leakage (Trap 5 & Trap 8).

## ADR-005: Two-Layer Citation Verification & Strict Author Independence Rule
- **Status:** Accepted
- **Decision:** Every atomic claim must pass a two-layer check:
  1. **Deterministic Layer:** The cited `quoted_span` must exist verbatim (whitespace/case-normalized) inside the cited chunk, and the chunk must be within the audience's permitted set.
  2. **Semantic Layer:** An entailment check verifies the chunk logically supports the claim.
  3. **Author Independence Rule:** Two supporting chunks count as independent (`corroborated` Green) ONLY if `chunkA.author !== chunkB.author` AND neither chunk copies/quotes the other. Multiple chunks by the same author always count as **1 source** (`single_source` Yellow).
- **Reason:** Prevents hallucinated citations and stops a single author repeating themselves in chat and docs from inflating Green corroboration ratings.

## ADR-006: Gap-Interview Answers Are Stored as `Attested` (Blue), Never `Corroborated` (Green)
- **Status:** Accepted
- **Decision:** Answers submitted by the departing member during Stage 4 (Gap-Interview) transition `Unsupported` (Red) or `Single-source` (Yellow) gaps to the explicit **`Attested` (Blue)** state tied to the departing person's name and timestamp. They are never counted as independent corroboration (`Green`). If the departing member is unavailable (Sudden Exit), unanswered gaps remain **`Unsupported` (Red)** and are assigned to a named fallback contact.
- **Reason:** Preserves epistemic honesty: unwritten tacit knowledge captured in an exit interview is valuable and attributable, but it is a single person's uncorroborated statement rather than multi-source verified fact.

## ADR-007: Reviewer-Only Approval Authority & Side-by-Side Conflict Preservation
- **Status:** Accepted
- **Decision:**
  1. When two sources disagree on an entity/attribute (Trap 1), the system marks the claim `Conflicting` (Purple) and displays both versions side-by-side with authors and timestamps—never picking a silent winner.
  2. Server-side authorization strictly prohibits `departing_member` from approving a handover (`403 Forbidden`). Only `reviewer` (Project Lead, Manager, or Faculty Mentor) can approve and publish an audience view.
- **Reason:** Ensures human accountability and prevents a departing member from self-approving incomplete, conflicting, or improperly redacted handover documentation.

## ADR-008: 1-Click Judge Role Switcher in the Global Command Bar
- **Status:** Accepted
- **Decision:** Include a persistent **1-Click Judge Role Switcher** in the top navigation bar (`Departing Lead: Aarav`, `Reviewer: Prof. Deshmukh`, `Incoming Team Lead: Riya`, `Incoming Intern: Kabir`) backed by a server-verified session cookie.
- **Reason:** Allows hackathon judges evaluating the live Vercel URL to test all 4 personas, verify server-side RBAC restrictions, and inspect the difference between the `Team Lead View` and `Intern View` in seconds without logging in and out of 4 separate email accounts.
