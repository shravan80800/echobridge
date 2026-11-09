import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/ingest/route";
import { NextRequest } from "next/server";
import { repository } from "@/lib/supabase/repository";

describe("API Route: /api/ingest", () => {
  beforeEach(() => {
    repository.resetInMemoryStore(false);
  });

  it("POST /api/ingest seeds CampusConnect when called with empty body", async () => {
    const request = new NextRequest("http://localhost:3000/api/ingest", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.sourcesIngested).toBe(8);
    expect(data.data.chunksCreated).toBeGreaterThanOrEqual(8);
    expect(data.data.quarantinedSecretsCount).toBeGreaterThanOrEqual(2);
  });

  it("GET /api/ingest returns sources count, ACL scope map, and quarantine secrets", async () => {
    // First ingest seed
    const postReq = new NextRequest("http://localhost:3000/api/ingest", {
      method: "POST",
      body: JSON.stringify({ useSeed: true }),
    });
    await POST(postReq);

    // Now call GET
    const getReq = new NextRequest(
      "http://localhost:3000/api/ingest?projectId=CampusConnect"
    );
    const getRes = await GET(getReq);
    expect(getRes.status).toBe(200);

    const data = await getRes.json();
    expect(data.success).toBe(true);
    expect(data.sourcesCount).toBe(8);
    expect(data.chunksCount).toBeGreaterThanOrEqual(8);
    expect(data.aclScopeMap).toBeDefined();
    expect(data.aclScopeMap.length).toBe(8);

    // Verify confidential finance restriction in scope map
    const finance = data.aclScopeMap.find(
      (s: { sourceId: string }) => s.sourceId === "SRC-FIN-06"
    );
    expect(finance.isRestrictedFromIntern).toBe(true);
  });

  it("POST /api/ingest processes custom uploaded sources", async () => {
    const customSource = {
      id: "SRC-CUSTOM-01",
      title: "Custom Service Setup",
      source_type: "document" as const,
      author: "Maya Patel",
      content:
        "Custom service configuration for email notifications via SendGrid. Stripe API key sk_live_CustomSecretKey123.",
    };

    const request = new NextRequest("http://localhost:3000/api/ingest", {
      method: "POST",
      body: JSON.stringify({
        projectId: "CustomProject",
        sources: [customSource],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.sourcesIngested).toBe(1);
    expect(data.data.quarantinedSecretsCount).toBeGreaterThanOrEqual(1);
  });
});
