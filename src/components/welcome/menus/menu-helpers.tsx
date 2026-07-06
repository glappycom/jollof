import { useState } from "react";
import { cn } from "@/lib/utils";

interface MenuItemProps {
  label: string;
  shortcut?: string;
  hint?: string;
  active?: boolean;
  onClick?: () => void;
}

export const MenuItem = ({ label, shortcut, hint, active, onClick }: MenuItemProps) => {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      className={cn(
        "flex w-full cursor-default items-center justify-between rounded-sm px-2 py-1 text-left text-[11px] text-cursor-text transition-colors duration-fast hover:bg-cursor-hover",
        active && "bg-cursor-hover text-cursor-text"
      )}
      onClick={onClick}
    >
      <span className="flex items-center gap-2">
        <span>{label}</span>
        {hint ? <span className="text-cursor-text-muted">{hint}</span> : null}
      </span>
      {shortcut ? <span className="text-cursor-text-muted">{shortcut}</span> : null}
    </Comp>
  );
};

export interface SubMenuItem {
  label: string;
  shortcut?: string;
  onClick?: () => void;
}

interface MenuItemWithSubmenuProps {
  label: string;
  shortcut?: string;
  children: React.ReactNode;
}

export function MenuItemWithSubmenu({ label, shortcut, children }: MenuItemWithSubmenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div
        className={cn(
          "flex w-full cursor-default items-center justify-between rounded-sm px-2 py-1 text-[11px] text-cursor-text transition-colors duration-fast hover:bg-cursor-hover",
          open && "bg-cursor-hover"
        )}
      >
        <span>{label}</span>
        <span className="flex items-center gap-2">
          {shortcut && <span className="text-cursor-text-muted">{shortcut}</span>}
          <span className="text-cursor-text-muted">›</span>
        </span>
      </div>
      {open && (
        <div className="absolute left-full top-0 z-50 ml-0.5 min-w-[180px] rounded border border-cursor-border/80 bg-cursor-dropdown p-1 shadow-dropdown">
          {children}
        </div>
      )}
    </div>
  );
}

export const MenuSeparator = () => (
  <div className="my-1 border-t-2 border-cursor-border" />
);
