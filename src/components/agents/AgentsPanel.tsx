import { useState } from "react";
import { Search, Plus, CheckCircle2, LayoutGrid } from "lucide-react";
import SolutionsModal from "./SolutionsModal";
import { EmptyState } from "@/components/ui/empty-state";

export interface AgentSessionHistory {
  id: string;
  name: string;
  messages: { id: string; role: "user" | "assistant"; content: string; images?: string[] }[];
  added: number;
  removed: number;
  filesCount: number;
  closedAt: Date;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

export interface ActiveAgentSnapshot {
  id: string;
  name: string;
}

interface AgentsPanelProps {
  activeAgent: ActiveAgentSnapshot | null;
  agentHistory: AgentSessionHistory[];
  onNewAgent: () => void;
  onOpenComposer?: () => void;
  onSelectAgent?: (id: string) => void;
}

export default function AgentsPanel({
  activeAgent,
  agentHistory,
  onNewAgent,
  onOpenComposer,
  onSelectAgent,
}: AgentsPanelProps) {
  const [search, setSearch] = useState("");
  const [solutionsOpen, setSolutionsOpen] = useState(false);

  const filteredHistory = search.trim()
    ? agentHistory.filter((h) => h.name.toLowerCase().includes(search.toLowerCase()))
    : agentHistory;

  return (
    <div className="flex h-full flex-col bg-cursor-sidebar">
      {/* Search */}
      <div className="shrink-0 border-b border-cursor-border px-2 py-2">
        <div className="flex items-center gap-1.5 rounded border border-cursor-border bg-cursor-editor px-2 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-cursor-text-muted" />
          <input
            type="text"
            placeholder="Search Agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-xs text-cursor-text placeholder:text-cursor-text-muted focus:outline-none"
          />
        </div>
        <button
          type="button"
          className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-sm bg-orange px-2.5 py-1.5 text-[11px] font-medium text-black hover:bg-orange/90"
          onClick={onNewAgent}
        >
          <Plus className="h-4 w-4" />
          New Agent
        </button>
        {onOpenComposer && (
          <button
            type="button"
            className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-sm border border-cursor-border bg-cursor-hover/80 px-2.5 py-1.5 text-[11px] font-medium text-cursor-text hover:bg-cursor-hover"
            onClick={onOpenComposer}
          >
            Composer
          </button>
        )}
      </div>

      {/* Agents list only */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 px-2 pt-2 text-[11px] font-medium uppercase tracking-wide text-cursor-text-muted">
          Agents
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {filteredHistory.length === 0 && !activeAgent && (
            <EmptyState
              icon={<LayoutGrid className="h-8 w-8" />}
              message={search.trim() ? "No agents match your search." : "No agents yet. Use the button above to create one."}
            />
          )}

          {activeAgent && (
            <div className="border-b border-cursor-border px-2 py-1.5">
              <button
                type="button"
                className="flex w-full items-start gap-2 text-left hover:opacity-90"
                onClick={() => onSelectAgent?.(activeAgent.id)}
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500 mt-0.5" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-cursor-text">{activeAgent.name}</p>
                  <p className="text-[11px] text-cursor-text-muted">Active — open in center</p>
                </div>
              </button>
            </div>
          )}

          <ul className="py-1">
            {filteredHistory.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className="w-full px-2 py-2 text-left hover:bg-cursor-hover"
                  onClick={() => onSelectAgent?.(h.id)}
                >
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-cursor-text-muted mt-0.5" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-cursor-text">{h.name}</p>
                      <p className="text-[11px] text-cursor-text-muted">
                        <span className="text-green-500">+{h.added}</span>
                        {" "}
                        <span className="text-red-400">-{h.removed}</span>
                        {" · "}
                        {h.filesCount} Files
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-cursor-text-muted">{formatTimeAgo(h.closedAt)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Browse Solutions (marketplace) */}
      <div className="shrink-0 border-t border-cursor-border p-2">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
          onClick={() => setSolutionsOpen(true)}
        >
          <LayoutGrid className="h-4 w-4 shrink-0" />
          Browse Solutions
        </button>
        <p className="px-2 pt-0.5 text-[11px] text-cursor-text-muted">
          Solutions for developers to kickstart projects.
        </p>
      </div>

      <SolutionsModal open={solutionsOpen} onClose={() => setSolutionsOpen(false)} />
    </div>
  );
}
