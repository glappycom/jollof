import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Loader2, Replace } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { SearchMatch } from "@/lib/workspace";
import { searchInWorkspace, replaceInWorkspaceMatch } from "@/lib/workspace";
import type { FlatFileEntry } from "@/lib/workspace";

interface SearchPanelProps {
  open: boolean;
  onClose: () => void;
  files: FlatFileEntry[];
  onSelectMatch: (match: SearchMatch) => void;
  /** When true, show replace row and Replace / Replace All buttons */
  replaceMode?: boolean;
  /** Called when a file was modified by replace (path + new content) so open editors can sync */
  onFileContentReplaced?: (path: string, newContent: string) => void;
  rootLocalPath?: string | null;
  localServerUrl?: string;
}

export default function SearchPanel({
  open,
  onClose,
  files,
  onSelectMatch,
  replaceMode = false,
  onFileContentReplaced,
  rootLocalPath = null,
  localServerUrl,
}: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [replaceWith, setReplaceWith] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, onClose);

  useEffect(() => {
    if (open) {
      setQuery("");
      setReplaceWith("");
      setMatches([]);
      setSelectedIndex(0);
      inputRef.current?.focus();
    }
  }, [open, replaceMode]);

  useEffect(() => {
    if (!open || selectedIndex >= matches.length) return;
    setSelectedIndex((i) => (i >= matches.length ? Math.max(0, matches.length - 1) : i));
  }, [matches.length, open, selectedIndex]);

  const fsOpts = { rootLocalPath, localServerUrl };

  const handleSearch = useCallback(async () => {
    if (!query.trim() || files.length === 0) return;
    setSearching(true);
    try {
      const result = await searchInWorkspace(files, query, fsOpts);
      setMatches(result);
      setSelectedIndex(0);
    } finally {
      setSearching(false);
    }
  }, [query, files, rootLocalPath, localServerUrl]);

  /** Replace all occurrences in the file of the currently selected match */
  const handleReplace = useCallback(async () => {
    if (!query.trim() || matches.length === 0 || replacing) return;
    const m = matches[selectedIndex];
    if (!m) return;
    setReplacing(true);
    try {
      const newContent = await replaceInWorkspaceMatch(m, query, replaceWith, fsOpts);
      onFileContentReplaced?.(m.path, newContent);
      const result = await searchInWorkspace(files, query, fsOpts);
      setMatches(result);
      setSelectedIndex(Math.min(selectedIndex, Math.max(0, result.length - 1)));
    } finally {
      setReplacing(false);
    }
  }, [query, replaceWith, matches, selectedIndex, files, replacing, onFileContentReplaced]);

  /** Replace all occurrences in every file that has a match */
  const handleReplaceAll = useCallback(async () => {
    if (!query.trim() || matches.length === 0 || replacing) return;
    const seen = new Set<string>();
    const toReplace: SearchMatch[] = [];
    for (const m of matches) {
      if (!seen.has(m.path)) {
        seen.add(m.path);
        toReplace.push(m);
      }
    }
    setReplacing(true);
    try {
      for (const m of toReplace) {
        const newContent = await replaceInWorkspaceMatch(m, query, replaceWith, fsOpts);
        onFileContentReplaced?.(m.path, newContent);
      }
      const result = await searchInWorkspace(files, query);
      setMatches(result);
      setSelectedIndex(0);
    } finally {
      setReplacing(false);
    }
  }, [query, replaceWith, matches, files, replacing, onFileContentReplaced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % Math.max(1, matches.length));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + matches.length) % Math.max(1, matches.length));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (matches.length > 0 && matches[selectedIndex]) {
          onSelectMatch(matches[selectedIndex]);
          onClose();
        } else {
          handleSearch();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, matches, selectedIndex, onClose, onSelectMatch, handleSearch]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={replaceMode ? "Replace in files" : "Search in files"}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="flex w-full max-w-2xl flex-col rounded-lg border border-cursor-border bg-cursor-sidebar shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-cursor-border px-3">
          {replaceMode ? (
            <Replace className="h-4 w-4 shrink-0 text-cursor-text-muted" />
          ) : (
            <Search className="h-4 w-4 shrink-0 text-cursor-text-muted" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in workspace..."
            className="flex-1 bg-transparent py-3 text-sm text-cursor-text placeholder:text-cursor-text-muted focus:outline-none"
            aria-label="Search query"
          />
          <button
            type="button"
            className="rounded bg-cursor-accent px-3 py-1.5 text-xs text-black hover:opacity-90 disabled:opacity-50"
            onClick={handleSearch}
            disabled={searching || !query.trim() || files.length === 0}
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </button>
        </div>
        {replaceMode && (
          <div className="flex items-center gap-2 border-b border-cursor-border px-3 pl-9">
            <input
              ref={replaceInputRef}
              type="text"
              value={replaceWith}
              onChange={(e) => setReplaceWith(e.target.value)}
              placeholder="Replace with..."
              className="flex-1 bg-transparent py-2 text-sm text-cursor-text placeholder:text-cursor-text-muted focus:outline-none"
              aria-label="Replace with"
            />
            <button
              type="button"
              className="rounded border border-cursor-border bg-transparent px-3 py-1.5 text-xs text-cursor-text hover:bg-cursor-hover disabled:opacity-50"
              onClick={handleReplace}
              disabled={replacing || !query.trim() || matches.length === 0}
            >
              {replacing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Replace"}
            </button>
            <button
              type="button"
              className="rounded bg-cursor-accent px-3 py-1.5 text-xs text-black hover:opacity-90 disabled:opacity-50"
              onClick={handleReplaceAll}
              disabled={replacing || !query.trim() || matches.length === 0}
            >
              Replace All
            </button>
          </div>
        )}
        <div className="max-h-[50vh] overflow-y-auto">
          {searching ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-cursor-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching...
            </div>
          ) : matches.length === 0 ? (
            <div className="py-6 text-center text-sm text-cursor-text-muted">
              {query.trim()
                ? "No results. Try a different query."
                : "Enter a search term and press Enter or click Search."}
              {files.length === 0 && " Open a folder and expand directories first."}
            </div>
          ) : (
            <ul className="py-1">
              {matches.map((m, i) => (
                <li key={`${m.path}-${m.lineNumber}-${i}`}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left hover:bg-cursor-hover",
                      selectedIndex === i && "bg-cursor-selected text-black"
                    )}
                    onClick={() => {
                      onSelectMatch(m);
                      onClose();
                    }}
                  >
                    <span className="text-xs text-cursor-text">
                      {m.path}:{m.lineNumber}
                    </span>
                    <span className="truncate text-xs text-cursor-text-muted">{m.line}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
