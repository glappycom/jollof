/**
 * Diagnostics for the Problems panel.
 * - Fast: in-editor syntactic + semantic (open TS/JS buffers)
 * - Project: `tsc --noEmit` via local server when a disk cwd is available
 */

import ts from "typescript";
import { extensionOf } from "@/lib/language";
import { runWorkspaceCommand } from "@/lib/run-api";

export interface ProblemEntry {
  id: string;
  file: string;
  line?: number;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface DiagnosticFile {
  path: string;
  content: string;
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

/** Minimal ambient lib so semantic checks work without bundling full TypeScript libs. */
const MINIMAL_LIB = `
interface Array<T> { length: number; [n: number]: T; push(...items: T[]): number; pop(): T | undefined; map<U>(fn: (v: T, i: number) => U): U[]; filter(fn: (v: T) => unknown): T[]; forEach(fn: (v: T, i: number) => void): void; find(fn: (v: T) => unknown): T | undefined; includes(v: T): boolean; join(sep?: string): string; slice(start?: number, end?: number): T[]; }
interface ReadonlyArray<T> { length: number; [n: number]: T; }
interface Boolean {}
interface Number { toFixed(d?: number): string; }
interface String { length: number; charAt(i: number): string; slice(start?: number, end?: number): string; split(sep: string | RegExp): string[]; includes(s: string): boolean; replace(search: string | RegExp, repl: string): string; trim(): string; toLowerCase(): string; toUpperCase(): string; }
interface Function { bind(thisArg: unknown, ...args: unknown[]): Function; call(thisArg: unknown, ...args: unknown[]): unknown; apply(thisArg: unknown, args: unknown[]): unknown; }
interface Object { toString(): string; }
interface RegExp { test(s: string): boolean; exec(s: string): RegExpExecArray | null; }
interface RegExpExecArray extends Array<string> { index: number; input: string; }
interface Date { getTime(): number; toISOString(): string; }
interface Error { name: string; message: string; stack?: string; }
interface Promise<T> { then<TResult>(onfulfilled?: (value: T) => TResult | PromiseLike<TResult>, onrejected?: (reason: unknown) => TResult | PromiseLike<TResult>): Promise<TResult>; catch<TResult>(onrejected?: (reason: unknown) => TResult | PromiseLike<TResult>): Promise<TResult>; }
interface PromiseLike<T> { then<TResult>(onfulfilled?: (value: T) => TResult | PromiseLike<TResult>, onrejected?: (reason: unknown) => TResult | PromiseLike<TResult>): PromiseLike<TResult>; }
interface Console { log(...args: unknown[]): void; warn(...args: unknown[]): void; error(...args: unknown[]): void; info(...args: unknown[]): void; debug(...args: unknown[]): void; }
declare var console: Console;
declare var undefined: undefined;
declare function parseInt(s: string, radix?: number): number;
declare function parseFloat(s: string): number;
declare function isNaN(n: number): boolean;
declare function setTimeout(handler: (...args: unknown[]) => void, timeout?: number, ...args: unknown[]): number;
declare function clearTimeout(id: number): void;
declare function setInterval(handler: (...args: unknown[]) => void, timeout?: number, ...args: unknown[]): number;
declare function clearInterval(id: number): void;
declare var JSON: { parse(text: string): unknown; stringify(value: unknown, replacer?: unknown, space?: unknown): string };
declare var Math: { floor(n: number): number; ceil(n: number): number; round(n: number): number; min(...n: number[]): number; max(...n: number[]): number; abs(n: number): number; random(): number; };
declare var Array: { isArray(arg: unknown): arg is unknown[]; from<T>(arrayLike: ArrayLike<T>): T[]; };
declare var Object: { keys(o: object): string[]; values<T>(o: { [s: string]: T }): T[]; entries<T>(o: { [s: string]: T }): [string, T][]; assign<T extends object>(target: T, ...sources: object[]): T; };
declare var Promise: { new <T>(executor: (resolve: (v: T | PromiseLike<T>) => void, reject: (reason?: unknown) => void) => void): Promise<T>; resolve<T>(value: T | PromiseLike<T>): Promise<T>; reject(reason?: unknown): Promise<never>; all<T>(values: readonly (T | PromiseLike<T>)[]): Promise<T[]>; };
declare var Error: { new (message?: string): Error; (message?: string): Error; };
interface ArrayLike<T> { length: number; [n: number]: T; }
interface ImportMeta { url: string; env: Record<string, string>; }
declare var process: { env: Record<string, string | undefined>; cwd(): string; platform: string; };
`;

const LIB_NAME = "lib.jollof.d.ts";

function scriptKindForPath(path: string): ts.ScriptKind {
  const ext = extensionOf(path);
  if (ext === ".tsx") return ts.ScriptKind.TSX;
  if (ext === ".jsx") return ts.ScriptKind.JSX;
  if (ext === ".ts" || ext === ".mts" || ext === ".cts") return ts.ScriptKind.TS;
  return ts.ScriptKind.JS;
}

function virtualFileName(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\//, "") || "file.ts";
}

function severityFromCategory(cat: ts.DiagnosticCategory): ProblemEntry["severity"] {
  if (cat === ts.DiagnosticCategory.Warning) return "warning";
  if (cat === ts.DiagnosticCategory.Message || cat === ts.DiagnosticCategory.Suggestion) {
    return "info";
  }
  return "error";
}

function diagnosticToProblem(
  d: ts.Diagnostic,
  fallbackPath: string,
  index: number
): ProblemEntry {
  const start = d.start ?? 0;
  const lineAndChar = d.file
    ? d.file.getLineAndCharacterOfPosition(start)
    : { line: 0, character: 0 };
  const message = ts.flattenDiagnosticMessageText(d.messageText, "\n");
  const line = lineAndChar.line + 1;
  const file = d.file?.fileName || fallbackPath;
  return {
    id: `${file}:${line}:${index}:${message.slice(0, 40)}`,
    file,
    line,
    message,
    severity: severityFromCategory(d.category),
  };
}

function getTsJsDiagnostics(
  path: string,
  content: string,
  openFiles: DiagnosticFile[] = []
): ProblemEntry[] {
  const primary = virtualFileName(path);
  const files = new Map<string, string>();
  files.set(primary, content);
  files.set(LIB_NAME, MINIMAL_LIB);

  for (const f of openFiles) {
    if (!f.path || f.path === path) continue;
    if (!TS_JS_EXT.has(extensionOf(f.path))) continue;
    files.set(virtualFileName(f.path), f.content);
  }

  const scriptNames = [...files.keys()].filter((n) => n !== LIB_NAME);
  const versions = new Map<string, string>();
  for (const [name, text] of files) {
    versions.set(name, String(text.length) + ":" + text.slice(0, 32));
  }

  const options: ts.CompilerOptions = {
    noEmit: true,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    allowJs: true,
    checkJs: false,
    skipLibCheck: true,
    strict: true,
    noLib: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    resolveJsonModule: true,
  };

  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => scriptNames,
    getScriptVersion: (name) => versions.get(name) ?? "0",
    getScriptSnapshot: (name) => {
      const text = files.get(name);
      return text != null ? ts.ScriptSnapshot.fromString(text) : undefined;
    },
    getCurrentDirectory: () => "/",
    getCompilationSettings: () => options,
    getDefaultLibFileName: () => LIB_NAME,
    fileExists: (f) => files.has(f) || f === LIB_NAME,
    readFile: (f) => files.get(f),
    readDirectory: () => [],
    directoryExists: () => true,
    getDirectories: () => [],
  };

  void scriptKindForPath;

  const service = ts.createLanguageService(host, ts.createDocumentRegistry());
  try {
    const syn = service.getSyntacticDiagnostics(primary);
    const sem = service.getSemanticDiagnostics(primary);
    const seen = new Set<string>();
    const out: ProblemEntry[] = [];
    [...syn, ...sem].forEach((d, i) => {
      const p = diagnosticToProblem(d, path, i);
      // Prefer original workspace path for the active file
      if (virtualFileName(p.file) === primary) p.file = path;
      const key = `${p.file}:${p.line}:${p.message}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(p);
    });
    return out;
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
 * Fast diagnostics for open buffers (syntactic + semantic across open TS/JS files).
 */
export function getDiagnostics(
  path: string,
  content: string,
  openFiles: DiagnosticFile[] = []
): ProblemEntry[] {
  const ext = extensionOf(path);
  if (TS_JS_EXT.has(ext)) return getTsJsDiagnostics(path, content, openFiles);
  if (ext === ".json") return getJsonDiagnostics(path, content);
  return [];
}

/** Parse `tsc --pretty false` / `tsc --pretty false --noEmit` output. */
export function parseTscOutput(text: string, rootName?: string): ProblemEntry[] {
  const problems: ProblemEntry[] = [];
  const re =
    /^(.+?)\((\d+),(\d+)\):\s*(error|warning|info)\s+TS\d+:\s*(.+)$/gm;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    const rawFile = m[1].replace(/\\/g, "/");
    const file =
      rootName && !rawFile.includes("/") && !rawFile.includes("\\")
        ? `${rootName}/${rawFile}`
        : rawFile.includes("/")
          ? rawFile
          : rootName
            ? `${rootName}/${rawFile}`
            : rawFile;
    const severity =
      m[4] === "warning" ? "warning" : m[4] === "info" ? "info" : "error";
    const line = Number(m[2]);
    const message = m[5].trim();
    problems.push({
      id: `tsc:${file}:${line}:${i}:${message.slice(0, 40)}`,
      file,
      line,
      message: `TS: ${message}`,
      severity,
    });
    i += 1;
  }
  return problems;
}

/**
 * Real project diagnostics via the workspace TypeScript compiler.
 * Requires local server + disk cwd (same as Git / Run).
 */
export async function getProjectDiagnostics(
  localServerUrl: string,
  cwd: string,
  rootName?: string
): Promise<ProblemEntry[]> {
  if (!cwd.trim()) return [];
  try {
    const result = await runWorkspaceCommand(
      localServerUrl,
      cwd,
      "npx --yes tsc --noEmit --pretty false",
      90_000
    );
    const text = `${result.stdout || ""}\n${result.stderr || ""}`;
    let problems = parseTscOutput(text, rootName);
    if (problems.length === 0 && !result.ok && /no such file|not found|ENOENT/i.test(text)) {
      // Fallback without -p when tsconfig missing
      const retry = await runWorkspaceCommand(
        localServerUrl,
        cwd,
        "npx --yes tsc --noEmit --pretty false --allowJs false",
        90_000
      );
      problems = parseTscOutput(`${retry.stdout || ""}\n${retry.stderr || ""}`, rootName);
    }
    // Normalize paths to workspace-style (rootName/rel)
    if (rootName) {
      const cwdNorm = cwd.replace(/\\/g, "/").replace(/\/$/, "");
      problems = problems.map((p) => {
        let file = p.file.replace(/\\/g, "/");
        if (file.startsWith(cwdNorm + "/")) {
          file = `${rootName}/${file.slice(cwdNorm.length + 1)}`;
        } else if (!file.startsWith(rootName + "/") && !file.includes(":")) {
          file = `${rootName}/${file.replace(/^\.\//, "")}`;
        }
        return { ...p, file, id: p.id.replace(p.file, file) };
      });
    }
    return problems;
  } catch {
    return [];
  }
}

/** Prefer project problems; overlay fresh buffer diagnostics for the active file. */
export function mergeDiagnostics(
  project: ProblemEntry[],
  buffer: ProblemEntry[],
  activePath?: string
): ProblemEntry[] {
  if (!activePath) {
    return project.length > 0 ? project : buffer;
  }
  const activeNorm = activePath.replace(/\\/g, "/");
  const fromProject = project.filter(
    (p) => p.file.replace(/\\/g, "/") !== activeNorm
  );
  // Buffer wins for the active file (unsaved edits)
  return [...fromProject, ...buffer];
}
