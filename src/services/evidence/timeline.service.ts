/**
 * Decision Timeline & Context Web Graph Service
 * Implements TASK-023 (Stretch Feature): Architectural Decision Timeline with "Why" Cards
 * and Interactive Context Web Graph linking sources, claims, people, and planted traps.
 */

import type {
  AudienceRole,
  DecisionTimelineItem,
  ContextGraphData,
  ContextNode,
  ContextEdge,
} from "@/types/echobridge.types";

/**
 * CampusConnect Synthetic Architectural Decision Milestones with "Why" Rationale
 */
export const CAMPUS_CONNECT_TIMELINE: DecisionTimelineItem[] = [
  {
    id: "DT-01",
    timestamp: "2024-01-15",
    title: "Full-Stack Framework & Core Stack Selection",
    summary:
      "Selected Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, and Supabase PostgreSQL with pgvector.",
    rationale:
      "Modern full-stack TypeScript framework with React Server Components ensures zero-latency SSR for course pages, fast route caching, and unified vector search for campus event semantic discovery.",
    alternativesConsidered: [
      "Django Monolith with Jinja2 templates (rejected: slow mobile client interactivity)",
      "MERN SPA with separate Express API (rejected: lack of server-side SEO and state fragmentation)",
    ],
    owner: "Aarav Sharma",
    sourceTitle: "CampusConnect Architecture Doc v2.1",
    sourceType: "document",
    evidenceState: "corroborated",
    allowedRoles: ["incoming_lead", "incoming_intern"],
    isRestricted: false,
  },
  {
    id: "DT-02",
    timestamp: "2024-02-10",
    title: "Session & Token Caching: Redis Cluster Migration",
    summary:
      "Migrated user session authentication tokens from PostgreSQL database queries to an in-memory Redis cluster.",
    rationale:
      "Flash registrations during Spring Course Sign-up caused PostgreSQL CPU usage to surge above 85% with 1,200 concurrent requests/sec. In-memory Redis caching slashed session validation p99 latency to <45ms.",
    alternativesConsidered: [
      "PostgreSQL indexed reads with connection pooler (rejected: CPU bottleneck persisted under peak burst)",
      "Memcached (rejected: lacked built-in persistence and pub/sub capabilities for real-time seat alerts)",
    ],
    owner: "Aarav Sharma",
    sourceTitle: "Gap-Interview with Aarav Sharma (GAP-TRAP-2)",
    sourceType: "chat_export",
    evidenceState: "attested",
    plantedTrap: "Trap 2: Missing Redis Rationale Gap",
    allowedRoles: ["incoming_lead", "incoming_intern"],
    isRestricted: false,
  },
  {
    id: "DT-03",
    timestamp: "2024-03-05",
    title: "Deployment & Backup Procedures Authored",
    summary:
      "Documented multi-environment deployment steps on Vercel and daily automated database snapshot schedules in runbook.",
    rationale:
      "Standard operating runbook created for volunteer developers. However, the document has not been updated in over 270 days (>180-day freshness threshold) and must be reviewed against live production settings.",
    alternativesConsidered: [
      "Self-hosted Docker Compose on campus VM (rejected: lack of automatic preview environments)",
    ],
    owner: "Aarav Sharma",
    sourceTitle: "CampusConnect Deployment Runbook",
    sourceType: "runbook",
    evidenceState: "stale",
    plantedTrap: "Trap 3: Stale Deployment Runbook (>180 days)",
    allowedRoles: ["incoming_lead", "incoming_intern"],
    isRestricted: false,
  },
  {
    id: "DT-04",
    timestamp: "2024-03-15",
    title: "Spring Fest Cutoff Announcement (Contradiction Side A)",
    summary:
      "Informal Discord announcement by lead developer stating registration would terminate on March 15th.",
    rationale:
      "Preliminary internal deadline circulated in chat without formal faculty board approval. Directly contradicted by the verified event planning document.",
    alternativesConsidered: [
      "March 20th cutoff (formal approved planning schedule)",
    ],
    owner: "Aarav Sharma",
    sourceTitle: "Student Dev Discord Chat Export",
    sourceType: "chat_export",
    evidenceState: "conflicting",
    plantedTrap: "Trap 1: Event Timeline Contradiction (Side A)",
    allowedRoles: ["incoming_lead", "incoming_intern"],
    isRestricted: false,
  },
  {
    id: "DT-05",
    timestamp: "2024-03-20",
    title: "Official Registration Cutoff Ratification (Contradiction Side B / Winner)",
    summary:
      "Faculty mentor and student council ratified March 20th as official deadline to permit late departmental entries.",
    rationale:
      "Formal university policy requires a 5-day grace window for engineering transfers. Verified during Stage 5 Review as the canonical, authoritative schedule.",
    alternativesConsidered: [
      "March 15th Discord cutoff (overridden during human review)",
    ],
    owner: "Prof. Deshmukh & Aarav Sharma",
    sourceTitle: "CampusConnect Event Planning Doc v1.2",
    sourceType: "document",
    evidenceState: "corroborated",
    plantedTrap: "Trap 1: Event Timeline Contradiction (Resolved Winner)",
    allowedRoles: ["incoming_lead", "incoming_intern"],
    isRestricted: false,
  },
  {
    id: "DT-06",
    timestamp: "2024-03-25",
    title: "Stripe Payment Gateway Integration & Secret Quarantine",
    summary:
      "Integrated Stripe webhook and Checkout session handlers for ticket purchases and student society club dues.",
    rationale:
      "Eliminates manual cash handling for student clubs. Ingestion redaction engine detected hardcoded live API keys (`sk_live_...`) in chat pastes and safely quarantined them to the secure vault.",
    alternativesConsidered: [
      "Manual cash payments (rejected: high risk of accounting discrepancies)",
      "Razorpay (rejected: lacked international student card support)",
    ],
    owner: "Maya Patel",
    sourceTitle: "Student Dev Discord Chat Export",
    sourceType: "chat_export",
    evidenceState: "corroborated",
    plantedTrap: "Trap 4: Live Secret & PII Quarantine",
    allowedRoles: ["incoming_lead", "incoming_intern"],
    isRestricted: false,
  },
  {
    id: "DT-07",
    timestamp: "2024-04-01",
    title: "Domain Renewal & Registrar Ownership Gap",
    summary:
      "Undocumented domain registrar account ownership for `campusconnect.edu` flagged during automated knowledge synthesis.",
    rationale:
      "No source document, commit, or chat thread identifies who holds master DNS credentials. Correctly identified as an unsupported Red epistemic gap and escalated to faculty mentor Prof. Deshmukh.",
    alternativesConsidered: [
      "Guessing registrar owner (rejected: violates Epistemic Honesty principle)",
    ],
    owner: "Unassigned / Flagged to Prof. Deshmukh",
    sourceTitle: "Auditor Knowledge Gap (CLM-TRAP-7)",
    sourceType: "document",
    evidenceState: "unsupported",
    plantedTrap: "Trap 7: Unanswerable Domain Ownership Gap",
    allowedRoles: ["incoming_lead", "incoming_intern"],
    isRestricted: false,
  },
  {
    id: "DT-08",
    timestamp: "2024-04-10",
    title: "Sponsor Funding & Financial Ledger Allocation",
    summary:
      "Allocated $3,500 corporate sponsor budget for infrastructure costs, student awards, and domain hosting.",
    rationale:
      "Confidential sponsor funding ledger maintained by faculty lead. Under Pre-Model and Post-Generation RBAC, this milestone is withheld from incoming intern views to protect confidential financial information.",
    alternativesConsidered: [
      "Public financial spreadsheet (rejected: student privacy and sponsor contract non-disclosure)",
    ],
    owner: "Prof. Deshmukh & Aarav Sharma",
    sourceTitle: "CampusConnect Finance & Budget Folder",
    sourceType: "finance_folder",
    evidenceState: "corroborated",
    plantedTrap: "Trap 5 & 8: Confidential Financial Scope",
    allowedRoles: ["incoming_lead"],
    isRestricted: false,
  },
];

/**
 * Returns the Decision Timeline filtered and masked according to the recipient's audience role.
 */
export function getDecisionTimeline(audience: AudienceRole): DecisionTimelineItem[] {
  return CAMPUS_CONNECT_TIMELINE.map((item) => {
    const isAllowed = item.allowedRoles.includes(audience);
    if (!isAllowed) {
      return {
        ...item,
        title: "Restricted: Confidential Sponsor Budget & Financial Ledger",
        summary:
          "[Restricted: request access] Confidential sponsor funding details are restricted to Team Lead role.",
        rationale:
          "[Restricted: request access] Only incoming team leads with finance clearance may view budget rationale.",
        alternativesConsidered: undefined,
        owner: "Restricted",
        sourceTitle: "Restricted Source",
        evidenceState: "restricted" as const,
        isRestricted: true,
      };
    }
    return item;
  });
}

/**
 * Returns Context Web Graph Nodes and Edges for the CampusConnect Project.
 */
export function getContextGraphData(audience: AudienceRole): ContextGraphData {
  const isIntern = audience === "incoming_intern";

  const nodes: ContextNode[] = [
    // Source Nodes
    {
      id: "SRC-01",
      label: "Architecture Doc v2.1",
      type: "source",
      evidenceState: "corroborated",
      roleScope: ["incoming_lead", "incoming_intern"],
      metadata: { author: "Aarav Sharma", type: "document" },
    },
    {
      id: "SRC-02",
      label: "Dev Discord Chat Export",
      type: "source",
      evidenceState: "conflicting",
      roleScope: ["incoming_lead", "incoming_intern"],
      metadata: { author: "Aarav Sharma", type: "chat_export" },
    },
    {
      id: "SRC-03",
      label: "Event Planning Doc v1.2",
      type: "source",
      evidenceState: "corroborated",
      roleScope: ["incoming_lead", "incoming_intern"],
      metadata: { author: "Prof. Deshmukh", type: "document" },
    },
    {
      id: "SRC-04",
      label: "Deployment Runbook",
      type: "source",
      evidenceState: "stale",
      roleScope: ["incoming_lead", "incoming_intern"],
      metadata: { author: "Aarav Sharma", type: "runbook" },
    },
    {
      id: "SRC-05",
      label: isIntern ? "Restricted Finance Folder" : "Finance & Budget Folder",
      type: "source",
      evidenceState: isIntern ? "restricted" : "corroborated",
      roleScope: ["incoming_lead"],
      metadata: {
        author: "Prof. Deshmukh",
        type: "finance_folder",
        isRestricted: isIntern,
      },
    },

    // Decision & Claim Nodes
    {
      id: "CLM-01",
      label: "Next.js 15 & Supabase Core Stack",
      type: "decision",
      evidenceState: "corroborated",
      roleScope: ["incoming_lead", "incoming_intern"],
      metadata: { trap: "None", milestone: "DT-01" },
    },
    {
      id: "CLM-TRAP-1A",
      label: "Trap 1A: Registration Closes March 15",
      type: "claim",
      evidenceState: "conflicting",
      roleScope: ["incoming_lead", "incoming_intern"],
      metadata: { trap: "Trap 1 (Side A)", milestone: "DT-04" },
    },
    {
      id: "CLM-TRAP-1B",
      label: "Trap 1B: Registration Closes March 20 (Resolved)",
      type: "claim",
      evidenceState: "corroborated",
      roleScope: ["incoming_lead", "incoming_intern"],
      metadata: { trap: "Trap 1 (Side B)", milestone: "DT-05" },
    },
    {
      id: "CLM-TRAP-2",
      label: "Trap 2: Redis Session Cache Rationale",
      type: "decision",
      evidenceState: "attested",
      roleScope: ["incoming_lead", "incoming_intern"],
      metadata: { trap: "Trap 2", milestone: "DT-02" },
    },
    {
      id: "CLM-TRAP-3",
      label: "Trap 3: Vercel Deploy & Runbook Backup",
      type: "claim",
      evidenceState: "stale",
      roleScope: ["incoming_lead", "incoming_intern"],
      metadata: { trap: "Trap 3", milestone: "DT-03" },
    },
    {
      id: "CLM-TRAP-7",
      label: "Trap 7: Domain Registrar Ownership (Red Gap)",
      type: "claim",
      evidenceState: "unsupported",
      roleScope: ["incoming_lead", "incoming_intern"],
      metadata: { trap: "Trap 7", milestone: "DT-07" },
    },
    {
      id: "CLM-TRAP-5",
      label: isIntern
        ? "Restricted: Sponsor Budget Allocation"
        : "Trap 5: $3,500 Sponsor Budget Ledger",
      type: "decision",
      evidenceState: isIntern ? "restricted" : "corroborated",
      roleScope: ["incoming_lead"],
      metadata: {
        trap: "Trap 5 & 8",
        milestone: "DT-08",
        isRestricted: isIntern,
      },
    },

    // People Nodes
    {
      id: "USR-01",
      label: "Aarav Sharma (Departing Lead)",
      type: "person",
      roleScope: ["incoming_lead", "incoming_intern"],
      metadata: { role: "departing_member" },
    },
    {
      id: "USR-02",
      label: "Prof. Deshmukh (Reviewer)",
      type: "person",
      roleScope: ["incoming_lead", "incoming_intern"],
      metadata: { role: "reviewer" },
    },
    {
      id: "USR-03",
      label: "Maya Patel (Contributor)",
      type: "person",
      roleScope: ["incoming_lead", "incoming_intern"],
      metadata: { role: "contributor" },
    },

    // Quarantine / Security Nodes
    {
      id: "SEC-01",
      label: "Trap 4: Stripe Live Key (Quarantined)",
      type: "secret",
      roleScope: ["incoming_lead", "incoming_intern"],
      metadata: { status: "quarantined", type: "api_key" },
    },
  ];

  const edges: ContextEdge[] = [
    // Citations from Claims to Sources
    { id: "E-01", source: "CLM-01", target: "SRC-01", label: "cites", style: "solid" },
    { id: "E-02", source: "CLM-TRAP-1A", target: "SRC-02", label: "cites", style: "solid" },
    { id: "E-03", source: "CLM-TRAP-1B", target: "SRC-03", label: "cites", style: "solid" },
    { id: "E-04", source: "CLM-TRAP-3", target: "SRC-04", label: "cites", style: "dashed" },

    // Authorship
    { id: "E-05", source: "SRC-01", target: "USR-01", label: "authored_by", style: "solid" },
    { id: "E-06", source: "SRC-02", target: "USR-01", label: "authored_by", style: "solid" },
    { id: "E-07", source: "SRC-03", target: "USR-02", label: "authored_by", style: "solid" },
    { id: "E-08", source: "SRC-04", target: "USR-01", label: "authored_by", style: "solid" },

    // Attestation & Gap-Interview
    { id: "E-09", source: "CLM-TRAP-2", target: "USR-01", label: "attests", style: "dashed" },

    // Contradiction Pair
    { id: "E-10", source: "CLM-TRAP-1A", target: "CLM-TRAP-1B", label: "contradicts", style: "conflict" },

    // Security & Quarantine
    { id: "E-11", source: "SRC-02", target: "SEC-01", label: "quarantines", style: "dashed" },

    // RBAC Scope
    {
      id: "E-12",
      source: "CLM-TRAP-5",
      target: "SRC-05",
      label: isIntern ? "restricts" : "cites",
      style: isIntern ? "dashed" : "solid",
    },
    { id: "E-13", source: "SRC-05", target: "USR-02", label: "authored_by", style: "solid" },
  ];

  return { nodes, edges };
}
