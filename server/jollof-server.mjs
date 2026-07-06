#!/usr/bin/env node
/**
 * Jollof IDE local server — PTY terminal + Git API.
 * Run: node server/jollof-server.mjs  (or npm run dev / npm run terminal:server)
 *
 * - WebSocket PTY: ws://localhost:31337/pty
 * - Git REST API:  http://localhost:31337/api/git/*
 *
 * Requires: node-pty, ws (devDependencies)
 */

import http from "http";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pty = require("node-pty");

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.JOLLOF_PORT || process.env.PTY_PORT) || 31337;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CWD = process.env.JOLLOF_CWD || process.cwd();

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "__pycache__", ".venv"]);

const shell = process.platform === "win32" ? "cmd.exe" : process.env.SHELL || "bash";
const shellArgs = process.platform === "win32" ? ["/K"] : [];
/** WinPTY fallback avoids ConPTY "AttachConsole failed" in some terminals (incl. Node 24). */
const USE_CONPTY = process.env.JOLLOF_USE_CONPTY === "1";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, status, body) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function resolveCwd(cwd) {
  const base = (cwd && String(cwd).trim()) || DEFAULT_CWD;
  const resolved = path.resolve(base);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Directory not found: ${resolved}`);
  }
  return resolved;
}

function resolveFilePath(cwd, rel) {
  const root = resolveCwd(cwd);
  const relNorm = String(rel || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const full = path.resolve(root, relNorm);
  const relCheck = path.relative(root, full);
  if (relCheck.startsWith("..") || path.isAbsolute(relCheck)) {
    throw new Error("Path escapes workspace");
  }
  return full;
}

function listDirectoryEntries(cwd, rel, rootName) {
  const dirPath = rel ? resolveFilePath(cwd, rel) : resolveCwd(cwd);
  if (!fs.statSync(dirPath).isDirectory()) {
    throw new Error("Not a directory");
  }
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const nodes = [];
  for (const entry of entries) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    const treePath = `${rootName}/${relPath.replace(/\\/g, "/")}`;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      nodes.push({ kind: "directory", name: entry.name, path: treePath, relPath });
    } else if (entry.isFile()) {
      nodes.push({ kind: "file", name: entry.name, path: treePath, relPath });
    }
  }
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
  return nodes;
}

async function runGit(args, cwd) {
  const workDir = resolveCwd(cwd);
  try {
    const { stdout, stderr } = await execFileAsync("git", args, {
      cwd: workDir,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    });
    return (stdout || stderr || "").trimEnd();
  } catch (err) {
    const msg = err.stderr?.toString?.() || err.message || "git failed";
    throw new Error(msg.trim());
  }
}

function parseStatus(porcelain) {
  const files = [];
  for (const line of porcelain.split("\n")) {
    if (!line.trim()) continue;
    const xy = line.slice(0, 2);
    let filePath = line.slice(3);
    if (filePath.includes(" -> ")) filePath = filePath.split(" -> ").pop();
    const index = xy[0];
    const workTree = xy[1];
    let status = "modified";
    if (index === "?" && workTree === "?") status = "untracked";
    else if (index !== " " && workTree === " ") status = "staged";
    else if (index === " " && workTree !== " ") status = "modified";
    else if (index !== " " && workTree !== " ") status = "staged";
    files.push({ path: filePath, status, staged: index !== " " && index !== "?" });
  }
  return files;
}

async function handleGitApi(req, res, url) {
  if (req.method === "OPTIONS") {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (url.pathname === "/api/health" && req.method === "GET") {
      const folderName = url.searchParams.get("folderName") || "";
      const cwdBase = url.searchParams.get("cwd") || DEFAULT_CWD;
      const cwd = resolveCwd(cwdBase);
      const basename = path.basename(cwd);
      sendJson(res, 200, {
        ok: true,
        cwd,
        basename,
        matchesFolder: folderName ? basename.toLowerCase() === folderName.toLowerCase() : false,
      });
      return;
    }

    if (url.pathname === "/api/git/status" && req.method === "GET") {
      const cwd = url.searchParams.get("cwd") || DEFAULT_CWD;
      const out = await runGit(["status", "--porcelain=v1", "-u"], cwd);
      const branch = await runGit(["rev-parse", "--abbrev-ref", "HEAD"], cwd).catch(() => "");
      sendJson(res, 200, { branch, files: parseStatus(out) });
      return;
    }

    if (url.pathname === "/api/git/diff" && req.method === "GET") {
      const cwd = url.searchParams.get("cwd") || DEFAULT_CWD;
      const filePath = url.searchParams.get("path") || "";
      const staged = url.searchParams.get("staged") === "true";
      if (!filePath) {
        sendJson(res, 400, { error: "path required" });
        return;
      }
      const args = staged ? ["diff", "--cached", "--", filePath] : ["diff", "--", filePath];
      const diff = await runGit(args, cwd);
      sendJson(res, 200, { diff });
      return;
    }

    if (url.pathname === "/api/git/stage" && req.method === "POST") {
      const body = await readBody(req);
      const cwd = body.cwd || DEFAULT_CWD;
      const paths = body.paths || [];
      if (!paths.length) {
        sendJson(res, 400, { error: "paths required" });
        return;
      }
      await runGit(["add", "--", ...paths], cwd);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === "/api/git/unstage" && req.method === "POST") {
      const body = await readBody(req);
      const cwd = body.cwd || DEFAULT_CWD;
      const paths = body.paths || [];
      if (!paths.length) {
        sendJson(res, 400, { error: "paths required" });
        return;
      }
      await runGit(["reset", "HEAD", "--", ...paths], cwd);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === "/api/git/commit" && req.method === "POST") {
      const body = await readBody(req);
      const cwd = body.cwd || DEFAULT_CWD;
      const message = (body.message || "").trim();
      if (!message) {
        sendJson(res, 400, { error: "message required" });
        return;
      }
      const out = await runGit(["commit", "-m", message], cwd);
      sendJson(res, 200, { ok: true, output: out });
      return;
    }

    if (url.pathname === "/api/fs/list" && req.method === "GET") {
      const cwd = url.searchParams.get("cwd") || DEFAULT_CWD;
      const rel = url.searchParams.get("rel") || "";
      const rootName = url.searchParams.get("rootName") || path.basename(resolveCwd(cwd));
      const entries = listDirectoryEntries(cwd, rel, rootName);
      sendJson(res, 200, { entries });
      return;
    }

    if (url.pathname === "/api/fs/read" && req.method === "GET") {
      const cwd = url.searchParams.get("cwd") || DEFAULT_CWD;
      const rel = url.searchParams.get("rel") || "";
      if (!rel) {
        sendJson(res, 400, { error: "rel required" });
        return;
      }
      const filePath = resolveFilePath(cwd, rel);
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        sendJson(res, 404, { error: "File not found" });
        return;
      }
      const content = fs.readFileSync(filePath, "utf8");
      sendJson(res, 200, { content });
      return;
    }

    if (url.pathname === "/api/fs/write" && req.method === "POST") {
      const body = await readBody(req);
      const cwd = body.cwd || DEFAULT_CWD;
      const rel = body.rel || "";
      const content = body.content ?? "";
      if (!rel) {
        sendJson(res, 400, { error: "rel required" });
        return;
      }
      const filePath = resolveFilePath(cwd, rel);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, "utf8");
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    sendJson(res, 500, { error: err.message || "Server error" });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  if (url.pathname.startsWith("/api/")) {
    await handleGitApi(req, res, url);
    return;
  }
  cors(res);
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Jollof IDE local server. WS: /pty · API: /api/git/*");
});

const wss = new WebSocketServer({ server, path: "/pty" });

wss.on("connection", (ws) => {
  let ptyProcess = null;
  let spawned = false;

  const spawnPty = (cols, rows, cwd) => {
    if (spawned) return;
    spawned = true;
    let workDir;
    try {
      workDir = resolveCwd(cwd);
    } catch (err) {
      spawned = false;
      if (ws.readyState === 1) {
        ws.send(`\r\n\x1b[31m[Jollof] ${err.message}\x1b[0m\r\n`);
      }
      return;
    }

    try {
      const spawnOpts = {
        name: "xterm-256color",
        cols: cols || 80,
        rows: rows || 24,
        cwd: workDir,
        env: { ...process.env, TERM: "xterm-256color" },
      };
      if (process.platform === "win32") {
        spawnOpts.useConpty = USE_CONPTY;
      }
      ptyProcess = pty.spawn(shell, shellArgs, spawnOpts);

      ptyProcess.onData((data) => {
        if (ws.readyState === 1) ws.send(data);
      });

      ptyProcess.onExit(() => {
        try {
          ws.close();
        } catch {}
      });
    } catch (err) {
      spawned = false;
      const message = err?.message || "PTY spawn failed";
      console.error("[jollof-server] PTY error:", message);
      if (ws.readyState === 1) {
        ws.send(
          `\r\n\x1b[31m[Jollof] Terminal unavailable: ${message}\x1b[0m\r\n` +
            `Git and file APIs still work. Restart from PowerShell/CMD if needed.\r\n`
        );
        ws.send(JSON.stringify({ type: "error", message }));
      }
    }
  };

  const initTimer = setTimeout(() => {
    spawnPty(80, 24, DEFAULT_CWD);
  }, 1500);

  ws.on("message", (raw) => {
    const data = raw.toString();
    if (data.startsWith("{")) {
      try {
        const msg = JSON.parse(data);
        if (msg.type === "init" && !spawned) {
          clearTimeout(initTimer);
          spawnPty(msg.cols, msg.rows, msg.cwd || DEFAULT_CWD);
          if (ws.readyState === 1) ws.send(JSON.stringify({ type: "ready" }));
          return;
        }
        if (msg.type === "resize" && ptyProcess && typeof msg.cols === "number" && typeof msg.rows === "number") {
          ptyProcess.resize(msg.cols, msg.rows);
        }
      } catch {}
      return;
    }
    if (ptyProcess) ptyProcess.write(data);
  });

  ws.on("close", () => {
    clearTimeout(initTimer);
    ptyProcess?.kill();
  });
});

// Legacy bare WebSocket on same port (no path) for older clients
server.listen(PORT, () => {
  console.log(`Jollof local server http://localhost:${PORT}`);
  console.log(`  PTY:  ws://localhost:${PORT}/pty`);
  console.log(`  Git:  http://localhost:${PORT}/api/git/status?cwd=...`);
  console.log(`  FS:   http://localhost:${PORT}/api/fs/list?cwd=...`);
  console.log(`  CWD:  ${DEFAULT_CWD}`);
});
