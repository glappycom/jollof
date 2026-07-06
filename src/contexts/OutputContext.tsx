import { createContext, useContext, useState, useCallback } from "react";

const OutputContext = createContext<{
  lines: string[];
  append: (line: string) => void;
  clear: () => void;
} | null>(null);

export function useOutput() {
  const ctx = useContext(OutputContext);
  if (!ctx) return { lines: [], append: () => {}, clear: () => {} };
  return ctx;
}

export function OutputProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<string[]>([]);
  const append = useCallback((line: string) => {
    setLines((prev) => [...prev, line]);
  }, []);
  const clear = useCallback(() => setLines([]), []);
  return (
    <OutputContext.Provider value={{ lines, append, clear }}>
      {children}
    </OutputContext.Provider>
  );
}
