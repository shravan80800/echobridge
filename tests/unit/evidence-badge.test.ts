import { describe, it, expect } from "vitest";
import {
  getEvidenceBadgeMetadata,
  type EvidenceIconName,
} from "@/components/evidence/EvidenceBadge";
import { EVIDENCE_STATES, type EvidenceState } from "@/types/echobridge.types";

describe("EvidenceBadge & Accessibility Metadata", () => {
  it("verifies all 7 EvidenceState values have full triple-signal metadata", () => {
    expect(EVIDENCE_STATES).toHaveLength(7);

    const expectedConfig: Record<
      EvidenceState,
      {
        label: string;
        iconName: EvidenceIconName;
        hex: string;
        isDashed: boolean;
        borderLeft: string;
      }
    > = {
      corroborated: {
        label: "CORROBORATED",
        iconName: "ShieldCheck",
        hex: "#10B981",
        isDashed: false,
        borderLeft: "4px solid #10B981",
      },
      single_source: {
        label: "SINGLE-SOURCE",
        iconName: "AlertCircle",
        hex: "#F59E0B",
        isDashed: false,
        borderLeft: "4px solid #F59E0B",
      },
      attested: {
        label: "ATTESTED",
        iconName: "UserCheck",
        hex: "#3B82F6",
        isDashed: false,
        borderLeft: "4px solid #3B82F6",
      },
      stale: {
        label: "STALE",
        iconName: "ClockAlert",
        hex: "#F97316",
        isDashed: false,
        borderLeft: "4px solid #F97316",
      },
      conflicting: {
        label: "CONFLICTING",
        iconName: "GitCompare",
        hex: "#A855F7",
        isDashed: false,
        borderLeft: "4px solid #A855F7",
      },
      unsupported: {
        label: "UNSUPPORTED GAP",
        iconName: "FileQuestion",
        hex: "#EF4444",
        isDashed: false,
        borderLeft: "4px solid #EF4444",
      },
      restricted: {
        label: "RESTRICTED",
        iconName: "Lock",
        hex: "#94A3B8",
        isDashed: true,
        borderLeft: "4px dashed #475569",
      },
    };

    for (const state of EVIDENCE_STATES) {
      const meta = getEvidenceBadgeMetadata(state);
      const expected = expectedConfig[state];

      expect(meta.state).toBe(state);
      expect(meta.label).toBe(expected.label);
      expect(meta.iconName).toBe(expected.iconName);
      expect(meta.hex).toBe(expected.hex);
      expect(meta.isDashed).toBe(expected.isDashed);
      expect(meta.borderLeft).toBe(expected.borderLeft);
      expect(meta.meaning.length).toBeGreaterThan(10);
      expect(meta.bg).toBeTruthy();
    }
  });

  it("verifies uppercase label styling and distinct icon names across all states", () => {
    const iconNames = new Set<string>();
    const labels = new Set<string>();

    for (const state of EVIDENCE_STATES) {
      const meta = getEvidenceBadgeMetadata(state);

      // Verify uppercase label rule
      expect(meta.label).toBe(meta.label.toUpperCase());

      // Ensure every state has a distinct visual icon (no icon reuse)
      expect(iconNames.has(meta.iconName)).toBe(false);
      iconNames.add(meta.iconName);

      // Ensure every state has a distinct text label
      expect(labels.has(meta.label)).toBe(false);
      labels.add(meta.label);
    }

    expect(iconNames.size).toBe(7);
    expect(labels.size).toBe(7);
  });

  it("verifies restricted state enforces dashed border style for lower-privilege views", () => {
    const restrictedMeta = getEvidenceBadgeMetadata("restricted");
    expect(restrictedMeta.isDashed).toBe(true);
    expect(restrictedMeta.borderLeft).toContain("dashed");

    const corroboratedMeta = getEvidenceBadgeMetadata("corroborated");
    expect(corroboratedMeta.isDashed).toBe(false);
    expect(corroboratedMeta.borderLeft).toContain("solid");
  });
});
