/**
 * Lightweight codebase index for @codebase context (keyword retrieval, not embeddings).
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
  builtAt: number;
  fileCount: number;
}

const MAX_FILES = 200;
const MAX_FILE_BYTES = 120_000;
const CHUNK_LINES = 80;
const MAX_CHUNKS_PER_FILE = 8;

const SKIP_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
  ".woff", ".woff2", ".ttf", ".eot",
  ".zip", ".gz", ".pdf", ".lock",
  ".map",
]);

function tokenize(text: string): string[] {
  const raw = text.toLowerCase().match(/[a-z0-9_./-]{2,}/g) ?? [];
  return [...new Set(raw)].filter((t) => t.length >= 2 && !/^\d+$/.test(t));
}

function chunkFile(path: string, content: string): CodeChunk[] {
  const lines = content.split("\n");
  if (lines.length <= CHUNK_LINES) {
    return [{ path, startLine: 1, content, tokens: tokenize(content + " " + path) }];
  }
  const chunks: CodeChunk[] = [];
  for (let i = 0; i < lines.length && chunks.length < MAX_CHUNKS_PER_FILE; i += CHUNK_LINES) {
    const slice = lines.slice(i, i + CHUNK_LINES).join("\n");
    chunks.push({
      path,
      startLine: i + 1,
      content: slice,
      tokens: tokenize(slice + " " + path),
    });
  }
  return chunks;
}

export async function buildCodebaseIndex(
  files: FlatFileEntry[],
  opts?: { rootLocalPath?: string | null; localServerUrl?: string }
): Promise<CodebaseIndex> {
  const chunks: CodeChunk[] = [];
  const toIndex = files.slice(0, MAX_FILES);

  for (const file of toIndex) {
    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "";
    if (SKIP_EXT.has(ext)) continue;
    try {
      const content = await readWorkspaceFile(file, {
        rootLocalPath: opts?.rootLocalPath,
        localServerUrl: opts?.localServerUrl,
      });
      if (content.length > MAX_FILE_BYTES) continue;
      chunks.push(...chunkFile(file.path, content));
    } catch {
      // skip unreadable
    }
  }

  return { chunks, builtAt: Date.now(), fileCount: toIndex.length };
}

export function searchCodebase(
  index: CodebaseIndex,
  query: string,
  maxResults = 10
): CodeChunk[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return index.chunks.slice(0, maxResults);

  const scored = index.chunks
    .map((chunk) => {
      let score = 0;
      const tokenSet = new Set(chunk.tokens);
      const pathLower = chunk.path.toLowerCase();
      for (const t of queryTokens) {
        if (tokenSet.has(t)) score += 2;
        if (pathLower.includes(t)) score += 4;
        if (chunk.content.toLowerCase().includes(t)) score += 1;
      }
      return { chunk, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const out: CodeChunk[] = [];
  for (const { chunk } of scored) {
    const key = `${chunk.path}:${chunk.startLine}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(chunk);
    if (out.length >= maxResults) break;
  }
  return out;
}
