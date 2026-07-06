import { useState, useEffect, useRef } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface GoToLineModalProps {
  open: boolean;
  onClose: () => void;
  onGo: (line: number, column?: number) => void;
}

export default function GoToLineModal({ open, onClose, onGo }: GoToLineModalProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, onClose);

  useEffect(() => {
    if (open) {
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      onClose();
      return;
    }
    const parts = trimmed.split(/[:,]/);
    const line = parseInt(parts[0], 10);
    const column = parts[1] !== undefined ? parseInt(parts[1], 10) : undefined;
    if (line >= 1 && !Number.isNaN(line)) {
      onGo(line, column && column >= 1 ? column : undefined);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Go to Line"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="w-full max-w-sm rounded-lg border border-cursor-border bg-cursor-sidebar p-4 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <label className="mb-2 block text-xs text-cursor-text-muted">
            Go to line (optional: column), e.g. 42 or 42:10
          </label>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Line:Column"
            className="mb-3 w-full rounded border border-cursor-border bg-cursor-editor px-3 py-2 text-sm text-cursor-text placeholder:text-cursor-text-muted focus:border-cursor-accent focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md px-3 py-1.5 text-xs text-cursor-text-muted transition-colors duration-fast hover:bg-cursor-border hover:text-white"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-cursor-accent px-3 py-1.5 text-xs font-medium text-black transition-opacity duration-fast hover:opacity-90"
            >
              Go
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
