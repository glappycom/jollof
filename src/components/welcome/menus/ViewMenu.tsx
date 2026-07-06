import { MenuItem, MenuSeparator } from "@/components/welcome/menus/menu-helpers";
import { useEditorActions } from "@/contexts/EditorActionsContext";

const ViewMenu = () => {
  const actions = useEditorActions();
  return (
    <div>
      <MenuItem label="Command Palette..." shortcut="Ctrl+Shift+P" onClick={actions?.openCommandPalette} />
      {/* Leftover: Open View..., Appearance, Editor Layout */}
      <MenuSeparator />
      <MenuItem label="Explorer" shortcut="Ctrl+Shift+E" onClick={actions?.showExplorer} />
      <MenuItem label="Search" shortcut="Ctrl+Shift+F" onClick={actions?.showSearch} />
      <MenuItem label="Source Control" shortcut="Ctrl+Shift+G" onClick={actions?.showSourceControl} />
      <MenuSeparator />
      <MenuItem label="Toggle Sidebar" onClick={actions?.toggleSidebar} />
      <MenuItem label="Toggle Panel" onClick={actions?.togglePanel} />
      <MenuSeparator />
      <MenuItem label="Problems" shortcut="Ctrl+Shift+M" onClick={actions?.showProblems} />
      <MenuItem label="Output" shortcut="Ctrl+Shift+U" onClick={actions?.showOutput} />
      <MenuItem label="Terminal" shortcut="Ctrl+`" onClick={actions?.showTerminal} />
      {/* Leftover: Debug Console (Ctrl+Shift+Alt+Y) */}
    </div>
  );
};

export default ViewMenu;
