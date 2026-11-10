import React from "react";
import {
  ShieldCheck,
  AlertCircle,
  UserCheck,
  ClockAlert,
  GitCompare,
  FileQuestion,
  Lock,
} from "lucide-react";
import type { EvidenceState } from "@/types/echobridge.types";
import { getEvidenceStateToken } from "@/utils/theme-tokens";

export type EvidenceIconName =
  | "ShieldCheck"
  | "AlertCircle"
  | "UserCheck"
  | "ClockAlert"
  | "GitCompare"
  | "FileQuestion"
  | "Lock";

export interface EvidenceBadgeMetadata {
  state: EvidenceState;
  label: string;
  iconName: EvidenceIconName;
  hex: string;
  bg: string;
  borderLeft: string;
  isDashed: boolean;
  meaning: string;
}

const iconComponentMap: Record<
  EvidenceIconName,
  React.ComponentType<{ className?: string; "data-icon"?: string }>
> = {
  ShieldCheck,
  AlertCircle,
  UserCheck,
  ClockAlert,
  GitCompare,
  FileQuestion,
  Lock,
};

const pastelBadgeStyles: Record<EvidenceState, string> = {
  corroborated: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  single_source: "bg-amber-50 text-amber-800 border border-amber-200",
  attested: "bg-blue-50 text-blue-800 border border-blue-200",
  stale: "bg-orange-50 text-orange-800 border border-orange-200",
  conflicting: "bg-purple-50 text-purple-800 border border-purple-200",
  unsupported: "bg-rose-50 text-rose-800 border border-rose-200",
  restricted: "bg-slate-100 text-slate-700 border border-slate-300",
};

/**
 * Returns deterministic visual metadata for any EvidenceState.
 * Adheres strictly to docs/DESIGN.md Section 4.
 */
export function getEvidenceBadgeMetadata(
  state: EvidenceState
): EvidenceBadgeMetadata {
  const token = getEvidenceStateToken(state);

  return {
    state,
    label: token.label,
    iconName: token.icon as EvidenceIconName,
    hex: token.hex,
    bg: token.bg,
    borderLeft: token.border,
    isDashed: state === "restricted",
    meaning: token.meaning,
  };
}

export interface EvidenceBadgeProps {
  state: EvidenceState;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

/**
 * EvidenceBadge enforces Triple-Signal Accessibility (colour + icon + label)
 * rendered as a flat non-clickable status pill so it never looks like a button.
 */
export function EvidenceBadge({
  state,
  size = "md",
  showIcon = true,
  className = "",
}: EvidenceBadgeProps) {
  const meta = getEvidenceBadgeMetadata(state);
  const IconComponent = iconComponentMap[meta.iconName];

  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[11px] gap-1"
      : "px-2.5 py-0.5 text-xs gap-1.5";

  const iconSizeClasses = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <span
      role="status"
      title={`${meta.label}: ${meta.meaning}`}
      className={`inline-flex items-center font-sans font-medium rounded-full cursor-default select-none whitespace-nowrap ${pastelBadgeStyles[state]} ${sizeClasses} ${className}`}
    >
      {showIcon && IconComponent && (
        <IconComponent
          data-icon={meta.iconName}
          className={`${iconSizeClasses} shrink-0`}
        />
      )}
      <span>{meta.label}</span>
    </span>
  );
}
