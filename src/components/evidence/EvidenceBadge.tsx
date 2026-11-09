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
 * EvidenceBadge enforces the mandatory Triple-Signal Accessibility Rule:
 * 1. Semantic Colour Pill + Border
 * 2. Distinct Lucide Icon (with data-icon attribute)
 * 3. Uppercase Monospace Text Label + Tooltip Meaning
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
      ? "text-[10px] px-2 py-0.5 gap-1"
      : "text-xs px-2.5 py-1 gap-1.5";

  const iconSizeClasses = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <span
      role="status"
      title={`${meta.label}: ${meta.meaning}`}
      style={{
        backgroundColor: meta.bg,
        color: meta.hex,
        borderColor: meta.hex,
      }}
      className={`inline-flex items-center font-mono font-bold uppercase tracking-wider rounded-md border border-opacity-30 select-none ${sizeClasses} ${className}`}
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
