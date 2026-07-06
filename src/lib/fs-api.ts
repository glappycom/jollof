import type { FileTreeNode } from "@/lib/workspace";

const DEFAULT_SERVER = "http://localhost:31337";

export interface FsListEntry {
  kind: "file" | "directory";
  name: string;
  path: string;
  relPath: string;
}

async function fsFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `FS API ${res.status}`);
  }
  return data;
}

export async function fsListDirectory(
  localServerUrl: string,
  cwd: string,
  rootName: string,
  rel = ""
): Promise<FsListEntry[]> {
  const base = localServerUrl || DEFAULT_SERVER;
  const params = new URLSearchParams({ cwd, rootName });
  if (rel) params.set("rel", rel);
  const data = await fsFetch<{ entries: FsListEntry[] }>(`${base}/api/fs/list?${params}`);
  return data.entries;
}

export async function fsReadFile(
  localServerUrl: string,
  cwd: string,
  rel: string
): Promise<string> {
  const base = localServerUrl || DEFAULT_SERVER;
  const params = new URLSearchParams({ cwd, rel });
  const data = await fsFetch<{ content: string }>(`${base}/api/fs/read?${params}`);
  return data.content;
}

export async function fsWriteFile(
  localServerUrl: string,
  cwd: string,
  rel: string,
  content: string
): Promise<void> {
  const base = localServerUrl || DEFAULT_SERVER;
  await fsFetch<{ ok: boolean }>(`${base}/api/fs/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cwd, rel, content }),
  });
}

export function fsEntriesToTreeNodes(entries: FsListEntry[]): FileTreeNode[] {
  return entries.map((e) => ({
    kind: e.kind,
    name: e.name,
    path: e.path,
    relPath: e.relPath,
    children: e.kind === "directory" ? [] : undefined,
  }));
}
