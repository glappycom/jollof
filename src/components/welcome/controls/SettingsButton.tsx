import { Settings } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditorActions } from "@/contexts/EditorActionsContext";

const SettingsButton = () => {
  const actions = useEditorActions();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-sm text-cursor-text-muted transition-colors duration-fast hover:bg-cursor-border hover:text-cursor-text"
          onClick={() => actions?.openPreferences()}
          aria-label="Settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>Settings (Ctrl+,)</TooltipContent>
    </Tooltip>
  );
};

export default SettingsButton;
