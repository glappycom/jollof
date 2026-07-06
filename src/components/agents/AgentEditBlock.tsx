import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeLineDiff,
  type AgentFileEdit,
  type AgentEditStatus,
} from "@/lib/agent-edits";

interface AgentEditBlockProps {
  edit: AgentFileEdit;
  onAccept: (editId: string) => void;
  onReject: (editId: string) => void;
}

export default function AgentEditBlock({ edit, onAccept, onReject }: AgentEditBlockProps) {
  const isNew = edit.originalContent === "";
  const diff = computeLineDiff(edit.originalContent, edit.newContent);
  const adds = diff.filter((d) => d.type === "add").length;
  const removes = diff.filter((d) => d.type === "remove").length;
  const status = edit.status;

  return (
    <div
      className={cn(
        "my-3 overflow-hidden rounded-lg border text-xs",
        status === "accepted" && "border-green-600/50 bg-green-950/20",
        status === "rejected" && "border-cursor-border/50 opacity-60",
        status === "pending" && "border-cursor-border"
      )}
      style={status === "pending" ? { borderColor: "#383838" } : undefined}
    >
      <div className="flex items-center justify-between gap-2 border-b border-cursor-border/50 bg-cursor-sidebar px-3 py-2">
        <div className="min-w-0">
          <span className="font-medium text-cursor-text">{edit.path}</span>
          <span className="ml-2 text-cursor-text-muted">
            {isNew ? "new file" : `${adds > 0 ? `+${adds}` : ""}${adds && removes ? " " : ""}${removes > 0 ? `-${removes}` : ""}`}
          </span>
          {status === "accepted" && (
            <span className="ml-2 text-green-500">Applied</span>
          )}
          {status === "rejected" && (
            <span className="ml-2 text-cursor-text-muted">Rejected</span>
          )}
        </div>
        {status === "pending" && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="flex items-center gap-1 rounded-full bg-cursor-hover/80 px-2.5 py-1 text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
              onClick={() => onReject(edit.id)}
            >
              <X className="h-3 w-3" />
              Reject
            </button>
            <button
              type="button"
              className="flex items-center gap-1 rounded-full bg-cursor-accent px-2.5 py-1 font-medium text-black hover:opacity-90"
              onClick={() => onAccept(edit.id)}
            >
              <Check className="h-3 w-3" />
              Accept
            </button>
          </div>
        )}
      </div>
      <div className="max-h-48 overflow-auto bg-cursor-editor p-2 font-mono">
        {diff.length === 0 && isNew ? (
          <pre className="whitespace-pre-wrap text-cursor-text">{edit.newContent || "(empty)"}</pre>
        ) : (
          diff.map((line, i) => (
            <div
              key={i}
              className={cn(
                "whitespace-pre-wrap pl-1",
                line.type === "add" && "bg-green-900/30 text-green-300",
                line.type === "remove" && "bg-red-900/30 text-red-300 line-through opacity-80",
                line.type === "same" && "text-cursor-text-muted"
              )}
            >
              {line.type === "add" && "+ "}
              {line.type === "remove" && "- "}
              {line.type === "same" && "  "}
              {line.text || " "}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export type { AgentFileEdit, AgentEditStatus };
