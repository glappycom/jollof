import { MenuItem, MenuItemWithSubmenu, MenuSeparator } from "@/components/welcome/menus/menu-helpers";
import { useEditorActions } from "@/contexts/EditorActionsContext";
import { useSettings } from "@/contexts/SettingsContext";

/**
 * File menu — all listed items are wired.
 */
const FileMenu = () => {
  const actions = useEditorActions();
  const { settings, updateSettings } = useSettings();
  const recent = actions?.recentFolders ?? [];

  return (
    <div>
      <MenuItem label="New Text File" shortcut="Ctrl+N" onClick={() => actions?.newFile()} />
      <MenuSeparator />
      <MenuItem label="Open File..." shortcut="Ctrl+O" onClick={() => void actions?.openFile()} />
      <MenuItem label="Open Folder..." onClick={() => void actions?.openFolder()} />
      <MenuItemWithSubmenu label="Open Recent">
        {recent.length === 0 ? (
          <MenuItem label="No recent folders" disabled />
        ) : (
          recent.map((entry) => (
            <MenuItem
              key={entry.localPath || entry.name}
              label={entry.name}
              hint={entry.localPath ? "path" : undefined}
              onClick={() => void actions?.openRecentFolder?.(entry)}
            />
          ))
        )}
      </MenuItemWithSubmenu>
      <MenuSeparator />
      <MenuItem label="Save" shortcut="Ctrl+S" onClick={() => void actions?.save()} />
      <MenuItem label="Save As..." shortcut="Ctrl+Shift+S" onClick={() => void actions?.saveAs()} />
      <MenuItem label="Save All" onClick={() => void actions?.saveAll()} />
      <MenuSeparator />
      <MenuItemWithSubmenu label="Preferences" shortcut="Ctrl+,">
        <MenuItem
          label="Settings..."
          shortcut="Ctrl+,"
          onClick={() => actions?.openPreferences()}
        />
        <MenuItem
          label="Auto Save"
          hint={settings.autoSave ? "On" : "Off"}
          onClick={() => updateSettings({ autoSave: !settings.autoSave })}
        />
        <MenuItem
          label="Color Theme"
          hint={settings.theme === "dark" ? "Dark" : "Light"}
          onClick={() =>
            updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })
          }
        />
      </MenuItemWithSubmenu>
      <MenuItem label="Revert File" onClick={() => void actions?.revertFile()} />
      <MenuSeparator />
      <MenuItem label="Close Editor" shortcut="Ctrl+F4" onClick={() => actions?.closeEditor()} />
    </div>
  );
};

export default FileMenu;
