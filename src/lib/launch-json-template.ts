/**
 * Default .vscode/launch.json scaffold for Jollof / VS Code compatibility.
 */
export const DEFAULT_LAUNCH_JSON = `{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch current file",
      "program": "\${file}"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "npm: start",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start"]
    }
  ]
}
`;

export const LAUNCH_JSON_REL = ".vscode/launch.json";
