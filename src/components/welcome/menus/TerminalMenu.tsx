import { MenuItem, MenuSeparator } from "@/components/welcome/menus/menu-helpers";
import { useEditorActions } from "@/contexts/EditorActionsContext";

const TerminalMenu = () => {
  const actions = useEditorActions();
  return (
    <div>
      <MenuItem label="New Terminal" shortcut="Ctrl+Shift+`" onClick={actions?.newTerminal} />
      <MenuItem label="Split Terminal" shortcut="Ctrl+Shift+5" onClick={actions?.newTerminal} />
      <MenuSeparator />
      <MenuItem label="Run Task..." shortcut="Ctrl+Shift+B" onClick={actions?.runTask} />
      {/* Leftover: Run Build Task..., Run Active File, Configure Tasks..., Configure Default Build Task... */}
    </div>
  );
};

export default TerminalMenu;
