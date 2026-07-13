/**
 * Persist recent folders:
 * - File System Access handles in IndexedDB (Chromium secure context)
 * - Absolute paths in localStorage (cloud / desktop / HTTP)
 */

const DB_NAME = "jollof-recent-folders";
const STORE = "folders";
const KEY = "list";
const PATH_KEY = "jollof-recent-folder-paths";
const MAX_RECENT = 10;

export interface RecentFolderEntry {
  name: string;
  /** Browser File System Access handle (optional). */
  handle?: FileSystemDirectoryHandle;
  /** Absolute disk path for server FS API (optional). */
  localPath?: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
  });
}

async function getHandleRecents(): Promise<RecentFolderEntry[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => {
        const list = (req.result || []) as RecentFolderEntry[];
        resolve(
          Array.isArray(list)
            ? list.filter((e) => e?.name && e.handle).map((e) => ({ name: e.name, handle: e.handle }))
            : []
        );
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return [];
  }
}

function getPathRecents(): RecentFolderEntry[] {
  try {
    const raw = localStorage.getItem(PATH_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as { name: string; localPath: string }[];
    if (!Array.isArray(list)) return [];
    return list
      .filter((e) => e?.name && e?.localPath)
      .map((e) => ({ name: e.name, localPath: e.localPath }));
  } catch {
    return [];
  }
}

function savePathRecents(list: RecentFolderEntry[]): void {
  const payload = list
    .filter((e) => e.localPath)
    .map((e) => ({ name: e.name, localPath: e.localPath! }))
    .slice(0, MAX_RECENT);
  localStorage.setItem(PATH_KEY, JSON.stringify(payload));
}

/** Merged recent list: path entries first (most recent), then handle entries not already listed. */
export async function getRecentFolders(): Promise<RecentFolderEntry[]> {
  const [handles, paths] = await Promise.all([getHandleRecents(), Promise.resolve(getPathRecents())]);
  const seen = new Set<string>();
  const out: RecentFolderEntry[] = [];
  for (const e of [...paths, ...handles]) {
    const key = e.localPath || e.name;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
    if (out.length >= MAX_RECENT) break;
  }
  return out;
}

export async function addRecentFolder(name: string, handle: FileSystemDirectoryHandle): Promise<void> {
  const list = await getHandleRecents();
  const rest = list.filter((e) => e.name !== name);
  const updated: RecentFolderEntry[] = [{ name, handle }, ...rest].slice(0, MAX_RECENT);
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(updated, KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function addRecentPathFolder(name: string, localPath: string): Promise<void> {
  const path = localPath.trim();
  if (!name || !path) return;
  const list = getPathRecents().filter((e) => e.localPath !== path && e.name !== name);
  savePathRecents([{ name, localPath: path }, ...list]);
}

export async function removeRecentFolder(name: string): Promise<void> {
  const handles = (await getHandleRecents()).filter((e) => e.name !== name);
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(handles, KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
  savePathRecents(getPathRecents().filter((e) => e.name !== name));
}
