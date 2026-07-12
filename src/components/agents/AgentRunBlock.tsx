import { Check, X, Terminal, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentCommand } from "@/lib/agent-runs";

interface AgentRunBlockProps {
  command: AgentCommand;
  onAccept: (commandId: string) => void;
  onReject: (commandId: string) => void;
}

export default function AgentRunBlock({ command, onAccept, onReject }: AgentRunBlockProps) {
  const status = command.status;
  const output =
    [command.stdout, command.stderr].filter((s) => s?.trim()).join("\n") ||
    command.error ||
    "";

  return (
    <div
      className={cn(
        "my-3 overflow-hidden rounded-lg border text-xs",
        status === "accepted" && "border-green-600/50 bg-green-950/20",
        status === "failed" && "border-red-600/40 bg-red-950/20",
        status === "rejected" && "border-cursor-border/50 opacity-60",
        (status === "pending" || status === "running") && "border-cursor-border"
      )}
      style={status === "pending" || status === "running" ? { borderColor: "#383838" } : undefined}
    >
      <div className="flex items-center justify-between gap-2 border-b border-cursor-border/50 bg-cursor-sidebar px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Terminal className="h-3.5 w-3.5 shrink-0 text-cursor-accent" />
          <span className="truncate font-mono font-medium text-cursor-text">{command.command}</span>
          {status === "running" && (
            <span className="ml-1 flex items-center gap-1 text-cursor-text-muted">
              <Loader2 className="h-3 w-3 animate-spin" />
              Running…
            </span>
          )}
          {status === "accepted" && (
            <span className="ml-1 text-green-500">
              Exit {command.exitCode ?? 0}
            </span>
          )}
          {status === "failed" && (
            <span className="ml-1 text-red-400">
              {command.timedOut ? "Timed out" : `Exit ${command.exitCode ?? 1}`}
            </span>
          )}
          {status === "rejected" && (
            <span className="ml-1 text-cursor-text-muted">Rejected</span>
          )}
        </div>
        {status === "pending" && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="flex items-center gap-1 rounded-full bg-cursor-hover/80 px-2.5 py-1 text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
              onClick={() => onReject(command.id)}
            >
              <X className="h-3 w-3" />
              Reject
            </button>
            <button
              type="button"
              className="flex items-center gap-1 rounded-full bg-cursor-accent px-2.5 py-1 font-medium text-black hover:opacity-90"
              onClick={() => onAccept(command.id)}
            >
              <Check className="h-3 w-3" />
              Run
            </button>
          </div>
        )}
      </div>
      {(status === "accepted" || status === "failed") && output ? (
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap bg-cursor-editor p-2 font-mono text-cursor-text-muted">
          {output.slice(0, 12000)}
        </pre>
      ) : status === "pending" ? (
        <div className="bg-cursor-editor px-3 py-2 text-cursor-text-muted">
          Approve to run this command in the workspace shell.
        </div>
      ) : null}
    </div>
  );
}
