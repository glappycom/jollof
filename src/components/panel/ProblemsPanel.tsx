import { FileWarning, FileX, Info, CheckCircle2 } from "lucide-react";
import type { ProblemEntry } from "@/lib/diagnostics";
import { EmptyState } from "@/components/ui/empty-state";

export type { ProblemEntry };

interface ProblemsPanelProps {
  problems?: ProblemEntry[];
  /** When user clicks a problem, go to file and line. */
  onSelectProblem?: (problem: ProblemEntry) => void;
}

function SeverityIcon({ severity }: { severity: ProblemEntry["severity"] }) {
  if (severity === "error") return <FileX className="h-4 w-4 shrink-0 text-red-500" />;
  if (severity === "warning") return <FileWarning className="h-4 w-4 shrink-0 text-amber-500" />;
  return <Info className="h-4 w-4 shrink-0 text-blue-400" />;
}

export default function ProblemsPanel({ problems = [], onSelectProblem }: ProblemsPanelProps) {
  return (
    <div className="flex flex-col p-2">
      {problems.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-8 w-8" />}
          message="No problems detected."
        />
      ) : (
        <ul className="space-y-0.5 text-xs">
          {problems.map((p) => (
            <li
              key={p.id}
              role="button"
              tabIndex={0}
              className="flex cursor-pointer items-start gap-2 rounded px-2 py-1 hover:bg-cursor-hover"
              onClick={() => onSelectProblem?.(p)}
              onKeyDown={(e) => e.key === "Enter" && onSelectProblem?.(p)}
            >
              <SeverityIcon severity={p.severity} />
              <span className="flex-1 truncate">
                <span className="text-cursor-text">{p.file}</span>
                {p.line != null && (
                  <span className="text-cursor-text-muted">:{p.line}</span>
                )}
                <span className="ml-1 text-cursor-text-muted">{p.message}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
