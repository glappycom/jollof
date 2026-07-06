import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEditorActions } from "@/contexts/EditorActionsContext";

const NavigationControls = () => {
  const actions = useEditorActions();
  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="h-6 w-6 rounded-sm text-cursor-text-muted transition-colors duration-fast hover:bg-cursor-border hover:text-cursor-text"
            onClick={() => actions?.goBack?.()}
            aria-label="Go Back"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Go Back (Alt+Left)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="h-6 w-6 rounded-sm text-cursor-text-muted transition-colors duration-fast hover:bg-cursor-border hover:text-cursor-text"
            onClick={() => actions?.goForward?.()}
            aria-label="Go Forward"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Go Forward (Alt+Right)</TooltipContent>
      </Tooltip>
    </div>
  );
};

export default NavigationControls;
