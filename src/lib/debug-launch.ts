/**
 * Debug launch configs: auto (active file / npm scripts) + .vscode/launch.json
 */

import { fsReadFile } from "@/lib/fs-api";
import { buildRunActiveFileCommand, runFileKindForPath } from "@/lib/run-file";
import { extensionOf } from "@/lib/language";

export interface DebugConfig {
  id: string;
  name: string;
  /** Shell command to run from workspace cwd */
  command: string;
  source: "auto" | "launch.json";
}

function isWin(): boolean {
  return typeof navigator !== "undefined" && /win/i.test(navigator.platform || navigator.userAgent);
}

function quote(path: string): string {
  if (isWin()) return `"${path.replace(/"/g, '""')}"`;
  if (/[^a-zA-Z0-9_./\\:@%+=,-]/.test(path)) return `'${path.replace(/'/g, `'\\''`)}'`;
  return path;
}

function substituteVars(
  template: string,
  ctx: { workspaceFolder: string; fileRel?: string; fileAbs?: string }
): string {
  const fileRel = (ctx.fileRel || "").replace(/\\/g, "/");
  const fileAbs = (ctx.fileAbs || "").replace(/\\/g, "/");
  const base = fileRel.split("/").pop() || "";
  const noExt = base.includes(".") ? base.slice(0, base.lastIndexOf(".")) : base;
  return template
    .replace(/\$\{workspaceFolder\}/g, ctx.workspaceFolder.replace(/\\/g, "/"))
    .replace(/\$\{file\}/g, fileAbs || fileRel)
    .replace(/\$\{relativeFile\}/g, fileRel)
    .replace(/\$\{fileBasename\}/g, base)
    .replace(/\$\{fileBasenameNoExtension\}/g, noExt);
}

/** Build shell command from a VS Code-style launch config object. */
export function commandFromLaunchEntry(
  entry: Record<string, unknown>,
  ctx: { workspaceFolder: string; fileRel?: string; fileAbs?: string }
): string | null {
  const type = String(entry.type || "node").toLowerCase();
  const runtimeExecutable = entry.runtimeExecutable
    ? substituteVars(String(entry.runtimeExecutable), ctx)
    : null;
  const runtimeArgs = Array.isArray(entry.runtimeArgs)
    ? (entry.runtimeArgs as unknown[]).map((a) => substituteVars(String(a), ctx))
    : [];
  const program = entry.program ? substituteVars(String(entry.program), ctx) : null;
  const args = Array.isArray(entry.args)
    ? (entry.args as unknown[]).map((a) => substituteVars(String(a), ctx))
    : [];

  // npm / yarn / pnpm via runtimeExecutable
  if (runtimeExecutable) {
    const parts = [quote(runtimeExecutable), ...runtimeArgs.map(quote), ...(program ? [quote(program)] : []), ...args.map(quote)];
    return parts.join(" ");
  }

  if (type === "node" || type === "pwa-node" || type === "node-terminal") {
    if (!program) return null;
    const ext = extensionOf(program);
    if (ext === ".ts" || ext === ".tsx" || ext === ".mts" || ext === ".cts") {
      return ["npx", "--yes", "tsx", quote(program), ...args.map(quote)].join(" ");
    }
    return ["node", quote(program), ...args.map(quote)].join(" ");
  }

  if (type === "python" || type === "debugpy") {
    if (!program) return null;
    const py = isWin() ? "py -3" : "python3";
    return `${py} ${quote(program)}${args.length ? " " + args.map(quote).join(" ") : ""}`;
  }

  // Generic: command field (non-standard but useful)
  if (typeof entry.command === "string" && entry.command.trim()) {
    return substituteVars(entry.command.trim(), ctx);
  }

  return null;
}

export function parseLaunchJson(
  raw: string,
  ctx: { workspaceFolder: string; fileRel?: string; fileAbs?: string }
): DebugConfig[] {
  try {
    // Strip JSONC-ish comments lightly
    const cleaned = raw.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const data = JSON.parse(cleaned) as { configurations?: Record<string, unknown>[] };
    const configs = Array.isArray(data.configurations) ? data.configurations : [];
    const out: DebugConfig[] = [];
    configs.forEach((entry, i) => {
      const name = String(entry.name || `Config ${i + 1}`);
      const command = commandFromLaunchEntry(entry, ctx);
      if (!command) return;
      out.push({
        id: `launch-${i}-${name}`,
        name,
        command,
        source: "launch.json",
      });
    });
    return out;
  } catch {
    return [];
  }
}

export function autoDebugConfigs(opts: {
  fileRel?: string | null;
  packageScripts?: Record<string, string>;
}): DebugConfig[] {
  const configs: DebugConfig[] = [];
  const rel = opts.fileRel?.replace(/\\/g, "/");
  if (rel && runFileKindForPath(rel) !== "unsupported") {
    const command = buildRunActiveFileCommand(rel);
    if (command) {
      configs.push({
        id: "auto-current-file",
        name: `Current File (${rel.split("/").pop()})`,
        command,
        source: "auto",
      });
    }
  }

  const scripts = opts.packageScripts || {};
  for (const key of ["dev", "start", "test", "debug"]) {
    if (scripts[key]) {
      configs.push({
        id: `auto-npm-${key}`,
        name: `npm: ${key}`,
        command: `npm run ${key}`,
        source: "auto",
      });
    }
  }
  return configs;
}

export async function loadPackageScripts(
  localServerUrl: string,
  cwd: string
): Promise<Record<string, string>> {
  try {
    const raw = await fsReadFile(localServerUrl, cwd, "package.json");
    const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };
    return pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {};
  } catch {
    return {};
  }
}

export async function loadLaunchJsonConfigs(
  localServerUrl: string,
  cwd: string,
  ctx: { fileRel?: string; fileAbs?: string }
): Promise<DebugConfig[]> {
  try {
    const raw = await fsReadFile(localServerUrl, cwd, ".vscode/launch.json");
    return parseLaunchJson(raw, { workspaceFolder: cwd, ...ctx });
  } catch {
    try {
      const raw = await fsReadFile(localServerUrl, cwd, "launch.json");
      return parseLaunchJson(raw, { workspaceFolder: cwd, ...ctx });
    } catch {
      return [];
    }
  }
}

export async function resolveDebugConfigs(opts: {
  localServerUrl: string;
  cwd: string;
  fileRel?: string | null;
}): Promise<DebugConfig[]> {
  const fileRel = opts.fileRel || undefined;
  const fileAbs = fileRel
    ? `${opts.cwd.replace(/\\/g, "/")}/${fileRel.replace(/\\/g, "/")}`
    : undefined;
  const [scripts, fromLaunch] = await Promise.all([
    loadPackageScripts(opts.localServerUrl, opts.cwd),
    loadLaunchJsonConfigs(opts.localServerUrl, opts.cwd, { fileRel, fileAbs }),
  ]);
  const auto = autoDebugConfigs({ fileRel, packageScripts: scripts });
  // launch.json first, then auto (dedupe by name)
  const seen = new Set<string>();
  const merged: DebugConfig[] = [];
  for (const c of [...fromLaunch, ...auto]) {
    if (seen.has(c.name)) continue;
    seen.add(c.name);
    merged.push(c);
  }
  return merged;
}
