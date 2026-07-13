import { cn } from "@/lib/utils";

interface StatusBarProps {
  className?: string;
  /** Git branch or "—" when none */
  branch?: string;
  /** Encoding, e.g. UTF-8 */
  encoding?: string;
  /** Language mode label */
  language?: string;
  /** Cursor position "Ln 1, Col 1" or null to hide */
  position?: { line: number; column: number } | null;
  /** @codebase index status, e.g. "Indexed 42 files" */
  indexStatus?: string | null;
  /** Active key chord waiting for second key, e.g. "Ctrl+K" */
  chordHint?: string | null;
}

export default function StatusBar({
  className,
  branch = "—",
  encoding = "UTF-8",
  language,
  position = null,
  indexStatus = null,
  chordHint = null,
}: StatusBarProps) {
  return (
    <div
      className={cn(
        "flex h-5 shrink-0 items-center justify-between border-t border-cursor-border bg-cursor-sidebar px-2 text-[11px] text-cursor-text-muted",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-4">
        <span title="Branch" aria-label={branch !== "—" ? `Branch: ${branch}` : undefined}>{branch}</span>
        <span title="Encoding" aria-label={`Encoding: ${encoding}`}>{encoding}</span>
        {indexStatus ? (
          <span title="@codebase index" aria-label={indexStatus}>
            {indexStatus}
          </span>
        ) : null}
        {chordHint ? (
          <span
            className="text-cursor-accent"
            title="Press the next key in the chord, or Esc to cancel"
            aria-label={`Chord ${chordHint} waiting`}
          >
            ({chordHint}) waiting…
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-4">
        {language ? (
          <span title="Language" aria-label={`Language: ${language}`}>{language}</span>
        ) : null}
        {position != null && (
          <span title="Line and column" aria-label={`Line ${position.line}, Column ${position.column}`}>
            Ln {position.line}, Col {position.column}
          </span>
        )}
      </div>
    </div>
  );
}
