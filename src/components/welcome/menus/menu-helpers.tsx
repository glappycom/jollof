import { useState } from "react";
import { cn } from "@/lib/utils";

interface MenuItemProps {
  label: string;
  shortcut?: string;
  hint?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export const MenuItem = ({ label, shortcut, hint, active, disabled, onClick }: MenuItemProps) => {
  const Comp = onClick && !disabled ? "button" : "div";
  return (
    <Comp
      type={onClick && !disabled ? "button" : undefined}
      disabled={disabled || undefined}
      role="menuitem"
      className={cn(
        "flex w-full cursor-default items-center justify-between rounded-sm px-2 py-1 text-left text-[11px] text-cursor-text transition-colors duration-fast",
        disabled
          ? "cursor-not-allowed text-cursor-text-muted/60"
          : "hover:bg-cursor-hover",
        active && !disabled && "bg-cursor-hover text-cursor-text"
      )}
      onClick={disabled ? undefined : onClick}
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

/**
 * Flyout submenu. Stays open while pointer is over parent or child panel.
 * Uses a zero-gap edge so the pointer can move into the flyout without closing.
 */
export function MenuItemWithSubmenu({ label, shortcut, children }: MenuItemWithSubmenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative"
      data-submenu-root
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        role="menuitem"
        aria-haspopup="true"
        aria-expanded={open}
        data-submenu-trigger
        className={cn(
          "flex w-full cursor-default items-center justify-between rounded-sm px-2 py-1 text-left text-[11px] text-cursor-text transition-colors duration-fast hover:bg-cursor-hover",
          open && "bg-cursor-hover"
        )}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span>{label}</span>
        <span className="flex items-center gap-2">
          {shortcut && <span className="text-cursor-text-muted">{shortcut}</span>}
          <span className="text-cursor-text-muted" aria-hidden>
            ›
          </span>
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-full top-0 z-[60] min-w-[200px] rounded border border-cursor-border/80 bg-cursor-dropdown p-1 shadow-dropdown"
          // Overlap parent by 1px so there is no hover gap
          style={{ marginLeft: -1 }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export const MenuSeparator = () => (
  <div className="my-1 border-t-2 border-cursor-border" role="separator" />
);
