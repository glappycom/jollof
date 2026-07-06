#!/usr/bin/env node
/**
 * Start Vite only if the dev server is not already running.
 * Used by `tauri dev` so it can attach to an existing `npm run dev` session.
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const PORT = Number(process.env.VITE_PORT) || 5173;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

async function isViteUp() {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

if (await isViteUp()) {
  console.log(`Vite dev server already running on port ${PORT} — reusing it.`);
  await new Promise(() => {});
} else {
  const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(process.execPath, [viteBin], {
    stdio: "inherit",
    env: process.env,
    cwd: root,
  });
  child.on("exit", (code) => process.exit(code ?? 1));
}
