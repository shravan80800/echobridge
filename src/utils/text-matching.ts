/**
 * Text Matching & Span Inspection Utilities
 * Implements docs/DECISIONS.md ADR-005, docs/PRD.md Section 5, and TASKS.md TASK-013.
 *
 * Provides verbatim quote span verification, whitespace-normalized matching,
 * derivative quoting detection, and span coordinate extraction for UI source popovers.
 */

/**
 * Normalizes text by collapsing whitespace and trimming.
 */
export function normalizeWhitespace(text: string): string {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Normalizes text for lenient/fuzzy token comparison (lowercased, stripped punctuation).
 */
export function normalizeForComparison(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Layer A — Verbatim Span Matcher:
 * Checks whether quotedSpan exists verbatim inside chunkText.
 * Handles exact matching as well as whitespace-normalized matching.
 */
export function isVerbatimMatch(
  quotedSpan: string,
  chunkText: string
): boolean {
  if (!quotedSpan || !chunkText) return false;

  const cleanQuote = quotedSpan.trim();
  const cleanChunk = chunkText.trim();

  // 1. Exact substring check
  if (cleanChunk.includes(cleanQuote)) {
    return true;
  }

  // 2. Whitespace-normalized substring check
  const normQuote = normalizeWhitespace(cleanQuote);
  const normChunk = normalizeWhitespace(cleanChunk);

  if (normChunk.includes(normQuote)) {
    return true;
  }

  // 3. Case-insensitive whitespace-normalized check
  if (normChunk.toLowerCase().includes(normQuote.toLowerCase())) {
    return true;
  }

  return false;
}

/**
 * Finds the starting and ending index coordinates of quotedSpan inside chunkText
 * for code-style UI source inspection popovers.
 */
export function findSpanLocation(
  quotedSpan: string,
  chunkText: string
): { start: number; end: number } | null {
  if (!quotedSpan || !chunkText) return null;

  const cleanQuote = quotedSpan.trim();

  // 1. Direct index
  const directIdx = chunkText.indexOf(cleanQuote);
  if (directIdx !== -1) {
    return { start: directIdx, end: directIdx + cleanQuote.length };
  }

  // 2. Case-insensitive index
  const lowerChunk = chunkText.toLowerCase();
  const lowerQuote = cleanQuote.toLowerCase();
  const caseIdx = lowerChunk.indexOf(lowerQuote);
  if (caseIdx !== -1) {
    return { start: caseIdx, end: caseIdx + cleanQuote.length };
  }

  // 3. Whitespace-tolerant search
  const words = cleanQuote.split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    const regexPattern = words
      .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("\\s+");
    const regex = new RegExp(regexPattern, "i");
    const match = regex.exec(chunkText);
    if (match) {
      return { start: match.index, end: match.index + match[0].length };
    }
  }

  return null;
}

/**
 * Checks if textB is quoting, copying, or citing authorA rather than
 * providing an independent primary statement (Author Independence Rule).
 */
export function isQuotingOrCopying(
  textA: string,
  textB: string,
  authorA: string,
  _authorB: string
): boolean {
  if (!textA || !textB) return false;

  const normB = textB.toLowerCase();
  const lowerAuthorA = authorA.toLowerCase().trim();

  // 1. Explicit citation or quote attribution
  const quotePhrases = [
    `${lowerAuthorA} wrote`,
    `${lowerAuthorA} said`,
    `${lowerAuthorA} confirmed`,
    `per ${lowerAuthorA}`,
    `according to ${lowerAuthorA}`,
    `quoting ${lowerAuthorA}`,
    `${lowerAuthorA}: "`,
  ];

  if (quotePhrases.some((phrase) => normB.includes(phrase))) {
    return true;
  }

  // 2. High verbatim overlap (direct copy-paste from textA)
  const normAWords = new Set(normalizeForComparison(textA).split(" "));
  const normBWords = normalizeForComparison(textB).split(" ");

  if (normAWords.size > 5 && normBWords.length > 5) {
    let overlapCount = 0;
    for (const word of normBWords) {
      if (normAWords.has(word)) overlapCount++;
    }
    const overlapRatio = overlapCount / normBWords.length;
    // Over 80% verbatim word reuse indicates a derivative copy rather than independent corroboration
    if (overlapRatio > 0.8) {
      return true;
    }
  }

  return false;
}
