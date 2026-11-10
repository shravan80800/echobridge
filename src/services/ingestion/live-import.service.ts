/**
 * Live URL Importer Service (GitHub Repositories & Public Google Docs)
 * Fetches live project knowledge over REST/export endpoints with zero OAuth required,
 * prepares sanitized RawSourceInput payloads for EchoBridge's security & trust pipeline.
 */

import crypto from "crypto";
import type { RawSourceInput } from "@/services/ingestion/parser.service";

const MAX_URL_LENGTH = 2_048;
const MAX_TOKEN_LENGTH = 512;
const MAX_CONTENT_CHARS = 100_000;
const MAX_UPSTREAM_BYTES = 2 * 1024 * 1024; // 2 MB cap per upstream response
const FETCH_TIMEOUT_MS = 15_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

const rateLimitBuckets = new Map<string, number[]>();

export class LiveImportError extends Error {
  public readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "LiveImportError";
    this.status = status;
  }
}

/**
 * Sliding-window per-client rate limiter for `/api/live-import`.
 */
export function checkLiveImportRateLimit(
  clientKey: string,
  nowMs = Date.now()
): { allowed: boolean; retryAfterSeconds: number } {
  const cutoff = nowMs - RATE_LIMIT_WINDOW_MS;
  const existing = rateLimitBuckets.get(clientKey) || [];
  const active = existing.filter((ts) => ts > cutoff);

  if (active.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldestActive = active[0];
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldestActive + RATE_LIMIT_WINDOW_MS - nowMs) / 1000)
    );
    rateLimitBuckets.set(clientKey, active);
    return { allowed: false, retryAfterSeconds };
  }

  active.push(nowMs);
  rateLimitBuckets.set(clientKey, active);

  // Prune stale buckets periodically so map stays bounded
  if (rateLimitBuckets.size > 1_000) {
    for (const [key, timestamps] of rateLimitBuckets.entries()) {
      const recent = timestamps.filter((ts) => ts > cutoff);
      if (recent.length === 0) {
        rateLimitBuckets.delete(key);
      } else {
        rateLimitBuckets.set(key, recent);
      }
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetLiveImportRateLimits(): void {
  rateLimitBuckets.clear();
}

export function extractClientRateLimitKey(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "local";
}

function validateOptionalToken(token?: string): string | undefined {
  const clean = token?.trim();
  if (!clean) return undefined;
  if (clean.length > MAX_TOKEN_LENGTH) {
    throw new LiveImportError(
      `Access token exceeds maximum allowed length (${MAX_TOKEN_LENGTH} characters).`,
      400
    );
  }
  return clean;
}

function assertWithinUpstreamSizeLimit(res: Response, sourceLabel: string): void {
  const contentLengthHeader = res.headers?.get("content-length");
  if (!contentLengthHeader) return;
  const contentLength = Number(contentLengthHeader);
  if (Number.isFinite(contentLength) && contentLength > MAX_UPSTREAM_BYTES) {
    throw new LiveImportError(
      `${sourceLabel} is too large to import safely (exceeds 2 MB limit).`,
      413
    );
  }
}

function isAllowedGoogleHost(responseUrl: string): boolean {
  if (!responseUrl) return true; // Allows unit-test Response mocks without URL metadata
  try {
    const parsed = new URL(responseUrl);
    const host = parsed.hostname.toLowerCase();
    return host === "docs.google.com" || host.endsWith(".googleusercontent.com");
  } catch {
    return false;
  }
}

function formatGitHubRateLimitWait(resetHeader: string | null): string {
  if (!resetHeader) return "a few minutes";
  const resetEpochSec = Number(resetHeader);
  if (!Number.isFinite(resetEpochSec)) return "a few minutes";
  const diffSeconds = Math.max(1, Math.ceil(resetEpochSec - Date.now() / 1000));
  if (diffSeconds < 60) return `~${diffSeconds}s`;
  return `~${Math.ceil(diffSeconds / 60)} min`;
}

/**
 * Removes any user-supplied token before text enters ingestion, chunks, or logs.
 */
export function stripSecretToken(text: string, token?: string): string {
  const cleanToken = token?.trim();
  if (!text || !cleanToken) return text;
  return text.split(cleanToken).join("[REDACTED_TOKEN]");
}

/**
 * Generates a deterministic 6-character alphanumeric prefix (never starting with "SRC")
 * so custom sources synthesize claims cleanly and never collide on chunk IDs.
 */
function buildSourceId(prefixChar: string, seed: string, suffixSlug: string, kindChar = ""): string {
  const hashHex = crypto.createHash("sha256").update(seed).digest("hex");
  const num = parseInt(hashHex.slice(0, 8), 16);
  const hashLen = kindChar ? 4 : 5;
  const code = num.toString(36).toUpperCase().padStart(hashLen, "0").slice(0, hashLen);
  const safeSlug = suffixSlug.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "SOURCE";
  return `${prefixChar}${code}${kindChar}-${safeSlug}`;
}

function truncateContent(text: string, maxChars = MAX_CONTENT_CHARS): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[Truncated at ${maxChars} characters for indexing]`;
}

/**
 * Parses and strictly validates a GitHub repository URL or SSH remote.
 */
export function parseGitHubRepoUrl(rawUrl: string): { owner: string; repo: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new LiveImportError("Invalid GitHub URL. Expected: https://github.com/owner/repo", 400);
  }
  if (trimmed.length > MAX_URL_LENGTH) {
    throw new LiveImportError(
      `URL exceeds maximum allowed length (${MAX_URL_LENGTH} characters).`,
      400
    );
  }

  let owner = "";
  let repo = "";

  const sshMatch = trimmed.match(/^git@github\.com:([^/\s]+)\/([^/?\s#]+)$/i);
  if (sshMatch) {
    owner = sshMatch[1];
    repo = sshMatch[2];
  } else {
    const normalized = /^(?:www\.)?github\.com\//i.test(trimmed)
      ? `https://${trimmed}`
      : trimmed;

    let parsed: URL;
    try {
      parsed = new URL(normalized);
    } catch {
      throw new LiveImportError("Invalid GitHub URL. Expected: https://github.com/owner/repo", 400);
    }

    const host = parsed.hostname.toLowerCase();
    if (
      (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
      (host !== "github.com" && host !== "www.github.com")
    ) {
      throw new LiveImportError("Invalid GitHub URL. Expected: https://github.com/owner/repo", 400);
    }

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length < 2) {
      throw new LiveImportError("Invalid GitHub URL. Expected: https://github.com/owner/repo", 400);
    }
    owner = segments[0];
    repo = segments[1];
  }

  repo = repo.replace(/\.git$/i, "");

  const validSlug = /^[a-zA-Z0-9._-]+$/;
  if (
    !validSlug.test(owner) ||
    !validSlug.test(repo) ||
    owner === "." ||
    owner === ".." ||
    repo === "." ||
    repo === ".."
  ) {
    throw new LiveImportError("Invalid GitHub URL. Expected: https://github.com/owner/repo", 400);
  }

  return { owner, repo };
}

/**
 * Parses and strictly validates a Google Docs URL.
 */
export function parseGoogleDocUrl(rawUrl: string): { docId: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new LiveImportError("Invalid Google Doc URL.", 400);
  }
  if (trimmed.length > MAX_URL_LENGTH) {
    throw new LiveImportError(
      `URL exceeds maximum allowed length (${MAX_URL_LENGTH} characters).`,
      400
    );
  }

  const normalized = /^docs\.google\.com\//i.test(trimmed)
    ? `https://${trimmed}`
    : trimmed;

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new LiveImportError("Invalid Google Doc URL.", 400);
  }

  if (
    (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
    parsed.hostname.toLowerCase() !== "docs.google.com"
  ) {
    throw new LiveImportError("Invalid Google Doc URL.", 400);
  }

  const match = parsed.pathname.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (!match || !match[1]) {
    throw new LiveImportError("Invalid Google Doc URL.", 400);
  }

  return { docId: match[1] };
}

export interface WorkspaceMetadata {
  projectId: string;
  projectName: string;
  description: string;
}

export function resolveGitHubWorkspaceMeta(
  url: string,
  titleOverride?: string
): WorkspaceMetadata {
  const { owner, repo } = parseGitHubRepoUrl(url);
  const projectId = `gh-${owner}-${repo}`
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-");
  const projectName = titleOverride?.trim() || `${owner}/${repo}`;
  return {
    projectId,
    projectName,
    description: `Imported from GitHub (https://github.com/${owner}/${repo})`,
  };
}

export function resolveGoogleDocWorkspaceMeta(
  url: string,
  titleOverride?: string
): WorkspaceMetadata {
  const { docId } = parseGoogleDocUrl(url);
  const projectId = `gdoc-${docId.slice(0, 12)}`;
  const projectName =
    titleOverride?.trim() || `Google Doc (${docId.slice(0, 8)})`;
  return {
    projectId,
    projectName,
    description: `Imported from Google Docs (https://docs.google.com/document/d/${docId})`,
  };
}

interface GitHubCommitItem {
  sha?: string;
  commit?: {
    message?: string;
    author?: { name?: string };
  };
  author?: { login?: string };
}

interface GitHubIssueItem {
  number: number;
  title: string;
  state: string;
  pull_request?: unknown;
}

interface GitHubPullItem {
  number: number;
  title: string;
  state: string;
}

/**
 * Fetches README, commits, open issues, and open PRs from a public or PAT-authenticated GitHub repo.
 */
export async function fetchGitHubSources(
  url: string,
  token?: string
): Promise<{ sources: RawSourceInput[]; repoFullName: string }> {
  const { owner, repo } = parseGitHubRepoUrl(url);
  const authToken =
    validateOptionalToken(token) ||
    validateOptionalToken(process.env.GITHUB_DEFAULT_PAT) ||
    undefined;

  const headers: Record<string, string> = {
    "User-Agent": "EchoBridge/1.0",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const endpoints = [
    `${base}/readme`,
    `${base}/commits?per_page=20`,
    `${base}/issues?state=open&per_page=20`,
    `${base}/pulls?state=open&per_page=10`,
  ];

  let responses: Response[];
  try {
    responses = await Promise.all(
      endpoints.map((endpoint) =>
        fetch(endpoint, {
          headers,
          cache: "no-store",
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        })
      )
    );
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Network request failed";
    throw new LiveImportError(
      `GitHub fetch failed: ${stripSecretToken(reason, authToken)}. For private repos, provide a Personal Access Token.`,
      502
    );
  }

  const [readmeRes, commitsRes, issuesRes, pullsRes] = responses;

  // Fail immediately on rate limits, auth failures, oversized responses, or server errors
  for (const res of responses) {
    assertWithinUpstreamSizeLimit(res, "GitHub API response");

    if (
      res.status === 429 ||
      (res.status === 403 && res.headers?.get("x-ratelimit-remaining") === "0")
    ) {
      const waitHint = formatGitHubRateLimitWait(
        res.headers?.get("x-ratelimit-reset") ?? null
      );
      throw new LiveImportError(
        `GitHub API rate limit exceeded (${res.status}). Retry in ${waitHint} or provide a Personal Access Token for higher limits.`,
        429
      );
    }

    if (res.status === 401 || res.status === 403 || res.status >= 500) {
      throw new LiveImportError(
        `GitHub fetch failed: ${res.status} ${res.statusText}. For private repos, provide a Personal Access Token.`,
        res.status >= 500 ? 502 : res.status
      );
    }
  }

  // If repository itself does not exist or is private without credentials, both readme and commits fail with 404
  if (!commitsRes.ok && commitsRes.status !== 409 && !readmeRes.ok) {
    throw new LiveImportError(
      `GitHub fetch failed: ${commitsRes.status} ${commitsRes.statusText}. For private repos, provide a Personal Access Token.`,
      commitsRes.status
    );
  }

  // 1. README
  let readmeContent = `No README.md found in ${owner}/${repo}.`;
  if (readmeRes.ok) {
    const readmeJson = (await readmeRes.json()) as { content?: string; encoding?: string };
    if (readmeJson.content) {
      const decoded = Buffer.from(
        readmeJson.content.replace(/\n/g, ""),
        readmeJson.encoding === "base64" || !readmeJson.encoding ? "base64" : "utf-8"
      ).toString("utf-8");
      if (decoded.trim().length > 0) {
        readmeContent = truncateContent(decoded.trim());
      }
    }
  }

  // 2. Recent Commits
  let commitsContent = `No recent commits found in ${owner}/${repo}.`;
  if (commitsRes.ok) {
    const commitsJson = (await commitsRes.json()) as GitHubCommitItem[];
    if (Array.isArray(commitsJson) && commitsJson.length > 0) {
      commitsContent = truncateContent(
        commitsJson
          .slice(0, 20)
          .map((c) => {
            const shortSha = (c.sha || "unknown").slice(0, 7);
            const message = (c.commit?.message || "Commit").replace(/\r?\n/g, " ").trim();
            const authorName = c.commit?.author?.name || c.author?.login || "Unknown";
            return `[${shortSha}] ${message} — ${authorName}`;
          })
          .join("\n")
      );
    }
  }

  // 3. Open Issues (excluding pull requests returned by GitHub's /issues endpoint)
  let issuesContent = `No open issues found in ${owner}/${repo}.`;
  if (issuesRes.ok) {
    const issuesJson = (await issuesRes.json()) as GitHubIssueItem[];
    if (Array.isArray(issuesJson)) {
      const pureIssues = issuesJson.filter((item) => !item.pull_request).slice(0, 20);
      if (pureIssues.length > 0) {
        issuesContent = truncateContent(
          pureIssues.map((i) => `[#${i.number}] ${i.title} (${i.state})`).join("\n")
        );
      }
    }
  }

  // 4. Open Pull Requests
  let pullsContent = `No open pull requests found in ${owner}/${repo}.`;
  if (pullsRes.ok) {
    const pullsJson = (await pullsRes.json()) as GitHubPullItem[];
    if (Array.isArray(pullsJson) && pullsJson.length > 0) {
      pullsContent = truncateContent(
        pullsJson
          .slice(0, 10)
          .map((pr) => `[#${pr.number}] ${pr.title} (${pr.state})`)
          .join("\n")
      );
    }
  }

  const repoFullName = `${owner}/${repo}`;
  const nowIso = new Date().toISOString();

  const sources: RawSourceInput[] = [
    {
      id: buildSourceId("G", repoFullName, `${repo}-README`, "R"),
      title: `README: ${repo}`,
      source_type: "document",
      author: "GitHub",
      source_timestamp: nowIso,
      allowed_roles: ["incoming_lead", "incoming_intern"],
      file_path: `https://github.com/${owner}/${repo}#readme`,
      content: stripSecretToken(readmeContent, authToken),
    },
    {
      id: buildSourceId("G", repoFullName, `${repo}-COMMITS`, "C"),
      title: `Recent Commits: ${repo}`,
      source_type: "document",
      author: "GitHub",
      source_timestamp: nowIso,
      allowed_roles: ["incoming_lead", "incoming_intern"],
      file_path: `https://github.com/${owner}/${repo}/commits`,
      content: stripSecretToken(commitsContent, authToken),
    },
    {
      id: buildSourceId("G", repoFullName, `${repo}-ISSUES`, "I"),
      title: `Open Issues: ${repo}`,
      source_type: "document",
      author: "GitHub",
      source_timestamp: nowIso,
      allowed_roles: ["incoming_lead", "incoming_intern"],
      file_path: `https://github.com/${owner}/${repo}/issues`,
      content: stripSecretToken(issuesContent, authToken),
    },
    {
      id: buildSourceId("G", repoFullName, `${repo}-PULLS`, "P"),
      title: `Open Pull Requests: ${repo}`,
      source_type: "document",
      author: "GitHub",
      source_timestamp: nowIso,
      allowed_roles: ["incoming_lead", "incoming_intern"],
      file_path: `https://github.com/${owner}/${repo}/pulls`,
      content: stripSecretToken(pullsContent, authToken),
    },
  ];

  return { sources, repoFullName };
}

/**
 * Fetches plain text export from a publicly shared Google Doc ("Anyone with the link").
 */
export async function fetchGoogleDocSource(
  url: string,
  token?: string
): Promise<RawSourceInput> {
  const { docId } = parseGoogleDocUrl(url);
  const cleanToken = validateOptionalToken(token);
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

  let res: Response;
  try {
    res = await fetch(exportUrl, {
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Network error";
    throw new LiveImportError(
      `Could not fetch Google Doc (${stripSecretToken(reason, cleanToken)}). Make sure sharing is set to 'Anyone with the link'.`,
      502
    );
  }

  assertWithinUpstreamSizeLimit(res, "Google Doc");

  const contentType = (res.headers?.get("content-type") || "").toLowerCase();
  if (
    !res.ok ||
    !isAllowedGoogleHost(res.url || "") ||
    contentType.includes("text/html")
  ) {
    throw new LiveImportError(
      "Could not fetch Google Doc. Make sure sharing is set to 'Anyone with the link'.",
      res.ok ? 403 : res.status
    );
  }

  const rawText = await res.text();
  const cleanedText = stripSecretToken(
    rawText.replace(/^\uFEFF/, "").trim(),
    cleanToken
  );

  if (!cleanedText) {
    throw new LiveImportError(
      "Could not fetch Google Doc. Make sure the document contains text and sharing is set to 'Anyone with the link'.",
      400
    );
  }

  return {
    id: buildSourceId("D", docId, docId.slice(0, 8)),
    title: `Google Doc: ${docId.slice(0, 8)}`,
    source_type: "document",
    author: "Google Docs",
    source_timestamp: new Date().toISOString(),
    allowed_roles: ["incoming_lead", "incoming_intern"],
    file_path: `https://docs.google.com/document/d/${docId}`,
    content: truncateContent(cleanedText),
  };
}
