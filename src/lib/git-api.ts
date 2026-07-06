import { localServerBaseUrl } from "@/lib/local-server";

export interface GitFileStatus {
  path: string;
  status: "modified" | "staged" | "untracked";
  staged: boolean;
}

export interface GitStatusResult {
  branch: string;
  files: GitFileStatus[];
}

async function apiFetch<T>(
  baseUrl: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = `${localServerBaseUrl(baseUrl)}${path}`;
  const res = await fetch(url, init);
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export async function fetchGitStatus(
  localServerUrl: string,
  cwd: string
): Promise<GitStatusResult> {
  const params = new URLSearchParams({ cwd });
  return apiFetch(localServerUrl, `/api/git/status?${params}`);
}

export async function fetchGitDiff(
  localServerUrl: string,
  cwd: string,
  filePath: string,
  staged = false
): Promise<string> {
  const params = new URLSearchParams({ cwd, path: filePath, staged: String(staged) });
  const data = await apiFetch<{ diff: string }>(localServerUrl, `/api/git/diff?${params}`);
  return data.diff;
}

export async function stageGitFiles(
  localServerUrl: string,
  cwd: string,
  paths: string[]
): Promise<void> {
  await apiFetch(localServerUrl, "/api/git/stage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cwd, paths }),
  });
}

export async function unstageGitFiles(
  localServerUrl: string,
  cwd: string,
  paths: string[]
): Promise<void> {
  await apiFetch(localServerUrl, "/api/git/unstage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cwd, paths }),
  });
}

export async function commitGit(
  localServerUrl: string,
  cwd: string,
  message: string
): Promise<string> {
  const data = await apiFetch<{ output: string }>(localServerUrl, "/api/git/commit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cwd, message }),
  });
  return data.output;
}

/** Map git-relative path to workspace tree path (rootName/...). */
export function gitPathToWorkspacePath(gitPath: string, rootName: string): string {
  if (!rootName) return gitPath;
  if (gitPath.startsWith(`${rootName}/`)) return gitPath;
  return `${rootName}/${gitPath.replace(/^\.\//, "")}`;
}
