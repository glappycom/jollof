/**
 * Codebase index for @codebase — BM25-ish keyword retrieval with smarter chunking.
 * No embeddings / paid vector DB; works fully offline in the browser.
 */

import type { FlatFileEntry } from "@/lib/workspace";
import { readWorkspaceFile } from "@/lib/workspace";

export interface CodeChunk {
  path: string;
  startLine: number;
  content: string;
  tokens: string[];
}

export interface CodebaseIndex {
  chunks: CodeChunk[];
  /** Document frequency: token → number of chunks containing it */
  df: Record<string, number>;
  builtAt: number;
  fileCount: number;
}

const MAX_FILES = 250;
const MAX_FILE_BYTES = 120_000;
const CHUNK_LINES = 60;
const CHUNK_OVERLAP = 12;
const MAX_CHUNKS_PER_FILE = 10;
const MAX_CHUNKS_PER_PATH_IN_RESULTS = 2;

const SKIP_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
  ".woff", ".woff2", ".ttf", ".eot",
  ".zip", ".gz", ".pdf", ".lock",
  ".map", ".min.js", ".min.css",
]);

const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "had", "her",
  "was", "one", "our", "out", "has", "have", "been", "from", "they", "with",
  "this", "that", "what", "when", "your", "which", "their", "will", "would",
  "there", "could", "should", "about", "into", "than", "then", "them", "these",
  "some", "such", "only", "other", "over", "also", "just", "like", "make",
  "code", "file", "files", "please", "help", "need", "want", "using", "use",
]);

const SOURCE_EXT_BOOST = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".go", ".rs", ".java", ".kt",
  ".css", ".scss", ".html", ".vue", ".svelte",
  ".md", ".json",
]);

/** Split identifiers: fooBar → foo, bar; snake_case → snake, case */
function splitIdent(token: string): string[] {
  const parts = token
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-./]+/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter((p) => p.length >= 2 && !/^\d+$/.test(p));
  return parts;
}

export function tokenize(text: string): string[] {
  const raw = text.toLowerCase().match(/[a-zA-Z0-9_./-]{2,}/g) ?? [];
  const out = new Set<string>();
  for (const t of raw) {
    const lower = t.toLowerCase();
    if (lower.length >= 2 && !/^\d+$/.test(lower) && !STOPWORDS.has(lower)) {
      out.add(lower);
    }
    for (const p of splitIdent(t)) {
      if (!STOPWORDS.has(p)) out.add(p);
    }
  }
  return [...out];
}

function isSymbolBoundary(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  return (
    /^(export\s+)?(async\s+)?function\b/.test(t) ||
    /^(export\s+)?(default\s+)?class\b/.test(t) ||
    /^(export\s+)?(type|interface|enum)\b/.test(t) ||
    /^(export\s+)?const\s+\w+\s*=/.test(t) ||
    /^def\s+\w+/.test(t) ||
    /^class\s+\w+/.test(t) ||
    /^fn\s+\w+/.test(t) ||
    /^func\s+\w+/.test(t)
  );
}

function chunkFile(path: string, content: string): CodeChunk[] {
  const lines = content.split("\n");
  if (lines.length <= CHUNK_LINES) {
    return [
      {
        path,
        startLine: 1,
        content,
        tokens: tokenize(`${content}\n${path}`),
      },
    ];
  }

  const chunks: CodeChunk[] = [];
  let i = 0;
  while (i < lines.length && chunks.length < MAX_CHUNKS_PER_FILE) {
    // Prefer starting on a symbol boundary when nearby
    let start = i;
    if (i > 0) {
      for (let j = i; j < Math.min(i + 8, lines.length); j++) {
        if (isSymbolBoundary(lines[j]!)) {
          start = j;
          break;
        }
      }
    }
    const end = Math.min(start + CHUNK_LINES, lines.length);
    const slice = lines.slice(start, end).join("\n");
    chunks.push({
      path,
      startLine: start + 1,
      content: slice,
      tokens: tokenize(`${slice}\n${path}`),
    });
    if (end >= lines.length) break;
    i = Math.max(start + CHUNK_LINES - CHUNK_OVERLAP, start + 1);
  }
  return chunks;
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export async function buildCodebaseIndex(
  files: FlatFileEntry[],
  opts?: { rootLocalPath?: string | null; localServerUrl?: string }
): Promise<CodebaseIndex> {
  const chunks: CodeChunk[] = [];
  // Prefer source files first so caps don't fill with noise
  const ranked = [...files].sort((a, b) => {
    const ae = SOURCE_EXT_BOOST.has(extOf(a.name)) ? 0 : 1;
    const be = SOURCE_EXT_BOOST.has(extOf(b.name)) ? 0 : 1;
    if (ae !== be) return ae - be;
    return a.path.localeCompare(b.path);
  });
  const toIndex = ranked.slice(0, MAX_FILES);
  let indexedFiles = 0;

  for (const file of toIndex) {
    const ext = extOf(file.name);
    if (SKIP_EXT.has(ext)) continue;
    if (file.name.endsWith(".min.js") || file.name.endsWith(".min.css")) continue;
    try {
      const content = await readWorkspaceFile(file, {
        rootLocalPath: opts?.rootLocalPath,
        localServerUrl: opts?.localServerUrl,
      });
      if (content.length > MAX_FILE_BYTES) continue;
      chunks.push(...chunkFile(file.path, content));
      indexedFiles += 1;
    } catch {
      // skip unreadable
    }
  }

  const df: Record<string, number> = {};
  for (const chunk of chunks) {
    const seen = new Set(chunk.tokens);
    for (const t of seen) {
      df[t] = (df[t] ?? 0) + 1;
    }
  }

  return { chunks, df, builtAt: Date.now(), fileCount: indexedFiles };
}

/**
 * Rank chunks for a natural-language query (IDF-weighted, path boost, diversity).
 */
export function searchCodebase(
  index: CodebaseIndex,
  query: string,
  maxResults = 12
): CodeChunk[] {
  const queryTokens = tokenize(query).filter((t) => !STOPWORDS.has(t));
  if (queryTokens.length === 0) {
    return diversify(index.chunks.slice(0, maxResults * 2), maxResults);
  }

  const N = Math.max(index.chunks.length, 1);
  const scored = index.chunks
    .map((chunk) => {
      let score = 0;
      const tokenSet = new Set(chunk.tokens);
      const pathLower = chunk.path.toLowerCase();
      const base = pathLower.split("/").pop() ?? pathLower;
      const contentLower = chunk.content.toLowerCase();

      for (const t of queryTokens) {
        const df = index.df[t] ?? 0;
        const idf = Math.log(1 + N / (1 + df));
        if (tokenSet.has(t)) score += 2.5 * idf;
        if (base.includes(t)) score += 5 * idf;
        else if (pathLower.includes(t)) score += 3 * idf;
        if (contentLower.includes(t)) score += 0.5 * idf;
      }

      const ext = extOf(base);
      if (SOURCE_EXT_BOOST.has(ext)) score *= 1.15;

      return { chunk, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return diversify(
    scored.map((s) => s.chunk),
    maxResults
  );
}

function diversify(chunks: CodeChunk[], maxResults: number): CodeChunk[] {
  const perPath = new Map<string, number>();
  const seen = new Set<string>();
  const out: CodeChunk[] = [];
  for (const chunk of chunks) {
    const key = `${chunk.path}:${chunk.startLine}`;
    if (seen.has(key)) continue;
    const count = perPath.get(chunk.path) ?? 0;
    if (count >= MAX_CHUNKS_PER_PATH_IN_RESULTS) continue;
    seen.add(key);
    perPath.set(chunk.path, count + 1);
    out.push(chunk);
    if (out.length >= maxResults) break;
  }
  return out;
}
