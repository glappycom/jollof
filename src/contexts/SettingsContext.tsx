import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { loadSettings, saveSettings, type Settings } from "@/lib/settings";
import {
  DEFAULT_LOCAL_SERVER_URL,
  DEFAULT_TERMINAL_WS_URL,
  resolveLocalServerUrl,
  resolveTerminalWsUrl,
} from "@/lib/local-server";

const SettingsContext = createContext<{
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
} | null>(null);

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx)
    return {
      settings: {
        fontSize: 14,
        tabSize: 2,
        theme: "dark" as const,
        autoSave: false,
        autoContinueAfterRun: true,
        terminalWsUrl: DEFAULT_TERMINAL_WS_URL,
        localServerUrl: DEFAULT_LOCAL_SERVER_URL,
        agentApiKey: "",
        agentApiUrl: "https://api.openai.com/v1",
        agentModel: "gpt-4o-mini",
      },
      updateSettings: () => {},
    };
  return ctx;
}

/** Persist raw prefs; expose location-aware server URLs to the app. */
function withResolvedServers(raw: Settings): Settings {
  return {
    ...raw,
    localServerUrl: resolveLocalServerUrl(raw.localServerUrl),
    terminalWsUrl: resolveTerminalWsUrl(raw.terminalWsUrl),
  };
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [rawSettings, setRawSettings] = useState<Settings>(() => loadSettings());

  // Persist only user prefs — never bake in ephemeral same-origin resolved URLs
  useEffect(() => {
    saveSettings(rawSettings);
  }, [rawSettings]);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setRawSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const settings = useMemo(() => withResolvedServers(rawSettings), [rawSettings]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
