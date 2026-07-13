/**
 * @-mention context for agent chat (Phase A).
 * Parses @selection, @active, @open, @filename, @codebase and builds a context block for the API.
 */

import type { CodebaseIndex } from "@/lib/codebase-index";
import { searchCodebase } from "@/lib/codebase-index";

export interface AgentContextFile {
  path: string;
  content: string;
}

export interface AgentContextInput {
  message: string;
  openFiles: AgentContextFile[];
  activeFilePath?: string;
  selection?: { text: string; line: number; column: number };
  workspaceFiles?: AgentContextFile[];
  codebaseIndex?: CodebaseIndex | null;
}

export interface ParsedContextMention {
  raw: string;
  kind: "selection" | "active" | "open" | "file" | "codebase" | "unknown";
  query?: string;
}

const MENTION_RE = /@(selection|active|file|open|codebase|[\w.\-/]+)/gi;

/** Find @ mentions in the user message. */
export function parseContextMentions(message: string): ParsedContextMention[] {
  const out: ParsedContextMention[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(MENTION_RE.source, "gi");
  while ((m = re.exec(message)) !== null) {
    const token = m[1].toLowerCase();
    if (token === "selection") out.push({ raw: m[0], kind: "selection" });
    else if (token === "active" || token === "file") out.push({ raw: m[0], kind: "active" });
    else if (token === "open") out.push({ raw: m[0], kind: "open" });
    else if (token === "codebase") out.push({ raw: m[0], kind: "codebase" });
    else out.push({ raw: m[0], kind: "file", query: m[1] });
  }
  return out;
}

function findFileByQuery(
  query: string,
  openFiles: AgentContextFile[],
  workspaceFiles: AgentContextFile[]
): AgentContextFile | undefined {
  const q = query.toLowerCase();
  const pool = [...openFiles, ...workspaceFiles];
  const exact = pool.find((f) => f.path.toLowerCase() === q || f.path.toLowerCase().endsWith("/" + q));
  if (exact) return exact;
  const byName = pool.filter((f) => {
    const name = f.path.split("/").pop()?.toLowerCase() ?? "";
    return name === q || name.startsWith(q);
  });
  if (byName.length === 1) return byName[0];
  return byName.find((f) => f.path.toLowerCase().includes(q));
}

const MAX_FILE_CHARS = 24_000;
const MAX_OPEN_FILES = 8;

function truncate(content: string, path: string): string {
  if (content.length <= MAX_FILE_CHARS) return content;
  return content.slice(0, MAX_FILE_CHARS) + `\n\n… [truncated ${path}]`;
}

/**
 * Build a context block appended to the user message for the model.
 * If no @ mentions, still includes active file when workspace is open (light default).
 */
export function buildAgentContextBlock(input: AgentContextInput): string {
  const mentions = parseContextMentions(input.message);
  const sections: string[] = [];
  const seen = new Set<string>();

  const addFile = (label: string, file: AgentContextFile) => {
    if (seen.has(file.path)) return;
    seen.add(file.path);
    sections.push(
      `### ${label}: \`${file.path}\`\n\`\`\`\n${truncate(file.content, file.path)}\n\`\`\``
    );
  };

  for (const mention of mentions) {
    switch (mention.kind) {
      case "selection":
        if (input.selection?.text.trim()) {
          sections.push(
            `### Selection (line ${input.selection.line}, col ${input.selection.column})\n\`\`\`\n${input.selection.text}\n\`\`\``
          );
        }
        break;
      case "active": {
        const active = input.openFiles.find((f) => f.path === input.activeFilePath);
        if (active) addFile("Active file", active);
        break;
      }
      case "open":
        input.openFiles.slice(0, MAX_OPEN_FILES).forEach((f) => addFile("Open file", f));
        break;
      case "file": {
        if (!mention.query) break;
        const file = findFileByQuery(
          mention.query,
          input.openFiles,
          input.workspaceFiles ?? []
        );
        if (file) addFile("Referenced file", file);
        break;
      }
      case "codebase": {
        if (!input.codebaseIndex || input.codebaseIndex.chunks.length === 0) {
          sections.push(
            "### @codebase\n_Index not ready — open a folder and wait a moment for indexing._"
          );
          break;
        }
        // Prefer the user's intent text; fall back to active path for bare @codebase
        const stripped = input.message.replace(MENTION_RE, "").trim();
        const query =
          stripped ||
          [input.activeFilePath, input.selection?.text?.slice(0, 200)].filter(Boolean).join(" ") ||
          input.message;
        const chunks = searchCodebase(input.codebaseIndex, query, 12);
        if (chunks.length === 0) {
          sections.push(
            `### @codebase\n_No matching snippets for:_ ${query.slice(0, 120) || "(empty query)"}`
          );
        } else {
          sections.push(
            `### @codebase matches (${chunks.length} snippets from ${input.codebaseIndex.fileCount} files)`
          );
          for (const chunk of chunks) {
            const label = chunk.startLine > 1 ? `${chunk.path}:${chunk.startLine}` : chunk.path;
            sections.push(
              `#### \`${label}\`\n\`\`\`\n${truncate(chunk.content, chunk.path)}\n\`\`\``
            );
          }
        }
        break;
      }
      default:
        break;
    }
  }

  // Default: include active file when user has one open and no file context yet
  if (sections.length === 0 && input.activeFilePath) {
    const active = input.openFiles.find((f) => f.path === input.activeFilePath);
    if (active) addFile("Active file", active);
  }

  if (sections.length === 0) return "";
  return `\n\n---\n## Workspace context\n${sections.join("\n\n")}`;
}

/** User-visible message with @ tokens stripped (optional display). */
export function stripContextMentions(message: string): string {
  return message.replace(MENTION_RE, "").replace(/\s+/g, " ").trim();
}
