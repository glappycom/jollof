#!/usr/bin/env node
/**
 * Serve Vite build (static) + proxy /api and /pty to jollof-server.
 */

import http from "http";
import fs from "fs";
import path from "path";
import net from "net";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
const staticPort = Number(process.env.STATIC_PORT) || 8080;
const apiPort = Number(process.env.JOLLOF_PORT) || 31337;
const API_HOST = "127.0.0.1";

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

function proxyHttp(req, res) {
  const headers = { ...req.headers, host: `${API_HOST}:${apiPort}` };
  const upstream = http.request(
    {
      hostname: API_HOST,
      port: apiPort,
      path: req.url,
      method: req.method,
      headers,
    },
    (upRes) => {
      res.writeHead(upRes.statusCode || 502, upRes.headers);
      upRes.pipe(res);
    }
  );
  upstream.on("error", (err) => {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end(`Bad gateway to API: ${err.message}`);
  });
  req.pipe(upstream);
}

const staticServer = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);

  if (urlPath === "/api" || urlPath.startsWith("/api/")) {
    proxyHttp(req, res);
    return;
  }

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

// WebSocket upgrade → jollof-server /pty
staticServer.on("upgrade", (req, socket, head) => {
  const urlPath = (req.url || "").split("?")[0];
  if (urlPath !== "/pty" && !urlPath.startsWith("/pty?")) {
    socket.destroy();
    return;
  }

  const upstream = net.connect(apiPort, API_HOST, () => {
    const reqLines = [
      `GET ${req.url || "/pty"} HTTP/1.1`,
      `Host: ${API_HOST}:${apiPort}`,
      "Connection: Upgrade",
      "Upgrade: websocket",
    ];
    for (const [key, value] of Object.entries(req.headers)) {
      if (!value) continue;
      const k = key.toLowerCase();
      if (k === "host" || k === "connection" || k === "upgrade") continue;
      if (Array.isArray(value)) {
        for (const v of value) reqLines.push(`${key}: ${v}`);
      } else {
        reqLines.push(`${key}: ${value}`);
      }
    }
    upstream.write(reqLines.join("\r\n") + "\r\n\r\n");
    if (head && head.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });

  upstream.on("error", () => {
    try {
      socket.write("HTTP/1.1 502 Bad Gateway\r\n\r\n");
    } catch {
      /* ignore */
    }
    socket.destroy();
  });
  socket.on("error", () => upstream.destroy());
});

staticServer.listen(staticPort, "0.0.0.0", () => {
  console.log(`Jollof static UI http://0.0.0.0:${staticPort} (proxies /api + /pty → :${apiPort})`);
});

const serverProc = spawn(process.execPath, [path.join(root, "server", "jollof-server.mjs")], {
  stdio: "inherit",
  env: { ...process.env, JOLLOF_PORT: String(apiPort) },
});

serverProc.on("exit", (code) => {
  console.error(`jollof-server exited with ${code}`);
  if (code !== 0) {
    console.error("API/terminal unavailable; static UI may still work on port", staticPort);
  }
});

process.on("SIGTERM", () => serverProc.kill("SIGTERM"));
process.on("SIGINT", () => serverProc.kill("SIGINT"));
