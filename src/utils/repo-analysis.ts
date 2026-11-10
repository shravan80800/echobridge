/**
 * Shared workspace source & chunk inspection helpers used cleanly across
 * Trust Claim Generation, Dynamic Gap-Interview Synthesis, and Risk Comprehension Quizzes.
 */

import type { Chunk, Source } from "@/types/echobridge.types";

const KNOWN_TECH_STACK: readonly { label: string; pattern: RegExp }[] = [
  { label: "Next.js", pattern: /\bnext(?:\.js|js)?\b/i },
  { label: "React", pattern: /\breact(?:\.js|js)?\b/i },
  { label: "TypeScript", pattern: /\btypescript\b/i },
  { label: "JavaScript", pattern: /\bjavascript\b/i },
  { label: "Tailwind CSS", pattern: /\btailwind(?:\s*css)?\b/i },
  { label: "Node.js", pattern: /\bnode(?:\.js|js)?\b/i },
  { label: "Express", pattern: /\bexpress(?:\.js)?\b/i },
  { label: "Python", pattern: /\bpython\b/i },
  { label: "FastAPI", pattern: /\bfastapi\b/i },
  { label: "Django", pattern: /\bdjango\b/i },
  { label: "Flask", pattern: /\bflask\b/i },
  { label: "Go", pattern: /\bgolang\b|\bgo\s+1\.\d+/i },
  { label: "Rust", pattern: /\brust\b|\bcargo\b/i },
  { label: "Java", pattern: /\bjava\b|\bspring\s*boot\b/i },
  { label: "Supabase", pattern: /\bsupabase\b/i },
  { label: "PostgreSQL", pattern: /\bpostgres(?:ql)?\b/i },
  { label: "Redis", pattern: /\bredis\b/i },
  { label: "MongoDB", pattern: /\bmongo(?:db)?\b/i },
  { label: "MySQL", pattern: /\bmysql\b/i },
  { label: "SQLite", pattern: /\bsqlite\b/i },
  { label: "Prisma", pattern: /\bprisma\b/i },
  { label: "Drizzle", pattern: /\bdrizzle\b/i },
  { label: "GraphQL", pattern: /\bgraphql\b/i },
  { label: "Docker", pattern: /\bdocker\b/i },
  { label: "Kubernetes", pattern: /\bkubernetes\b|\bk8s\b/i },
  { label: "Vite", pattern: /\bvite\b/i },
  { label: "Vitest", pattern: /\bvitest\b/i },
  { label: "Gemini", pattern: /\bgemini\b/i },
  { label: "OpenAI", pattern: /\bopenai\b/i },
  { label: "Vercel", pattern: /\bvercel\b/i },
  { label: "AWS", pattern: /\baws\b/i },
  { label: "Stripe", pattern: /\bstripe\b/i },
];

export interface WorkspaceContentAnalysis {
  sourcesById: Map<string, Source>;
  readmeChunk?: Chunk;
  commitsChunk?: Chunk;
  issuesChunk?: Chunk;
  pullsChunk?: Chunk;
  docChunks: Chunk[];
  readmeTitle?: string;
  commitsTitle?: string;
  issuesTitle?: string;
  pullsTitle?: string;
  docTitle?: string;
  readmeSummaryLine: string;
  docSummaryLine: string;
  techStack: string[];
  commitLines: string[];
  contributors: string[];
  issueLines: string[];
  prLines: string[];
  hasNoOpenIssuesNotice: boolean;
  hasNoOpenPrsNotice: boolean;
}

export function extractTechStackTokens(text: string): string[] {
  if (!text) return [];
  const found: string[] = [];
  for (const entry of KNOWN_TECH_STACK) {
    if (entry.pattern.test(text) && !found.includes(entry.label)) {
      found.push(entry.label);
    }
  }
  return found;
}

export function extractMeaningfulLines(content: string): string[] {
  if (!content) return [];
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line || line.length < 4) return false;
      if (line.startsWith("![") || line.startsWith("[![")) return false;
      if (line.startsWith("<") && line.endsWith(">")) return false;
      if (/^[-*_`]{3,}$/.test(line)) return false;
      if (line.startsWith("[Truncated at ")) return false;
      return true;
    })
    .map((line) => line.replace(/^#+\s*/, "").replace(/^[-*]\s+/, "").trim())
    .filter((line) => line.length >= 4);
}

function classifySourceKind(source?: Source): "readme" | "commits" | "issues" | "pulls" | "doc" {
  if (!source) return "doc";
  const title = source.title || "";
  if (title.startsWith("README:")) return "readme";
  if (title.startsWith("Recent Commits:")) return "commits";
  if (title.startsWith("Open Issues:")) return "issues";
  if (title.startsWith("Open Pull Requests:")) return "pulls";
  if (source.file_path?.endsWith("#readme")) return "readme";
  if (source.file_path?.endsWith("/commits")) return "commits";
  if (source.file_path?.endsWith("/issues")) return "issues";
  if (source.file_path?.endsWith("/pulls")) return "pulls";
  return "doc";
}

export function analyzeWorkspaceSources(
  sources: Source[],
  chunks: Chunk[]
): WorkspaceContentAnalysis {
  const sourcesById = new Map<string, Source>(sources.map((s) => [s.id, s]));

  let readmeChunk: Chunk | undefined;
  let commitsChunk: Chunk | undefined;
  let issuesChunk: Chunk | undefined;
  let pullsChunk: Chunk | undefined;
  const docChunks: Chunk[] = [];

  for (const chunk of chunks) {
    const src = sourcesById.get(chunk.source_id);
    const kind = classifySourceKind(src);
    if (kind === "readme" && !readmeChunk) {
      readmeChunk = chunk;
    } else if (kind === "commits" && !commitsChunk) {
      commitsChunk = chunk;
    } else if (kind === "issues" && !issuesChunk) {
      issuesChunk = chunk;
    } else if (kind === "pulls" && !pullsChunk) {
      pullsChunk = chunk;
    } else {
      docChunks.push(chunk);
    }
  }

  const readmeSource = readmeChunk
    ? sourcesById.get(readmeChunk.source_id)
    : sources.find((s) => classifySourceKind(s) === "readme");
  const commitsSource = commitsChunk
    ? sourcesById.get(commitsChunk.source_id)
    : sources.find((s) => classifySourceKind(s) === "commits");
  const issuesSource = issuesChunk
    ? sourcesById.get(issuesChunk.source_id)
    : sources.find((s) => classifySourceKind(s) === "issues");
  const pullsSource = pullsChunk
    ? sourcesById.get(pullsChunk.source_id)
    : sources.find((s) => classifySourceKind(s) === "pulls");
  const primaryDocSource =
    (docChunks[0] ? sourcesById.get(docChunks[0].source_id) : undefined) ||
    sources.find((s) => classifySourceKind(s) === "doc");

  const readmeLines = readmeChunk ? extractMeaningfulLines(readmeChunk.content) : [];
  const readmeSummaryLine =
    readmeLines.find((l) => !/^No README\.md found in/i.test(l)) ||
    readmeLines[0] ||
    "";

  const docLines = docChunks[0] ? extractMeaningfulLines(docChunks[0].content) : [];
  const docSummaryLine = docLines[0] || "";

  const combinedStackCorpus = [
    readmeChunk?.content || "",
    ...docChunks.map((c) => c.content),
    commitsChunk?.content || "",
  ].join("\n");
  const techStack = extractTechStackTokens(combinedStackCorpus);

  const commitLines = commitsChunk
    ? extractMeaningfulLines(commitsChunk.content)
        .filter((l) => !/^No recent commits found in/i.test(l))
        .slice(0, 8)
    : [];

  const contributorsSet = new Set<string>();
  for (const line of commitLines) {
    const match = line.match(/\s+[—-]\s+([^—-]+)$/);
    const name = match?.[1]?.trim();
    if (name && name.toLowerCase() !== "unknown") {
      contributorsSet.add(name);
    }
  }
  for (const chunk of chunks) {
    if (
      chunk.author &&
      !chunk.author.startsWith("GitHub") &&
      chunk.author !== "Google Docs" &&
      chunk.author !== "Uploaded Contributor"
    ) {
      contributorsSet.add(chunk.author);
    }
  }

  const rawIssueLines = issuesChunk ? extractMeaningfulLines(issuesChunk.content) : [];
  const hasNoOpenIssuesNotice =
    rawIssueLines.length > 0 &&
    rawIssueLines.every((l) => /^No open issues found in/i.test(l));
  const issueLines = rawIssueLines
    .filter((l) => !/^No open issues found in/i.test(l))
    .slice(0, 8);

  const rawPrLines = pullsChunk ? extractMeaningfulLines(pullsChunk.content) : [];
  const hasNoOpenPrsNotice =
    rawPrLines.length > 0 &&
    rawPrLines.every((l) => /^No open pull requests found in/i.test(l));
  const prLines = rawPrLines
    .filter((l) => !/^No open pull requests found in/i.test(l))
    .slice(0, 6);

  return {
    sourcesById,
    readmeChunk,
    commitsChunk,
    issuesChunk,
    pullsChunk,
    docChunks,
    readmeTitle: readmeSource?.title,
    commitsTitle: commitsSource?.title,
    issuesTitle: issuesSource?.title,
    pullsTitle: pullsSource?.title,
    docTitle: primaryDocSource?.title,
    readmeSummaryLine,
    docSummaryLine,
    techStack,
    commitLines,
    contributors: Array.from(contributorsSet),
    issueLines,
    prLines,
    hasNoOpenIssuesNotice,
    hasNoOpenPrsNotice,
  };
}
