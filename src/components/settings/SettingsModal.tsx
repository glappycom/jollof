import { useRef } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettings();
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="w-full max-w-md rounded-lg border border-cursor-border bg-cursor-sidebar p-4 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-cursor-text">Preferences</h2>
          <button
            type="button"
            className="rounded-sm px-1.5 py-0.5 text-[11px] text-cursor-text-muted hover:bg-cursor-border hover:text-cursor-text"
            onClick={onClose}
            aria-label="Close settings"
          >
            Close
          </button>
        </div>
        <div className="space-y-3 text-[11px]">
          <div>
            <label id="settings-font-size-label" htmlFor="settings-font-size" className="mb-1 block text-cursor-text-muted">Editor: Font size</label>
            <input
              id="settings-font-size"
              type="number"
              min={10}
              max={24}
              value={settings.fontSize}
              onChange={(e) => updateSettings({ fontSize: Number(e.target.value) || 14 })}
              className="w-20 rounded border border-cursor-border bg-cursor-editor px-2 py-1 text-cursor-text"
              aria-labelledby="settings-font-size-label"
            />
          </div>
          <div>
            <label id="settings-tab-size-label" htmlFor="settings-tab-size" className="mb-1 block text-cursor-text-muted">Editor: Tab size</label>
            <input
              id="settings-tab-size"
              type="number"
              min={2}
              max={8}
              value={settings.tabSize}
              onChange={(e) => updateSettings({ tabSize: Number(e.target.value) || 2 })}
              className="w-20 rounded border border-cursor-border bg-cursor-editor px-2 py-1 text-cursor-text"
              aria-labelledby="settings-tab-size-label"
            />
          </div>
          <div>
            <label id="settings-theme-label" htmlFor="settings-theme" className="mb-1 block text-cursor-text-muted">Theme</label>
            <select
              id="settings-theme"
              value={settings.theme}
              onChange={(e) => updateSettings({ theme: e.target.value as "dark" | "light" })}
              className="rounded border border-cursor-border bg-cursor-editor px-2 py-1 text-cursor-text"
              aria-labelledby="settings-theme-label"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto-save"
              checked={settings.autoSave}
              onChange={(e) => updateSettings({ autoSave: e.target.checked })}
              className="rounded border-cursor-border"
            />
            <label htmlFor="auto-save" className="text-cursor-text-muted">Auto Save</label>
          </div>
          <div>
            <label id="settings-terminal-ws-label" htmlFor="settings-terminal-ws" className="mb-1 block text-cursor-text-muted">Terminal: WebSocket URL</label>
            <input
              id="settings-terminal-ws"
              type="text"
              value={settings.terminalWsUrl}
              onChange={(e) => updateSettings({ terminalWsUrl: e.target.value.trim() })}
              placeholder="ws://localhost:31337/pty"
              className="w-full rounded border border-cursor-border bg-cursor-editor px-2 py-1 text-cursor-text placeholder:text-cursor-text-muted"
              aria-labelledby="settings-terminal-ws-label"
            />
            <p className="mt-1 text-[10px] text-cursor-text-muted">
              Started automatically with <code className="rounded bg-cursor-hover px-1">npm run dev</code>. Default: ws://localhost:31337/pty
            </p>
          </div>
          <div>
            <label id="settings-local-server-label" htmlFor="settings-local-server" className="mb-1 block text-cursor-text-muted">Local server URL (Git API)</label>
            <input
              id="settings-local-server"
              type="text"
              value={settings.localServerUrl}
              onChange={(e) => updateSettings({ localServerUrl: e.target.value.trim() })}
              placeholder="http://localhost:31337"
              className="w-full rounded border border-cursor-border bg-cursor-editor px-2 py-1 text-cursor-text placeholder:text-cursor-text-muted"
              aria-labelledby="settings-local-server-label"
            />
          </div>
          <div className="border-t border-cursor-border pt-3">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-cursor-text-muted">Agent</p>
            <div className="space-y-2">
              <div>
                <label id="settings-agent-key-label" htmlFor="settings-agent-key" className="mb-1 block text-cursor-text-muted">API key</label>
                <input
                  id="settings-agent-key"
                  type="password"
                  value={settings.agentApiKey}
                  onChange={(e) => updateSettings({ agentApiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full rounded border border-cursor-border bg-cursor-editor px-2 py-1 text-cursor-text placeholder:text-cursor-text-muted"
                  aria-labelledby="settings-agent-key-label"
                  autoComplete="off"
                />
              </div>
              <div>
                <label id="settings-agent-url-label" htmlFor="settings-agent-url" className="mb-1 block text-cursor-text-muted">API URL</label>
                <input
                  id="settings-agent-url"
                  type="text"
                  value={settings.agentApiUrl}
                  onChange={(e) => updateSettings({ agentApiUrl: e.target.value.trim() })}
                  placeholder="https://api.openai.com/v1"
                  className="w-full rounded border border-cursor-border bg-cursor-editor px-2 py-1 text-cursor-text placeholder:text-cursor-text-muted"
                  aria-labelledby="settings-agent-url-label"
                />
              </div>
              <div>
                <label id="settings-agent-model-label" htmlFor="settings-agent-model" className="mb-1 block text-cursor-text-muted">Model</label>
                <input
                  id="settings-agent-model"
                  type="text"
                  value={settings.agentModel}
                  onChange={(e) => updateSettings({ agentModel: e.target.value.trim() })}
                  placeholder="gpt-4o-mini"
                  className="w-full rounded border border-cursor-border bg-cursor-editor px-2 py-1 text-cursor-text placeholder:text-cursor-text-muted"
                  aria-labelledby="settings-agent-model-label"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
