export const DEFAULT_LOCAL_SERVER_URL = "http://127.0.0.1:31337";
export const DEFAULT_TERMINAL_WS_URL = "ws://127.0.0.1:31337/pty";

function isLocalHostName(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
}

function looksLikeLocalhostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return !host || isLocalHostName(host);
  } catch {
    return true;
  }
}

/** Same-origin API/PTY via Vite or Docker reverse proxy (preferred in the browser). */
export function sameOriginServerUrls(): {
  localServerUrl: string;
  terminalWsUrl: string;
} | null {
  if (typeof window === "undefined") return null;
  const { protocol, host } = window.location;
  if (!host) return null;
  const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
  return {
    localServerUrl: `${protocol}//${host}`,
    terminalWsUrl: `${wsProtocol}//${host}/pty`,
  };
}

/** When the UI is served from a remote host without a same-origin proxy. */
export function inferServerUrlsFromLocation(): {
  localServerUrl: string;
  terminalWsUrl: string;
} | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  if (!host || isLocalHostName(host)) return null;
  const protocol = window.location.protocol === "https:" ? "https" : "http";
  const wsProtocol = protocol === "https" ? "wss" : "ws";
  return {
    localServerUrl: `${protocol}://${host}:31337`,
    terminalWsUrl: `${wsProtocol}://${host}:31337/pty`,
  };
}

function preferSameOriginProxy(): boolean {
  if (typeof window === "undefined") return false;
  if (import.meta.env.DEV) return true;
  const port = window.location.port;
  return port === "8080" || port === "5173" || port === "4173";
}

/**
 * Prefer same-origin `/api` (Vite/Docker proxy). Fall back to direct :31337.
 */
export function resolveLocalServerUrl(configured?: string): string {
  const same = sameOriginServerUrls();
  if (same && preferSameOriginProxy()) {
    return same.localServerUrl;
  }

  const trimmed = (configured || "").trim().replace(/\/$/, "");
  const inferred = inferServerUrlsFromLocation();
  if (inferred) {
    if (!trimmed || looksLikeLocalhostUrl(trimmed)) return inferred.localServerUrl;
    return trimmed;
  }
  if (!trimmed) return DEFAULT_LOCAL_SERVER_URL;
  if (!looksLikeLocalhostUrl(trimmed)) return DEFAULT_LOCAL_SERVER_URL;
  if (trimmed.includes("localhost")) {
    return trimmed.replace("localhost", "127.0.0.1");
  }
  return trimmed;
}

/**
 * Prefer same-origin `/pty` WebSocket via proxy (avoids Chrome blocking
 * cross-port WS from the Vite origin to :31337).
 */
export function resolveTerminalWsUrl(configured?: string): string {
  const same = sameOriginServerUrls();
  if (same && preferSameOriginProxy()) {
    return same.terminalWsUrl;
  }

  const trimmed = (configured || "").trim();
  const inferred = inferServerUrlsFromLocation();
  if (inferred) {
    if (!trimmed || looksLikeLocalhostUrl(trimmed)) return inferred.terminalWsUrl;
    return trimmed;
  }
  if (!trimmed) return DEFAULT_TERMINAL_WS_URL;
  if (!looksLikeLocalhostUrl(trimmed)) return DEFAULT_TERMINAL_WS_URL;
  if (trimmed.includes("localhost")) {
    return trimmed.replace("localhost", "127.0.0.1");
  }
  return trimmed;
}

/** Candidate URLs to try in order when connecting the terminal. */
export function terminalWsUrlCandidates(configured?: string): string[] {
  const primary = resolveTerminalWsUrl(configured);
  const candidates = [primary];
  const same = sameOriginServerUrls()?.terminalWsUrl;
  if (same && !candidates.includes(same)) candidates.push(same);
  if (!candidates.includes(DEFAULT_TERMINAL_WS_URL)) candidates.push(DEFAULT_TERMINAL_WS_URL);
  const localhostVariant = "ws://localhost:31337/pty";
  if (!candidates.includes(localhostVariant)) candidates.push(localhostVariant);
  return candidates.filter(Boolean);
}

export function localServerBaseUrl(configured?: string): string {
  return resolveLocalServerUrl(configured);
}

export function terminalWsUrl(configured?: string): string {
  return resolveTerminalWsUrl(configured);
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

export function resolveWorkspaceCwd(
  workspaceLocalPath: string | null | undefined,
  serverDefaultCwd?: string
): string {
  return workspaceLocalPath?.trim() || serverDefaultCwd?.trim() || "";
}
