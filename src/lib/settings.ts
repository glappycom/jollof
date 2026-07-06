import {
  DEFAULT_LOCAL_SERVER_URL,
  DEFAULT_TERMINAL_WS_URL,
} from "@/lib/local-server";

const KEY = "jollof-settings";

export interface Settings {
  fontSize: number;
  tabSize: number;
  theme: "dark" | "light";
  autoSave: boolean;
  /** WebSocket URL for real terminal (default ws://localhost:31337/pty). */
  terminalWsUrl: string;
  /** HTTP base URL for Git API (default http://localhost:31337). */
  localServerUrl: string;
  /** Agent: API key (e.g. OpenAI). Empty = no backend. */
  agentApiKey: string;
  /** Agent: API base URL (OpenAI-compatible). */
  agentApiUrl: string;
  /** Agent: model name (e.g. gpt-4o-mini). */
  agentModel: string;
}

const defaults: Settings = {
  fontSize: 14,
  tabSize: 2,
  theme: "dark",
  autoSave: false,
  terminalWsUrl: DEFAULT_TERMINAL_WS_URL,
  localServerUrl: DEFAULT_LOCAL_SERVER_URL,
  agentApiKey: "",
  agentApiUrl: "https://api.openai.com/v1",
  agentModel: "gpt-4o-mini",
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const merged = { ...defaults, ...parsed };
    if (!parsed.terminalWsUrl?.trim()) merged.terminalWsUrl = defaults.terminalWsUrl;
    if (!parsed.localServerUrl?.trim()) merged.localServerUrl = defaults.localServerUrl;
    return merged;
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(KEY, JSON.stringify(settings));
}
