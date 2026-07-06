import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

const PROMPT = "\r\n$ ";

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
  /** WebSocket URL for real PTY (default ws://localhost:31337/pty). */
  wsUrl?: string;
  /** Working directory sent to PTY server on connect. */
  cwd?: string;
}

const TerminalView = forwardRef<TerminalViewHandle, TerminalViewProps>(
  function TerminalView({ onRunCommand, wsUrl, cwd }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal | null>(null);
    const fitRef = useRef<FitAddon | null>(null);

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
        fontFamily: '"IBM Plex Mono", "Cascadia Code", Consolas, Monaco, "Courier New", monospace',
        fontSize: 12,
        cursorBlink: true,
        cursorStyle: "bar",
        scrollback: 1000,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current);
      fitAddon.fit();

      const url = wsUrl?.trim() || "";
      let line = "";
      let socket: WebSocket | null = null;
      let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
      let disposed = false;

      const sendInit = () => {
        if (socket?.readyState !== WebSocket.OPEN || !fitRef.current) return;
        const { cols, rows } = fitAddon.proposeDimensions() ?? { cols: 80, rows: 24 };
        socket.send(
          JSON.stringify({
            type: "init",
            cols,
            rows,
            ...(cwd?.trim() ? { cwd: cwd.trim() } : {}),
          })
        );
      };

      const sendResize = () => {
        if (socket?.readyState === WebSocket.OPEN && fitRef.current) {
          const { cols, rows } = fitAddon.proposeDimensions() ?? { cols: 80, rows: 24 };
          socket.send(JSON.stringify({ type: "resize", cols, rows }));
        }
      };

      const connect = () => {
        if (!url || disposed) return;
        try {
          socket = new WebSocket(url);
          socket.binaryType = "arraybuffer";
          socket.onopen = () => {
            term.clear();
            sendInit();
          };
          socket.onmessage = (e) => {
            const data = typeof e.data === "string" ? e.data : new TextDecoder().decode(e.data);
            if (data.startsWith('{"type":"ready"')) return;
            term.write(data);
          };
          socket.onclose = () => {
            if (disposed) return;
            term.writeln("\r\n\x1b[90m[Disconnected — reconnecting…]\x1b[0m");
            reconnectTimer = setTimeout(connect, 2000);
          };
          socket.onerror = () => {
            if (disposed) return;
            term.writeln("\r\n\x1b[90m[Connection error — is npm run dev running?]\x1b[0m");
          };
        } catch {
          term.writeln("\r\n\x1b[90m[Invalid WebSocket URL]\x1b[0m");
        }
      };

      if (url) {
        connect();
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
            onRunCommand?.(cmd);
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
        if (reconnectTimer) clearTimeout(reconnectTimer);
        socket?.close();
        resizeObserver.disconnect();
        term.dispose();
        terminalRef.current = null;
        fitRef.current = null;
      };
    }, [onRunCommand, wsUrl, cwd]);

    return (
      <div
        ref={containerRef}
        className="terminal-view h-full w-full min-h-[100px] overflow-hidden px-2 pt-1.5 pb-2"
      />
    );
  }
);

export default TerminalView;
