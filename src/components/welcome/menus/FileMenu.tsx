import { MenuItem, MenuItemWithSubmenu, MenuSeparator } from "@/components/welcome/menus/menu-helpers";
import { useEditorActions } from "@/contexts/EditorActionsContext";

/**
 * File menu — only implemented items are shown.
 * For later: New Window, New Window with Profile, Open Workspace from File,
 * Add Folder to Workspace, Save Workspace As, Duplicate Workspace,
 * Share, Auto Save, Close Window, Exit. Preferences sub-menu: Keyboard Shortcuts,
 * Configure Snippets, Themes.
 */
const FileMenu = () => {
  const actions = useEditorActions();
  const recent = actions?.recentFolders ?? [];

  return (
    <div>
      <MenuItem label="New Text File" shortcut="Ctrl+N" onClick={() => actions?.newFile()} />
      <MenuSeparator />
      <MenuItem label="Open File..." shortcut="Ctrl+O" onClick={() => actions?.openFile()} />
      <MenuItem label="Open Folder..." shortcut="Ctrl+Shift+O" onClick={() => actions?.openFolder()} />
      {recent.length > 0 && (
        <MenuItemWithSubmenu label="Open Recent">
          {recent.map((entry) => (
            <MenuItem
              key={entry.name}
              label={entry.name}
              onClick={() => actions?.openRecentFolder?.(entry)}
            />
          ))}
        </MenuItemWithSubmenu>
      )}
      <MenuSeparator />
      <MenuItem label="Save" shortcut="Ctrl+S" onClick={() => actions?.save()} />
      <MenuItem label="Save As..." shortcut="Ctrl+Shift+S" onClick={() => actions?.saveAs()} />
      <MenuItem label="Save All" shortcut="Ctrl+M S" onClick={() => actions?.saveAll()} />
      <MenuSeparator />
      <MenuItemWithSubmenu label="Preferences" shortcut="Ctrl+,">
        <MenuItem label="Jollof Settings" shortcut="Ctrl+," onClick={() => actions?.openPreferences()} />
      </MenuItemWithSubmenu>
      <MenuItem label="Revert File" onClick={() => actions?.revertFile()} />
      <MenuSeparator />
      <MenuItem label="Close Editor" shortcut="Ctrl+F4" onClick={() => actions?.closeEditor()} />
    </div>
  );
};

export default FileMenu;
