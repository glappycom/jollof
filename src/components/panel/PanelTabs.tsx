import { useState, useRef, useEffect } from "react";
import { PanelBottomClose, Maximize2, Minimize2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type PanelTabId = "terminal" | "output" | "problems" | "debug";

const COLLAPSED_HEIGHT_THRESHOLD = 56;

interface PanelTabsProps {
  active: PanelTabId;
  onSelect: (id: PanelTabId) => void;
  children: React.ReactNode;
  problemCount?: number;
  onClosePanel?: () => void;
  /** Expand bottom panel to take most of the vertical space */
  onMaximizePanel?: () => void;
  /** Restore bottom panel from maximized state */
  onRestorePanel?: () => void;
  /** When true, show Restore instead of Maximize */
  isPanelMaximized?: boolean;
  /** Optional one-line snippet for collapsed strip (e.g. last terminal line) */
  snippet?: string;
}

const TAB_IDS: PanelTabId[] = ["terminal", "output", "problems", "debug"];

function getTabLabel(id: PanelTabId, problemCount?: number): string {
  if (id === "terminal") return "Terminal";
  if (id === "output") return "Output";
  if (id === "problems") {
    return problemCount != null && problemCount > 0 ? `Problems (${problemCount})` : "Problems";
  }
  if (id === "debug") return "Debug Console";
  return id;
}

function getSnippetHint(active: PanelTabId, problemCount?: number, snippet?: string): string {
  if (snippet) return snippet;
  if (active === "terminal") return "PS C:\\...> · real shell (npm run dev)";
  if (active === "output") return "Build and task output";
  if (active === "problems") return problemCount != null && problemCount > 0 ? `${problemCount} issue(s)` : "No problems";
  if (active === "debug") return "Run and debug";
  return "Drag up to expand";
}

export default function PanelTabs({
  active,
  onSelect,
  children,
  problemCount,
  onClosePanel,
  onMaximizePanel,
  onRestorePanel,
  isPanelMaximized,
  snippet,
}: PanelTabsProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? 0;
      setIsCollapsed(height > 0 && height < COLLAPSED_HEIGHT_THRESHOLD);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hint = getSnippetHint(active, problemCount, snippet);

  if (isCollapsed) {
    return (
      <div
        ref={containerRef}
        className="flex h-full flex-col bg-cursor-sidebar"
      >
        <div className="flex h-full min-h-0 flex-1 items-center justify-between gap-1.5 border-t border-cursor-border bg-cursor-sidebar/95 px-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {TAB_IDS.map((tabId) => (
              <button
                key={tabId}
                type="button"
                className={cn(
                  "shrink-0 rounded-sm px-2 py-0.5 text-[11px] font-medium transition-all duration-fast",
                  active === tabId
                    ? "bg-cursor-hover text-cursor-text"
                    : "text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
                )}
                onClick={() => onSelect(tabId)}
              >
                {getTabLabel(tabId, problemCount)}
              </button>
            ))}
            <span className="truncate pl-2 text-[11px] text-cursor-text-muted" title={hint}>
              {hint}
            </span>
          </div>
          {(isPanelMaximized ? onRestorePanel : onMaximizePanel) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="shrink-0 rounded-sm p-0.5 text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
                  onClick={isPanelMaximized ? onRestorePanel : onMaximizePanel}
                  aria-label={isPanelMaximized ? "Restore panel" : "Maximize panel"}
                >
                  {isPanelMaximized ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>{isPanelMaximized ? "Restore panel" : "Maximize panel"}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex h-full flex-col bg-cursor-sidebar">
      <div className="flex shrink-0 items-center justify-between border-t border-cursor-border bg-cursor-sidebar/98">
        <div className="flex items-center">
          {TAB_IDS.map((tabId) => (
            <button
              key={tabId}
              type="button"
              className={cn(
                "px-3 py-1.5 text-[11px] font-medium border-b-2 transition-colors duration-fast",
                active === tabId
                  ? "border-cursor-border text-cursor-text"
                  : "border-transparent text-cursor-text-muted hover:text-cursor-text"
              )}
              onClick={() => onSelect(tabId)}
            >
              {getTabLabel(tabId, problemCount)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5">
          {(isPanelMaximized ? onRestorePanel : onMaximizePanel) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-cursor-text-muted transition-colors duration-fast hover:bg-cursor-border hover:text-white"
                  onClick={isPanelMaximized ? onRestorePanel : onMaximizePanel}
                  aria-label={isPanelMaximized ? "Restore panel" : "Maximize panel"}
                >
                  {isPanelMaximized ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>{isPanelMaximized ? "Restore panel" : "Maximize panel"}</TooltipContent>
            </Tooltip>
          )}
          {onClosePanel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md mr-1 text-cursor-text-muted transition-colors duration-fast hover:bg-cursor-border hover:text-white"
                  onClick={onClosePanel}
                  aria-label="Close bottom panel"
                >
                  <PanelBottomClose className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Close bottom panel (collapse)</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto text-xs font-mono text-cursor-text">
        {children}
      </div>
    </div>
  );
}
