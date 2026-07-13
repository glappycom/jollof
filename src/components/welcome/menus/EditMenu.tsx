import { MenuItem, MenuItemWithSubmenu, MenuSeparator } from "@/components/welcome/menus/menu-helpers";
import { useEditorActions } from "@/contexts/EditorActionsContext";

/**
 * Edit menu — all listed items are wired to the editor / search actions.
 */
const EditMenu = () => {
  const actions = useEditorActions();

  return (
    <div>
      <MenuItem label="Undo" shortcut="Ctrl+Z" onClick={() => actions?.undo()} />
      <MenuItem label="Redo" shortcut="Ctrl+Y" onClick={() => actions?.redo()} />
      <MenuSeparator />
      <MenuItem label="Cut" shortcut="Ctrl+X" onClick={() => void actions?.cut()} />
      <MenuItem label="Copy" shortcut="Ctrl+C" onClick={() => void actions?.copy()} />
      <MenuItem label="Paste" shortcut="Ctrl+V" onClick={() => void actions?.paste()} />
      <MenuItemWithSubmenu label="Copy Path">
        <MenuItem
          label="Copy Path"
          shortcut="Ctrl+K P"
          onClick={() => void actions?.copyPath?.()}
        />
        <MenuItem
          label="Copy Relative Path"
          shortcut="Ctrl+K Shift+P"
          onClick={() => void actions?.copyRelativePath?.()}
        />
      </MenuItemWithSubmenu>
      <MenuSeparator />
      <MenuItemWithSubmenu label="Find">
        <MenuItem label="Find" shortcut="Ctrl+F" onClick={() => actions?.findInEditor()} />
        <MenuItem label="Replace" shortcut="Ctrl+H" onClick={() => actions?.replaceInEditor()} />
        <MenuItem label="Find Next" shortcut="F3" onClick={() => actions?.findNext?.()} />
        <MenuItem label="Find Previous" shortcut="Shift+F3" onClick={() => actions?.findPrevious?.()} />
        <MenuSeparator />
        <MenuItem
          label="Find in Files"
          shortcut="Ctrl+Shift+F"
          onClick={() => actions?.showSearch()}
        />
        <MenuItem
          label="Replace in Files"
          shortcut="Ctrl+Shift+H"
          onClick={() => actions?.showReplaceInFiles()}
        />
      </MenuItemWithSubmenu>
      <MenuItemWithSubmenu label="Selection">
        <MenuItem label="Select All" shortcut="Ctrl+A" onClick={() => actions?.selectAll?.()} />
        <MenuSeparator />
        <MenuItem
          label="Copy Line Up"
          shortcut="Shift+Alt+↑"
          onClick={() => actions?.copyLineUp?.()}
        />
        <MenuItem
          label="Copy Line Down"
          shortcut="Shift+Alt+↓"
          onClick={() => actions?.copyLineDown?.()}
        />
        <MenuItem label="Move Line Up" shortcut="Alt+↑" onClick={() => actions?.moveLineUp?.()} />
        <MenuItem
          label="Move Line Down"
          shortcut="Alt+↓"
          onClick={() => actions?.moveLineDown?.()}
        />
        <MenuSeparator />
        <MenuItem
          label="Delete Line"
          shortcut="Ctrl+Shift+K"
          onClick={() => actions?.deleteLine?.()}
        />
      </MenuItemWithSubmenu>
      <MenuSeparator />
      <MenuItemWithSubmenu label="Comment">
        <MenuItem
          label="Toggle Line Comment"
          shortcut="Ctrl+/"
          onClick={() => actions?.toggleLineComment()}
        />
        <MenuItem
          label="Toggle Block Comment"
          shortcut="Shift+Alt+A"
          onClick={() => actions?.toggleBlockComment()}
        />
      </MenuItemWithSubmenu>
    </div>
  );
};

export default EditMenu;
