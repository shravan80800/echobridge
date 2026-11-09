import { describe, it, expect } from "vitest";
import {
  SURFACE_COLORS,
  ACCENT_COLORS,
  TEXT_COLORS,
  EVIDENCE_STATE_COLORS,
  type EvidenceStateKey,
} from "@/utils/theme-tokens";

describe("EchoBridge Theme & Evidence State Design Tokens", () => {
  it("defines all core surface and canvas color tokens matching DESIGN.md", () => {
    expect(SURFACE_COLORS.canvas).toBe("#090D16");
    expect(SURFACE_COLORS.surface).toBe("#111827");
    expect(SURFACE_COLORS.surfaceHover).toBe("#1E293B");
    expect(SURFACE_COLORS.borderSubtle).toBe("#1E293B");
  });

  it("defines brand and tech accent tokens matching DESIGN.md", () => {
    expect(ACCENT_COLORS.primary).toBe("#6366F1");
    expect(ACCENT_COLORS.primaryHover).toBe("#4F46E5");
    expect(ACCENT_COLORS.cyan).toBe("#06B6D4");
  });

  it("defines primary, secondary and muted text tokens matching DESIGN.md", () => {
    expect(TEXT_COLORS.primary).toBe("#F8FAFC");
    expect(TEXT_COLORS.secondary).toBe("#94A3B8");
    expect(TEXT_COLORS.muted).toBe("#64748B");
  });

  it("defines all 7 Evidence States with exact hex, icon, and monospace label", () => {
    const expectedStates: Record<
      EvidenceStateKey,
      { hex: string; icon: string; label: string }
    > = {
      corroborated: {
        hex: "#10B981",
        icon: "ShieldCheck",
        label: "CORROBORATED",
      },
      "single-source": {
        hex: "#F59E0B",
        icon: "AlertCircle",
        label: "SINGLE-SOURCE",
      },
      attested: {
        hex: "#3B82F6",
        icon: "UserCheck",
        label: "ATTESTED",
      },
      stale: {
        hex: "#F97316",
        icon: "ClockAlert",
        label: "STALE",
      },
      conflicting: {
        hex: "#A855F7",
        icon: "GitCompare",
        label: "CONFLICTING",
      },
      unsupported: {
        hex: "#EF4444",
        icon: "FileQuestion",
        label: "UNSUPPORTED GAP",
      },
      restricted: {
        hex: "#94A3B8",
        icon: "Lock",
        label: "RESTRICTED",
      },
    };

    expect(Object.keys(EVIDENCE_STATE_COLORS)).toHaveLength(7);

    for (const [key, expected] of Object.entries(expectedStates) as [
      EvidenceStateKey,
      { hex: string; icon: string; label: string }
    ][]) {
      const state = EVIDENCE_STATE_COLORS[key];
      expect(state, `Missing state: ${key}`).toBeDefined();
      expect(state.hex).toBe(expected.hex);
      expect(state.icon).toBe(expected.icon);
      expect(state.label).toBe(expected.label);
      expect(state.bg).toBeTruthy();
      expect(state.border).toBeTruthy();
      expect(state.meaning).toBeTruthy();
    }
  });

  it("enforces triple-signal accessibility (colour + icon + label) for every state", () => {
    for (const [key, state] of Object.entries(EVIDENCE_STATE_COLORS)) {
      expect(state.hex.startsWith("#"), `${key} hex must be valid`).toBe(true);
      expect(state.icon.length > 0, `${key} icon must be defined`).toBe(true);
      expect(state.label.length > 0, `${key} label must be defined`).toBe(true);
      expect(state.label).toBe(state.label.toUpperCase());
    }
  });
});
