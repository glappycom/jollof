import { MenuItem, MenuSeparator } from "@/components/welcome/menus/menu-helpers";
import { useEditorActions } from "@/contexts/EditorActionsContext";

const EditMenu = () => {
  const actions = useEditorActions();

  return (
    <div>
      <MenuItem label="Undo" shortcut="Ctrl+Z" onClick={actions?.undo} />
      <MenuItem label="Redo" shortcut="Ctrl+Y" onClick={actions?.redo} />
      <MenuSeparator />
      <MenuItem label="Cut" shortcut="Ctrl+X" onClick={() => actions?.cut()} />
      <MenuItem label="Copy" shortcut="Ctrl+C" onClick={() => actions?.copy()} />
      <MenuItem label="Paste" shortcut="Ctrl+V" onClick={() => actions?.paste()} />
      <MenuSeparator />
      <MenuItem label="Find" shortcut="Ctrl+F" onClick={actions?.findInEditor} />
      <MenuItem label="Replace" shortcut="Ctrl+H" onClick={actions?.replaceInEditor} />
      <MenuSeparator />
      <MenuItem label="Find in Files" shortcut="Ctrl+Shift+F" onClick={actions?.showSearch} />
      <MenuItem label="Replace in Files" shortcut="Ctrl+Shift+H" onClick={actions?.showReplaceInFiles} />
      <MenuSeparator />
      <MenuItem label="Toggle Line Comment" shortcut="Ctrl+/" onClick={actions?.toggleLineComment} />
      <MenuItem label="Toggle Block Comment" shortcut="Shift+Alt+A" onClick={actions?.toggleBlockComment} />
    </div>
  );
};

export default EditMenu;
