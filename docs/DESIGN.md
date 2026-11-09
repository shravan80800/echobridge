# Design System (`DESIGN.md`)

## 1. Visual Aesthetic & Brand Identity
**Theme:** Modern, Techy, High-Trust Developer & Security Workspace (inspired by Linear, Vercel Geist, Raycast, and GitHub Next).  
**Core Vibe:** Precision engineering, verifiable intelligence, and cryptographic-grade auditability. Every claim feels like an inspectable code artifact backed by a live verification pipeline.

### Key Visual Principles
1. **Dark-First Tech Aesthetic (with High-Contrast Light Mode Toggle):** Deep obsidian-slate surfaces (`#090D16` and `#111827`), subtle `1px` translucent borders (`rgba(255, 255, 255, 0.08)`), crisp neon-accented status indicators, and subtle radial top-glow gradients.
2. **Evidence is Never Colour-Only (Strict Accessibility Rule):** Every single Evidence State MUST always render with three simultaneous signals: **Semantic Colour Pill + Distinct Lucide Icon + Uppercase Monospace Label**.
3. **Inspectable Everything:** Every claim card features a monospace `CLAIM-ID` tag, an interactive `[🔗 Source]` chip that opens a verbatim quote diff popover, and an ACL scope badge (`Team Lead + Intern` vs. `Team Lead Only`).
4. **Zero Layout Shift & Crisp Micro-Interactions:** Subtle `150ms ease-out` hover border highlights, skeleton shimmer loaders during Gemini pipeline steps, and terminal-style live pipeline logs.

## 2. Typography

| Role | Font Family | Weights | Usage |
| :--- | :--- | :--- | :--- |
| **Primary UI & Headings** | `Inter` or `Geist Sans` (`font-sans`) | `400`, `500`, `600`, `700` | Page titles, navigation, claim prose, review cards, onboarding instructions. |
| **Technical & Evidence Metadata** | `JetBrains Mono` or `Geist Mono` (`font-mono`) | `400`, `500`, `600` | Claim IDs (`CLM-014`), chunk IDs (`CHK-08`), Confidence Score formula metrics, verbatim source quotes, SHA hashes, timestamps, and ACL tags. |

### Typographic Scale
- **Hero / Page Header:** `text-2xl` (`24px`) to `text-3xl` (`30px`), `font-bold`, `tracking-tight` (`-0.02em`)
- **Section Header:** `text-lg` (`18px`), `font-semibold`, `tracking-tight`
- **Claim Body Text:** `text-sm` (`14px`) or `text-base` (`16px`), `leading-relaxed` (`1.6`)
- **Technical Badges & Metadata:** `text-xs` (`12px`), `font-mono`, `uppercase`, `tracking-wider` (`0.05em`)

## 3. Color Palette & Surface Tokens

### Core Application Surfaces (Dark-First Tech Palette)
- **Canvas Background (`bg-canvas`):** `#090D16` (Deep Obsidian Navy)
- **Elevated Card Surface (`bg-surface`):** `#111827` (Slate 900 with subtle glass backdrop `backdrop-blur-md`)
- **Interactive / Hover Surface (`bg-surface-hover`):** `#1E293B` (Slate 800)
- **Subtle Glass Panel (`bg-glass`):** `rgba(17, 24, 39, 0.75)` with `border: 1px solid rgba(255, 255, 255, 0.08)`
- **Primary Brand Accent (`accent-primary`):** `#6366F1` (Electric Indigo) $\rightarrow$ Hover `#4F46E5`
- **Secondary Tech Accent (`accent-cyan`):** `#06B6D4` (Cyber Cyan — used for active pipeline steps & AI verification scanners)
- **Primary Text (`text-primary`):** `#F8FAFC` (Crisp Slate 50)
- **Secondary Text (`text-secondary`):** `#94A3B8` (Slate 400)
- **Muted / Monospace Metadata (`text-muted`):** `#64748B` (Slate 500)
- **Border Token (`border-subtle`):** `#1E293B` (`1px solid`)

## 4. Evidence State Visual System (Mandatory 7-State Token Map)
Every claim card and inline highlight MUST follow this exact visual mapping (matching Section 05 & Section 07 of the Round 1 Proposal):

| Evidence State | Label Text | Lucide Icon | Text / Icon Hex | Badge Background | Card Left Border Accent | Meaning Displayed in Tooltip |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Corroborated** | `CORROBORATED` | `ShieldCheck` | `#10B981` (Emerald 400) | `rgba(16, 185, 129, 0.12)` | `4px solid #10B981` | Supported by 2+ independent sources (different authors). |
| **Single-source** | `SINGLE-SOURCE` | `AlertCircle` | `#F59E0B` (Amber 400) | `rgba(245, 158, 11, 0.12)` | `4px solid #F59E0B` | Supported by 1 source (or multiple items by the same author). |
| **Attested** | `ATTESTED` | `UserCheck` | `#3B82F6` (Electric Blue 400) | `rgba(59, 130, 246, 0.12)` | `4px solid #3B82F6` | Stated by departing member in Gap-Interview; timestamped & attributed. |
| **Stale** | `STALE` | `ClockAlert` | `#F97316` (Orange 400) | `rgba(249, 115, 22, 0.12)` | `4px solid #F97316` | Supporting source is older than freshness threshold (>6 months). |
| **Conflicting** | `CONFLICTING` | `GitCompare` | `#A855F7` (Neon Purple 400) | `rgba(168, 85, 247, 0.12)` | `4px solid #A855F7` | 2+ sources disagree; shown side-by-side with authors & dates. |
| **Unsupported** | `UNSUPPORTED GAP` | `FileQuestion` | `#EF4444` (Rose Red 400) | `rgba(239, 68, 68, 0.12)` | `4px solid #EF4444` | No supporting chunk found. Shown only as an open question. |
| **Restricted** | `RESTRICTED` | `Lock` | `#94A3B8` (Slate 400) | `rgba(148, 163, 184, 0.10)` | `4px dashed #475569` | `"Restricted: request access"` (hides topic, title, source & count). |

## 5. Core Component Specifications

### 5.1 Top Command Bar & 1-Click Judge Role Switcher
- **Sticky Header (`h-16`):** Displays the **EchoBridge** logo with a glowing indigo/cyan pulse badge, active project selector (`CampusConnect [Synthetic Demo]`), and a compact **6-Stage Workflow Stepper** (`1. Connect` $\rightarrow$ `2. Reconstruct` $\rightarrow$ `3. Verify` $\rightarrow$ `4. Gap-Interview` $\rightarrow$ `5. Review` $\rightarrow$ `6. Handover`).
- **Judge Demo Role Switcher Pill:** A segmented control in the top-right corner allowing instant switching between:
  - `Departing Lead (Aarav)`
  - `Reviewer / Mentor (Prof. Deshmukh)`
  - `Incoming Team Lead (Riya)`
  - `Incoming Intern (Kabir)`
- Switching roles immediately updates the active permission scope banner and re-renders role-filtered views.
- **Audit Trail Drawer Button:** Opens a slide-over monospace terminal drawer showing live `AuditEvent` logs (`secret_quarantined`, `injection_flagged`, `access_denied_guard`, `handover_approved`).

### 5.2 Transparent Confidence Score HUD (`ConfidenceScoreCard`)
- Positioned at the top of the Draft and Review screens.
- Displays a radial gauge or large monospace score (e.g., `CONFIDENCE SCORE: 87 / 100`) labelled explicitly as **`EVIDENCE QUALITY HEURISTIC (NOT PROBABILITY)`**.
- Renders 4 progress bars with exact formula weights:
  - `40% Citation Coverage` (e.g., `96%`)
  - `25% Corroboration Rate` (e.g., `72%`)
  - `15% Freshness Rate` (e.g., `88%`)
  - `20% Non-Conflict Rate` (e.g., `90%`)

### 5.3 Atomic Claim Card & Verbatim Citation Popover (`ClaimCard`)
- **Card Container:** `rounded-xl` (`12px`), `bg-surface`, `border border-subtle`, with a `4px` left border coloured by its `EvidenceState`.
- **Header Row:** Monospace `CLM-ID`, `EvidenceBadge` (Icon + Label + Colour), Claim Type chip (`DECISION`, `RISK`, `DEPENDENCY`), and `ACL Scope` pill.
- **Conflict View (when state === `conflicting`):** Splits the card body into a two-column **Side-by-Side Conflict Matrix** (`Source A: Chat Export (2 Mar)` vs. `Source B: Planning Doc (10 Mar)`) with a Reviewer action button to pick or annotate the resolution.
- **Source Citation Drawer/Popover:** Clicking `[🔗 Source: Arch Doc v2]` opens a floating code-style inspection box displaying:
  - Source filename, author, timestamp, and ACL roles.
  - Full chunk text with the exact `quoted_span` highlighted in glowing emerald/indigo (`bg-indigo-500/20 text-indigo-200 border-b border-indigo-400`).
  - Two-layer verification status badges: `✓ Verbatim Span Match` and `✓ Semantic Entailment Verified`.

### 5.4 Gap-Interview Terminal UI (`GapQuestionCard`)
- Clean, focused split-screen layout for the Departing Member.
- Left panel lists detected knowledge gaps (`Red Unsupported` and critical `Yellow Single-Source` claims) with a progress counter (`Question 2 of 6`).
- Right panel displays a red alert banner (`Gap found: rationale for choosing Redis is not in any source`), the generated question (`"Why was Redis chosen over Postgres?"`), a dark code-ready textarea, and a **`Submit as Attested Evidence`** primary button that transitions the badge to **Blue (`ATTESTED`)** with the departing member's name and timestamp.
- Includes a **"Simulate Sudden Exit (Departing Member Unavailable)"** toggle so judges can verify that unanswered gaps remain Red and get assigned to a fallback contact.

### 5.5 Reviewer Diff & Redaction Quarantine Dashboard
- **3-Column Review Layout (inspired by Figure 3 of Proposal):**
  1. **Version History Rail (Left, `w-64`):** Selectable snapshots (`v2.0 Approved`, `v1.1 After Gap-Interview`, `v1.0 Initial Draft`).
  2. **Diff & Claim Inspector (Center, `flex-1`):** Git-style red/green inline diff lines (`- Uses server polling` / `+ Uses WebSocket events`) and side-by-side Audience Tabs (`Team Lead View` vs. `Intern View`).
  3. **Action Panel (Right, `w-72`):** Keyboard-accessible action buttons (`[A] Approve`, `[E] Edit / Request Revision`, `[R] Redact`, `[X] Reject`) plus a toggle for `"Show 'Restricted: request access' placeholders in Intern View"`.
- **Quarantine Vault Tab:** Shows masked previews (`sk-live-••••••••9a2f`, `+91-98••••••10`) alongside prompt-injection flags (`"⚠️ Flagged instruction pattern stripped from chunk CHK-19"`).

### 5.6 Role-Appropriate Handover & Onboarding Continuation Plan
- **Top Receipt Banner:** Shows `Receipt: Not Yet Acknowledged` with a high-contrast emerald **`Verify & Acknowledge Receipt`** CTA (opens a 3-question **Critical Risk Comprehension Check** modal before unlocking final sign-off).
- **3-Column Continuation Board (inspired by Figure 7 of Proposal):**
  - **Column 1: `Day 1` (Immediate Setup & Contacts)**
  - **Column 2: `Week 1` (Active PRs, Key Rotation & Architecture)**
  - **Column 3: `Month 1` (Release Planning & Conflict Resolution)**
- **Critical Risk Callout Card:** Pinned crimson-bordered alert box highlighting unresolved or high-priority operational risks (e.g., `🚩 Open Risk: API Rate Limits`).

## 6. Buttons, Cards & Interactive States
- **Primary Button:** `bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg shadow-sm shadow-indigo-500/20 transition-all`
- **Secondary / Ghost Tech Button:** `bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-lg`
- **Approve Action Button:** `bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3.5 py-1.5 rounded-lg`
- **Destructive / Reject / Redact Button:** `bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 px-3.5 py-1.5 rounded-lg`
- **Card Border Radius:** `rounded-xl` (`12px`) for primary containers; `rounded-lg` (`8px`) for inner claim/task cards; `rounded-full` for status pills.

## 7. UX, Accessibility & Responsive Requirements
- **Responsive Breakpoints:**
  - `375px` (Mobile): Single-column stacked cards, collapsible workflow stepper, bottom sheet for source citations.
  - `768px` (Tablet): 2-column onboarding grid, collapsible version history sidebar.
  - `1440px` (Desktop): Full 3-column Reviewer dashboard, side-by-side conflict comparison, and persistent header stepper.
- **Mandatory UI States on Every Page:**
  - **Loading State:** Tech-styled skeleton cards + step-by-step pipeline progress indicator (`Parsing sources...` $\rightarrow$ `Quarantining 2 secrets...` $\rightarrow$ `Checking verbatim spans...`).
  - **Empty State:** Dashed slate card with icon, clear explanation, and a 1-click **`Load CampusConnect Synthetic Dataset`** button.
  - **Error State:** Non-destructive rose banner with structured error details and retry button.
- **Keyboard Navigation & Contrast:** All review actions (`Approve`, `Edit`, `Redact`, `Reject`) support keyboard focus rings (`focus:ring-2 focus:ring-indigo-500`) and meet WCAG AA contrast ($\ge 4.5:1$).
