import { MenuItem, MenuSeparator } from "@/components/welcome/menus/menu-helpers";

const SelectionMenu = () => {
  return (
    <div>
      <MenuItem label="Select All" shortcut="Ctrl+A" />
      <MenuItem label="Expand Selection" shortcut="Shift+Alt+Right" />
      <MenuItem label="Shrink Selection" shortcut="Shift+Alt+Left" />
      <MenuSeparator />
      <MenuItem label="Copy Line Up" shortcut="Shift+Alt+Up" />
      <MenuItem label="Copy Line Down" shortcut="Shift+Alt+Down" />
      <MenuItem label="Move Line Up" shortcut="Alt+Up" />
      <MenuItem label="Move Line Down" shortcut="Alt+Down" />
      <MenuSeparator />
      <MenuItem label="Add Cursor Above" shortcut="Ctrl+Alt+Up" />
      <MenuItem label="Add Cursor Below" shortcut="Ctrl+Alt+Down" />
      <MenuItem label="Add Cursors to Line Ends" shortcut="Shift+Alt+I" />
    </div>
  );
};

export default SelectionMenu;
