import { MenuItem, MenuSeparator } from "@/components/welcome/menus/menu-helpers";
import { useEditorActions } from "@/contexts/EditorActionsContext";

const TerminalMenu = () => {
  const actions = useEditorActions();
  return (
    <div>
      <MenuItem label="New Terminal" shortcut="Ctrl+Shift+`" onClick={actions?.newTerminal} />
      <MenuItem label="Split Terminal" shortcut="Ctrl+Shift+5" onClick={actions?.newTerminal} />
      <MenuSeparator />
      <MenuItem label="Run Active File" onClick={actions?.runActiveFile} />
      <MenuItem label="Run Task..." onClick={actions?.runTask} />
      <MenuItem label="Run Build Task" shortcut="Ctrl+Shift+B" onClick={actions?.runBuildTask} />
    </div>
  );
};

export default TerminalMenu;
