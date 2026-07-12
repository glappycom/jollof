/**
 * Diagnostics for the Problems panel.
 * JS/TS via TypeScript language service (syntactic); JSON via JSON.parse.
 */

import ts from "typescript";
import { extensionOf } from "@/lib/language";

export interface ProblemEntry {
  id: string;
  file: string;
  line?: number;
  message: string;
  severity: "error" | "warning" | "info";
}

const TS_JS_EXT = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

function scriptKindForPath(path: string): ts.ScriptKind {
  const ext = extensionOf(path);
  if (ext === ".tsx") return ts.ScriptKind.TSX;
  if (ext === ".jsx") return ts.ScriptKind.JSX;
  if (ext === ".ts" || ext === ".mts" || ext === ".cts") return ts.ScriptKind.TS;
  return ts.ScriptKind.JS;
}

function fileNameFromPath(path: string): string {
  const base = path.replace(/\\/g, "/").split("/").pop() || "file.ts";
  return base;
}

function severityFromCategory(cat: ts.DiagnosticCategory): ProblemEntry["severity"] {
  if (cat === ts.DiagnosticCategory.Warning) return "warning";
  if (cat === ts.DiagnosticCategory.Message || cat === ts.DiagnosticCategory.Suggestion) return "info";
  return "error";
}

function getTsJsDiagnostics(path: string, content: string): ProblemEntry[] {
  const fileName = fileNameFromPath(path);
  const scriptKind = scriptKindForPath(path);
  const isJs = scriptKind === ts.ScriptKind.JS || scriptKind === ts.ScriptKind.JSX;

  const options: ts.CompilerOptions = {
    noEmit: true,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    allowJs: true,
    checkJs: false,
    skipLibCheck: true,
    strict: false,
    noLib: true,
  };

  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => [fileName],
    getScriptVersion: () => "1",
    getScriptSnapshot: (name) =>
      name === fileName ? ts.ScriptSnapshot.fromString(content) : undefined,
    getCurrentDirectory: () => "/",
    getCompilationSettings: () => options,
    getDefaultLibFileName: () => "lib.d.ts",
    fileExists: (f) => f === fileName,
    readFile: (f) => (f === fileName ? content : undefined),
    readDirectory: () => [],
    directoryExists: () => true,
    getDirectories: () => [],
  };

  // Force script kind via SourceFile creation in snapshot is enough for .tsx names;
  // LanguageService uses extension of fileName.
  void isJs;
  void scriptKind;

  const service = ts.createLanguageService(host, ts.createDocumentRegistry());
  try {
    const diags = service.getSyntacticDiagnostics(fileName);
    return diags.map((d, i) => {
      const start = d.start ?? 0;
      const lineAndChar = d.file
        ? d.file.getLineAndCharacterOfPosition(start)
        : { line: 0, character: 0 };
      const message = ts.flattenDiagnosticMessageText(d.messageText, "\n");
      const line = lineAndChar.line + 1;
      return {
        id: `${path}:${line}:${i}:${message.slice(0, 40)}`,
        file: path,
        line,
        message,
        severity: severityFromCategory(d.category),
      };
    });
  } finally {
    service.dispose();
  }
}

function getJsonDiagnostics(path: string, content: string): ProblemEntry[] {
  const trimmed = content.trim();
  if (!trimmed) return [];
  try {
    JSON.parse(trimmed);
    return [];
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid JSON";
    // Try to extract position from V8 message: "... at position N"
    let line = 1;
    const posMatch = /position\s+(\d+)/i.exec(message);
    if (posMatch) {
      const pos = Number(posMatch[1]);
      line = content.slice(0, pos).split(/\r?\n/).length;
    }
    return [
      {
        id: `${path}:${line}:${message.slice(0, 40)}`,
        file: path,
        line,
        message,
        severity: "error",
      },
    ];
  }
}

/**
 * Diagnostics for a single open file. Empty for unsupported languages.
 */
export function getDiagnostics(path: string, content: string): ProblemEntry[] {
  const ext = extensionOf(path);
  if (TS_JS_EXT.has(ext)) return getTsJsDiagnostics(path, content);
  if (ext === ".json") return getJsonDiagnostics(path, content);
  return [];
}
