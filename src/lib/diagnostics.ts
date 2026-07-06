/**
 * Lightweight diagnostics for the Problems panel (syntax errors via Acorn).
 */

import * as acorn from "acorn";

export interface ProblemEntry {
  id: string;
  file: string;
  line?: number;
  message: string;
  severity: "error" | "warning" | "info";
}

/** Acorn parses JS only; .ts/.tsx would need a TS parser. */
const JS_EXT = new Set([".js", ".mjs", ".cjs", ".jsx"]);

function hasJSExt(path: string): boolean {
  const i = path.lastIndexOf(".");
  return i >= 0 && JS_EXT.has(path.slice(i).toLowerCase());
}

/**
 * Get syntax-error diagnostics for a single file. Returns empty array for non-JS or if parse succeeds.
 */
export function getDiagnostics(path: string, content: string): ProblemEntry[] {
  if (!hasJSExt(path)) return [];

  try {
    acorn.parse(content, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true,
      allowHashBang: true,
      allowAwaitOutsideFunction: true,
    });
    return [];
  } catch (err) {
    const e = err as Error & { loc?: { line: number; column?: number }; pos?: number };
    const line = e.loc?.line ?? 1;
    const message = e.message || "Syntax error";
    return [
      {
        id: `${path}:${line}:${message.slice(0, 20)}`,
        file: path,
        line,
        message,
        severity: "error",
      },
    ];
  }
}
