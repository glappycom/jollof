#!/usr/bin/env node
/**
 * Serve Vite build (static) + jollof-server (API/PTY) in one container.
 */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
const staticPort = Number(process.env.STATIC_PORT) || 8080;
const apiPort = Number(process.env.JOLLOF_PORT) || 31337;

const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  const type = mime[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type });
  fs.createReadStream(filePath).pipe(res);
}

const staticServer = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  let filePath = path.join(dist, urlPath === "/" ? "index.html" : urlPath);
  if (!filePath.startsWith(dist)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    sendFile(res, filePath);
    return;
  }
  sendFile(res, path.join(dist, "index.html"));
});

staticServer.listen(staticPort, () => {
  console.log(`Jollof static UI http://0.0.0.0:${staticPort}`);
});

const serverProc = spawn(process.execPath, [path.join(root, "server", "jollof-server.mjs")], {
  stdio: "inherit",
  env: { ...process.env, JOLLOF_PORT: String(apiPort) },
});

serverProc.on("exit", (code) => {
  console.error(`jollof-server exited with ${code}`);
  process.exit(code ?? 1);
});

process.on("SIGTERM", () => serverProc.kill("SIGTERM"));
process.on("SIGINT", () => serverProc.kill("SIGINT"));
