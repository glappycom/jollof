import { MenuItem, MenuSeparator } from "@/components/welcome/menus/menu-helpers";
import { useEditorActions } from "@/contexts/EditorActionsContext";

const RunMenu = () => {
  const actions = useEditorActions();
  return (
    <div>
      <MenuItem label="Start Debugging" shortcut="F5" onClick={actions?.startDebugging} />
      <MenuItem label="Run Without Debugging" shortcut="Ctrl+F5" onClick={actions?.runActiveFile} />
      <MenuItem label="Stop Debugging" onClick={actions?.stopDebugging} />
      <MenuSeparator />
      <MenuItem label="Run Active File" shortcut="Ctrl+F5" onClick={actions?.runActiveFile} />
      <MenuItem label="Run Task..." shortcut="Ctrl+Shift+B" onClick={actions?.runTask} />
    </div>
  );
};

export default RunMenu;
