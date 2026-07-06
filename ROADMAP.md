# Jollof IDE — Roadmap: Next Level

This plan takes the app from "Cursor-like shell" to a **real daily-driver IDE** and then to a **differentiated product**.

---

## Current state (what you have)

| Area | Status |
|------|--------|
| **Layout** | Grid + resizable sidebars, bottom panel (visible by default), maximized panel/chat |
| **Editor** | CodeMirror 6, JS syntax, find/replace, line numbers, One Dark |
| **Explorer** | File tree (File System Access API), open folder, file icons |
| **Search** | Find in Files (Ctrl+Shift+F), Replace in Files (Ctrl+Shift+H) |
| **Terminal** | xterm.js UI, multi-tabs; **no real shell** (placeholder message) |
| **Agents** | Panel + chat UI in center; **no backend** (messages local only) |
| **Problems** | Panel UI; **no diagnostics** (always "No problems") |
| **Output** | Panel + context; Run Task is a placeholder |
| **Settings** | Font size, tab size, theme (stored but **theme not applied**), auto-save |
| **Persistence** | Settings + sidebar widths in localStorage; **no recent folders** |
| **Top bar search** | Placeholder input; **does not open Find in Files** |

---

## Phase 1 — Foundation (feel like a real IDE)

**Goal:** Core features work end-to-end so the app is usable as a primary editor.

### 1.1 Real terminal
- **Why:** Terminal is the main gap ("No shell connected").
- **Options:** (A) Tauri/Electron + PTY, (B) browser PTY (e.g. xterm.js + WebSocket to a local agent), (C) "Run in terminal" that sends commands to an external shell and streams output.
- **Scope:** At least run commands and show output (e.g. Node/npm scripts, shell commands). Tabs and resize already exist.

### 1.2 Problems panel with real diagnostics
- **Why:** Problems tab is empty; F8 / "Next Problem" are useless without data.
- **Options:** (A) ESLint in the browser (e.g. eslint + ESTree), (B) TypeScript compiler (e.g. ts-api or ts-morph) for TS/JS errors, (C) LSP later.
- **Scope:** Show errors/warnings in Problems, optional inline underlines, and wire **Next Problem (F8)** / **Previous Problem (Shift+F8)** to navigate them.

### 1.3 Apply theme setting
- **Why:** Preferences has Dark/Light but the UI and editor stay dark.
- **Scope:** Toggle CodeMirror theme (e.g. one-dark vs one-light) and global UI (e.g. Tailwind dark/light or CSS vars) from settings.theme.

### 1.4 Open Recent
- **Why:** Users reopen the same folders often.
- **Scope:** Persist last N folder roots (e.g. names + handle tokens if possible, or paths for Tauri/Electron). File → Open Recent (submenu). Re-open via showDirectoryPicker or desktop API.

### 1.5 Wire top bar search
- **Why:** Top bar "Search files..." does nothing.
- **Scope:** On focus or Enter, open the existing Find in Files panel (same as Ctrl+Shift+F). Optional: prefill query from the input.

---

## Phase 2 — Productivity (daily use)

**Goal:** Navigation, editing, and workflows match how people work in Cursor/VS Code.

### 2.1 Go to Symbol (Ctrl+Shift+O)
- **Why:** Quick jump to functions/classes in the current file.
- **Scope:** Outline from CodeMirror (e.g. @codemirror/language + parser) or a simple regex/ESTree pass for JS/TS. Dropdown or panel listing symbols; select → go to line.

### 2.2 Back / Forward (Alt+Left / Alt+Right)
- **Why:** Standard navigation after "Go to definition" or "Go to file".
- **Scope:** Stack of (fileId, line, column) or (path, position). On "Go to file/line/symbol" push current; on Back pop and go; Forward is second stack.

### 2.3 Source Control (Ctrl+Shift+G)
- **Why:** Git is central to dev workflow.
- **Scope:** In browser: use Git REST (e.g. GitHub) or read-only status. With Tauri/Electron: run git status / git diff and show in a sidebar (changed files, diff view or list). Start with status + list; add staging/commit when backend allows.

### 2.4 Language-aware editor
- **Why:** Only JS is supported; other files are plain text.
- **Scope:** Add more @codemirror/lang-* (e.g. lang-json, lang-html, lang-css, lang-markdown, lang-typescript). Choose language by file extension (and optional manual override).

### 2.5 Tab size in editor
- **Why:** Settings has "Tab size" but CodeMirror does not use it.
- **Scope:** Pass settings.tabSize into the editor (e.g. indentUnit, tab display).

---

## Phase 3 — Differentiation (agents and AI)

**Goal:** Make "Agents" and AI features real value, not just UI.

### 3.1 Agent backend
- **Why:** Agent chat is local-only; no real answers or actions.
- **Scope:** Connect to an API (e.g. Cursor-style agent, or OpenAI/Anthropic with a "dev" prompt). Send conversation + optional context (selection, file, workspace). Stream responses into AgentChatView. Optional: "Plan", "@ file", "/ commands" parsing.

### 3.2 Context from editor
- **Why:** Agents need code context.
- **Scope:** "@ file" or "add selection" sends current file or selection to the agent. Optionally list open files and workspace roots for inclusion.

### 3.3 Terminal + agents
- **Why:** "Ctrl+K to generate command" is a natural fit.
- **Scope:** When terminal is focused or a shortcut is used, call agent with "suggest shell command for: [user intent or selection]" and insert or run the suggestion.

### 3.4 Browse Solutions
- **Why:** Solutions modal is placeholder.
- **Scope:** Curated list with links or embedded templates (e.g. "Next.js app", "CLI tool"). Optional: one-click "Apply" that creates files in the workspace.

---

## Phase 4 — Polish and scale

**Goal:** Professional feel, performance, and extensibility.

### 4.1 Run / Debug
- **Why:** Run menu has placeholders; no debugging.
- **Scope:** "Run active file" (e.g. Node for .js/.ts via backend or runScript). "Start Debugging" (F5): simple breakpoints (e.g. store in state), pause on line, and Debug Console (evaluate in scope). Full DAP later.

### 4.2 Tasks (tasks.json)
- **Why:** Run Task is a stub.
- **Scope:** Read tasks.json from workspace (or default). List tasks in a quick-pick; run in terminal (when real terminal exists) or via backend.

### 4.3 Multi-root workspace
- **Why:** TODO lists "Add Folder to Workspace", "Save Workspace As...".
- **Scope:** Support multiple roots in the file tree and in search/replace. Optional .code-workspace load/save.

### 4.4 Performance and large files
- **Why:** Single editor instance; huge files could lag.
- **Scope:** Virtualize or limit open size (e.g. "File too large to edit"), and lazy-load file tree children (already partially there).

### 4.5 Keyboard Shortcuts / Preferences submenu
- **Why:** Users expect to see and change shortcuts.
- **Scope:** File → Preferences → Keyboard Shortcuts: list commands + shortcuts; optional rebind (stored in settings).

### 4.6 Extensions (optional, long-term)
- **Why:** Cursor/VS Code power comes from extensions.
- **Scope:** Define a minimal extension API (e.g. "register command", "add panel", "provide diagnostics") and load one or two sample extensions. Low priority until Phases 1–3 are solid.

---

## Suggested order (next 3–6 months)

| Priority | Item | Phase | Rationale |
|----------|------|--------|------------|
| 1 | Real terminal (or "run command") | 1.1 | Biggest UX gap |
| 2 | Problems + diagnostics (ESLint/TS) | 1.2 | Makes Problems and F8 useful |
| 3 | Apply theme (dark/light) | 1.3 | Quick win; settings already exist |
| 4 | Open Recent | 1.4 | High impact, moderate effort |
| 5 | Wire top bar search | 1.5 | Quick win |
| 6 | Go to Symbol (Ctrl+Shift+O) | 2.1 | Daily navigation |
| 7 | Back / Forward | 2.2 | Complements Go to File/Line/Symbol |
| 8 | Tab size in editor | 2.5 | Small; settings already there |
| 9 | More languages (JSON, HTML, CSS, MD, TS) | 2.4 | Broader use |
| 10 | Source Control (read-only or basic Git) | 2.3 | Expected in an IDE |
| 11 | Agent backend + context | 3.1–3.2 | Differentiation |
| 12 | Run active file / Run Task (real) | 4.1–4.2 | After terminal is real |

---

## Technical notes

- **Browser limits:** File System Access API is Chromium; no real PTY in browser. For a "next level" terminal and some run/debug features, **Tauri or Electron** is the natural step.
- **State:** Most state lives in Index.tsx. Consider moving workspace, layout, and panel state into context or a small store (e.g. Zustand) as features grow.
- **TODO.md:** Keep it as the single source of menu/command leftovers; this roadmap is the strategic plan. Mark items done in TODO as you complete them (e.g. Replace in Files is already done).

Use this as a living plan: tick off items as you ship them and adjust order based on whether you stay web-only or add a desktop backend first.
