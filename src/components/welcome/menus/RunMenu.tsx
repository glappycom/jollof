import {
  MenuItem,
  MenuItemWithSubmenu,
  MenuSeparator,
} from "@/components/welcome/menus/menu-helpers";
import { useEditorActions } from "@/contexts/EditorActionsContext";
import { useDebug } from "@/contexts/DebugContext";

const RunMenu = () => {
  const actions = useEditorActions();
  const { configs, selectedId, packageScripts, running } = useDebug();
  const scriptNames = Object.keys(packageScripts).sort();

  return (
    <div>
      <MenuItem
        label="Start Debugging"
        shortcut="F5"
        onClick={actions?.startDebugging}
        disabled={running}
      />
      <MenuItem
        label="Run Without Debugging"
        shortcut="Ctrl+F5"
        onClick={actions?.runWithoutDebugging}
        disabled={running}
      />
      <MenuItem
        label="Stop Debugging"
        shortcut="Shift+F5"
        onClick={actions?.stopDebugging}
        disabled={!running}
      />
      <MenuItem
        label="Restart Debugging"
        shortcut="Ctrl+Shift+F5"
        onClick={actions?.restartDebugging}
        disabled={running}
      />

      <MenuSeparator />

      <MenuItemWithSubmenu label="Start With Configuration">
        {configs.length === 0 ? (
          <MenuItem label="No configurations" disabled />
        ) : (
          configs.map((c) => (
            <MenuItem
              key={c.id}
              label={c.name}
              active={c.id === selectedId}
              hint={c.source === "launch.json" ? "launch" : undefined}
              onClick={() => actions?.startDebuggingWithConfig?.(c.id)}
            />
          ))
        )}
      </MenuItemWithSubmenu>

      <MenuItem label="Open Configurations" onClick={actions?.openLaunchConfig} />
      <MenuItem label="Add Configuration..." onClick={actions?.addLaunchConfig} />
      <MenuItem label="Show Debug Console" onClick={actions?.showDebugConsole} />

      <MenuSeparator />

      <MenuItem
        label="Run Active File"
        onClick={actions?.runActiveFile}
        disabled={running}
      />

      <MenuItemWithSubmenu label="Run Task">
        {scriptNames.length === 0 ? (
          <MenuItem label="No npm scripts (open a Node project)" disabled />
        ) : (
          scriptNames.map((name) => (
            <MenuItem
              key={name}
              label={`npm: ${name}`}
              onClick={() => actions?.runNpmScript?.(name)}
            />
          ))
        )}
        <MenuSeparator />
        <MenuItem label="Run Task..." onClick={actions?.runTask} />
      </MenuItemWithSubmenu>

      <MenuItem
        label="Run Build Task"
        shortcut="Ctrl+Shift+B"
        onClick={actions?.runBuildTask}
        disabled={running}
      />
    </div>
  );
};

export default RunMenu;
