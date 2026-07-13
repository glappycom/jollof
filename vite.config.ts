import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import { readFileSync } from "fs"

const pkg = JSON.parse(readFileSync(path.join(__dirname, "package.json"), "utf-8"))
const host = process.env.TAURI_DEV_HOST

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    // Bind IPv4 so both localhost and 127.0.0.1 work (Windows often makes localhost → ::1 only)
    host: host || "127.0.0.1",
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : { host: "127.0.0.1" },
    watch: {
      ignored: ["**/src-tauri/**"],
    },
    // Browser talks same-origin; Vite forwards API + PTY (Chrome blocks cross-port WS)
    proxy: {
      "/api": {
        target: "http://127.0.0.1:31337",
        changeOrigin: true,
      },
      "/pty": {
        target: "ws://127.0.0.1:31337",
        ws: true,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: process.env.TAURI_ENV_DEBUG ? false : "esbuild",
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@codemirror")) return "codemirror";
            if (id.includes("typescript") && !id.includes("typescript-eslint")) return "typescript";
            if (id.includes("@xterm")) return "xterm";
            if (id.includes("@radix-ui")) return "radix";
            if (id.includes("react-resizable-panels")) return "panels";
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
