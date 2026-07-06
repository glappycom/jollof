import { open } from "@tauri-apps/plugin-dialog";
import { fsEntriesToTreeNodes, fsListDirectory } from "@/lib/fs-api";
import { setWorkspaceLocalPath } from "@/lib/workspace-local-path";
import type { FileTreeNode } from "@/lib/workspace";

export interface DesktopFolderResult {
  rootName: string;
  rootLocalPath: string;
  rootHandle: null;
  children: FileTreeNode[];
}

function basename(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts[parts.length - 1] || "workspace";
}

/**
 * Open a folder via native dialog (Tauri). Uses the local server for file tree I/O.
 */
export async function openDesktopFolder(
  localServerUrl: string
): Promise<DesktopFolderResult | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Open Folder",
  });
  if (!selected || Array.isArray(selected)) return null;

  const rootLocalPath = selected;
  const rootName = basename(rootLocalPath);
  setWorkspaceLocalPath(rootName, rootLocalPath);

  const entries = await fsListDirectory(localServerUrl, rootLocalPath, rootName);
  const children = fsEntriesToTreeNodes(entries);

  return {
    rootName,
    rootLocalPath,
    rootHandle: null,
    children,
  };
}

export async function loadDesktopDirectoryChildren(
  localServerUrl: string,
  rootLocalPath: string,
  rootName: string,
  node: FileTreeNode
): Promise<FileTreeNode[]> {
  if (node.kind !== "directory" || !node.relPath) return [];
  const entries = await fsListDirectory(localServerUrl, rootLocalPath, rootName, node.relPath);
  return fsEntriesToTreeNodes(entries);
}

export function treePathToRelPath(treePath: string, rootName: string): string {
  const prefix = `${rootName}/`;
  if (treePath.startsWith(prefix)) return treePath.slice(prefix.length);
  if (treePath === rootName) return "";
  return treePath;
}
