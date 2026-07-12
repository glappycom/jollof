import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { loadSettings, saveSettings, type Settings } from "@/lib/settings";
import {
  DEFAULT_LOCAL_SERVER_URL,
  DEFAULT_TERMINAL_WS_URL,
  inferServerUrlsFromLocation,
} from "@/lib/local-server";

const SettingsContext = createContext<{
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
} | null>(null);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) return { settings: { fontSize: 14, tabSize: 2, theme: "dark" as const, autoSave: false, terminalWsUrl: DEFAULT_TERMINAL_WS_URL, localServerUrl: DEFAULT_LOCAL_SERVER_URL, agentApiKey: "", agentApiUrl: "https://api.openai.com/v1", agentModel: "gpt-4o-mini" }, updateSettings: () => {} };
  return ctx;
}

function withInferredRemoteServers(settings: Settings): Settings {
  const inferred = inferServerUrlsFromLocation();
  if (!inferred) return settings;
  const stillLocalhost =
    settings.localServerUrl.includes("localhost") ||
    settings.localServerUrl.includes("127.0.0.1");
  if (!stillLocalhost) return settings;
  return {
    ...settings,
    localServerUrl: inferred.localServerUrl,
    terminalWsUrl: inferred.terminalWsUrl,
  };
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() =>
    withInferredRemoteServers(loadSettings())
  );

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
