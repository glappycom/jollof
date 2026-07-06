import { MenuItem, MenuSeparator } from "@/components/welcome/menus/menu-helpers";
import { useEditorActions } from "@/contexts/EditorActionsContext";

const GoMenu = () => {
  const actions = useEditorActions();
  return (
    <div>
      {/* Leftover: Back (Alt+Left), Forward (Alt+Right), Last Edit Location (Ctrl+K Ctrl+Q) */}
      <MenuItem label="Go to File..." shortcut="Ctrl+P" onClick={actions?.openGoToFile} />
      <MenuItem label="Go to Line/Column..." shortcut="Ctrl+G" onClick={actions?.openGoToLineDialog} />
      <MenuItem label="Go to Symbol in Editor..." shortcut="Ctrl+Shift+O" onClick={actions?.openGoToSymbol} />
      <MenuSeparator />
      {/* Leftover: Next Problem (F8), Previous Problem (Shift+F8) */}
    </div>
  );
};

export default GoMenu;
