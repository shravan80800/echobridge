import type { Config } from "tailwindcss";
import {
  SURFACE_COLORS,
  ACCENT_COLORS,
  TEXT_COLORS,
  EVIDENCE_STATE_COLORS,
} from "./src/utils/theme-tokens";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: SURFACE_COLORS.canvas,
        surface: {
          DEFAULT: SURFACE_COLORS.surface,
          hover: SURFACE_COLORS.surfaceHover,
        },
        accent: {
          primary: ACCENT_COLORS.primary,
          "primary-hover": ACCENT_COLORS.primaryHover,
          cyan: ACCENT_COLORS.cyan,
        },
        text: {
          primary: TEXT_COLORS.primary,
          secondary: TEXT_COLORS.secondary,
          muted: TEXT_COLORS.muted,
        },
        border: {
          subtle: SURFACE_COLORS.borderSubtle,
        },
        evidence: {
          corroborated: {
            DEFAULT: EVIDENCE_STATE_COLORS.corroborated.hex,
            bg: EVIDENCE_STATE_COLORS.corroborated.bg,
          },
          "single-source": {
            DEFAULT: EVIDENCE_STATE_COLORS["single-source"].hex,
            bg: EVIDENCE_STATE_COLORS["single-source"].bg,
          },
          attested: {
            DEFAULT: EVIDENCE_STATE_COLORS.attested.hex,
            bg: EVIDENCE_STATE_COLORS.attested.bg,
          },
          stale: {
            DEFAULT: EVIDENCE_STATE_COLORS.stale.hex,
            bg: EVIDENCE_STATE_COLORS.stale.bg,
          },
          conflicting: {
            DEFAULT: EVIDENCE_STATE_COLORS.conflicting.hex,
            bg: EVIDENCE_STATE_COLORS.conflicting.bg,
          },
          unsupported: {
            DEFAULT: EVIDENCE_STATE_COLORS.unsupported.hex,
            bg: EVIDENCE_STATE_COLORS.unsupported.bg,
          },
          restricted: {
            DEFAULT: EVIDENCE_STATE_COLORS.restricted.hex,
            bg: EVIDENCE_STATE_COLORS.restricted.bg,
          },
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(99, 102, 241, 0.35)",
        "glow-cyan": "0 0 25px -5px rgba(6, 182, 212, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
