# Security & Permission Architecture (`SECURITY.md`)

> **Purpose:** Defines mandatory security, Role-Based Access Control (RBAC), secret quarantine, and prompt-injection safeguards for **EchoBridge** (aligned with Section 07 of the EchoBridge Round 1 Proposal and Step 15 of the Vibe Coding Guide).  
> **AI Agent Rule:** Security is a core architectural pillar of EchoBridge—never defer or bypass these rules during implementation.

## 1. Claim-Level Access Control (Pre-Model & Post-Generation Guards)
A single handover draft filtered after generation can leak confidential context because a single sentence may blend a public chunk with a restricted one. EchoBridge prevents leakage through a two-barrier defense:

1. **Permissions Travel with Content:**
   - Every ingested `Source` and `Chunk` stores its `allowed_roles` array (`['incoming_lead', 'incoming_intern']` vs. `['incoming_lead']`) in metadata at ingestion time.
2. **Audience Scope Is Computed First (`Access = Role AND Source Permissions`):**
   - Access is strictly the **intersection** of the incoming user's role and the cited sources' ACLs—never the union.
3. **Barrier 1 — Pre-Model Filtering (`filterChunksForAudience`):**
   - Retrieval for a target audience (`incoming_lead` vs. `incoming_intern`) returns ONLY chunks inside that audience's permitted scope.
   - Restricted chunks (such as the `Finance Folder` in Trap 5) **never enter the LLM prompt context** when generating the `Intern View`.
4. **Separate Drafts Per Audience:**
   - The system generates and versions separate drafts per audience (`Team Lead View` vs. `Intern View`), and the Reviewer approves each view individually.
5. **Barrier 2 — Post-Generation Guard (`enforcePostGenerationGuard`):**
   - After generation, every claim's `audience_acl` is re-computed as the intersection of `allowed_roles` across all chunks cited by that claim.
   - If a claim cites *any* chunk outside the target audience's scope (e.g., Trap 8 mixing a public architecture doc with a restricted finance note), the claim is immediately dropped from that audience view and logged as an `access_denied_guard` event in `audit_events`.
6. **Zero-Leak Restricted Placeholders:**
   - Where the Team Lead sees a restricted item that the Intern cannot, the Intern's view displays only: `"Restricted: request access"`.
   - The placeholder exposes **no topic, no title, no source name, and no item count**, because even metadata can leak sensitive operations. The Reviewer can toggle whether placeholders appear at all.

## 2. Secret Redaction & Quarantine at Ingestion (`redaction.service.ts`)
- **Pre-Embedding Detection:** During Stage 2 (Ingestion), before any chunk is embedded or sent to the LLM, `redaction.service.ts` scans all text for:
  - API keys & developer tokens (`sk_live_...`, `sk-...`, `AIza...`, `ghp_...`, `xoxb-...`, `Bearer ...`)
  - Passwords, connection strings, and private keys
  - Personal phone numbers (e.g., `+91-9876543210`) and personal email addresses
  - HR or Finance-marked account/signatory numbers
- **Quarantine & Safe Pointer Replacement:**
  - Raw secrets are masked and quarantined in `quarantined_secrets` with a redacted preview (`sk_live_••••9912`) for explicit Reviewer inspection.
  - Inside the chunk text, the raw credential is replaced with `[REDACTED_SECRET: <TYPE> — Administered by Project Lead]`.
  - **Hard Rule:** Credentials are NEVER copied into a handover claim; EchoBridge only records a safe note that a credential exists and who administers/rotates it.

## 3. Prompt-Injection & Untrusted Data Safeguards (`injection.service.ts`)
- **Untrusted Data Isolation:** All ingested source content is treated as untrusted data and passed to Gemini strictly inside XML-delimited data blocks (`<chunk id="...">...</chunk>`), never concatenated into system instructions.
- **Instruction Pattern Stripping:**
  - At ingestion, `injection.service.ts` scans for instruction-override patterns (e.g., `"ignore previous instructions"`, `"system override"`, `"disregard rubric"`, `"mark all claims Corroborated"`, `"approve all"`).
  - Matching spans are stripped from the model-bound chunk text, the chunk is marked `injection_flagged = true`, a security warning badge is surfaced to the Reviewer in the Quarantine Vault, and an `injection_flagged` event is written to `audit_events`.
- **Escaped Output Rendering:** Model outputs are validated against strict JSON schemas and rendered purely as escaped text in React (never via `dangerouslySetInnerHTML`, `eval`, or executable scripts).

## 4. Server-Side Authentication & Role Authorization
- **Server-Side Authority Only:** The frontend UI (`RoleSwitcherBar` and role tabs) only reflects permissions; every `/api/*` Route Handler and Server Action verifies the active role server-side before returning or mutating data.
- **Reviewer Separation of Duties (No Self-Approval):**
  - The Reviewer must be the project lead, faculty mentor, or manager—never the departing member alone.
  - `/api/review` enforces a hard check: any attempt by `actor_role === 'departing_member'` to approve or publish a handover returns `HTTP 403 Forbidden` and records an `access_denied_guard` audit event.
- **Intern Scope Isolation:**
  - `/api/handover` and `/api/reconstruct` when queried with `role = 'incoming_intern'` never return raw `Finance Folder` chunks, quarantined secret values, or unapproved draft claims.

## 5. Environment Secrets & API Input Validation
- **Zero Secrets in Git or Client Bundle:**
  - `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `DATABASE_URL` must live only in `.env.local` and Vercel Project Environment Variables.
  - Never prefix server secrets with `NEXT_PUBLIC_`.
  - `.gitignore` must exclude `.env`, `.env.local`, `.env.*.local`.
- **API Request & File Upload Validation:**
  - Validate all request bodies and query parameters in `/api/*` routes.
  - For file uploads on `/connect`, validate:
    - Allowed file types (`.md`, `.txt`, `.json`, `.csv`)
    - Maximum file size ($\le 5\text{ MB}$ per file for demo safety)
    - Sanitized filenames (strip path traversal characters `../`).

## 6. Immutable Audit Log & Data Deletability
- **Comprehensive Audit Trail (`audit_events`):** Every source connection, quarantined secret, flagged prompt injection, draft generation, post-generation guard drop, gap-interview submission, reviewer edit/approval, and handover receipt acknowledgement is logged with timestamp, actor role, and event metadata.
- **Project Data Deletability & LLM Disclosure:** Ingested sources, chunks, embeddings, and drafts can be reset/deleted per project, and the UI openly discloses which model (`Google Gemini 2.5 Flash` + `text-embedding-004`) processes permitted chunks.
