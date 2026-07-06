import { useCallback, useEffect, useState } from "react";
import {
  GitBranch,
  RefreshCw,
  Plus,
  Minus,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import {
  fetchGitStatus,
  fetchGitDiff,
  stageGitFiles,
  unstageGitFiles,
  commitGit,
  gitPathToWorkspacePath,
  type GitFileStatus,
} from "@/lib/git-api";
import { checkLocalServer, resolveWorkspaceCwd } from "@/lib/local-server";
import {
  getWorkspaceLocalPath,
  setWorkspaceLocalPath,
  resolveWorkspaceLocalPath,
} from "@/lib/workspace-local-path";

interface SourceControlPanelProps {
  workspaceRootName: string | null;
  workspaceRootHandle?: FileSystemDirectoryHandle | null;
  localServerUrl: string;
  onOpenFile?: (workspacePath: string) => void;
}

export default function SourceControlPanel({
  workspaceRootName,
  workspaceRootHandle = null,
  localServerUrl,
  onOpenFile,
}: SourceControlPanelProps) {
  const [localPath, setLocalPath] = useState("");
  const [pathInput, setPathInput] = useState("");
  const [branch, setBranch] = useState("");
  const [files, setFiles] = useState<GitFileStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [expandedPath, setExpandedPath] = useState<string | null>(null);
  const [expandedDiff, setExpandedDiff] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    if (!workspaceRootName) {
      setLocalPath("");
      return;
    }
    const stored = getWorkspaceLocalPath(workspaceRootName);
    setLocalPath(stored || "");
    setPathInput(stored || "");
  }, [workspaceRootName]);

  const effectiveCwd = resolveWorkspaceCwd(localPath);

  const refresh = useCallback(async () => {
    if (!effectiveCwd) return;
    setLoading(true);
    setError(null);
    try {
      const health = await checkLocalServer(localServerUrl, workspaceRootName ?? undefined, effectiveCwd);
      setServerOnline(health?.ok ?? false);
      const status = await fetchGitStatus(localServerUrl, effectiveCwd);
      setBranch(status.branch);
      setFiles(status.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Git status");
      setServerOnline(false);
    } finally {
      setLoading(false);
    }
  }, [effectiveCwd, localServerUrl, workspaceRootName]);

  useEffect(() => {
    if (effectiveCwd) void refresh();
  }, [effectiveCwd, refresh]);

  useEffect(() => {
    if (!workspaceRootName) return;
    void (async () => {
      const health = await checkLocalServer(localServerUrl, workspaceRootName ?? undefined);
      setServerOnline(health?.ok ?? false);
      if (getWorkspaceLocalPath(workspaceRootName)) return;
      const resolved = await resolveWorkspaceLocalPath(
        workspaceRootName,
        workspaceRootHandle,
        localServerUrl
      );
      if (resolved) {
        setLocalPath(resolved);
        setPathInput(resolved);
        return;
      }
      if (health?.matchesFolder && health.cwd) {
        setWorkspaceLocalPath(workspaceRootName, health.cwd);
        setLocalPath(health.cwd);
        setPathInput(health.cwd);
      }
    })();
  }, [localServerUrl, workspaceRootName]);

  const saveLocalPath = () => {
    if (!workspaceRootName || !pathInput.trim()) return;
    setWorkspaceLocalPath(workspaceRootName, pathInput.trim());
    setLocalPath(pathInput.trim());
    void refresh();
  };

  const toggleDiff = async (file: GitFileStatus) => {
    if (expandedPath === file.path) {
      setExpandedPath(null);
      setExpandedDiff("");
      return;
    }
    if (!effectiveCwd) return;
    try {
      const diff = await fetchGitDiff(localServerUrl, effectiveCwd, file.path, file.staged);
      setExpandedPath(file.path);
      setExpandedDiff(diff || "(no diff)");
    } catch (err) {
      setExpandedDiff(err instanceof Error ? err.message : "Could not load diff");
      setExpandedPath(file.path);
    }
  };

  const handleStage = async (paths: string[]) => {
    if (!effectiveCwd) return;
    await stageGitFiles(localServerUrl, effectiveCwd, paths);
    await refresh();
  };

  const handleUnstage = async (paths: string[]) => {
    if (!effectiveCwd) return;
    await unstageGitFiles(localServerUrl, effectiveCwd, paths);
    await refresh();
  };

  const handleCommit = async () => {
    if (!effectiveCwd || !commitMessage.trim()) return;
    setCommitting(true);
    try {
      await commitGit(localServerUrl, effectiveCwd, commitMessage.trim());
      setCommitMessage("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Commit failed");
    } finally {
      setCommitting(false);
    }
  };

  if (!workspaceRootName) {
    return (
      <EmptyState
        icon={<GitBranch className="h-8 w-8" />}
        message="Open a folder to use Source Control."
        className="flex-1"
      />
    );
  }

  if (!localPath) {
    return (
      <div className="flex flex-col gap-3 p-3 text-xs">
        <p className="text-cursor-text-muted">
          Git runs on your machine via the local Jollof server. Enter the folder path on disk that matches{" "}
          <span className="text-cursor-text">{workspaceRootName}</span>.
        </p>
        {serverOnline === false && (
          <p className="rounded border border-red-900/50 bg-red-950/30 px-2 py-1.5 text-red-300">
            Local server offline. Run <code className="rounded bg-cursor-hover px-1">npm run dev</code> or{" "}
            <code className="rounded bg-cursor-hover px-1">npm run terminal:server</code>.
          </p>
        )}
        <label className="block text-cursor-text-muted">Local path</label>
        <input
          type="text"
          value={pathInput}
          onChange={(e) => setPathInput(e.target.value)}
          placeholder="e.g. C:\Projects\my-app or /home/user/my-app"
          className="w-full rounded border border-cursor-border bg-cursor-editor px-2 py-1.5 text-cursor-text placeholder:text-cursor-text-muted"
        />
        <button
          type="button"
          className="rounded bg-cursor-accent px-3 py-1.5 font-medium text-black hover:opacity-90"
          onClick={saveLocalPath}
          disabled={!pathInput.trim()}
        >
          Save path
        </button>
      </div>
    );
  }

  const stagedCount = files.filter((f) => f.staged).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col text-xs">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-cursor-border px-2 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5 text-cursor-text">
          <GitBranch className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{branch || "—"}</span>
        </div>
        <button
          type="button"
          className="rounded p-1 text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
          onClick={() => void refresh()}
          disabled={loading}
          aria-label="Refresh"
          title="Refresh"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        </button>
      </div>

      <div className="shrink-0 border-b border-cursor-border px-2 py-1.5">
        <p className="truncate text-[10px] text-cursor-text-muted" title={localPath}>
          {localPath}
        </p>
        <button
          type="button"
          className="mt-1 text-[10px] text-cursor-accent hover:underline"
          onClick={() => {
            setLocalPath("");
            setPathInput(localPath);
          }}
        >
          Change path
        </button>
      </div>

      {error && (
        <p className="shrink-0 border-b border-red-900/40 bg-red-950/20 px-2 py-1.5 text-red-300">{error}</p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {files.length === 0 && !loading ? (
          <p className="px-3 py-4 text-center text-cursor-text-muted">No changes</p>
        ) : (
          <ul className="py-1">
            {files.map((file) => (
              <li key={file.path} className="border-b border-cursor-border/30 last:border-0">
                <div className="flex items-center gap-1 px-1 py-0.5 hover:bg-cursor-hover/50">
                  <button
                    type="button"
                    className="shrink-0 rounded p-0.5 text-cursor-text-muted hover:text-cursor-text"
                    onClick={() => void toggleDiff(file)}
                    aria-label="Toggle diff"
                  >
                    {expandedPath === file.path ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left text-cursor-text hover:underline"
                    onClick={() =>
                      onOpenFile?.(gitPathToWorkspacePath(file.path, workspaceRootName))
                    }
                    title={file.path}
                  >
                    <span
                      className={cn(
                        "mr-1.5 font-mono text-[10px]",
                        file.status === "untracked" && "text-green-500",
                        file.status === "staged" && "text-cursor-accent",
                        file.status === "modified" && "text-yellow-500"
                      )}
                    >
                      {file.staged ? "S" : file.status === "untracked" ? "U" : "M"}
                    </span>
                    {file.path}
                  </button>
                  {file.staged ? (
                    <button
                      type="button"
                      className="shrink-0 rounded p-1 text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
                      onClick={() => void handleUnstage([file.path])}
                      title="Unstage"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="shrink-0 rounded p-1 text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
                      onClick={() => void handleStage([file.path])}
                      title="Stage"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {expandedPath === file.path && (
                  <pre className="max-h-40 overflow-auto border-t border-cursor-border/40 bg-cursor-editor p-2 font-mono text-[10px] text-cursor-text-muted whitespace-pre-wrap">
                    {expandedDiff}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-cursor-border p-2">
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Commit message"
          rows={2}
          className="mb-2 w-full resize-none rounded border border-cursor-border bg-cursor-editor px-2 py-1.5 text-cursor-text placeholder:text-cursor-text-muted"
        />
        <button
          type="button"
          className="w-full rounded bg-cursor-accent py-1.5 font-medium text-black hover:opacity-90 disabled:opacity-50"
          onClick={() => void handleCommit()}
          disabled={committing || !commitMessage.trim() || stagedCount === 0}
        >
          {committing ? "Committing…" : `Commit${stagedCount ? ` (${stagedCount})` : ""}`}
        </button>
      </div>
    </div>
  );
}
