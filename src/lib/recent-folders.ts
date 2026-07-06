/**
 * Persist recent folder handles in IndexedDB (File System Access API).
 * Handles can be restored and reused with verifyPermission.
 */

const DB_NAME = "jollof-recent-folders";
const STORE = "folders";
const KEY = "list";
const MAX_RECENT = 10;

export interface RecentFolderEntry {
  name: string;
  handle: FileSystemDirectoryHandle;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
  });
}

export async function getRecentFolders(): Promise<RecentFolderEntry[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => {
      const list = (req.result || []) as RecentFolderEntry[];
      resolve(Array.isArray(list) ? list : []);
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function addRecentFolder(name: string, handle: FileSystemDirectoryHandle): Promise<void> {
  const list = await getRecentFolders();
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

export async function removeRecentFolder(name: string): Promise<void> {
  const list = await getRecentFolders();
  const updated = list.filter((e) => e.name !== name);
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
