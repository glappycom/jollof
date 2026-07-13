import { MenuItem, MenuSeparator } from "@/components/welcome/menus/menu-helpers";
import { useEditorActions } from "@/contexts/EditorActionsContext";

const RunMenu = () => {
  const actions = useEditorActions();
  return (
    <div>
      <MenuItem label="Run Active File" shortcut="Ctrl+F5" onClick={actions?.runActiveFile} />
      <MenuSeparator />
      <MenuItem label="Run Task..." shortcut="Ctrl+Shift+B" onClick={actions?.runTask} />
    </div>
  );
};

export default RunMenu;
