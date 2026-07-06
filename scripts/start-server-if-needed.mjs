#!/usr/bin/env node
/**
 * Start jollof-server only if nothing is listening on the local port.
 * Lets `npm run tauri:dev` coexist with an existing `npm run dev` session.
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const PORT = Number(process.env.JOLLOF_PORT || process.env.PTY_PORT) || 31337;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, "..", "server", "jollof-server.mjs");

async function isServerUp() {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/health`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

if (await isServerUp()) {
  console.log(`Jollof local server already running on port ${PORT} — reusing it.`);
  // Keep this process alive so concurrently does not treat it as exited.
  await new Promise(() => {});
} else {
  const child = spawn(process.execPath, [serverPath], {
    stdio: "inherit",
    env: process.env,
  });
  child.on("exit", (code) => process.exit(code ?? 1));
}
