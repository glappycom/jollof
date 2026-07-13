import { createContext, useContext, useState, useCallback } from "react";
import type { DebugConfig } from "@/lib/debug-launch";

interface DebugContextValue {
  lines: string[];
  append: (line: string) => void;
  clear: () => void;
  configs: DebugConfig[];
  setConfigs: (configs: DebugConfig[]) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null | ((prev: string | null) => string | null)) => void;
  running: boolean;
  setRunning: (running: boolean) => void;
}

const DebugContext = createContext<DebugContextValue | null>(null);

export function useDebug() {
  const ctx = useContext(DebugContext);
  if (!ctx) {
    return {
      lines: [] as string[],
      append: (_line: string) => {},
      clear: () => {},
      configs: [] as DebugConfig[],
      setConfigs: (_c: DebugConfig[]) => {},
      selectedId: null as string | null,
      setSelectedId: (_id: string | null | ((prev: string | null) => string | null)) => {},
      running: false,
      setRunning: (_r: boolean) => {},
    };
  }
  return ctx;
}

export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<string[]>([]);
  const [configs, setConfigs] = useState<DebugConfig[]>([]);
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const append = useCallback((line: string) => {
    setLines((prev) => [...prev, line]);
  }, []);
  const clear = useCallback(() => setLines([]), []);
  const setSelectedId = useCallback(
    (id: string | null | ((prev: string | null) => string | null)) => {
      setSelectedIdState((prev) => (typeof id === "function" ? id(prev) : id));
    },
    []
  );
  return (
    <DebugContext.Provider
      value={{
        lines,
        append,
        clear,
        configs,
        setConfigs,
        selectedId,
        setSelectedId,
        running,
        setRunning,
      }}
    >
      {children}
    </DebugContext.Provider>
  );
}
