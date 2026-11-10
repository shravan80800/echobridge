import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReceiptBanner } from "@/components/handover/ReceiptBanner";
import { OnboardingBoard } from "@/components/handover/OnboardingBoard";
import { ComprehensionQuizModal } from "@/components/handover/ComprehensionQuizModal";
import { HandoverCertificateDocument } from "@/components/handover/HandoverCertificateDocument";
import { ReceiptCertificateModal } from "@/components/handover/ReceiptCertificateModal";
import { ProjectSwitcherBar } from "@/components/layout/ProjectSwitcherBar";
import { buildCertificateSvg } from "@/utils/certificate-svg";
import { getFullVerificationKey } from "@/utils/verification-key";
import type { Receipt, ClaimRecord, ComprehensionQuestion } from "@/types/echobridge.types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("Stage 6 UI: Handover Delivery, Onboarding Board & Receipt Modal (TASK-021)", () => {
  const sampleReceipt: Receipt = {
    id: "RCP-LEAD-123456789",
    project_id: "CampusConnect",
    draft_version_id: "DV-LEAD-V2.0",
    audience_role: "incoming_lead",
    incoming_user_name: "Riya Patel",
    comprehension_score: 100,
    comprehension_passed: true,
    acknowledged_at: "2026-03-12T12:00:00Z",
    receipt_hash: "0x9f2a4b8c1d3e5f7a9b0c2d4e6f8a0b2c4d6e8f0a",
  };

  const sampleQuestions: ComprehensionQuestion[] = [
    {
      id: "QUIZ-01",
      question: "What is the official agreed deadline for hackathon event registration?",
      options: [
        "March 15th at midnight",
        "March 20th to allow late entries",
      ],
      correct_option_index: 1,
      explanation: "Approved by Mentor Prof. Deshmukh in v2.0.",
    },
  ];

  const sampleClaims: ClaimRecord[] = [
    {
      id: "CLM-001",
      draft_version_id: "DV-LEAD-V2.0",
      project_id: "CampusConnect",
      audience_role: "incoming_lead",
      section: "onboarding_day1",
      claim_type: "owner",
      text: "Verify local development environment against Next.js 15 App Router specifications.",
      evidence_state: "corroborated",
      evidence: [],
      audience_acl: ["incoming_lead", "incoming_intern"],
      review: { status: "approved" },
    },
    {
      id: "CLM-002",
      draft_version_id: "DV-LEAD-V2.0",
      project_id: "CampusConnect",
      audience_role: "incoming_lead",
      section: "onboarding_week1",
      claim_type: "next_action",
      text: "Rotate Stripe payment gateway keys in Vercel environment variables.",
      evidence_state: "corroborated",
      evidence: [],
      audience_acl: ["incoming_lead", "incoming_intern"],
      review: { status: "approved" },
    },
    {
      id: "CLM-003",
      draft_version_id: "DV-LEAD-V2.0",
      project_id: "CampusConnect",
      audience_role: "incoming_lead",
      section: "onboarding_month1",
      claim_type: "decision",
      text: "Deploy hackathon registration portal for March 20th deadline.",
      evidence_state: "corroborated",
      evidence: [],
      audience_acl: ["incoming_lead", "incoming_intern"],
      review: { status: "approved" },
    },
  ];

  describe("ReceiptBanner", () => {
    it("renders unacknowledged banner with verify action button", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReceiptBanner, {
          receipt: null,
          recipientName: "Riya Patel",
          recipientRoleName: "Incoming Team Lead",
          onOpenQuizModal: () => {},
          onOpenCertificateModal: () => {},
          isIncomingRole: true,
        })
      );

      expect(html).toContain("Receipt: Not Yet Acknowledged");
      expect(html).toContain("Transfer pending verification by Riya Patel");
      expect(html).toContain("Verify &amp; Acknowledge Receipt");
    });

    it("renders verified acknowledged banner with cryptographic signature hash", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReceiptBanner, {
          receipt: sampleReceipt,
          recipientName: "Riya Patel",
          recipientRoleName: "Incoming Team Lead",
          onOpenQuizModal: () => {},
          onOpenCertificateModal: () => {},
          isIncomingRole: true,
        })
      );

      expect(html).toContain("Verified Transfer Acknowledged");
      expect(html).toContain("Handover acknowledged by Riya Patel");
      expect(html).toContain("0x9f2a4b8c1d3e5f7a9b0c2d4e6f8a0b2c4d6e8f0a");
      expect(html).toContain("View Certificate");
    });
  });

  describe("OnboardingBoard", () => {
    it("renders Day 1, Week 1, and Month 1 continuation columns with critical risks", () => {
      const html = renderToStaticMarkup(
        React.createElement(OnboardingBoard, {
          claims: sampleClaims,
          audienceRole: "incoming_lead",
        })
      );

      expect(html).toContain("Critical Inherited Operational Risks");
      expect(html).toContain("Deployment Runbook &gt; 180 Days Old");
      expect(html).toContain("Day 1: Setup &amp; Contacts");
      expect(html).toContain("Week 1: PRs &amp; Keys");
      expect(html).toContain("Month 1: Releases &amp; Milestones");
      expect(html).toContain("Verify local development environment");
    });

    it("renders restricted placeholder in Intern view when finance card is present", () => {
      const internClaimsWithFinance: ClaimRecord[] = [
        ...sampleClaims,
        {
          id: "CLM-FIN-RESTRICTED",
          draft_version_id: "DV-INTERN-V2.0",
          project_id: "CampusConnect",
          audience_role: "incoming_intern",
          section: "onboarding_month1",
          claim_type: "owner",
          text: "Restricted: request access",
          evidence_state: "restricted",
          evidence: [],
          audience_acl: ["incoming_lead"],
          review: { status: "approved" },
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(OnboardingBoard, {
          claims: internClaimsWithFinance,
          audienceRole: "incoming_intern",
          showRestrictedPlaceholders: true,
        })
      );

      expect(html).toContain("Restricted: request access");
      expect(html).toContain("RESTRICTED");
      expect(html).not.toContain("$8,500"); // Zero raw finance leak!
    });
  });

  describe("ComprehensionQuizModal", () => {
    it("renders modal with questions and Fill Verified Answers demo helper", () => {
      const html = renderToStaticMarkup(
        React.createElement(ComprehensionQuizModal, {
          isOpen: true,
          onClose: () => {},
          questions: sampleQuestions,
          recipientName: "Riya Patel",
          recipientRoleName: "Incoming Team Lead",
          onAcknowledge: async () => {},
        })
      );

      expect(html).toContain("Critical Risk Comprehension Check");
      expect(html).toContain("What is the official agreed deadline");
      expect(html).toContain("Fill Verified Answers");
      expect(html).toContain("Verify Answers &amp; Sign Receipt");
    });
  });

  describe("HandoverCertificateDocument, Modal & SVG Export", () => {
    it("renders formal landscape certificate artwork without action chrome and shows full SHA-256 key", () => {
      const fullKey = getFullVerificationKey(sampleReceipt);
      const html = renderToStaticMarkup(
        React.createElement(HandoverCertificateDocument, {
          receipt: sampleReceipt,
          projectName: "CampusConnect",
          approverName: "Prof. Deshmukh (Project Mentor)",
        })
      );

      expect(html).toContain("Certificate of Verified Project Handover");
      expect(html).toContain("Riya Patel");
      expect(html).toContain("Incoming Team Lead");
      expect(html).toContain("CampusConnect");
      expect(html).toContain("Prof. Deshmukh — Faculty Mentor");
      expect(html).toContain("100%");
      expect(html).toContain(sampleReceipt.id);
      expect(html).toContain(fullKey);
      expect(html).not.toContain("Copy Full Verification Key");
      expect(html).not.toContain("Print / Save Official PDF");
      expect(html).not.toContain("Download Certificate");
    });

    it("renders ReceiptCertificateModal safely in Node SSR without throwing", () => {
      const html = renderToStaticMarkup(
        React.createElement(ReceiptCertificateModal, {
          isOpen: true,
          onClose: () => {},
          receipt: sampleReceipt,
          projectName: "CampusConnect",
        })
      );

      expect(html).toContain("Official Handover Verification Certificate");
      expect(html).toContain("Download Certificate (.svg)");
      expect(html).toContain("Print / Save Official PDF");
    });

    it("builds valid XML-escaped standalone SVG certificate containing full SHA-256 key", () => {
      const customReceipt: Receipt = {
        ...sampleReceipt,
        incoming_user_name: "Riya & Kabir <Leads>",
      };
      const fullKey = getFullVerificationKey(customReceipt);
      const svg = buildCertificateSvg({
        receipt: customReceipt,
        projectName: "CampusConnect & Co",
      });

      expect(svg.startsWith("<?xml version=\"1.0\"")).toBe(true);
      expect(svg).toContain('viewBox="0 0 1122 794"');
      expect(svg).toContain(sampleReceipt.id);
      expect(svg).toContain(fullKey);
      expect(svg).toContain("Riya &amp; Kabir &lt;Leads&gt;");
      expect(svg).toContain("CampusConnect &amp; Co");
      expect(svg).not.toContain("<Leads>");
    });

    it("stamps custom imported GitHub repo projectName onto HTML certificate, modal, and SVG export", () => {
      const repoReceipt: Receipt = {
        ...sampleReceipt,
        id: "RCP-LEAD-GH-SHRAVAN80800-ECHOBRIDGE",
        project_id: "gh-shravan80800-echobridge",
        draft_version_id: "DFT-GH-SHRAVAN80800-ECHOBRIDGE-LEAD-v2.0",
      };
      const fullKey = getFullVerificationKey(repoReceipt);

      const docHtml = renderToStaticMarkup(
        React.createElement(HandoverCertificateDocument, {
          receipt: repoReceipt,
          projectName: "shravan80800/echobridge",
        })
      );
      expect(docHtml).toContain("shravan80800/echobridge");
      expect(docHtml).toContain("RCP-LEAD-GH-SHRAVAN80800-ECHOBRIDGE");
      expect(docHtml).toContain(fullKey);
      expect(docHtml).not.toContain("CampusConnect");

      const modalHtml = renderToStaticMarkup(
        React.createElement(ReceiptCertificateModal, {
          isOpen: true,
          onClose: () => {},
          receipt: repoReceipt,
          projectName: "shravan80800/echobridge",
        })
      );
      expect(modalHtml).toContain("shravan80800/echobridge");

      const svg = buildCertificateSvg({
        receipt: repoReceipt,
        projectName: "shravan80800/echobridge",
      });
      expect(svg).toContain("shravan80800/echobridge");
      expect(svg).toContain(fullKey);
      expect(svg).not.toContain("CampusConnect");
    });

    it("renders ProjectSwitcherBar cleanly using safe default RoleContext fallback", () => {
      const html = renderToStaticMarkup(React.createElement(ProjectSwitcherBar));
      expect(html).toContain("CampusConnect");
      expect(html).toContain("Demo");
    });
  });
});
