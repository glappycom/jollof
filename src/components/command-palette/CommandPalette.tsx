import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}

export default function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [filter, setFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, onClose);

  const filtered = filter.trim()
    ? commands.filter((c) =>
        c.label.toLowerCase().includes(filter.trim().toLowerCase())
      )
    : commands;
  const selectedId = filtered[selectedIndex]?.id ?? null;

  useEffect(() => {
    if (open) {
      setFilter("");
      setSelectedIndex(0);
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex((i) => (i >= filtered.length ? Math.max(0, filtered.length - 1) : i));
  }, [filter, filtered.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === "Enter" && selectedId) {
        e.preventDefault();
        const cmd = filtered.find((c) => c.id === selectedId);
        if (cmd) {
          cmd.run();
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filtered, selectedId, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="w-full max-w-xl rounded-lg border border-cursor-border bg-cursor-sidebar shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-cursor-border px-3">
          <span className="text-cursor-text-muted mr-2">›</span>
          <input
            ref={inputRef}
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent py-3 text-sm text-cursor-text placeholder:text-cursor-text-muted focus:outline-none"
            aria-label="Filter commands"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-cursor-text-muted">No commands found.</div>
          ) : (
            filtered.map((cmd) => (
              <button
                key={cmd.id}
                type="button"
                className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-cursor-text hover:bg-cursor-hover"
                onClick={() => {
                  cmd.run();
                  onClose();
                }}
              >
                <span>{cmd.label}</span>
                {cmd.shortcut && (
                  <span className="text-xs text-cursor-text-muted">{cmd.shortcut}</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
