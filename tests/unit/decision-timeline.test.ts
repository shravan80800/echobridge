import { describe, it, expect } from "vitest";
import {
  getDecisionTimeline,
  getContextGraphData,
  CAMPUS_CONNECT_TIMELINE,
} from "@/services/evidence/timeline.service";

describe("Decision Timeline & Context Web Graph (TASK-023)", () => {
  it("returns 8 chronological architectural milestones for Team Lead scope", () => {
    const timeline = getDecisionTimeline("incoming_lead");
    expect(timeline.length).toBe(8);

    // Verify chronological ordering
    for (let i = 0; i < timeline.length - 1; i++) {
      expect(timeline[i].timestamp <= timeline[i + 1].timestamp).toBe(true);
    }

    // Verify unmasked finance milestone is accessible to team lead
    const financeItem = timeline.find((t) => t.id === "DT-08");
    expect(financeItem).toBeDefined();
    expect(financeItem?.isRestricted).toBe(false);
    expect(financeItem?.summary).toContain("$3,500");
  });

  it("strictly masks confidential financial milestones in Intern scope with zero leak", () => {
    const timeline = getDecisionTimeline("incoming_intern");
    expect(timeline.length).toBe(8);

    const financeItem = timeline.find((t) => t.id === "DT-08");
    expect(financeItem).toBeDefined();
    expect(financeItem?.isRestricted).toBe(true);
    expect(financeItem?.evidenceState).toBe("restricted");
    expect(financeItem?.summary).toContain("[Restricted: request access]");
    expect(financeItem?.summary).not.toContain("$3,500");
    expect(financeItem?.rationale).not.toContain("$3,500");
    expect(financeItem?.alternativesConsidered).toBeUndefined();
  });

  it("verifies Trap 2 (Redis Rationale) contains unwritten 'Why' explanation and attested state", () => {
    const timeline = getDecisionTimeline("incoming_lead");
    const trap2 = timeline.find((t) => t.id === "DT-02");
    expect(trap2).toBeDefined();
    expect(trap2?.evidenceState).toBe("attested");
    expect(trap2?.plantedTrap).toContain("Trap 2");
    expect(trap2?.rationale).toContain("Flash registrations");
    expect(trap2?.rationale).toContain("1,200 concurrent requests/sec");
    expect(trap2?.alternativesConsidered?.length).toBeGreaterThan(0);
  });

  it("verifies Trap 1 (Contradiction) captures both Side A and resolved Side B milestones", () => {
    const timeline = getDecisionTimeline("incoming_lead");
    const sideA = timeline.find((t) => t.id === "DT-04");
    const sideB = timeline.find((t) => t.id === "DT-05");

    expect(sideA).toBeDefined();
    expect(sideA?.evidenceState).toBe("conflicting");
    expect(sideA?.plantedTrap).toContain("Trap 1");
    expect(sideA?.timestamp).toBe("2024-03-15");

    expect(sideB).toBeDefined();
    expect(sideB?.evidenceState).toBe("corroborated");
    expect(sideB?.plantedTrap).toContain("Trap 1");
    expect(sideB?.timestamp).toBe("2024-03-20");
  });

  it("generates complete Context Web Graph topology with sources, claims, people, and quarantine vaults", () => {
    const graphLead = getContextGraphData("incoming_lead");
    expect(graphLead.nodes.length).toBeGreaterThanOrEqual(13);
    expect(graphLead.edges.length).toBeGreaterThanOrEqual(12);

    // Verify presence of all node types
    const nodeTypes = new Set(graphLead.nodes.map((n) => n.type));
    expect(nodeTypes.has("source")).toBe(true);
    expect(nodeTypes.has("decision") || nodeTypes.has("claim")).toBe(true);
    expect(nodeTypes.has("person")).toBe(true);
    expect(nodeTypes.has("secret")).toBe(true);

    // Verify contradiction edge exists between 1A and 1B
    const contradictionEdge = graphLead.edges.find(
      (e) =>
        e.label === "contradicts" &&
        ((e.source === "CLM-TRAP-1A" && e.target === "CLM-TRAP-1B") ||
          (e.source === "CLM-TRAP-1B" && e.target === "CLM-TRAP-1A"))
    );
    expect(contradictionEdge).toBeDefined();
    expect(contradictionEdge?.style).toBe("conflict");

    // Verify quarantine edge connects chat to secret vault
    const quarantineEdge = graphLead.edges.find((e) => e.label === "quarantines");
    expect(quarantineEdge).toBeDefined();
    expect(quarantineEdge?.target).toBe("SEC-01");
  });

  it("enforces Pre-Model & Post-Generation RBAC in the Context Web Graph for Intern scope", () => {
    const graphIntern = getContextGraphData("incoming_intern");
    const restrictedSource = graphIntern.nodes.find((n) => n.id === "SRC-05");
    const restrictedClaim = graphIntern.nodes.find((n) => n.id === "CLM-TRAP-5");

    expect(restrictedSource).toBeDefined();
    expect(restrictedSource?.evidenceState).toBe("restricted");
    expect(restrictedSource?.label).toContain("Restricted");

    expect(restrictedClaim).toBeDefined();
    expect(restrictedClaim?.evidenceState).toBe("restricted");
    expect(restrictedClaim?.label).not.toContain("$3,500");
  });
});
