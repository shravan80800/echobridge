import { describe, it, expect } from "vitest";
import {
  redactSecretsAndPII,
  maskSecretPreview,
} from "@/services/ingestion/redaction.service";

describe("Secret & PII Redaction Engine (docs/SECURITY.md & Trap 4)", () => {
  it("detects and redacts live Stripe API keys", () => {
    const raw = "Stripe webhook configured with sk_live_51NxCampus9912SecretKeyA9 in env.";
    const result = redactSecretsAndPII(raw, "SRC-TEST");

    expect(result.redactedText).not.toContain("sk_live_51NxCampus9912SecretKeyA9");
    expect(result.redactedText).toContain(
      "[REDACTED_SECRET: API_KEY — Administered by Project Lead]"
    );
    expect(result.redactionCount).toBe(1);
    expect(result.quarantinedSecrets[0].secret_type).toBe("api_key");
    expect(result.quarantinedSecrets[0].masked_preview).toBe("sk_live_••••eyA9");
  });

  it("detects and redacts Google, GitHub, and Bearer developer tokens", () => {
    const raw = `
      Google Key: AIzaSyD-7abc1234567890abcdef12345678901
      GitHub PAT: ghp_1234567890abcdef1234567890abcdef1234
      Auth Header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9abcdef
    `;

    const result = redactSecretsAndPII(raw);
    expect(result.redactedText).not.toContain("AIzaSyD");
    expect(result.redactedText).not.toContain("ghp_1234");
    expect(result.redactedText).not.toContain("eyJhbGci");
    expect(result.redactionCount).toBe(3);
    expect(result.quarantinedSecrets.every((s) => s.secret_type === "api_key")).toBe(true);
  });

  it("detects and redacts personal phone numbers without corrupting dates", () => {
    const raw = "Call Aarav at +91-9876543210 regarding the 2026-03-01 release.";
    const result = redactSecretsAndPII(raw);

    expect(result.redactedText).not.toContain("+91-9876543210");
    expect(result.redactedText).toContain(
      "[REDACTED_SECRET: PHONE — Administered by Project Lead]"
    );
    // Preserves non-secret dates
    expect(result.redactedText).toContain("2026-03-01");
    expect(result.redactionCount).toBe(1);
    expect(result.quarantinedSecrets[0].masked_preview).toBe("+91-98••••••10");
  });

  it("detects and redacts personal email addresses", () => {
    const raw = "Contact lead developer at aarav.sharma@gmail.com for handover access.";
    const result = redactSecretsAndPII(raw);

    expect(result.redactedText).not.toContain("aarav.sharma@gmail.com");
    expect(result.redactedText).toContain(
      "[REDACTED_SECRET: EMAIL — Administered by Project Lead]"
    );
    expect(result.redactionCount).toBe(1);
    expect(result.quarantinedSecrets[0].masked_preview).toBe("aa••••@gmail.com");
  });

  it("detects and redacts hardcoded password assignments", () => {
    const raw = "const DB_PASSWORD = 'SuperSecretDbPassword123!'";
    const result = redactSecretsAndPII(raw);

    expect(result.redactedText).not.toContain("SuperSecretDbPassword123!");
    expect(result.redactedText).toContain(
      "[REDACTED_SECRET: PASSWORD — Administered by Project Lead]"
    );
    expect(result.redactionCount).toBe(1);
    expect(result.quarantinedSecrets[0].secret_type).toBe("password");
  });

  // --------------------------------------------------------------------------
  // STRICT GUARANTEE: Planted Trap 4 (CampusConnect)
  // --------------------------------------------------------------------------
  it("enforces Trap 4 strict verification: 0% raw secret leaked from chat export", () => {
    const rawChatChunk =
      "Maya Patel: For payment gateway webhooks, use sk_live_51NxCampus9912SecretKeyA9. In case of production gateway failures, notify Aarav directly at +91-9876543210.";

    const result = redactSecretsAndPII(rawChatChunk, "SRC-CHAT-03", "CampusConnect");

    // 1. Raw credentials must be 100% absent
    expect(result.redactedText).not.toContain("sk_live_51NxCampus9912SecretKeyA9");
    expect(result.redactedText).not.toContain("+91-9876543210");

    // 2. Both replacement markers must be present
    expect(result.redactedText).toContain(
      "[REDACTED_SECRET: API_KEY — Administered by Project Lead]"
    );
    expect(result.redactedText).toContain(
      "[REDACTED_SECRET: PHONE — Administered by Project Lead]"
    );

    // 3. Exactly 2 secrets quarantined
    expect(result.redactionCount).toBe(2);
    expect(result.quarantinedSecrets[0].secret_type).toBe("api_key");
    expect(result.quarantinedSecrets[0].masked_preview).toBe("sk_live_••••eyA9");
    expect(result.quarantinedSecrets[1].secret_type).toBe("phone");
    expect(result.quarantinedSecrets[1].masked_preview).toBe("+91-98••••••10");

    // 4. Originals must be safely obfuscated in quarantine record
    expect(result.quarantinedSecrets[0].original_encrypted).toContain("ENC:");
    expect(result.quarantinedSecrets[0].original_encrypted).not.toBe(
      "sk_live_51NxCampus9912SecretKeyA9"
    );
  });

  it("handles empty or clean text without mutations", () => {
    const clean = "This is a clean documentation chunk with no credentials.";
    const result = redactSecretsAndPII(clean);

    expect(result.redactedText).toBe(clean);
    expect(result.redactionCount).toBe(0);
    expect(result.quarantinedSecrets).toHaveLength(0);
  });

  it("detects and redacts fine-grained GitHub PATs (github_pat_...)", () => {
    const token = ["github_pat", "11ABCDEFG0123456789", "xyzABCDEF1234567890"].join("_");
    const raw = `GitHub backup config token=${token}`;
    const result = redactSecretsAndPII(raw, "SRC-GH-TEST");

    expect(result.redactedText).not.toContain(token);
    expect(result.redactedText).toContain(
      "[REDACTED_SECRET: API_KEY — Administered by Project Lead]"
    );
    expect(result.redactionCount).toBe(1);
    expect(result.quarantinedSecrets[0].secret_type).toBe("api_key");
    expect(result.quarantinedSecrets[0].masked_preview).toBe("github_pat_••••7890");
    expect(maskSecretPreview(token, "api_key")).toBe("github_pat_••••7890");
  });

  it("masks previews without exposing sensitive content", () => {
    expect(maskSecretPreview("sk_live_1234567890abcdef", "api_key")).toBe(
      "sk_live_••••cdef"
    );
    expect(maskSecretPreview("+91-9876543210", "phone")).toBe("+91-98••••••10");
    expect(maskSecretPreview("user@domain.com", "email")).toBe("us••••@domain.com");
    expect(maskSecretPreview("mySecretPassword1", "password")).toBe("••••••••••••");
  });
});
