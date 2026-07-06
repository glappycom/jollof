export const DEFAULT_LOCAL_SERVER_URL = "http://localhost:31337";
export const DEFAULT_TERMINAL_WS_URL = "ws://localhost:31337/pty";

export function localServerBaseUrl(configured?: string): string {
  const url = (configured || DEFAULT_LOCAL_SERVER_URL).trim().replace(/\/$/, "");
  return url || DEFAULT_LOCAL_SERVER_URL;
}

export function terminalWsUrl(configured?: string): string {
  const url = (configured || DEFAULT_TERMINAL_WS_URL).trim();
  return url || DEFAULT_TERMINAL_WS_URL;
}

export interface ServerHealth {
  ok: boolean;
  cwd: string;
  basename: string;
  matchesFolder: boolean;
}

export async function checkLocalServer(
  baseUrl: string,
  folderName?: string,
  cwd?: string
): Promise<ServerHealth | null> {
  try {
    const params = new URLSearchParams();
    if (folderName) params.set("folderName", folderName);
    if (cwd) params.set("cwd", cwd);
    const q = params.toString();
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/health${q ? `?${q}` : ""}`);
    if (!res.ok) return null;
    return (await res.json()) as ServerHealth;
  } catch {
    return null;
  }
}

/** Effective cwd for git/terminal: workspace local path or server default. */
export function resolveWorkspaceCwd(
  workspaceLocalPath: string | null | undefined,
  serverDefaultCwd?: string
): string {
  return workspaceLocalPath?.trim() || serverDefaultCwd?.trim() || "";
}
