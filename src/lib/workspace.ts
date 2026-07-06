/**
 * Workspace types and helpers for Open Folder (File System Access API).
 * See: https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API
 */

export interface FileTreeNode {
  kind: "file" | "directory";
  name: string;
  path: string;
  /** Browser mode — File System Access API handle */
  handle?: FileSystemFileHandle | FileSystemDirectoryHandle;
  /** Desktop mode — path relative to workspace root (e.g. src/main.tsx) */
  relPath?: string;
  children?: FileTreeNode[];
}

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "__pycache__", ".venv"]);

/**
 * Check if the File System Access API is available (Chromium-based browsers).
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

/**
 * Open file(s) with the native picker. Returns selected file handles.
 */
export async function openFilePicker(
  multiple = false
): Promise<FileSystemFileHandle[]> {
  if (typeof window === "undefined" || !("showOpenFilePicker" in window)) return [];
  const w = window as Window & {
    showOpenFilePicker?(opts?: { multiple?: boolean; types?: { description?: string; accept?: Record<string, string[]> }[] }): Promise<FileSystemFileHandle[]>;
  };
  const handles = await w.showOpenFilePicker!({
    multiple,
    types: [{ description: "Text/Code", accept: { "text/*": [".*"], "application/json": [".json"] } }],
  });
  return Array.from(handles);
}

/**
 * Open a folder with the native picker. Returns the root handle and a shallow tree (one level).
 * Caller can expand directories on demand to avoid loading huge trees.
 */
export async function openFolder(): Promise<{
  rootName: string;
  rootHandle: FileSystemDirectoryHandle;
  children: FileTreeNode[];
} | null> {
  if (!isFileSystemAccessSupported()) return null;
  const rootHandle = await (window as Window & { showDirectoryPicker?(opts?: { mode?: string }): Promise<FileSystemDirectoryHandle> })
    .showDirectoryPicker!({ mode: "readwrite" });
  const rootName = rootHandle.name;
  const children = await readDirectoryEntries(rootHandle, rootName);
  return { rootName, rootHandle, children };
}

/**
 * Reopen a folder from an existing directory handle (e.g. from Open Recent).
 * Caller should verify permission (queryPermission/requestPermission) before calling.
 */
export async function openFolderFromHandle(
  rootHandle: FileSystemDirectoryHandle
): Promise<{ rootName: string; rootHandle: FileSystemDirectoryHandle; children: FileTreeNode[] }> {
  const rootName = rootHandle.name;
  const children = await readDirectoryEntries(rootHandle, rootName);
  return { rootName, rootHandle, children };
}

/**
 * Read direct children of a directory (files and directory handles).
 */
export async function readDirectoryEntries(
  dirHandle: FileSystemDirectoryHandle,
  basePath: string
): Promise<FileTreeNode[]> {
  const nodes: FileTreeNode[] = [];
  // File System Access API: values() is async iterable (DOM types may not include it)
  const dir = dirHandle as unknown as { values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle> };
  for await (const entry of dir.values()) {
    const path = basePath + "/" + entry.name;
    if (entry.kind === "file") {
      nodes.push({ kind: "file", name: entry.name, path, handle: entry });
    } else {
      if (SKIP_DIRS.has(entry.name)) continue;
      nodes.push({
        kind: "directory",
        name: entry.name,
        path,
        handle: entry,
        children: [], // loaded on expand
      });
    }
  }
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
  return nodes;
}

/**
 * Load children of a directory node (for lazy expansion).
 */
export async function loadDirectoryChildren(
  node: FileTreeNode
): Promise<FileTreeNode[]> {
  if (node.kind !== "directory" || !node.handle) return [];
  const dirHandle = node.handle as FileSystemDirectoryHandle;
  const children = await readDirectoryEntries(dirHandle, node.path);
  return children;
}

/**
 * Read full text content of a file from its handle.
 */
export async function readFileContent(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

/**
 * Write text content to a file via its handle (requires readwrite permission).
 */
export async function writeFileContent(
  handle: FileSystemFileHandle,
  content: string
): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

/**
 * Resolve or create a file handle under a workspace root by relative path.
 * Path uses forward slashes (e.g. "myfolder/src/app.ts").
 */
export async function getFileHandleAtPath(
  rootHandle: FileSystemDirectoryHandle,
  relativePath: string,
  create = false
): Promise<FileSystemFileHandle> {
  const parts = relativePath.split("/").filter(Boolean);
  if (parts.length === 0) throw new Error("Invalid file path");
  let dir = rootHandle;
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i], create ? { create: true } : undefined);
  }
  return dir.getFileHandle(parts[parts.length - 1], create ? { create: true } : undefined);
}

/**
 * Write content to a path under the workspace root (creates parent dirs and file if needed).
 */
export async function writeFileAtPath(
  rootHandle: FileSystemDirectoryHandle,
  relativePath: string,
  content: string
): Promise<FileSystemFileHandle> {
  const handle = await getFileHandleAtPath(rootHandle, relativePath, true);
  await writeFileContent(handle, content);
  return handle;
}

/**
 * Read content from a path under the workspace root. Returns null if missing.
 */
export async function readFileAtPath(
  rootHandle: FileSystemDirectoryHandle,
  relativePath: string
): Promise<string | null> {
  try {
    const handle = await getFileHandleAtPath(rootHandle, relativePath, false);
    return readFileContent(handle);
  } catch {
    return null;
  }
}

export interface FlatFileEntry {
  path: string;
  name: string;
  handle?: FileSystemFileHandle;
  relPath?: string;
}

/**
 * Read file content from a flat entry (browser handle or desktop relPath).
 */
export async function readWorkspaceFile(
  entry: FlatFileEntry,
  opts: { rootLocalPath?: string | null; localServerUrl?: string }
): Promise<string> {
  if (entry.handle) return readFileContent(entry.handle);
  if (entry.relPath && opts.rootLocalPath) {
    const { fsReadFile } = await import("@/lib/fs-api");
    return fsReadFile(opts.localServerUrl || "http://localhost:31337", opts.rootLocalPath, entry.relPath);
  }
  throw new Error(`Cannot read file: ${entry.path}`);
}

/**
 * Write content to a relative path in the workspace.
 */
export async function writeWorkspaceFileAtPath(
  relativePath: string,
  content: string,
  opts: {
    rootHandle?: FileSystemDirectoryHandle | null;
    rootLocalPath?: string | null;
    localServerUrl?: string;
  }
): Promise<void> {
  if (opts.rootHandle) {
    await writeFileAtPath(opts.rootHandle, relativePath, content);
    return;
  }
  if (opts.rootLocalPath) {
    const { fsWriteFile } = await import("@/lib/fs-api");
    await fsWriteFile(opts.localServerUrl || "http://localhost:31337", opts.rootLocalPath, relativePath, content);
    return;
  }
  throw new Error("No workspace root for write");
}

/**
 * Read content from a relative path in the workspace.
 */
export async function readWorkspaceFileAtPath(
  relativePath: string,
  opts: {
    rootHandle?: FileSystemDirectoryHandle | null;
    rootLocalPath?: string | null;
    localServerUrl?: string;
  }
): Promise<string | null> {
  if (opts.rootHandle) {
    return readFileAtPath(opts.rootHandle, relativePath);
  }
  if (opts.rootLocalPath) {
    try {
      const { fsReadFile } = await import("@/lib/fs-api");
      return await fsReadFile(opts.localServerUrl || "http://localhost:31337", opts.rootLocalPath, relativePath);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Collect all file entries from tree (top-level + loaded directory children).
 */
export function getFlatFileList(
  nodes: FileTreeNode[],
  childCache: Record<string, FileTreeNode[]>
): FlatFileEntry[] {
  const out: FlatFileEntry[] = [];
  function walk(ns: FileTreeNode[]) {
    for (const n of ns) {
      if (n.kind === "file") {
        out.push({
          path: n.path,
          name: n.name,
          handle: n.handle as FileSystemFileHandle | undefined,
          relPath: n.relPath,
        });
      } else if (childCache[n.path]) {
        walk(childCache[n.path]);
      }
    }
  }
  walk(nodes);
  return out.sort((a, b) => a.path.localeCompare(b.path, undefined, { sensitivity: "base" }));
}

export interface SearchMatch {
  path: string;
  name: string;
  lineNumber: number;
  line: string;
  handle?: FileSystemFileHandle;
  relPath?: string;
}

const MAX_FILES_TO_SEARCH = 200;

/**
 * Search for query in workspace files (plain text, case-insensitive).
 * Returns matches with line number and line content.
 */
export async function searchInWorkspace(
  files: FlatFileEntry[],
  query: string,
  opts?: { rootLocalPath?: string | null; localServerUrl?: string }
): Promise<SearchMatch[]> {
  const q = query.trim().toLowerCase();
  if (!q || files.length === 0) return [];

  const toSearch = files.slice(0, MAX_FILES_TO_SEARCH);
  const contents = await Promise.all(
    toSearch.map(async (f) => ({
      file: f,
      content: await readWorkspaceFile(f, {
        rootLocalPath: opts?.rootLocalPath,
        localServerUrl: opts?.localServerUrl,
      }),
    }))
  );

  const matches: SearchMatch[] = [];
  for (const { file, content } of contents) {
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(q)) {
        matches.push({
          path: file.path,
          name: file.name,
          lineNumber: i + 1,
          line: lines[i].trim(),
          handle: file.handle,
          relPath: file.relPath,
        });
      }
    }
  }
  return matches;
}

/**
 * Escape special regex characters in a string for use in RegExp.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replace all occurrences of query in content (case-insensitive).
 * Query is treated as literal text (regex-escaped).
 */
export function replaceAllInContent(
  content: string,
  query: string,
  replaceWith: string
): string {
  if (!query.trim()) return content;
  const re = new RegExp(escapeRegex(query), "gi");
  return content.replace(re, replaceWith);
}

/**
 * Replace all occurrences of query with replaceWith in the given file.
 * Returns the new content (caller can write and/or update open editor).
 */
export async function replaceInFile(
  handle: FileSystemFileHandle,
  query: string,
  replaceWith: string
): Promise<string> {
  const content = await readFileContent(handle);
  const newContent = replaceAllInContent(content, query, replaceWith);
  await writeFileContent(handle, newContent);
  return newContent;
}

/** Replace in a search match (browser handle or desktop relPath). */
export async function replaceInWorkspaceMatch(
  match: SearchMatch,
  query: string,
  replaceWith: string,
  opts?: { rootLocalPath?: string | null; localServerUrl?: string }
): Promise<string> {
  if (match.handle) return replaceInFile(match.handle, query, replaceWith);
  if (match.relPath && opts?.rootLocalPath) {
    const content = await readWorkspaceFile(
      { path: match.path, name: match.name, relPath: match.relPath },
      opts
    );
    const newContent = replaceAllInContent(content, query, replaceWith);
    await writeWorkspaceFileAtPath(match.relPath, newContent, {
      rootLocalPath: opts.rootLocalPath,
      localServerUrl: opts.localServerUrl,
    });
    return newContent;
  }
  throw new Error(`Cannot replace in file: ${match.path}`);
}
