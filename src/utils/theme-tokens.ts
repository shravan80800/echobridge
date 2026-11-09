/**
 * EchoBridge Theme Tokens & Evidence State Visual Tokens
 * Derived strictly from docs/DESIGN.md
 */

export const SURFACE_COLORS = {
  canvas: "#090D16",
  surface: "#111827",
  surfaceHover: "#1E293B",
  borderSubtle: "#1E293B",
} as const;

export const ACCENT_COLORS = {
  primary: "#6366F1",
  primaryHover: "#4F46E5",
  cyan: "#06B6D4",
} as const;

export const TEXT_COLORS = {
  primary: "#F8FAFC",
  secondary: "#94A3B8",
  muted: "#64748B",
} as const;

export const EVIDENCE_STATE_COLORS = {
  corroborated: {
    hex: "#10B981",
    bg: "rgba(16, 185, 129, 0.12)",
    border: "4px solid #10B981",
    label: "CORROBORATED",
    icon: "ShieldCheck",
    meaning: "Supported by 2+ independent sources (different authors).",
  },
  "single-source": {
    hex: "#F59E0B",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "4px solid #F59E0B",
    label: "SINGLE-SOURCE",
    icon: "AlertCircle",
    meaning: "Supported by 1 source (or multiple items by the same author).",
  },
  attested: {
    hex: "#3B82F6",
    bg: "rgba(59, 130, 246, 0.12)",
    border: "4px solid #3B82F6",
    label: "ATTESTED",
    icon: "UserCheck",
    meaning: "Stated by departing member in Gap-Interview; timestamped & attributed.",
  },
  stale: {
    hex: "#F97316",
    bg: "rgba(249, 115, 22, 0.12)",
    border: "4px solid #F97316",
    label: "STALE",
    icon: "ClockAlert",
    meaning: "Supporting source is older than freshness threshold (>6 months).",
  },
  conflicting: {
    hex: "#A855F7",
    bg: "rgba(168, 85, 247, 0.12)",
    border: "4px solid #A855F7",
    label: "CONFLICTING",
    icon: "GitCompare",
    meaning: "2+ sources disagree; shown side-by-side with authors & dates.",
  },
  unsupported: {
    hex: "#EF4444",
    bg: "rgba(239, 68, 68, 0.12)",
    border: "4px solid #EF4444",
    label: "UNSUPPORTED GAP",
    icon: "FileQuestion",
    meaning: "No supporting chunk found. Shown only as an open question.",
  },
  restricted: {
    hex: "#94A3B8",
    bg: "rgba(148, 163, 184, 0.10)",
    border: "4px dashed #475569",
    label: "RESTRICTED",
    icon: "Lock",
    meaning: '"Restricted: request access" (hides topic, title, source & count).',
  },
} as const;

export type EvidenceStateKey = keyof typeof EVIDENCE_STATE_COLORS;

export type NormalizedEvidenceState =
  | "corroborated"
  | "single_source"
  | "attested"
  | "stale"
  | "conflicting"
  | "unsupported"
  | "restricted";

export function getEvidenceStateToken(
  state: NormalizedEvidenceState | EvidenceStateKey
) {
  const normalizedKey =
    state === "single_source" ? "single-source" : state;
  return EVIDENCE_STATE_COLORS[normalizedKey as EvidenceStateKey];
}
