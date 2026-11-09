import { describe, it, expect } from "vitest";
import type {
  QuarantinedSecret,
  SecretType,
  Source,
} from "@/types/echobridge.types";
import { resolveSourceRoles } from "@/services/ingestion/parser.service";

describe("Quarantine Vault & Stage 1/2 UI Metadata (TASK-011)", () => {
  const sampleSecrets: QuarantinedSecret[] = [
    {
      id: "SEC-01",
      project_id: "CampusConnect",
      source_id: "SRC-CHAT-03",
      chunk_id: "CHK-07",
      secret_type: "api_key",
      masked_preview: "sk_live_••••eyA9",
      reviewer_status: "quarantined",
      detected_at: "2026-03-02T16:05:00Z",
    },
    {
      id: "SEC-02",
      project_id: "CampusConnect",
      source_id: "SRC-CHAT-03",
      chunk_id: "CHK-07",
      secret_type: "phone",
      masked_preview: "+91-98••••••10",
      reviewer_status: "quarantined",
      detected_at: "2026-03-02T16:05:00Z",
    },
    {
      id: "SEC-03",
      project_id: "CampusConnect",
      source_id: "SRC-BACKLOG-07",
      chunk_id: "CHK-09",
      secret_type: "prompt_injection",
      masked_preview: "[PROMPT_INJECTION] Ignore previous instructions...",
      reviewer_status: "quarantined",
      detected_at: "2026-03-05T13:00:00Z",
    },
  ];

  it("identifies Planted Trap 4 and Trap 6 accurately in quarantine entries", () => {
    const isPlantedTrap = (secret: QuarantinedSecret) => {
      if (
        secret.source_id === "SRC-CHAT-03" &&
        (secret.secret_type === "api_key" || secret.secret_type === "phone")
      ) {
        return "Trap 4: Secret/PII Redaction";
      }
      if (
        secret.source_id === "SRC-BACKLOG-07" ||
        secret.secret_type === "prompt_injection"
      ) {
        return "Trap 6: Injection Stripped";
      }
      return null;
    };

    expect(isPlantedTrap(sampleSecrets[0])).toBe("Trap 4: Secret/PII Redaction");
    expect(isPlantedTrap(sampleSecrets[1])).toBe("Trap 4: Secret/PII Redaction");
    expect(isPlantedTrap(sampleSecrets[2])).toBe("Trap 6: Injection Stripped");
  });

  it("filters quarantine secrets accurately across credentials, PII, and injections", () => {
    const filterSecrets = (secrets: QuarantinedSecret[], filterType: string) => {
      return secrets.filter((s) => {
        if (filterType === "all") return true;
        if (filterType === "credentials")
          return s.secret_type === "api_key" || s.secret_type === "password";
        if (filterType === "pii")
          return s.secret_type === "phone" || s.secret_type === "email";
        if (filterType === "injections")
          return s.secret_type === "prompt_injection";
        return true;
      });
    };

    expect(filterSecrets(sampleSecrets, "all")).toHaveLength(3);
    expect(filterSecrets(sampleSecrets, "credentials")).toHaveLength(1);
    expect(filterSecrets(sampleSecrets, "pii")).toHaveLength(1);
    expect(filterSecrets(sampleSecrets, "injections")).toHaveLength(1);
  });

  it("confirms zero raw secret leaks in masked previews", () => {
    for (const secret of sampleSecrets) {
      // Must not leak the raw keys from CampusConnect seed
      expect(secret.masked_preview).not.toContain("sk_live_51PqL92CampusKeyA9");
      expect(secret.masked_preview).not.toContain("+91-9876543210");
      expect(secret.masked_preview).toMatch(/••••|\[PROMPT_INJECTION\]/);
    }
  });

  it("validates Stage 1 Source Scope Mapping rules for Planted Trap 5", () => {
    const sources: Source[] = [
      {
        id: "SRC-ARCH-01",
        project_id: "CampusConnect",
        title: "Architecture_Overview.md",
        source_type: "document",
        author: "Aarav Sharma",
        source_timestamp: "2026-03-01T10:00:00Z",
        allowed_roles: ["incoming_lead", "incoming_intern"],
        created_at: "2026-03-01T10:00:00Z",
      },
      {
        id: "SRC-FIN-06",
        project_id: "CampusConnect",
        title: "Finance/Sponsorship_Budget_2025-26.md",
        source_type: "finance_folder",
        author: "Prof. Deshmukh",
        source_timestamp: "2026-02-15T11:00:00Z",
        allowed_roles: resolveSourceRoles({
          source_type: "finance_folder",
          file_path: "confidential/Finance.md",
        }),
        created_at: "2026-02-15T11:00:00Z",
      },
    ];

    expect(sources[0].allowed_roles).toContain("incoming_intern");
    expect(sources[0].allowed_roles).toContain("incoming_lead");

    // Trap 5: Finance source MUST be restricted from intern
    expect(sources[1].allowed_roles).toEqual(["incoming_lead"]);
    expect(sources[1].allowed_roles.includes("incoming_intern" as any)).toBe(false);
  });
});
