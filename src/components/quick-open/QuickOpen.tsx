import { useEffect, useRef, useState } from "react";
import { File } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FlatFileEntry } from "@/lib/workspace";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface QuickOpenProps {
  open: boolean;
  onClose: () => void;
  files: FlatFileEntry[];
  onSelectFile: (entry: FlatFileEntry) => void;
}

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  let i = 0;
  for (const c of text.toLowerCase()) {
    if (c === q[i]) i++;
    if (i === q.length) return true;
  }
  return false;
}

export default function QuickOpen({
  open,
  onClose,
  files,
  onSelectFile,
}: QuickOpenProps) {
  const [filter, setFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, onClose);

  const filtered = filter.trim()
    ? files.filter(
        (f) =>
          fuzzyMatch(filter, f.name) ||
          fuzzyMatch(filter, f.path)
      )
    : files;
  const selected = filtered[selectedIndex] ?? null;

  useEffect(() => {
    if (open) {
      setFilter("");
      setSelectedIndex(0);
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex((i) =>
      i >= filtered.length ? Math.max(0, filtered.length - 1) : i
    );
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
      if (e.key === "Enter" && selected) {
        e.preventDefault();
        onSelectFile(selected);
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filtered.length, selected, onSelectFile, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Go to file"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="w-full max-w-xl rounded-lg border border-cursor-border bg-cursor-sidebar shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-cursor-border px-3">
          <File className="h-4 w-4 shrink-0 text-cursor-text-muted mr-2" />
          <input
            ref={inputRef}
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Type to search files..."
            className="flex-1 bg-transparent py-3 text-sm text-cursor-text placeholder:text-cursor-text-muted focus:outline-none"
            aria-label="Search files"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-cursor-text-muted">
              {files.length === 0
                ? "Open a folder and expand directories to list files."
                : "No matching files."}
            </div>
          ) : (
            filtered.map((f) => (
              <button
                key={f.path}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 px-4 py-2 text-left text-sm",
                  selected?.path === f.path
                    ? "bg-cursor-selected text-black"
                    : "text-cursor-text hover:bg-cursor-hover"
                )}
                onClick={() => {
                  onSelectFile(f);
                  onClose();
                }}
              >
                <File className="h-4 w-4 shrink-0 text-cursor-text-muted" />
                <span className="truncate">{f.path}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
