import { MenuItem, MenuSeparator } from "@/components/welcome/menus/menu-helpers";
import { useEditorActions } from "@/contexts/EditorActionsContext";

const HelpMenu = () => {
  const actions = useEditorActions();
  return (
    <div>
      <MenuItem label="Welcome" onClick={actions?.showWelcome} />
      <MenuItem label="Show All Commands" shortcut="Ctrl+Shift+P" onClick={actions?.openCommandPalette} />
      <MenuSeparator />
      <MenuItem label="Keyboard Shortcuts" onClick={actions?.openPreferences} />
      <MenuSeparator />
      <MenuItem label="Documentation" onClick={actions?.openDocumentation} />
      <MenuItem label="Release Notes" onClick={actions?.openReleaseNotes} />
      <MenuSeparator />
      <MenuItem label="Report Issue" onClick={actions?.openReportIssue} />
      <MenuItem label="About" onClick={actions?.openAbout} />
    </div>
  );
};

export default HelpMenu;
