import { Play, Square, Trash2, Bug } from "lucide-react";
import { useDebug } from "@/contexts/DebugContext";
import { useEditorActions } from "@/contexts/EditorActionsContext";
import { EmptyState } from "@/components/ui/empty-state";

export default function DebugConsolePanel() {
  const { lines, clear, configs, selectedId, setSelectedId, running } = useDebug();
  const actions = useEditorActions();

  return (
    <div className="flex h-full flex-col bg-cursor-editor">
      <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-cursor-border px-2">
        <select
          className="h-6 min-w-0 flex-1 max-w-[220px] rounded-sm border border-cursor-border bg-cursor-sidebar px-1.5 text-[11px] text-cursor-text outline-none focus:border-cursor-accent"
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value || null)}
          disabled={running || configs.length === 0}
          aria-label="Debug configuration"
        >
          {configs.length === 0 ? (
            <option value="">No configurations</option>
          ) : (
            configs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.source === "launch.json" ? " · launch.json" : ""}
              </option>
            ))
          )}
        </select>
        <button
          type="button"
          className="flex h-6 items-center gap-1 rounded-sm bg-cursor-accent/90 px-2 text-[11px] font-medium text-white hover:bg-cursor-accent disabled:opacity-40"
          onClick={() => actions?.startDebugging?.()}
          disabled={running || configs.length === 0}
          title="Start Debugging (F5)"
        >
          <Play className="h-3 w-3" />
          Start
        </button>
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-sm text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text disabled:opacity-40"
          onClick={() => actions?.stopDebugging?.()}
          disabled={!running}
          title="Stop"
          aria-label="Stop debugging"
        >
          <Square className="h-3 w-3" />
        </button>
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-sm text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
          onClick={clear}
          title="Clear console"
          aria-label="Clear debug console"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2 font-mono text-xs text-cursor-text">
        {lines.length === 0 ? (
          <EmptyState
            icon={<Bug className="h-8 w-8" />}
            message={
              configs.length === 0
                ? "No debug configs yet. Open a folder with a local path, open a .js/.ts/.py file, or add .vscode/launch.json — then press F5."
                : "Select a configuration and press Start (F5). Output appears here."
            }
            className="h-full"
          />
        ) : (
          <>
            <pre className="whitespace-pre-wrap break-all leading-relaxed">{lines.join("\n")}</pre>
            {running && (
              <p className="mt-2 text-[11px] text-cursor-text-muted">… running</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
