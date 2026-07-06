import { Folder, Search, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

export type LeftSidebarTab = "explorer" | "source-control";

interface SidebarActivityBarProps {
  active: LeftSidebarTab;
  onSelect: (tab: LeftSidebarTab) => void;
  onSearch: () => void;
  changesCount?: number;
}

export default function SidebarActivityBar({
  active,
  onSelect,
  onSearch,
  changesCount = 0,
}: SidebarActivityBarProps) {
  return (
    <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-cursor-border bg-cursor-sidebar py-2">
      <button
        type="button"
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-md text-cursor-text-muted transition-colors",
          active === "explorer" && "bg-cursor-hover text-cursor-text"
        )}
        onClick={() => onSelect("explorer")}
        aria-label="Explorer"
        title="Explorer (Ctrl+Shift+E)"
      >
        <Folder className="h-5 w-5" />
      </button>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-md text-cursor-text-muted transition-colors hover:bg-cursor-hover hover:text-cursor-text"
        onClick={onSearch}
        aria-label="Search"
        title="Search (Ctrl+Shift+F)"
      >
        <Search className="h-5 w-5" />
      </button>
      <button
        type="button"
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-md text-cursor-text-muted transition-colors",
          active === "source-control" && "bg-cursor-hover text-cursor-text"
        )}
        onClick={() => onSelect("source-control")}
        aria-label="Source Control"
        title="Source Control (Ctrl+Shift+G)"
      >
        <GitBranch className="h-5 w-5" />
        {changesCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cursor-accent px-1 text-[9px] font-bold text-black">
            {changesCount > 99 ? "99+" : changesCount}
          </span>
        )}
      </button>
    </div>
  );
}
