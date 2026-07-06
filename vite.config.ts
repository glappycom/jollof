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
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
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
            if (id.includes("@xterm")) return "xterm";
            if (id.includes("@radix-ui")) return "radix";
            if (id.includes("acorn")) return "acorn";
            if (id.includes("react-resizable-panels")) return "panels";
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
