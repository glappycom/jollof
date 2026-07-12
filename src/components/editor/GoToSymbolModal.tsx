import { useState, useEffect, useRef, useMemo } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { SymbolEntry, SymbolKind } from "@/lib/symbols";

interface GoToSymbolModalProps {
  open: boolean;
  symbols: SymbolEntry[];
  onClose: () => void;
  onSelect: (symbol: SymbolEntry) => void;
}

const kindLabel: Record<SymbolKind, string> = {
  function: "function",
  class: "class",
  variable: "var",
  interface: "interface",
  type: "type",
};

export default function GoToSymbolModal({
  open,
  symbols,
  onClose,
  onSelect,
}: GoToSymbolModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, onClose);

  const filtered = useMemo(() => {
    if (!query.trim()) return symbols;
    const q = query.trim().toLowerCase();
    return symbols.filter((s) => s.name.toLowerCase().includes(q));
  }, [symbols, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleSelect = (symbol: SymbolEntry) => {
    onSelect(symbol);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % filtered.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (filtered.length + i - 1) % filtered.length);
      return;
    }
    if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      handleSelect(filtered[selectedIndex]!);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Go to Symbol"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="w-full max-w-lg rounded-lg border border-cursor-border bg-cursor-sidebar shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-cursor-border px-2 py-1.5">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type to filter symbols..."
            className="w-full rounded-sm border-0 bg-cursor-editor px-2 py-1.5 text-[11px] text-cursor-text placeholder:text-cursor-text-muted focus:outline-none focus:ring-1 focus:ring-cursor-border"
            aria-label="Filter symbols"
          />
        </div>
        <div
          ref={listRef}
          className="max-h-[280px] overflow-y-auto py-1"
          role="listbox"
          aria-label="Symbols"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-cursor-text-muted">
              {symbols.length === 0 ? "No symbols in this file." : "No matching symbols."}
            </div>
          ) : (
            filtered.map((sym, i) => (
              <button
                key={`${sym.name}-${sym.line}`}
                type="button"
                role="option"
                aria-selected={i === selectedIndex}
                className={`
                  flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[11px] transition-colors duration-fast
                  ${i === selectedIndex ? "bg-cursor-hover text-cursor-text" : "text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"}
                `}
                onClick={() => handleSelect(sym)}
              >
                <span className="truncate">{sym.name}</span>
                <span className="shrink-0 text-cursor-text-muted">
                  {kindLabel[sym.kind]} · L{sym.line}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
