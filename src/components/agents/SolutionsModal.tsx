import { useRef } from "react";
import { LayoutGrid, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface SolutionsModalProps {
  open: boolean;
  onClose: () => void;
}

const PLACEHOLDER_SOLUTIONS = [
  { id: "1", name: "Web app shell", description: "React + TypeScript + Vite starter" },
  { id: "2", name: "API backend", description: "REST API template with auth" },
  { id: "3", name: "CLI tool", description: "Node.js CLI with prompts" },
];

export default function SolutionsModal({ open, onClose }: SolutionsModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="solutions-modal-title"
    >
      <div
        ref={panelRef}
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-lg border border-cursor-border bg-cursor-sidebar shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-cursor-border px-4 py-3">
          <h2 id="solutions-modal-title" className="flex items-center gap-2 text-sm font-semibold text-cursor-text">
            <LayoutGrid className="h-4 w-4" />
            Browse Solutions
          </h2>
          <button
            type="button"
            className="rounded p-1 text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="shrink-0 px-4 py-2 text-xs text-cursor-text-muted">
          Solutions for developers to kickstart projects. More coming soon.
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-2">
          {PLACEHOLDER_SOLUTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={cn(
                "w-full rounded border border-cursor-border bg-cursor-editor px-3 py-2.5 text-left",
                "hover:border-cursor-accent hover:bg-cursor-hover"
              )}
            >
              <p className="text-xs font-medium text-cursor-text">{s.name}</p>
              <p className="mt-0.5 text-[11px] text-cursor-text-muted">{s.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
