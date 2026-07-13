import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { terminalWsUrlCandidates } from "@/lib/local-server";

const PROMPT = "\r\n$ ";
const MAX_RECONNECT_ATTEMPTS = 8;
const BASE_RECONNECT_MS = 1500;

const TERM_THEME = {
  background: "#1e1e1e",
  foreground: "#cccccc",
  cursor: "#8a898c",
  cursorAccent: "#1e1e1e",
  selectionBackground: "#2a2d2e",
};

export interface TerminalViewHandle {
  write: (data: string) => void;
  writeln: (data: string) => void;
  clear: () => void;
}

interface TerminalViewProps {
  onRunCommand?: (command: string) => void;
  /** Preferred WebSocket URL; fallbacks are tried automatically. */
  wsUrl?: string;
  /** Working directory sent to PTY server on connect. */
  cwd?: string;
}

const TerminalView = forwardRef<TerminalViewHandle, TerminalViewProps>(
  function TerminalView({ onRunCommand, wsUrl, cwd }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal | null>(null);
    const fitRef = useRef<FitAddon | null>(null);
    const onRunCommandRef = useRef(onRunCommand);
    const cwdRef = useRef(cwd);
    onRunCommandRef.current = onRunCommand;
    cwdRef.current = cwd;

    useImperativeHandle(
      ref,
      () => ({
        write: (data: string) => terminalRef.current?.write(data),
        writeln: (data: string) => terminalRef.current?.writeln(data),
        clear: () => terminalRef.current?.clear(),
      }),
      []
    );

    useEffect(() => {
      if (!containerRef.current) return;

      const term = new Terminal({
        theme: TERM_THEME,
        fontFamily:
          '"IBM Plex Mono", "Cascadia Code", Consolas, Monaco, "Courier New", monospace',
        fontSize: 12,
        cursorBlink: true,
        cursorStyle: "bar",
        scrollback: 1000,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current);
      fitAddon.fit();

      const candidates = terminalWsUrlCandidates(wsUrl);
      let candidateIndex = 0;
      let line = "";
      let socket: WebSocket | null = null;
      let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
      let disposed = false;
      let attempts = 0;
      let lastStatus = "";
      let generation = 0;
      let openedOnce = false;

      const status = (msg: string) => {
        if (msg === lastStatus) return;
        lastStatus = msg;
        term.writeln(`\r\n\x1b[90m[${msg}]\x1b[0m`);
      };

      const currentUrl = () => candidates[candidateIndex] || "";

      const sendInit = () => {
        if (socket?.readyState !== WebSocket.OPEN) return;
        const { cols, rows } = fitAddon.proposeDimensions() ?? { cols: 80, rows: 24 };
        const workDir = cwdRef.current?.trim() || "";
        socket.send(
          JSON.stringify({
            type: "init",
            cols,
            rows,
            ...(workDir ? { cwd: workDir } : {}),
          })
        );
      };

      const sendResize = () => {
        if (socket?.readyState === WebSocket.OPEN) {
          const { cols, rows } = fitAddon.proposeDimensions() ?? { cols: 80, rows: 24 };
          socket.send(JSON.stringify({ type: "resize", cols, rows }));
        }
      };

      const scheduleReconnect = (gen: number) => {
        if (disposed || gen !== generation) return;
        if (attempts >= MAX_RECONNECT_ATTEMPTS) {
          status(
            `Gave up after trying: ${candidates.join(" · ")}. Run npm run dev, hard-refresh (Ctrl+Shift+R).`
          );
          return;
        }
        // Rotate through candidate URLs before backing off hard
        if (!openedOnce && candidates.length > 1) {
          candidateIndex = (candidateIndex + 1) % candidates.length;
        }
        const delay = Math.min(BASE_RECONNECT_MS * Math.pow(1.35, attempts), 8_000);
        attempts += 1;
        reconnectTimer = setTimeout(() => connect(gen), delay);
      };

      const connect = (gen: number) => {
        const url = currentUrl();
        if (!url || disposed || gen !== generation) return;
        try {
          const ws = new WebSocket(url);
          socket = ws;
          ws.binaryType = "arraybuffer";
          ws.onopen = () => {
            if (gen !== generation) {
              ws.close();
              return;
            }
            openedOnce = true;
            attempts = 0;
            lastStatus = "";
            term.clear();
            term.writeln(`\x1b[90mConnected · ${url}\x1b[0m`);
            sendInit();
          };
          ws.onmessage = (e) => {
            if (gen !== generation) return;
            const data = typeof e.data === "string" ? e.data : new TextDecoder().decode(e.data);
            if (data.startsWith('{"type":"ready"') || data.startsWith('{"type":"error"')) return;
            term.write(data);
          };
          ws.onclose = () => {
            if (disposed || gen !== generation) return;
            if (socket === ws) socket = null;
            status(`Disconnected — retry ${currentUrl()}`);
            scheduleReconnect(gen);
          };
          ws.onerror = () => {
            if (disposed || gen !== generation) return;
            status(`Connection error · ${url}`);
          };
        } catch {
          status(`Invalid WebSocket URL · ${url}`);
          scheduleReconnect(gen);
        }
      };

      if (candidates.length > 0) {
        const gen = ++generation;
        status(`Connecting · ${currentUrl()}`);
        connect(gen);
      } else {
        term.writeln("Terminal — set WebSocket URL in Preferences or run npm run dev.");
        term.write(PROMPT);
      }

      term.onData((data) => {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(data);
          return;
        }
        if (data === "\r" || data === "\n") {
          term.writeln("");
          const cmd = line.trim();
          line = "";
          term.write(PROMPT);
          if (cmd === "clear") {
            term.clear();
            term.write(PROMPT);
          } else if (cmd) {
            term.writeln(`\x1b[90m${cmd}\x1b[0m`);
            onRunCommandRef.current?.(cmd);
          }
        } else if (data === "\u007F") {
          if (line.length > 0) {
            line = line.slice(0, -1);
            term.write("\b \b");
          }
        } else {
          line += data;
          term.write(data);
        }
      });

      terminalRef.current = term;
      fitRef.current = fitAddon;

      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
        sendResize();
      });
      resizeObserver.observe(containerRef.current);

      return () => {
        disposed = true;
        generation += 1;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        try {
          socket?.close();
        } catch {
          /* ignore */
        }
        socket = null;
        resizeObserver.disconnect();
        term.dispose();
        terminalRef.current = null;
        fitRef.current = null;
      };
    }, [wsUrl]);

    return (
      <div
        ref={containerRef}
        className="terminal-view h-full w-full min-h-[100px] overflow-hidden px-2 pt-1.5 pb-2"
      />
    );
  }
);

export default TerminalView;
