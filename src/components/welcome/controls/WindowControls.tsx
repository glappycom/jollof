import { Minus, Square, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const WindowControls = () => {
  const win = typeof window !== "undefined" ? (window as unknown as { minimize?: () => void; maximize?: () => void; close?: () => void }) : null;
  const handleMinimize = () => win?.minimize?.();
  const handleMaximize = () => win?.maximize?.();
  const handleClose = () => (typeof window !== "undefined" ? window.close() : undefined);

  return (
    <div className="flex items-center gap-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded text-cursor-text-muted hover:bg-cursor-border hover:text-white"
            onClick={handleMinimize}
            aria-label="Minimize"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Minimize</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded text-cursor-text-muted hover:bg-cursor-border hover:text-white"
            onClick={handleMaximize}
            aria-label="Maximize"
          >
            <Square className="h-3.5 w-3.5 stroke-[2]" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Maximize</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded text-cursor-text-muted hover:bg-cursor-border hover:text-white"
            onClick={handleClose}
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Close</TooltipContent>
      </Tooltip>
    </div>
  );
};

export default WindowControls;
