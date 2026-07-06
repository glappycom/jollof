import {
  readWorkspaceFile,
  readWorkspaceFileAtPath,
  type FlatFileEntry,
} from "@/lib/workspace";
import { parseContextMentions } from "@/lib/agent-context";
import type { AgentFileEdit } from "@/lib/agent-edits";
import type { OpenFile } from "@/components/editor/EditorTabs";

export function toRelativePath(fullPath: string, rootName: string): string {
  if (fullPath.startsWith(`${rootName}/`)) return fullPath.slice(rootName.length + 1);
  return fullPath;
}

/** Map agent-provided path to workspace full path (rootName/...). */
export function normalizeAgentPath(
  agentPath: string,
  rootName: string,
  flatFileList: FlatFileEntry[]
): { fullPath: string; relativePath: string } {
  const cleaned = agentPath.replace(/^\.\//, "").replace(/\\/g, "/").trim();
  const byExact = flatFileList.find((f) => f.path === cleaned);
  if (byExact) {
    return { fullPath: byExact.path, relativePath: toRelativePath(byExact.path, rootName) };
  }
  const bySuffix = flatFileList.find(
    (f) => f.path.endsWith(`/${cleaned}`) || f.path.split("/").pop() === cleaned
  );
  if (bySuffix) {
    return { fullPath: bySuffix.path, relativePath: toRelativePath(bySuffix.path, rootName) };
  }
  const fullPath =
    cleaned.startsWith(`${rootName}/`) || !rootName ? cleaned : `${rootName}/${cleaned}`;
  return { fullPath, relativePath: toRelativePath(fullPath, rootName) };
}

/** Load workspace files referenced by @ mentions (not already open). */
export async function loadMentionedWorkspaceFiles(
  message: string,
  rootName: string,
  flatFileList: FlatFileEntry[],
  openPaths: Set<string>,
  opts?: { rootLocalPath?: string | null; localServerUrl?: string }
): Promise<{ path: string; content: string }[]> {
  const mentions = parseContextMentions(message);
  const out: { path: string; content: string }[] = [];
  const seen = new Set<string>();

  for (const mention of mentions) {
    if (mention.kind !== "file" || !mention.query) continue;
    const { fullPath } = normalizeAgentPath(mention.query, rootName, flatFileList);
    const entry = flatFileList.find((f) => f.path === fullPath);
    if (!entry || openPaths.has(entry.path) || seen.has(entry.path)) continue;
    seen.add(entry.path);
    try {
      out.push({
        path: entry.path,
        content: await readWorkspaceFile(entry, {
          rootLocalPath: opts?.rootLocalPath,
          localServerUrl: opts?.localServerUrl,
        }),
      });
    } catch {
      // skip unreadable
    }
  }
  return out;
}

/** Load original file content for each parsed edit. */
export async function hydrateAgentEdits(
  edits: Omit<AgentFileEdit, "status">[],
  opts: {
    rootName: string;
    rootHandle: FileSystemDirectoryHandle | null;
    rootLocalPath?: string | null;
    localServerUrl?: string;
    flatFileList: FlatFileEntry[];
    openFiles: OpenFile[];
  }
): Promise<AgentFileEdit[]> {
  const { rootName, rootHandle, rootLocalPath, localServerUrl, flatFileList, openFiles } = opts;
  const out: AgentFileEdit[] = [];
  const fsOpts = { rootHandle, rootLocalPath, localServerUrl };

  for (const edit of edits) {
    const { fullPath, relativePath } = normalizeAgentPath(edit.path, rootName, flatFileList);
    let originalContent = openFiles.find((f) => f.path === fullPath)?.content;

    if (originalContent === undefined) {
      const entry = flatFileList.find((f) => f.path === fullPath);
      if (entry) {
        try {
          originalContent = await readWorkspaceFile(entry, {
            rootLocalPath,
            localServerUrl,
          });
        } catch {
          originalContent = "";
        }
      } else if (relativePath) {
        originalContent = (await readWorkspaceFileAtPath(relativePath, fsOpts)) ?? "";
      } else {
        originalContent = "";
      }
    }

    out.push({
      ...edit,
      path: fullPath,
      originalContent,
      status: "pending",
    });
  }

  return out;
}
