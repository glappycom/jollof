import { cn } from "@/lib/utils";

interface StatusBarProps {
  className?: string;
  /** Git branch or "—" when none */
  branch?: string;
  /** Encoding, e.g. UTF-8 */
  encoding?: string;
  /** Cursor position "Ln 1, Col 1" or null to hide */
  position?: { line: number; column: number } | null;
}

export default function StatusBar({
  className,
  branch = "—",
  encoding = "UTF-8",
  position = null,
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
      </div>
      <div className="flex items-center gap-4">
        {position != null && (
          <span title="Line and column" aria-label={`Line ${position.line}, Column ${position.column}`}>
            Ln {position.line}, Col {position.column}
          </span>
        )}
      </div>
    </div>
  );
}
