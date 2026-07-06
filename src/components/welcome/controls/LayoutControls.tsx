import { PanelBottomClose, PanelBottomOpen, PanelLeftClose, PanelRightClose } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditorActions } from "@/contexts/EditorActionsContext";

/**
 * Cursor-style layout icons: left bar (sidebar), bottom bar (panel), right bar (Agents).
 * Bottom panel appears only after clicking the icon; icon shows "open" when panel is hidden.
 */
interface LayoutControlsProps {
  panelVisible?: boolean;
}

const LayoutControls = ({ panelVisible = false }: LayoutControlsProps) => {
  const actions = useEditorActions();

  return (
    <div className="flex items-center gap-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-sm text-cursor-text-muted transition-colors duration-fast hover:bg-cursor-border hover:text-cursor-text"
            onClick={() => actions?.toggleSidebar()}
            aria-label="Toggle left bar (sidebar)"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Toggle left bar</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-sm text-cursor-text-muted transition-colors duration-fast hover:bg-cursor-border hover:text-cursor-text"
            onClick={() => actions?.togglePanel()}
            aria-label={panelVisible ? "Hide bottom panel" : "Show bottom panel (Terminal, Output, Problems)"}
          >
            {panelVisible ? (
              <PanelBottomClose className="h-3.5 w-3.5" />
            ) : (
              <PanelBottomOpen className="h-3.5 w-3.5" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>{panelVisible ? "Hide bottom panel" : "Show bottom panel"}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-sm text-cursor-text-muted transition-colors duration-fast hover:bg-cursor-border hover:text-cursor-text"
            onClick={() => actions?.toggleRightSidebar()}
            aria-label="Toggle right bar (Agents)"
          >
            <PanelRightClose className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Toggle right bar (Agents)</TooltipContent>
      </Tooltip>
    </div>
  );
};

export default LayoutControls;
