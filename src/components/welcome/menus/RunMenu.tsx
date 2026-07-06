import { MenuItem } from "@/components/welcome/menus/menu-helpers";
import { useEditorActions } from "@/contexts/EditorActionsContext";

const RunMenu = () => {
  const actions = useEditorActions();
  return (
    <div>
      <MenuItem label="Run Task..." shortcut="Ctrl+Shift+B" onClick={actions?.runTask} />
      {/* Leftover: Start Debugging (F5), Run Without Debugging (Ctrl+F5), Stop/Restart Debugging, Toggle Breakpoint (F9), New Breakpoint, Add/Open Configurations */}
    </div>
  );
};

export default RunMenu;
