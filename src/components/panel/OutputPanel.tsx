import { useOutput } from "@/contexts/OutputContext";

export default function OutputPanel() {
  const { lines, clear } = useOutput();

  return (
    <div className="flex h-full flex-col p-2">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          className="rounded px-2 py-1 text-xs text-cursor-text-muted hover:bg-cursor-border hover:text-white"
          onClick={clear}
        >
          Clear
        </button>
      </div>
      <pre className="min-h-0 flex-1 overflow-auto font-mono text-xs text-cursor-text whitespace-pre-wrap break-all">
        {lines.length === 0 ? (
          <span className="text-cursor-text-muted">Output from build and tasks will appear here.</span>
        ) : (
          lines.join("\n")
        )}
      </pre>
    </div>
  );
}
