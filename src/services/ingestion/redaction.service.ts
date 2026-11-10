/**
 * Secret & PII Redaction Engine
 * Implements docs/SECURITY.md Section 2 and docs/PRD.md Section 6 & 7 (Trap 4).
 * Redacts live API keys, developer tokens, passwords, phone numbers, and emails
 * at ingestion time BEFORE chunk embedding or model prompt assembly.
 */

import type { QuarantinedSecret, SecretType } from "@/types/echobridge.types";

export interface RedactionResult {
  redactedText: string;
  quarantinedSecrets: QuarantinedSecret[];
  redactionCount: number;
}

interface DetectedSecretMatch {
  raw: string;
  type: SecretType;
  replacementLabel: string;
  index: number;
  length: number;
}

/**
 * Masking helper for reviewer inspection.
 * Shows safe prefixes and suffixes while protecting the sensitive inner span.
 */
export function maskSecretPreview(raw: string, type: SecretType): string {
  if (!raw || raw.length === 0) return "••••";

  switch (type) {
    case "api_key": {
      if (raw.startsWith("sk_live_") || raw.startsWith("sk_test_")) {
        const prefix = raw.slice(0, 8);
        const suffix = raw.slice(-4);
        return `${prefix}••••${suffix}`;
      }
      if (raw.startsWith("github_pat_")) {
        const prefix = raw.slice(0, 11);
        const suffix = raw.slice(-4);
        return `${prefix}••••${suffix}`;
      }
      if (raw.startsWith("AIza") || raw.startsWith("ghp_") || raw.startsWith("gho_")) {
        const prefix = raw.slice(0, 4);
        const suffix = raw.slice(-4);
        return `${prefix}••••${suffix}`;
      }
      if (raw.startsWith("Bearer ")) {
        const token = raw.slice(7);
        return `Bearer ••••${token.slice(-4)}`;
      }
      if (raw.length > 8) {
        return `${raw.slice(0, 4)}••••${raw.slice(-4)}`;
      }
      return "••••••••";
    }

    case "phone": {
      // E.g. +91-9876543210 -> +91-98••••••10
      const digits = raw.replace(/\D/g, "");
      if (raw.startsWith("+91") && raw.length >= 12) {
        return `${raw.slice(0, 6)}••••••${raw.slice(-2)}`;
      }
      if (raw.length > 6) {
        return `${raw.slice(0, 3)}••••••${raw.slice(-2)}`;
      }
      return "••••••••";
    }

    case "email": {
      // E.g. aarav.sharma@gmail.com -> aa••••@gmail.com
      const parts = raw.split("@");
      if (parts.length === 2) {
        const local = parts[0];
        const domain = parts[1];
        const visibleLocal = local.length > 2 ? local.slice(0, 2) : local.slice(0, 1);
        return `${visibleLocal}••••@${domain}`;
      }
      return "••••@••••";
    }

    case "password":
      return "••••••••••••";

    case "prompt_injection":
      return raw.length > 30 ? `${raw.slice(0, 25)}...` : raw;

    default:
      return "••••••••";
  }
}

/**
 * Detects and redacts credentials and PII from raw source text.
 * Returns the sanitized string and quarantined secret records.
 */
export function redactSecretsAndPII(
  text: string,
  sourceId = "UNKNOWN_SOURCE",
  projectId = "CampusConnect"
): RedactionResult {
  if (!text || text.trim() === "") {
    return {
      redactedText: text || "",
      quarantinedSecrets: [],
      redactionCount: 0,
    };
  }

  const matches: DetectedSecretMatch[] = [];

  // 1. Password assignments (e.g. password="...", DB_PASSWORD=...)
  const passwordRegex =
    /(?:password|db_pass(?:word)?|secret_key)\s*[:=]\s*(['"]?)([^'"\s\n\r]{6,})\1/gi;
  let m: RegExpExecArray | null;
  while ((m = passwordRegex.exec(text)) !== null) {
    const rawVal = m[2];
    matches.push({
      raw: rawVal,
      type: "password",
      replacementLabel: "PASSWORD",
      index: m.index + m[0].indexOf(rawVal),
      length: rawVal.length,
    });
  }

  // 2. Stripe API Keys (sk_live_..., sk_test_...)
  const stripeRegex = /\b(sk_live_[a-zA-Z0-9]{16,}|sk_test_[a-zA-Z0-9]{16,})\b/g;
  while ((m = stripeRegex.exec(text)) !== null) {
    matches.push({
      raw: m[1],
      type: "api_key",
      replacementLabel: "API_KEY",
      index: m.index,
      length: m[1].length,
    });
  }

  // 3. GitHub Personal Access Tokens (classic gh[pousr]_... & fine-grained github_pat_...)
  const githubRegex = /\b(gh[pousr]_[a-zA-Z0-9]{36,}|github_pat_[a-zA-Z0-9_]{20,})\b/g;
  while ((m = githubRegex.exec(text)) !== null) {
    matches.push({
      raw: m[1],
      type: "api_key",
      replacementLabel: "API_KEY",
      index: m.index,
      length: m[1].length,
    });
  }

  // 4. Google API Keys (AIza...)
  const googleRegex = /\b(AIza[0-9A-Za-z\-_]{35})\b/g;
  while ((m = googleRegex.exec(text)) !== null) {
    matches.push({
      raw: m[1],
      type: "api_key",
      replacementLabel: "API_KEY",
      index: m.index,
      length: m[1].length,
    });
  }

  // 5. Generic OpenAI / API Keys (sk-...)
  const openAiRegex = /\b(sk-[a-zA-Z0-9]{20,})\b/g;
  while ((m = openAiRegex.exec(text)) !== null) {
    matches.push({
      raw: m[1],
      type: "api_key",
      replacementLabel: "API_KEY",
      index: m.index,
      length: m[1].length,
    });
  }

  // 6. Slack Tokens (xoxb-..., xoxp-...)
  const slackRegex = /\b(xox[baprs]-[0-9a-zA-Z-]{15,})\b/g;
  while ((m = slackRegex.exec(text)) !== null) {
    matches.push({
      raw: m[1],
      type: "api_key",
      replacementLabel: "API_KEY",
      index: m.index,
      length: m[1].length,
    });
  }

  // 7. Authorization Bearer Tokens
  const bearerRegex = /\bBearer\s+([a-zA-Z0-9_\-\.]{20,})\b/gi;
  while ((m = bearerRegex.exec(text)) !== null) {
    matches.push({
      raw: m[1],
      type: "api_key",
      replacementLabel: "API_KEY",
      index: m.index + m[0].indexOf(m[1]),
      length: m[1].length,
    });
  }

  // 8. Personal Email Addresses
  const emailRegex = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
  while ((m = emailRegex.exec(text)) !== null) {
    matches.push({
      raw: m[1],
      type: "email",
      replacementLabel: "EMAIL",
      index: m.index,
      length: m[1].length,
    });
  }

  // 9. Phone Numbers (Indian domestic + international formats)
  // Ensures it doesn't match dates like 2026-03-01
  const phoneRegex =
    /(?:\+91[-\s]?[6-9]\d{4}[-\s]?\d{5}|\+91[-\s]?[6-9]\d{9}|\b\+?[1-9]\d{0,2}[-\s]?[6-9]\d{4}[-\s]?\d{5}\b|\b(?:\d{3}[-.]){2}\d{4}\b)/g;
  while ((m = phoneRegex.exec(text)) !== null) {
    // Exclude date patterns (e.g. 2026-03-01)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(m[0])) {
      matches.push({
        raw: m[0],
        type: "phone",
        replacementLabel: "PHONE",
        index: m.index,
        length: m[0].length,
      });
    }
  }

  // Filter overlapping matches and sort by index ascending
  matches.sort((a, b) => a.index - b.index);

  const nonOverlapping: DetectedSecretMatch[] = [];
  let lastEnd = -1;

  for (const match of matches) {
    if (match.index >= lastEnd) {
      nonOverlapping.push(match);
      lastEnd = match.index + match.length;
    }
  }

  // Build the sanitized redacted text
  let resultText = "";
  let currentIndex = 0;
  const quarantinedSecrets: QuarantinedSecret[] = [];

  for (let i = 0; i < nonOverlapping.length; i++) {
    const item = nonOverlapping[i];
    resultText += text.substring(currentIndex, item.index);

    const replacement = `[REDACTED_SECRET: ${item.replacementLabel} — Administered by Project Lead]`;
    resultText += replacement;

    const masked = maskSecretPreview(item.raw, item.type);
    const encrypted = `ENC:${Buffer.from(item.raw).toString("base64")}`;

    quarantinedSecrets.push({
      id: `SEC-${Date.now()}-${i + 1}-${Math.random().toString(36).substring(2, 6)}`,
      project_id: projectId,
      source_id: sourceId,
      chunk_id: "",
      secret_type: item.type,
      masked_preview: masked,
      original_encrypted: encrypted,
      reviewer_status: "quarantined",
      detected_at: new Date().toISOString(),
    });

    currentIndex = item.index + item.length;
  }

  resultText += text.substring(currentIndex);

  return {
    redactedText: resultText,
    quarantinedSecrets,
    redactionCount: quarantinedSecrets.length,
  };
}
