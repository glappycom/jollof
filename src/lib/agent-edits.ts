/**
 * Parse structured file edits from agent responses and compute simple line diffs.
 */

export type AgentEditStatus = "pending" | "accepted" | "rejected";

export interface AgentFileEdit {
  id: string;
  path: string;
  originalContent: string;
  newContent: string;
  status: AgentEditStatus;
}

/** Fence format: ```jollof-edit:path/to/file.ts\ncontent\n``` */
const EDIT_FENCE_RE = /```jollof-edit(?::([^\n`]+))?\n([\s\S]*?)```/g;

/** XML fallback: <edit path="...">content</edit> */
const EDIT_XML_RE = /<edit\s+path=["']([^"']+)["']\s*>([\s\S]*?)<\/edit>/gi;

export function parseEditsFromResponse(content: string): Omit<AgentFileEdit, "status">[] {
  const edits: Omit<AgentFileEdit, "status">[] = [];
  const seenPaths = new Set<string>();

  let m: RegExpExecArray | null;
  const fenceRe = new RegExp(EDIT_FENCE_RE.source, "g");
  while ((m = fenceRe.exec(content)) !== null) {
    const path = (m[1] ?? "").trim();
    const newContent = m[2].replace(/\n$/, "");
    if (!path || seenPaths.has(path) || isPlaceholderEditContent(newContent)) continue;
    seenPaths.add(path);
    edits.push({ id: crypto.randomUUID(), path, originalContent: "", newContent });
  }

  const xmlRe = new RegExp(EDIT_XML_RE.source, "gi");
  while ((m = xmlRe.exec(content)) !== null) {
    const path = m[1].trim();
    const newContent = m[2].replace(/\n$/, "");
    if (!path || seenPaths.has(path) || isPlaceholderEditContent(newContent)) continue;
    seenPaths.add(path);
    edits.push({ id: crypto.randomUUID(), path, originalContent: "", newContent });
  }

  return edits;
}

/** Drop invented / stub edit bodies so Accept/Reject never shows junk. */
function isPlaceholderEditContent(content: string): boolean {
  const t = content.trim();
  if (!t) return true;
  if (t.length < 30) return true;
  if (/full file content from earlier/i.test(t)) return true;
  if (/entire file contents here/i.test(t)) return true;
  if (/TODO:\s*fill/i.test(t)) return true;
  if (/^\/\/\s*(full|complete|entire|placeholder|stub)\b/i.test(t)) return true;
  const codeLines = t.split("\n").filter((l) => {
    const s = l.trim();
    return s && !s.startsWith("//") && !s.startsWith("/*") && !s.startsWith("*");
  });
  if (codeLines.length === 0 && t.length < 200) return true;
  return false;
}

/** Remove edit blocks from assistant markdown (show prose + diff UI separately). */
export function stripEditBlocksFromDisplay(content: string): string {
  return content
    .replace(EDIT_FENCE_RE, "")
    .replace(EDIT_XML_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface DiffLine {
  type: "same" | "add" | "remove";
  text: string;
  oldLine?: number;
  newLine?: number;
}

/** Simple line-based diff for UI (Myers-lite / LCS would be overkill for v1). */
export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  // LCS table
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        oldLines[i - 1] === newLines[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  let i = m;
  let j = n;
  const stack: DiffLine[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      stack.push({ type: "same", text: oldLines[i - 1], oldLine: i, newLine: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: "add", text: newLines[j - 1], newLine: j });
      j--;
    } else {
      stack.push({ type: "remove", text: oldLines[i - 1], oldLine: i });
      i--;
    }
  }
  stack.reverse();
  return stack;
}

export function parseInlineEditFromResponse(content: string): string | null {
  const m = /```jollof-inline\n([\s\S]*?)```/.exec(content);
  if (m) return m[1].replace(/\n$/, "");
  const code = /```[\w]*\n([\s\S]*?)```/.exec(content);
  return code ? code[1].replace(/\n$/, "") : null;
}

export const AGENT_EDIT_SYSTEM_APPEND = `

## File edits (required when changing code)

When you propose file changes, include one block per file using this exact format (full file content, not a patch):

\`\`\`jollof-edit:path/relative/to/file.ext
entire file contents here
\`\`\`

Rules:
- Use paths relative to the workspace root (e.g. \`src/App.tsx\`). Never prefix with the workspace folder name.
- Include the COMPLETE new file content in each block — real code only, never placeholders like "full file content from earlier" or "// TODO: fill in".
- Only emit \`jollof-edit\` when the user asked you to change code. Pure questions get explanation only.
- When you do change files, add a "### Summary of changes:" section listing what you changed.`;
