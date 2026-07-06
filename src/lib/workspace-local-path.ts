import { checkLocalServer } from "@/lib/local-server";
import { readFileAtPath } from "@/lib/workspace";

const KEY = "jollof-workspace-local-paths";
const PATH_HINT_FILE = ".jollof/workspace-path";

/** Map workspace root name → absolute path on disk (for Git + terminal). */
export function getWorkspaceLocalPath(rootName: string): string | null {
  if (!rootName) return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[rootName]?.trim() || null;
  } catch {
    return null;
  }
}

export function setWorkspaceLocalPath(rootName: string, localPath: string): void {
  if (!rootName) return;
  try {
    const raw = localStorage.getItem(KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    map[rootName] = localPath.trim();
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function clearWorkspaceLocalPath(rootName: string): void {
  if (!rootName) return;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const map = JSON.parse(raw) as Record<string, string>;
    delete map[rootName];
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/**
 * Resolve local disk path: localStorage → `.jollof/workspace-path` → server auto-detect.
 */
export async function resolveWorkspaceLocalPath(
  rootName: string,
  rootHandle: FileSystemDirectoryHandle | null,
  localServerUrl: string
): Promise<string | null> {
  if (!rootName) return null;

  const stored = getWorkspaceLocalPath(rootName);
  if (stored) return stored;

  if (rootHandle) {
    try {
      const hint = await readFileAtPath(rootHandle, PATH_HINT_FILE);
      const trimmed = hint?.trim();
      if (trimmed) {
        setWorkspaceLocalPath(rootName, trimmed);
        return trimmed;
      }
    } catch {
      // no hint file
    }
  }

  const health = await checkLocalServer(localServerUrl, rootName);
  if (health?.matchesFolder && health.cwd) {
    setWorkspaceLocalPath(rootName, health.cwd);
    return health.cwd;
  }

  return null;
}
