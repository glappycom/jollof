# Jollof IDE — Desktop (Tauri)

Jollof ships as a **browser app** and a **desktop app** from the same codebase. You can keep iterating in the browser while testing the desktop shell.

## Prerequisites

1. **Node.js** — already used for `npm run dev`
2. **Rust** — required for the Tauri shell ([rustup.rs](https://rustup.rs/))
3. **Windows:** [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually pre-installed on Windows 10/11)

Install Rust (one time):

```powershell
# After installing from https://rustup.rs, restart your terminal, then:
rustc --version
cargo --version
```

## Two ways to run

| Command | What it does |
|---------|----------------|
| `npm run dev` | **Browser** — local server + Vite (unchanged; fastest iteration) |
| `npm run tauri:dev` | **Desktop** — reuses local server if already running, else starts it + Tauri window |
| `npm run tauri:app` | **Desktop only** — when `npm run dev` is already running in another terminal |

Build an installable app:

```powershell
npm run tauri:build
```

Installer output: `src-tauri/target/release/bundle/`

## Desktop vs browser

| Feature | Browser | Desktop (Tauri) |
|---------|---------|-----------------|
| Open folder | File System Access API picker | Native folder dialog |
| Disk path for Git/terminal | `.jollof/workspace-path` or manual | Auto from folder dialog |
| File read/write | Browser handles | Local server FS API |
| Hot reload | Vite HMR | Same — edits to `src/` reload in the window |

The local server (`server/jollof-server.mjs`) still runs for **PTY terminal**, **Git**, and **desktop file I/O** on port `31337`.

## Typical workflow

1. **Day-to-day edits:** `npm run dev` → Chrome/Edge at `http://localhost:5173`
2. **Test desktop:** `npm run tauri:dev` → native window
3. Same repo, same `src/` — no separate project

## Troubleshooting

**`rustc` not found**  
Install Rust via [rustup.rs](https://rustup.rs/) and open a new terminal.

**First `tauri:dev` is slow**  
Cargo compiles dependencies once; later runs are much faster.

**Terminal/Git errors in desktop**  
Ensure `npm run tauri:dev` started the local server (you should see port `31337` in the terminal). Open a folder via **File → Open Folder** so Git gets the absolute path.

**`Could not resolve host: index.crates.io`**  
Cargo needs internet on the **first** desktop build to download Rust crates (~hundreds of MB). This is a network/DNS issue, not a Jollof bug.

**Step 1 — diagnose:**

```powershell
npm run tauri:net-check
```

**Step 2 — fixes (try in order):**

1. **Change DNS** (most common fix on flaky ISPs):
   - Windows 11: Settings → Network & Internet → Wi‑Fi/Ethernet → your network → DNS → Edit → Manual → **1.1.1.1** and **1.0.0.1** (or **8.8.8.8**)
   - Then in PowerShell: `ipconfig /flushdns`
2. **Retry:** `npm run tauri:app`
3. **GitHub index fallback** — the repo includes `.cargo/config.toml` so Cargo uses GitHub’s crate index when `index.crates.io` DNS fails. Pull latest and retry.
4. **Test another network** — phone hotspot rules out router/ISP DNS issues.
5. **VPN/proxy off** — or set `$env:HTTP_PROXY` / `$env:HTTPS_PROXY` if required.

Until desktop builds, **`npm run dev`** in Chrome/Edge is the full IDE.

**Port 31337 in use (`EADDRINUSE`)**  
Another Jollof server is already running (usually from `npm run dev` in another terminal). Either:
- Stop that terminal (`Ctrl+C`), then run `npm run tauri:dev` again, or
- Keep `npm run dev` running and use `npm run tauri:app` to launch only the desktop window.

**Port 5173 in use**  
Stop other Vite instances or change the port in `vite.config.ts` and `src-tauri/tauri.conf.json` `devUrl`.

## Phase D roadmap

- **D1 (this)** — Tauri shell, native open folder, FS via local server
- **D2** — Agent-run terminal commands
- **D3** — Smarter `@codebase` (full-tree + IDF retrieval shipped; embeddings optional later)
- **D4** — Africa defaults (DeepSeek, offline models)
