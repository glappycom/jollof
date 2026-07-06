# Jollof IDE — Git, releases, and cloud (DigitalOcean)

## What you're deploying

| Piece | Where it lives | Notes |
|-------|----------------|-------|
| **Source code** | GitHub / GitLab | Single repo; team pushes updates |
| **Browser IDE** | DigitalOcean | Vite build + `jollof-server` (Git, terminal, FS API) |
| **Desktop app** | GitHub Releases (or your site) | `.exe` from `npm run tauri:build` — not hosted on DO |

PTY terminal and Git need the **Node server** (`server/jollof-server.mjs`). A static-only host is not enough for full IDE features.

---

## Part 1 — Put Jollof on Git

### 1. One-time setup

```powershell
cd C:\Users\User\jollof-ide
git init
git branch -M main
```

### 2. Create an empty repo on GitHub

1. [github.com/new](https://github.com/new) → name e.g. `jollof-ide` → **Private** (recommended while iterating)
2. Do **not** add README/license if you already have files locally

### 3. First commit and push

```powershell
git add .
git status
git commit -m "Initial commit: Jollof IDE (browser + Tauri desktop)"
git remote add origin https://github.com/YOUR_USERNAME/jollof-ide.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

### 4. Day-to-day updates

```powershell
git add .
git commit -m "Describe what you changed"
git push
```

On another machine:

```powershell
git clone https://github.com/YOUR_USERNAME/jollof-ide.git
cd jollof-ide
npm install
npm run dev
```

### 5. Never commit secrets

- API keys → user **Preferences** only (localStorage), not in repo
- `.env` files → listed in `.gitignore`
- `.jollof/` → per-machine paths, already ignored

---

## Part 2 — DigitalOcean (cloud browser IDE)

### Recommended layout

```
Users → https://ide.yourdomain.com
         ├── Nginx (HTTPS, static files from Vite build)
         └── /api/* and /pty → Node jollof-server (port 31337)
```

### Option A — Droplet + Docker (most control)

**Good for:** one VPS, predictable cost, full terminal/Git stack.

1. Create a **Droplet** (Ubuntu 24.04, 2 GB RAM minimum for builds; 1 GB OK if you build elsewhere)
2. Point a domain **A record** to the Droplet IP
3. Install Docker on the Droplet
4. Clone repo on the Droplet **or** build image in CI and pull from registry
5. Run:

```bash
git clone https://github.com/YOUR_USERNAME/jollof-ide.git
cd jollof-ide
docker compose up -d --build
```

6. Put **Caddy** or **Nginx** in front with Let's Encrypt (see `docker-compose.yml` comments)

See repo root `Dockerfile` and `docker-compose.yml`.

### Option B — App Platform (managed)

**Good for:** less server admin.

1. **Static site** component → build: `npm run build`, output: `dist`
2. **Worker/service** component → run `node server/jollof-server.mjs`, expose port 31337
3. Configure routing: `/api/*` and `/pty` → service; everything else → static

You must set env on the service:

- `JOLLOF_PORT=31337`
- `JOLLOF_CWD=/app` (or workspace path inside container)

**Caveat:** App Platform WebSockets need to be enabled for the terminal. Droplet + Docker is simpler for PTY.

### Option C — Static only (limited)

Host `dist/` on **Spaces + CDN** or static App Platform — **no real terminal/Git** unless users run `jollof-server` locally (same as today’s hybrid). Fine for a demo landing page, not full IDE.

---

## Part 3 — Desktop releases (optional)

Build Windows installer locally or in **GitHub Actions**:

```powershell
npm run tauri:build
```

Installer: `src-tauri\target\release\bundle\nsis\` or `msi\`

Upload to **GitHub Releases** so users download `.exe` without cloning the repo.

---

## Environment variables (cloud)

| Variable | Default | Purpose |
|----------|---------|---------|
| `JOLLOF_PORT` | `31337` | Server + WebSocket port |
| `JOLLOF_CWD` | process cwd | Default terminal/Git working directory |
| `PORT` | (App Platform sets) | May map to `JOLLOF_PORT` in your start command |

Frontend must know the server URL. Today defaults are `localhost:31337`. For production, set in app settings or build-time env (future: `VITE_LOCAL_SERVER_URL`).

---

## Suggested rollout

1. **GitHub** — push code, protect `main`, use branches for features  
2. **DO Droplet + Docker** — one `ide.yourdomain.com` for beta testers (browser)  
3. **GitHub Releases** — ship Windows desktop `.exe` for offline/native users  
4. Later — CI (build on push), auth, per-user workspaces, Africa CDN edge

---

## Quick checklist

- [ ] `git init` + push to GitHub  
- [ ] Droplet created, SSH access works  
- [ ] Domain DNS → Droplet  
- [ ] `docker compose up` on server  
- [ ] HTTPS certificate  
- [ ] Open `https://ide.yourdomain.com` in Chrome/Edge  
- [ ] Set Agent API key in Preferences (per user)
