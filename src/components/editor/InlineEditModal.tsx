import { useRef, useState } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { cn } from "@/lib/utils";

export interface InlineEditContext {
  filePath: string;
  fileName: string;
  selectedText: string;
  from: number;
  to: number;
  line: number;
}

interface InlineEditModalProps {
  open: boolean;
  context: InlineEditContext | null;
  loading?: boolean;
  preview?: string | null;
  error?: string | null;
  onClose: () => void;
  onSubmit: (instruction: string) => void;
  onAccept: () => void;
  onReject: () => void;
}

export default function InlineEditModal({
  open,
  context,
  loading = false,
  preview,
  error,
  onClose,
  onSubmit,
  onAccept,
  onReject,
}: InlineEditModalProps) {
  const [instruction, setInstruction] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, onClose);

  if (!open || !context) return null;

  const handleSubmit = () => {
    const q = instruction.trim();
    if (!q || loading) return;
    onSubmit(q);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Inline edit"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="w-full max-w-xl rounded-xl border bg-cursor-sidebar p-4 shadow-modal"
        style={{ borderColor: "#383838" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-cursor-text">
            Edit selection <span className="text-cursor-text-muted">· Ctrl+K I</span>
          </h2>
          <button
            type="button"
            className="text-xs text-cursor-text-muted hover:text-cursor-text"
            onClick={onClose}
          >
            Esc
          </button>
        </div>
        <p className="mb-2 truncate text-[11px] text-cursor-text-muted">
          {context.fileName} · line {context.line}
        </p>
        {context.selectedText && (
          <pre className="mb-3 max-h-24 overflow-auto rounded border border-cursor-border/50 bg-cursor-editor p-2 font-mono text-[11px] text-cursor-text-muted">
            {context.selectedText.slice(0, 800)}
            {context.selectedText.length > 800 ? "…" : ""}
          </pre>
        )}
        {!preview ? (
          <>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Describe the change…"
              rows={2}
              autoFocus
              className="mb-3 w-full resize-none rounded border border-cursor-border bg-cursor-editor px-3 py-2 text-sm text-cursor-text placeholder:text-cursor-text-muted focus:outline-none focus:ring-1 focus:ring-cursor-accent"
            />
            {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded px-3 py-1.5 text-xs text-cursor-text-muted hover:bg-cursor-hover"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className={cn(
                  "rounded bg-cursor-accent px-3 py-1.5 text-xs font-medium text-black hover:opacity-90",
                  loading && "opacity-60"
                )}
                onClick={handleSubmit}
                disabled={loading || !instruction.trim()}
              >
                {loading ? "Generating…" : "Generate"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-1 text-[11px] font-medium text-cursor-text">Preview</p>
            <pre className="mb-3 max-h-48 overflow-auto rounded border border-cursor-border/50 bg-cursor-editor p-2 font-mono text-[11px] text-cursor-text whitespace-pre-wrap">
              {preview}
            </pre>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded px-3 py-1.5 text-xs text-cursor-text-muted hover:bg-cursor-hover"
                onClick={onReject}
              >
                Reject
              </button>
              <button
                type="button"
                className="rounded bg-cursor-accent px-3 py-1.5 text-xs font-medium text-black hover:opacity-90"
                onClick={onAccept}
              >
                Accept
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
