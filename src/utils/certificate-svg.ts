import type { Receipt } from "@/types/echobridge.types";
import { getFullVerificationKey } from "@/utils/verification-key";

export interface CertificateMetadata {
  fullKey: string;
  roleLabel: string;
  displayApprover: string;
  formattedDate: string;
  formattedTime: string;
}

/**
 * Normalizes display metadata shared across the DOM certificate and SVG export.
 */
export function resolveCertificateMetadata(
  receipt: Receipt,
  approverName = "Prof. Deshmukh — Faculty Mentor"
): CertificateMetadata {
  const fullKey = getFullVerificationKey(receipt);
  const roleLabel =
    receipt.audience_role === "incoming_lead"
      ? "Incoming Team Lead"
      : "Incoming Intern";
  const displayApprover =
    approverName === "Prof. Deshmukh (Project Mentor)"
      ? "Prof. Deshmukh — Faculty Mentor"
      : approverName;

  const issuedAt = new Date(receipt.acknowledged_at);
  const formattedDate = Number.isNaN(issuedAt.getTime())
    ? receipt.acknowledged_at
    : issuedAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
  const formattedTime = Number.isNaN(issuedAt.getTime())
    ? ""
    : issuedAt.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      });

  return {
    fullKey,
    roleLabel,
    displayApprover,
    formattedDate,
    formattedTime,
  };
}

/**
 * Generates a deterministic 9x9 verification matrix from the full SHA-256 key.
 */
export function buildVerificationMatrix(seedKey: string): boolean[][] {
  const size = 9;
  const grid: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  );

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTopLeft = r < 2 && c < 2;
      const inTopRight = r < 2 && c >= size - 2;
      const inBottomLeft = r >= size - 2 && c < 2;
      if (inTopLeft || inTopRight || inBottomLeft) {
        grid[r][c] = true;
        continue;
      }
      const idx = (r * size + c) % Math.max(1, seedKey.length);
      const code = seedKey.charCodeAt(idx) + r * 7 + c * 13;
      grid[r][c] = code % 2 === 0;
    }
  }

  return grid;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Builds a standalone, A4-landscape (1122x794) archival SVG certificate
 * embedding all verified handover details and the full SHA-256 key.
 */
export function buildCertificateSvg(params: {
  receipt: Receipt;
  projectName?: string;
  approverName?: string;
}): string {
  const { receipt, projectName = "CampusConnect", approverName } = params;
  const meta = resolveCertificateMetadata(receipt, approverName);
  const matrix = buildVerificationMatrix(meta.fullKey);

  const issuedLabel = meta.formattedTime
    ? `${meta.formattedDate} • ${meta.formattedTime}`
    : meta.formattedDate;

  const matrixRects = matrix
    .flatMap((row, r) =>
      row.map((filled, c) =>
        filled
          ? `<rect x="${c * 6}" y="${r * 6}" width="5.2" height="5.2" rx="1" fill="${
              (r + c) % 3 === 0 ? "#059669" : "#0F172A"
            }" />`
          : ""
      )
    )
    .filter(Boolean)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1122 794" width="1122" height="794">
  <rect width="1122" height="794" fill="#FFFEFA" />

  <!-- Outer Teal & Inner Gold Archival Borders -->
  <rect x="24" y="24" width="1074" height="746" fill="none" stroke="#134E4A" stroke-width="5" />
  <rect x="36" y="36" width="1050" height="722" fill="none" stroke="#D97706" stroke-width="1.5" stroke-opacity="0.75" />

  <!-- Corner Ornaments -->
  <g fill="none" stroke="#D97706" stroke-width="2">
    <path d="M46 76V46H76" />
    <path d="M1046 46H1076V76" />
    <path d="M46 718V748H76" />
    <path d="M1046 748H1076V718" />
  </g>
  <g fill="#0F766E">
    <circle cx="54" cy="54" r="3" />
    <circle cx="1068" cy="54" r="3" />
    <circle cx="54" cy="740" r="3" />
    <circle cx="1068" cy="740" r="3" />
  </g>

  <!-- Faint Center Crest Watermark -->
  <g opacity="0.04" transform="translate(441 257)" fill="none" stroke="#134E4A">
    <circle cx="120" cy="120" r="108" stroke-width="4" />
    <circle cx="120" cy="120" r="88" stroke-width="2" stroke-dasharray="8 5" />
    <path d="M120 48L174 70V122C174 162 151 188 120 200C89 188 66 162 66 122V70L120 48Z" stroke-width="4" />
  </g>

  <!-- Registry Header -->
  <text x="561" y="96" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" letter-spacing="4" fill="#115E59">ECHOBRIDGE KNOWLEDGE TRANSFER REGISTRY</text>
  <text x="561" y="148" text-anchor="middle" font-family="Georgia, Cambria, serif" font-size="38" font-weight="700" fill="#0F172A">Certificate of Verified Project Handover</text>

  <line x1="250" y1="178" x2="390" y2="178" stroke="#D97706" stroke-opacity="0.55" stroke-width="1.5" />
  <rect x="404" y="164" width="314" height="28" rx="14" fill="#F0FDFA" stroke="#115E59" stroke-opacity="0.25" />
  <text x="561" y="182" text-anchor="middle" font-family="ui-monospace, Consolas, monospace" font-size="12" font-weight="700" fill="#134E4A">CERTIFICATE NO. ${escapeXml(receipt.id)}</text>
  <line x1="732" y1="178" x2="872" y2="178" stroke="#D97706" stroke-opacity="0.55" stroke-width="1.5" />

  <!-- Recipient Spotlight -->
  <text x="561" y="232" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="17" fill="#64748B">This officially certifies that</text>
  <text x="561" y="286" text-anchor="middle" font-family="Georgia, serif" font-size="40" font-weight="700" fill="#020617">${escapeXml(receipt.incoming_user_name)}</text>
  <line x1="360" y1="298" x2="762" y2="298" stroke="#F59E0B" stroke-opacity="0.7" stroke-width="2" />

  <rect x="468" y="314" width="186" height="24" rx="12" fill="#ECFDF5" stroke="#6EE7B7" />
  <text x="561" y="330" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="700" letter-spacing="1.2" fill="#065F46">${escapeXml(meta.roleLabel.toUpperCase())}</text>

  <text x="561" y="374" text-anchor="middle" font-family="system-ui, sans-serif" font-size="15.5" fill="#334155">
    has reviewed all cited handover artifacts, passed the critical risk comprehension gate with a score of <tspan font-weight="700" fill="#047857">${receipt.comprehension_score}%</tspan>,
  </text>
  <text x="561" y="398" text-anchor="middle" font-family="system-ui, sans-serif" font-size="15.5" fill="#334155">
    and formally accepted operational ownership of <tspan font-weight="700" fill="#0F172A">${escapeXml(projectName)}</tspan> (Release v2.0 • ${escapeXml(receipt.draft_version_id)}).
  </text>

  <!-- Hairline Metadata Ledger -->
  <line x1="72" y1="432" x2="1050" y2="432" stroke="#D97706" stroke-opacity="0.25" stroke-width="1" />
  <line x1="72" y1="494" x2="1050" y2="494" stroke="#D97706" stroke-opacity="0.25" stroke-width="1" />
  <line x1="316" y1="438" x2="316" y2="488" stroke="#CBD5E1" stroke-width="1" />
  <line x1="561" y1="438" x2="561" y2="488" stroke="#CBD5E1" stroke-width="1" />
  <line x1="806" y1="438" x2="806" y2="488" stroke="#CBD5E1" stroke-width="1" />

  <g text-anchor="middle" font-family="system-ui, sans-serif">
    <text x="194" y="454" font-size="10.5" font-weight="700" letter-spacing="1.1" fill="#64748B">PROJECT SCOPE</text>
    <text x="194" y="477" font-size="14" font-weight="600" fill="#0F172A">${escapeXml(projectName)}</text>

    <text x="438" y="454" font-size="10.5" font-weight="700" letter-spacing="1.1" fill="#64748B">APPROVED DRAFT</text>
    <text x="438" y="477" font-size="14" font-weight="600" fill="#0F172A">v2.0 (${escapeXml(receipt.draft_version_id)})</text>

    <text x="684" y="454" font-size="10.5" font-weight="700" letter-spacing="1.1" fill="#64748B">RISK GATE SCORE</text>
    <text x="684" y="477" font-size="14" font-weight="700" fill="#047857">${receipt.comprehension_score}% — Verified</text>

    <text x="928" y="454" font-size="10.5" font-weight="700" letter-spacing="1.1" fill="#64748B">ISSUED TIMESTAMP</text>
    <text x="928" y="477" font-size="12.5" font-weight="600" fill="#0F172A">${escapeXml(issuedLabel)}</text>
  </g>

  <!-- Dual Signatures & Seal -->
  <g transform="translate(110 532)">
    <path d="M18 32C34 12 44 10 47 26C50 34 62 14 75 21C86 27 96 17 110 24C126 30 144 15 170 23C186 27 202 20 215 18" fill="none" stroke="#134E4A" stroke-width="2" stroke-linecap="round" />
    <line x1="0" y1="44" x2="250" y2="44" stroke="#94A3B8" stroke-width="1.2" />
    <text x="125" y="64" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13.5" font-weight="600" fill="#0F172A">${escapeXml(meta.displayApprover)}</text>
    <text x="125" y="80" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" letter-spacing="1" fill="#64748B">APPROVING AUTHORITY</text>
  </g>

  <g transform="translate(505 516)">
    <circle cx="56" cy="56" r="50" fill="#ECFDF5" stroke="#D97706" stroke-width="2.5" stroke-dasharray="4 2" />
    <circle cx="56" cy="56" r="43" fill="#FFFFFF" stroke="#0F766E" stroke-width="2" />
    <circle cx="56" cy="56" r="34" fill="#F0FDFA" stroke="#D97706" stroke-width="1" />
    <path d="M56 32L70 38V51C70 61 64 69 56 73C48 69 42 61 42 51V38L56 32Z" fill="#059669" />
    <path d="M49.5 52.5L54 57L63 47.5" fill="none" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
    <text x="56" y="85" text-anchor="middle" font-family="system-ui, sans-serif" font-size="7.2" font-weight="700" letter-spacing="1.3" fill="#0F766E">VERIFIED SEAL</text>
  </g>

  <g transform="translate(762 532)">
    <path d="M26 26C40 13 50 29 63 19C76 9 86 31 102 22C118 14 134 29 154 20C172 13 188 25 208 16" fill="none" stroke="#134E4A" stroke-width="2" stroke-linecap="round" />
    <line x1="0" y1="44" x2="250" y2="44" stroke="#94A3B8" stroke-width="1.2" />
    <text x="125" y="64" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13.5" font-weight="600" fill="#0F172A">${escapeXml(receipt.incoming_user_name)}</text>
    <text x="125" y="80" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" letter-spacing="1" fill="#64748B">${escapeXml(meta.roleLabel.toUpperCase())} • DIGITALLY SIGNED</text>
  </g>

  <!-- Full Cryptographic Verification Footer -->
  <rect x="72" y="646" width="978" height="74" rx="8" fill="#F8FAFC" stroke="#134E4A" stroke-opacity="0.22" />
  <text x="90" y="668" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" letter-spacing="1.2" fill="#134E4A">CRYPTOGRAPHIC VERIFICATION KEY (FULL SHA-256)</text>
  <text x="955" y="668" text-anchor="end" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#047857">TAMPER-EVIDENT HANDOVER RECORD</text>
  <text x="90" y="698" font-family="ui-monospace, Consolas, monospace" font-size="13.5" font-weight="600" fill="#0F172A">${escapeXml(meta.fullKey)}</text>

  <g transform="translate(974 656)">
    <rect x="-3" y="-3" width="60" height="60" rx="4" fill="#FFFFFF" stroke="#CBD5E1" />
    ${matrixRects}
  </g>
</svg>`;
}
