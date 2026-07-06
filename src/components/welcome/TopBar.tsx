import { useRef } from "react";
import JollofLogo from "@/components/logo/JollofLogo";
import MenuBar from "@/components/welcome/menus/MenuBar";
import NavigationControls from "@/components/welcome/controls/NavigationControls";
import LayoutControls from "@/components/welcome/controls/LayoutControls";
import SettingsButton from "@/components/welcome/controls/SettingsButton";
import WindowControls from "@/components/welcome/controls/WindowControls";
import SearchInput, {
  type SearchInputHandle,
} from "@/components/welcome/search/SearchInput";

interface TopBarProps {
  searchRef?: React.RefObject<SearchInputHandle>;
  /** When top bar search is focused/Enter, open Find in Files panel. */
  onOpenSearch?: () => void;
  /** Workspace/project name shown in the center (e.g. folder name or "jollof-ide"). */
  workspaceName?: string;
  /** Whether the bottom panel (Terminal/Output/Problems) is visible; used for the toggle icon. */
  panelVisible?: boolean;
}

const TopBar = ({ searchRef, onOpenSearch, workspaceName = "jollof-ide", panelVisible = false }: TopBarProps) => {
  const internalRef = useRef<SearchInputHandle>(null);
  const inputRef = searchRef ?? internalRef;

  return (
    <div className="flex h-8 items-center justify-between border-b border-cursor-border bg-cursor-title px-2 shadow-bar">
      {/* Left: logo + menus */}
      <div className="flex shrink-0 items-center gap-1.5">
        <JollofLogo />
        <MenuBar />
      </div>
      {/* Center: nav arrows + workspace name + search */}
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden">
        <NavigationControls />
        <span className="max-w-[120px] truncate text-[11px] font-medium text-cursor-text" title={workspaceName}>
          {workspaceName}
        </span>
        <SearchInput ref={inputRef} onOpenSearch={onOpenSearch} />
      </div>
      {/* Right: layout icons + gear + window controls */}
      <div className="flex shrink-0 items-center justify-end gap-0.5">
        <LayoutControls panelVisible={panelVisible} />
        <SettingsButton />
        <WindowControls />
      </div>
    </div>
  );
};

export default TopBar;
