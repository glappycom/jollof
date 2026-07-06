import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface EmptyStateProps {
  icon: ReactNode;
  message: string;
  /** Optional primary action (e.g. "Open Folder", "New Agent") */
  action?: { label: string; onClick: () => void; disabled?: boolean };
  className?: string;
}

export function EmptyState({ icon, message, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-4 py-4 text-center",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span className="shrink-0 text-cursor-text-muted" aria-hidden>
        {icon}
      </span>
      <p className="text-[11px] text-cursor-text-muted">{message}</p>
      {action && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
