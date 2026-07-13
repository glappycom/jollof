/**
 * Map an open workspace file to a shell command that runs it.
 */

import { extensionOf } from "@/lib/language";

function shellQuote(path: string): string {
  if (processPlatformIsWin()) {
    // cmd.exe: wrap in double quotes; escape embedded quotes
    return `"${path.replace(/"/g, '""')}"`;
  }
  if (/[^a-zA-Z0-9_./\\:@%+=,-]/.test(path)) {
    return `'${path.replace(/'/g, `'\\''`)}'`;
  }
  return path;
}

function processPlatformIsWin(): boolean {
  if (typeof navigator !== "undefined" && /win/i.test(navigator.platform || navigator.userAgent)) {
    return true;
  }
  return false;
}

export type RunFileKind = "node" | "tsx" | "python" | "unsupported";

export function runFileKindForPath(path: string): RunFileKind {
  const ext = extensionOf(path);
  switch (ext) {
    case ".js":
    case ".mjs":
    case ".cjs":
      return "node";
    case ".ts":
    case ".tsx":
    case ".mts":
    case ".cts":
      return "tsx";
    case ".py":
      return "python";
    default:
      return "unsupported";
  }
}

/**
 * Build a shell command to run `relPath` from the workspace root.
 * Returns null when the file type is not runnable.
 */
export function buildRunActiveFileCommand(relPath: string): string | null {
  const normalized = relPath.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!normalized || normalized.includes("..")) return null;

  const kind = runFileKindForPath(normalized);
  const quoted = shellQuote(normalized.replace(/\//g, processPlatformIsWin() ? "\\" : "/"));

  switch (kind) {
    case "node":
      return `node ${quoted}`;
    case "tsx":
      // tsx handles TS/TSX without a separate compile step
      return `npx --yes tsx ${quoted}`;
    case "python":
      // `py -3` is the Windows launcher; `python3`/`python` elsewhere
      return processPlatformIsWin() ? `py -3 ${quoted}` : `python3 ${quoted}`;
    default:
      return null;
  }
}

export function runFileLabel(kind: RunFileKind): string {
  switch (kind) {
    case "node":
      return "Node";
    case "tsx":
      return "TypeScript (tsx)";
    case "python":
      return "Python";
    default:
      return "Unsupported";
  }
}
