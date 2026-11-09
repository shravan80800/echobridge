# Development Rules (`RULES.md`)

> **AI Agent Rulebook (Antigravity / Cursor / Claude Code):**  
> Read and obey every rule in this file before planning, creating, or modifying any code in the **EchoBridge** repository.

## 1. General Coding Rules
- **Strict TypeScript Everywhere:** Use explicit interfaces from `src/types/echobridge.types.ts`. Never use `any` or untyped JSON payloads.
- **One Task at a Time (Vertical Slices):** Implement only the currently requested `TASK-XXX` from `TASKS.md`. Never modify unrelated files or refactor working features outside the current task scope.
- **Small, Modular Functions:** Keep functions focused and under 50 lines where possible. Extract reusable helpers into `src/utils/` and business logic into `src/services/`.
- **No Duplicate Logic:** Reuse existing UI components in `src/components/ui/` and shared services in `src/services/`.
- **Vercel Serverless Compatibility:** Never write to local disk paths (other than ephemeral `/tmp` if strictly needed). All persistent state must flow through the Supabase service layer (`src/lib/supabase/`) with seamless fallback to the deterministic `CampusConnect` seed store (`src/services/seed/campus-connect.seed.ts`) so the app works both with and without external env keys.

## 2. Mandatory Pre-Coding Workflow (The Vibe Coding Loop)
Before writing code for any task, follow this exact sequence:
1. **READ:** Inspect `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, `docs/DECISIONS.md`, and `docs/MEMORY.md`.
2. **UNDERSTAND & PLAN:** State which files will be created or modified and how the change satisfies the task's acceptance criteria.
3. **IMPLEMENT:** Write clean, modular TypeScript code adhering to `ARCHITECTURE.md` and `DESIGN.md`.
4. **TEST:** Run `npm run typecheck`, `npm run lint`, and relevant unit/integration tests (`npm test`). Fix any failing checks before proceeding.
5. **REPORT & UPDATE:** After completing a task, report:
   - Files changed
   - What was implemented
   - Tests executed
   - Remaining issues
   - Update `TASKS.md` and `docs/MEMORY.md`.

## 3. UI & Design System Rules (`DESIGN.md` Enforcement)
- **Dark-First Tech Aesthetic:** Use the exact obsidian-slate background tokens (`#090D16`, `#111827`), `1px` subtle borders (`border-slate-800`), Electric Indigo (`#6366F1`), and Cyber Cyan (`#06B6D4`) accents defined in `docs/DESIGN.md`.
- **Colour Is Never the Only Signal (Accessibility Rule):** Every `EvidenceBadge` and `ClaimCard` MUST simultaneously render:
  1. The semantic colour border/pill (`Green`, `Yellow`, `Blue`, `Orange`, `Purple`, `Red`, `Grey`)
  2. The corresponding Lucide icon (`ShieldCheck`, `AlertCircle`, `UserCheck`, `ClockAlert`, `GitCompare`, `FileQuestion`, `Lock`)
  3. The uppercase monospace text label (`CORROBORATED`, `SINGLE-SOURCE`, `ATTESTED`, `STALE`, `CONFLICTING`, `UNSUPPORTED GAP`, `RESTRICTED`)
- **Complete UI States:** Every page and async component MUST include:
  - A tech-styled skeleton/progress **Loading State**
  - A helpful **Empty State** (with a 1-click button to load the `CampusConnect` dataset)
  - A clear, non-crashing **Error State**
- **Responsive Layout:** Verify layouts work cleanly at `375px` (Mobile), `768px` (Tablet), and `1440px` (Desktop).
- **UI Separation:** Never place database queries, regex redaction patterns, or Gemini API calls inside React components. UI components call `/api/*` Route Handlers or Server Actions, which delegate to `src/services/`.

## 4. Trust Pipeline & Evidence Model Rules (Domain Guardrails)
- **Retrieve-Only Generation:** Gemini prompts in `generator.service.ts` must pass ONLY the retrieved, role-permitted chunks in delimited data blocks (`<chunk id="...">...</chunk>`) with `temperature: 0`. The model must be instructed never to extrapolate and to return `"insufficient_evidence"` when chunks do not answer a question.
- **Two-Layer Citation Checking:**
  1. **Deterministic Check (`text-matching.ts`):** Every cited `quoted_span` must exist verbatim (case/whitespace-normalized) inside its cited `chunk.content`, and the chunk must belong to the target audience's `allowed_roles`.
  2. **Semantic Entailment Check (`verifier.service.ts`):** Verify that the cited chunk logically supports the claim. Failing claims are marked `unsupported` (Red).
- **Strict Author Independence Rule:**
  - Two supporting chunks qualify a claim as `corroborated` (Green) ONLY if `chunkA.author !== chunkB.author` AND neither chunk copies/quotes the other.
  - Multiple chunks by the same author (even across different source types or dates) count as **1 source** (`single_source` Yellow).
- **Conflict Handling (Never Pick a Silent Winner):**
  - When two sources state conflicting values for the same entity/attribute (e.g., March 15 in chat vs. March 20 in planning doc), mark the claim `conflicting` (Purple) and store both versions, timestamps, and authors in `conflict_pair_json` for side-by-side display.
- **Confidence Score Transparency:**
  - Always calculate the Confidence Score using the exact formula:
    `Score = Math.round(100 * (0.40 * citationCoverage + 0.25 * corroborationRate + 0.15 * freshnessRate + 0.20 * (1 - conflictRate)))`
  - Always display the 4 component rates alongside the total score and label it `"Evidence-Quality Heuristic (Not Probability)"`.

## 5. Security, RBAC & Redaction Rules (`SECURITY.md` Enforcement)
- **Never Expose Secrets:** API keys (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) must only be accessed in server-side code (`src/services/`, `src/lib/`, `src/app/api/`) and never prefixed with `NEXT_PUBLIC_`.
- **Pre-Model AND Post-Generation Permission Filtering:**
  - **Pre-Model:** Filter chunks by `target_role = ANY(allowed_roles)` *before* invoking the LLM so restricted sources (e.g., `Finance Folder`) never enter the `incoming_intern` prompt context.
  - **Post-Generation Guard:** Re-verify `claim.audience_acl` as the intersection of all cited chunks' `allowed_roles`. If any cited chunk is outside `incoming_intern` scope, drop the claim from the Intern View and render a generic `"Restricted: request access"` placeholder (showing zero topic, title, source name, or item count).
- **Secret Redaction & Quarantine at Ingestion:**
  - Detect and mask API keys (`sk-...`, `AIza...`), passwords, personal phone numbers, and personal emails during ingestion before chunk embedding. Store masked metadata in `quarantined_secrets`. Never copy raw credentials into a handover claim.
- **Prompt-Injection Defense:**
  - Scan all ingested text for instruction-override patterns (e.g., `"ignore previous instructions"`, `"system prompt"`, `"auto-approve"`). Flag matching chunks (`injection_flagged = true`), strip the malicious span before model input, and log an `injection_flagged` event in `audit_events`.
- **Reviewer-Only Approval Authority:**
  - Enforce server-side checks ensuring `actor_role === 'departing_member'` can submit Gap-Interview answers and suggest edits, but can NEVER approve or publish a handover (`403 Forbidden`). Only `actor_role === 'reviewer'` can approve a draft version.

## 6. Testing & Git Rules
- **Verify the 8 Planted Traps:** Every change to ingestion, verification, or RBAC services must keep all 8 planted traps in the `CampusConnect` test suite passing.
- **Run Checks Before Completing Any Task:**
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
- **Atomic Git Commits:** Make small, descriptive commits after each verified task (e.g., `feat(trust): implement author independence rule and verbatim span checker`).
