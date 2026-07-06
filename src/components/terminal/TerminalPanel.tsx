import { X, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import TerminalView from "./TerminalView";

export interface TerminalTab {
  id: string;
  name: string;
}

interface TerminalPanelProps {
  tabs: TerminalTab[];
  activeId: string | null;
  onNewTerminal: () => void;
  onCloseTerminal: (id: string) => void;
  onSelectTerminal: (id: string) => void;
  /** When user runs a command in the terminal. Wire to a backend (e.g. Tauri/Electron) for real execution. */
  onRunCommand?: (command: string) => void;
  /** WebSocket URL for real PTY (e.g. ws://localhost:31337/pty). */
  terminalWsUrl?: string;
  /** Working directory for the shell (local disk path). */
  terminalCwd?: string;
}

export default function TerminalPanel({
  tabs,
  activeId,
  onNewTerminal,
  onCloseTerminal,
  onSelectTerminal,
  onRunCommand,
  terminalWsUrl = "",
  terminalCwd = "",
}: TerminalPanelProps) {
  if (tabs.length === 0) {
    return (
      <div className="flex h-full flex-col bg-cursor-editor">
        <div className="flex h-8 shrink-0 items-center border-b border-cursor-border px-1.5">
          <button
            type="button"
            className="rounded-sm px-2 py-1 text-[11px] text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
            onClick={onNewTerminal}
          >
            + New Terminal
          </button>
        </div>
        <EmptyState
          icon={<Terminal className="h-8 w-8" />}
          message="No terminals. Create one to run commands (Ctrl+Shift+`)."
          action={{ label: "New Terminal", onClick: onNewTerminal }}
          className="flex-1"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-cursor-editor">
      <div className="flex h-8 shrink-0 items-center gap-px border-b border-cursor-border overflow-x-auto">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            role="tab"
            aria-selected={activeId === tab.id}
            className={cn(
              "flex h-full cursor-pointer items-center gap-1 border-r border-cursor-border px-2.5 text-[11px] transition-colors duration-fast",
              activeId === tab.id
                ? "bg-cursor-editor text-cursor-text"
                : "bg-cursor-hover/80 text-cursor-text-muted hover:bg-cursor-border hover:text-cursor-text"
            )}
            onClick={() => onSelectTerminal(tab.id)}
          >
            <span className="truncate max-w-[90px]">{tab.name}</span>
            <button
              type="button"
              className="rounded-sm p-0.5 hover:bg-cursor-border"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTerminal(tab.id);
              }}
              aria-label={`Close ${tab.name}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="flex shrink-0 items-center rounded-sm px-2 py-1 text-[11px] text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
          onClick={onNewTerminal}
          aria-label="New terminal"
        >
          +
        </button>
      </div>
      <div className="terminal-view-container flex-1 min-h-0 relative border-t border-cursor-border/60">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(
              "absolute inset-0 h-full w-full min-h-[100px]",
              activeId === tab.id ? "block" : "hidden"
            )}
          >
            <TerminalView key={tab.id} onRunCommand={onRunCommand} wsUrl={terminalWsUrl} cwd={terminalCwd} />
          </div>
        ))}
      </div>
    </div>
  );
}
