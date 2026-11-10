import type { Config } from "tailwindcss";
import { EVIDENCE_STATE_COLORS } from "./src/utils/theme-tokens";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Proposal Light Theme Surface & Typography Tokens
        canvas: "#F8FAFC",
        surface: {
          DEFAULT: "#FFFFFF",
          hover: "#F1F5F9",
        },
        accent: {
          primary: "#0F766E",
          "primary-hover": "#115E59",
          cyan: "#0D9488",
        },
        text: {
          primary: "#0F172A",
          secondary: "#475569",
          muted: "#64748B",
        },
        border: {
          subtle: "#E2E8F0",
        },
        evidence: {
          corroborated: {
            DEFAULT: EVIDENCE_STATE_COLORS.corroborated.hex,
            bg: "#ECFDF5",
          },
          "single-source": {
            DEFAULT: EVIDENCE_STATE_COLORS["single-source"].hex,
            bg: "#FFFBEB",
          },
          attested: {
            DEFAULT: EVIDENCE_STATE_COLORS.attested.hex,
            bg: "#EFF6FF",
          },
          stale: {
            DEFAULT: EVIDENCE_STATE_COLORS.stale.hex,
            bg: "#FFF7ED",
          },
          conflicting: {
            DEFAULT: EVIDENCE_STATE_COLORS.conflicting.hex,
            bg: "#FAF5FF",
          },
          unsupported: {
            DEFAULT: EVIDENCE_STATE_COLORS.unsupported.hex,
            bg: "#FFF1F2",
          },
          restricted: {
            DEFAULT: EVIDENCE_STATE_COLORS.restricted.hex,
            bg: "#F1F5F9",
          },
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        glow: "0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.06)",
        "glow-cyan": "0 1px 3px 0 rgba(15, 118, 110, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
