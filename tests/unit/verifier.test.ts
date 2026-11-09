import { describe, it, expect } from "vitest";
import {
  verifyEvidenceLayerA,
  evaluateDeterministicEntailment,
  evaluateAuthorIndependence,
  determineEvidenceState,
  verifyClaim,
} from "@/services/trust/verifier.service";
import {
  isVerbatimMatch,
  findSpanLocation,
  isQuotingOrCopying,
} from "@/utils/text-matching";
import type { Chunk, ClaimRecord, EvidenceRecord } from "@/types/echobridge.types";

describe("Two-Layer Citation Verifier & Author Independence Rule (TASK-013)", () => {
  const sampleChunkA: Chunk = {
    id: "CHK-01",
    project_id: "CampusConnect",
    source_id: "SRC-ARCH-01",
    content:
      "Next.js 15 App Router handles all frontend UI components and API route handlers deployed seamlessly on Vercel.",
    author: "Aarav Sharma",
    chunk_timestamp: "2026-03-01T10:00:00Z",
    allowed_roles: ["incoming_lead", "incoming_intern"],
    injection_flagged: false,
    redaction_count: 0,
  };

  const sampleChunkB: Chunk = {
    id: "CHK-02",
    project_id: "CampusConnect",
    source_id: "SRC-CHAT-02",
    content:
      "Maya Patel: Verified that Next.js 15 App Router handles frontend UI components and API routes on Vercel preview.",
    author: "Maya Patel",
    chunk_timestamp: "2026-03-02T11:00:00Z",
    allowed_roles: ["incoming_lead", "incoming_intern"],
    injection_flagged: false,
    redaction_count: 0,
  };

  const sampleChunkC_SameAuthor: Chunk = {
    id: "CHK-03",
    project_id: "CampusConnect",
    source_id: "SRC-DOC-03",
    content:
      "Aarav Sharma: Re-confirming that Next.js 15 App Router handles all frontend UI components.",
    author: "Aarav Sharma", // Same author as Chunk A
    chunk_timestamp: "2026-03-03T12:00:00Z",
    allowed_roles: ["incoming_lead", "incoming_intern"],
    injection_flagged: false,
    redaction_count: 0,
  };

  const sampleChunkD_Quoting: Chunk = {
    id: "CHK-04",
    project_id: "CampusConnect",
    source_id: "SRC-CHAT-04",
    content:
      'Maya Patel: Per Aarav Sharma wrote: "Next.js 15 App Router handles all frontend UI components and API route handlers".',
    author: "Maya Patel",
    chunk_timestamp: "2026-03-04T14:00:00Z",
    allowed_roles: ["incoming_lead", "incoming_intern"],
    injection_flagged: false,
    redaction_count: 0,
  };

  const chunksMap = new Map<string, Chunk>([
    ["CHK-01", sampleChunkA],
    ["CHK-02", sampleChunkB],
    ["CHK-03", sampleChunkC_SameAuthor],
    ["CHK-04", sampleChunkD_Quoting],
  ]);

  describe("Layer A — Deterministic Verbatim Span Matcher", () => {
    it("confirms exact verbatim substring matches", () => {
      const quote = "Next.js 15 App Router handles all frontend UI components";
      expect(isVerbatimMatch(quote, sampleChunkA.content)).toBe(true);

      const result = verifyEvidenceLayerA(quote, sampleChunkA, "incoming_intern");
      expect(result.isVerbatim).toBe(true);
      expect(result.isRolePermitted).toBe(true);
      expect(result.spanLocation).not.toBeNull();
      expect(result.spanLocation?.start).toBe(0);
    });

    it("confirms whitespace-normalized matching", () => {
      const quoteWithNewlines =
        "Next.js 15 App Router\n  handles all frontend   UI components";
      expect(isVerbatimMatch(quoteWithNewlines, sampleChunkA.content)).toBe(true);
    });

    it("rejects hallucinated or non-existent quote spans", () => {
      const hallucinated =
        "Ruby on Rails backend handles server rendering and graphql endpoints";
      expect(isVerbatimMatch(hallucinated, sampleChunkA.content)).toBe(false);

      const result = verifyEvidenceLayerA(
        hallucinated,
        sampleChunkA,
        "incoming_intern"
      );
      expect(result.isVerbatim).toBe(false);
      expect(result.spanLocation).toBeNull();
    });

    it("finds correct span coordinates for interactive UI code popovers", () => {
      const quote = "API route handlers deployed seamlessly";
      const loc = findSpanLocation(quote, sampleChunkA.content);
      expect(loc).not.toBeNull();
      const extracted = sampleChunkA.content.slice(loc!.start, loc!.end);
      expect(extracted).toBe(quote);
    });
  });

  describe("Layer B — Semantic Entailment Judge", () => {
    it("returns supported when chunk logically entails claim", () => {
      const claim = "Next.js 15 App Router is used for the web frontend and API routes.";
      const verdict = evaluateDeterministicEntailment(
        claim,
        sampleChunkA.content,
        "Next.js 15 App Router handles all frontend UI components and API route handlers"
      );
      expect(verdict).toBe("supported");
    });

    it("returns contradicted when chunk asserts conflicting timeline", () => {
      const claim = "Event registration closes on March 15.";
      const conflictingChunk = "Official Event Timeline: Event registration closes on March 20th.";
      const verdict = evaluateDeterministicEntailment(
        claim,
        conflictingChunk,
        "Event registration closes on March 20th"
      );
      expect(verdict).toBe("contradicted");
    });

    it("returns unsupported for irrelevant text", () => {
      const claim = "Payment webhooks are processed using Stripe.";
      const irrelevantChunk = "Worker Maintenance: Restart background workers manually.";
      const verdict = evaluateDeterministicEntailment(
        claim,
        irrelevantChunk,
        "Restart background workers manually"
      );
      expect(verdict).toBe("unsupported");
    });
  });

  describe("Author Independence Rule (All 4 Examples from Proposal Page 7)", () => {
    it("Example 1: Two statements by different authors -> 2 independent sources -> Corroborated (Green)", () => {
      const evidenceList: EvidenceRecord[] = [
        {
          id: "EVD-01",
          claim_id: "CLM-01",
          chunk_id: "CHK-01",
          source_id: "SRC-ARCH-01",
          source_type: "document",
          source_title: "Architecture_Overview.md",
          author: "Aarav Sharma", // Author 1
          evidence_timestamp: "2026-03-01T10:00:00Z",
          quoted_span: "Next.js 15 App Router handles all frontend UI components",
          is_verbatim_verified: true,
          entailment_verdict: "supported",
        },
        {
          id: "EVD-02",
          claim_id: "CLM-01",
          chunk_id: "CHK-02",
          source_id: "SRC-CHAT-02",
          source_type: "chat_export",
          source_title: "Discord General",
          author: "Maya Patel", // Author 2 (Independent)
          evidence_timestamp: "2026-03-02T11:00:00Z",
          quoted_span: "Next.js 15 App Router handles frontend UI components",
          is_verbatim_verified: true,
          entailment_verdict: "supported",
        },
      ];

      const independence = evaluateAuthorIndependence(evidenceList, chunksMap);
      expect(independence.isIndependent).toBe(true);
      expect(independence.independentCount).toBe(2);
      expect(independence.uniqueAuthors).toContain("Aarav Sharma");
      expect(independence.uniqueAuthors).toContain("Maya Patel");

      const state = determineEvidenceState({
        claimText: "Next.js App Router powers the frontend.",
        evidenceList,
        chunksById: chunksMap,
        targetRole: "incoming_intern",
      });
      expect(state).toBe("corroborated"); // Green!
    });

    it("Example 2: Two statements by the same author -> Same author -> 1 source -> Single-source (Yellow)", () => {
      const evidenceList: EvidenceRecord[] = [
        {
          id: "EVD-01",
          claim_id: "CLM-02",
          chunk_id: "CHK-01",
          source_id: "SRC-ARCH-01",
          source_type: "document",
          source_title: "Architecture_Overview.md",
          author: "Aarav Sharma",
          evidence_timestamp: "2026-03-01T10:00:00Z",
          quoted_span: "Next.js 15 App Router handles all frontend UI components",
          is_verbatim_verified: true,
          entailment_verdict: "supported",
        },
        {
          id: "EVD-03",
          claim_id: "CLM-02",
          chunk_id: "CHK-03",
          source_id: "SRC-DOC-03",
          source_type: "document",
          source_title: "Sprint Notes",
          author: "Aarav Sharma", // Same author again!
          evidence_timestamp: "2026-03-03T12:00:00Z",
          quoted_span: "Next.js 15 App Router handles all frontend UI components",
          is_verbatim_verified: true,
          entailment_verdict: "supported",
        },
      ];

      const independence = evaluateAuthorIndependence(evidenceList, chunksMap);
      expect(independence.isIndependent).toBe(false);
      expect(independence.independentCount).toBe(1);
      expect(independence.derivativeNotes.length).toBeGreaterThanOrEqual(1);

      const state = determineEvidenceState({
        claimText: "Next.js App Router powers the frontend.",
        evidenceList,
        chunksById: chunksMap,
        targetRole: "incoming_intern",
      });
      expect(state).toBe("single_source"); // Yellow!
    });

    it("Example 3: Maya quotes Aarav -> Derivative quote -> 1 source -> Single-source (Yellow)", () => {
      expect(
        isQuotingOrCopying(
          sampleChunkA.content,
          sampleChunkD_Quoting.content,
          sampleChunkA.author,
          sampleChunkD_Quoting.author
        )
      ).toBe(true);

      const evidenceList: EvidenceRecord[] = [
        {
          id: "EVD-01",
          claim_id: "CLM-03",
          chunk_id: "CHK-01",
          source_id: "SRC-ARCH-01",
          source_type: "document",
          source_title: "Architecture_Overview.md",
          author: "Aarav Sharma",
          evidence_timestamp: "2026-03-01T10:00:00Z",
          quoted_span: "Next.js 15 App Router handles all frontend UI components",
          is_verbatim_verified: true,
          entailment_verdict: "supported",
        },
        {
          id: "EVD-04",
          claim_id: "CLM-03",
          chunk_id: "CHK-04",
          source_id: "SRC-CHAT-04",
          source_type: "chat_export",
          source_title: "Team Chat",
          author: "Maya Patel", // Quoting Aarav!
          evidence_timestamp: "2026-03-04T14:00:00Z",
          quoted_span: "Next.js 15 App Router handles all frontend UI components",
          is_verbatim_verified: true,
          entailment_verdict: "supported",
        },
      ];

      const independence = evaluateAuthorIndependence(evidenceList, chunksMap);
      expect(independence.isIndependent).toBe(false);
      expect(independence.independentCount).toBe(1);

      const state = determineEvidenceState({
        claimText: "Next.js App Router powers the frontend.",
        evidenceList,
        chunksById: chunksMap,
        targetRole: "incoming_intern",
      });
      expect(state).toBe("single_source"); // Yellow!
    });

    it("Example 4: 0 supporting chunks found -> Unsupported (Red Gap)", () => {
      const evidenceList: EvidenceRecord[] = [];
      const independence = evaluateAuthorIndependence(evidenceList, chunksMap);
      expect(independence.independentCount).toBe(0);

      const state = determineEvidenceState({
        claimText: "Why Redis was chosen over Postgres for caching.",
        evidenceList,
        chunksById: chunksMap,
        targetRole: "incoming_intern",
      });
      expect(state).toBe("unsupported"); // Red!
    });
  });

  describe("Gap-Interview Attestation Rule (ADR-006)", () => {
    it("transitions an unsupported gap to Attested (Blue), never Corroborated (Green)", () => {
      const state = determineEvidenceState({
        claimText: "Redis was chosen because it handled the 5,000 req/sec registration spike.",
        evidenceList: [],
        chunksById: chunksMap,
        targetRole: "incoming_intern",
        isAttestedByGapInterview: true,
      });
      expect(state).toBe("attested"); // Blue!
    });
  });

  describe("verifyClaim End-to-End Integration", () => {
    it("processes all evidence layers and classifies corroborated claim cleanly", async () => {
      const rawClaim: ClaimRecord = {
        id: "CLM-INTEG-01",
        draft_version_id: "DFT-01",
        project_id: "CampusConnect",
        audience_role: "incoming_intern",
        section: "architecture",
        claim_type: "decision",
        text: "Next.js 15 App Router handles frontend UI components and API route handlers.",
        evidence_state: "single_source", // Initial unverified
        evidence: [
          {
            id: "EVD-01",
            claim_id: "CLM-INTEG-01",
            chunk_id: "CHK-01",
            source_id: "SRC-ARCH-01",
            source_type: "document",
            source_title: "Architecture_Overview.md",
            author: "Aarav Sharma",
            evidence_timestamp: "2026-03-01T10:00:00Z",
            quoted_span: "Next.js 15 App Router handles all frontend UI components and API route handlers",
            is_verbatim_verified: false,
            entailment_verdict: "unsupported",
          },
          {
            id: "EVD-02",
            claim_id: "CLM-INTEG-01",
            chunk_id: "CHK-02",
            source_id: "SRC-CHAT-02",
            source_type: "chat_export",
            source_title: "Discord General",
            author: "Maya Patel",
            evidence_timestamp: "2026-03-02T11:00:00Z",
            quoted_span: "Next.js 15 App Router handles frontend UI components and API routes",
            is_verbatim_verified: false,
            entailment_verdict: "unsupported",
          },
        ],
        audience_acl: ["incoming_lead", "incoming_intern"],
        review: { status: "pending" },
      };

      const verified = await verifyClaim(rawClaim, chunksMap, "incoming_intern");

      expect(verified.evidence[0].is_verbatim_verified).toBe(true);
      expect(verified.evidence[0].entailment_verdict).toBe("supported");
      expect(verified.evidence[1].is_verbatim_verified).toBe(true);
      expect(verified.evidence[1].entailment_verdict).toBe("supported");
      expect(verified.evidence_state).toBe("corroborated");
    });
  });
});
