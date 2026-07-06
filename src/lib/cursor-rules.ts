/**
 * Load project rules (.cursorrules, AGENTS.md) for agent system prompts.
 */

import { readWorkspaceFile, readWorkspaceFileAtPath, type FlatFileEntry } from "@/lib/workspace";

const RULE_FILES = [".cursorrules", "AGENTS.md", "jollof.rules", ".cursor/rules"];

export async function loadProjectRules(
  rootHandle: FileSystemDirectoryHandle | null,
  rootName: string,
  flatFiles: FlatFileEntry[],
  opts?: { rootLocalPath?: string | null; localServerUrl?: string }
): Promise<string> {
  if (!rootHandle && !opts?.rootLocalPath && flatFiles.length === 0) return "";

  const parts: string[] = [];
  const fsOpts = {
    rootHandle,
    rootLocalPath: opts?.rootLocalPath,
    localServerUrl: opts?.localServerUrl,
  };

  for (const name of RULE_FILES) {
    const fullPath = rootName ? `${rootName}/${name}` : name;
    const entry = flatFiles.find((f) => f.path === fullPath || f.path.endsWith(`/${name}`) || f.name === name);
    try {
      let content: string | null = null;
      if (entry) {
        content = await readWorkspaceFile(entry, {
          rootLocalPath: opts?.rootLocalPath,
          localServerUrl: opts?.localServerUrl,
        });
      } else {
        const rel = rootName && fullPath.startsWith(`${rootName}/`)
          ? fullPath.slice(rootName.length + 1)
          : name;
        content = await readWorkspaceFileAtPath(rel, fsOpts);
      }
      if (content?.trim()) {
        parts.push(`### ${name}\n${content.trim()}`);
      }
    } catch {
      // not found
    }
  }

  if (parts.length === 0) return "";
  return `\n\n## Project rules\n${parts.join("\n\n")}`;
}
