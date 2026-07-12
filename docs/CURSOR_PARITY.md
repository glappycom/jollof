# Cursor Parity Checklist

Living tracker for Jollof vs Cursor core capabilities. Update as features ship.

**Legend:** ✅ Done · 🟡 Partial · ⬜ Not started

Last updated: 2026-07-12

---

## Layout & shell

| Capability | Status | Notes |
|------------|--------|-------|
| Resizable sidebars + bottom panel | ✅ | Grid layout, maximize chat/panel |
| Editor tabs | ✅ | Dirty indicator, close |
| Command palette | ✅ | Ctrl+Shift+P |
| Menu bar (File, Edit, View, …) | 🟡 | Many items stubbed — see `TODO.md` |
| Status bar | ✅ | Line/col, basic info |
| Dark / light theme | 🟡 | Theme sync exists; polish ongoing |
| Orange / Jollof accent | ✅ | Replaces default blue accent |

---

## Editor

| Capability | Status | Notes |
|------------|--------|-------|
| Syntax highlighting | 🟡 | JavaScript only |
| Find / replace in editor | ✅ | CodeMirror search |
| Go to line | ✅ | Ctrl+G |
| Go to symbol | 🟡 | Basic symbol list |
| Multi-language support | ⬜ | JSON, TS, Python, etc. |
| LSP / IntelliSense | ⬜ | — |
| Tab completion (Copilot++) | ⬜ | — |
| Inline edit (Cmd+K) | ✅ | Ctrl+K modal; `jollof-inline` accept/reject |
| Split editor | ⬜ | — |

---

## Workspace & files

| Capability | Status | Notes |
|------------|--------|-------|
| Open folder | ✅ | File System Access API |
| File tree + lazy dirs | ✅ | Skips node_modules, .git |
| Save / Save As | ✅ | Needs file handle |
| Open Recent | 🟡 | Recent list exists; polish |
| Multi-root workspace | ⬜ | — |
| Search in files | ✅ | Ctrl+Shift+F |
| Replace in files | ✅ | Ctrl+Shift+H |

---

## Terminal

| Capability | Status | Notes |
|------------|--------|-------|
| Terminal panel + tabs | ✅ | xterm.js |
| Real shell (PTY) | ✅ | Auto-starts with `npm run dev`; ws://localhost:31337/pty |
| Agent runs commands | ✅ | Phase D2 — `jollof-run` blocks; Approve → `POST /api/run`; output back in chat |
| Ctrl+K generate command | 🟡 | Agent proposes `jollof-run`; Run button in chat (not terminal Ctrl+K yet) |

---

## Git & run

| Capability | Status | Notes |
|------------|--------|-------|
| Source control panel | ✅ | Stage, unstage, diff, commit via local server |
| Diff / stage / commit | ✅ | Requires workspace local path in Source Control |
| Run active file | ⬜ | — |
| Debug / breakpoints | ⬜ | — |
| Tasks (tasks.json) | ⬜ | Run Task is placeholder |

---

## Problems & output

| Capability | Status | Notes |
|------------|--------|-------|
| Problems panel | 🟡 | JS syntax via Acorn |
| Next / previous problem (F8) | ⬜ | — |
| Output panel | ✅ | Context + append |
| ESLint / TS diagnostics | ⬜ | — |

---

## Agent & AI (core differentiator)

| Capability | Status | Notes |
|------------|--------|-------|
| Chat UI (Cursor-style) | ✅ | Tabs, New Chat, Past Chats |
| Streaming responses | ✅ | OpenAI-compatible API |
| Markdown rendering | ✅ | Headers, lists, code |
| Image / vision upload | ✅ | Multimodal user messages |
| Chat history restore | ✅ | Per-session messages |
| Title from first message | ✅ | — |
| Agent / Plan / Debug / Ask modes | 🟡 | UI only; not wired to behavior |
| Auto model dropdown | 🟡 | UI placeholder |
| **@ context** (@ file, selection, open, active) | ✅ | Phase A — `@file`, `@selection`, `@open`, `@active` |
| **Apply edits + diff + Accept/Reject** | ✅ | Phase A — `jollof-edit` blocks, diff UI, writes to workspace |
| @ codebase / semantic index | ✅ | Keyword index; `@codebase` in chat/composer |
| Composer (multi-file) | ✅ | Ctrl+Shift+I; multi-file `jollof-edit` blocks |
| Rules file (.cursorrules) | 🟡 | Loads `.cursorrules`, `AGENTS.md`, `jollof.rules` |
| MCP tools | ⬜ | — |
| Voice input | ⬜ | Future release — `TODO.md` |

---

## Desktop & Africa fit

| Capability | Status | Notes |
|------------|--------|-------|
| Browser app (Vite) | ✅ | Current delivery |
| Desktop app (Tauri/Electron) | 🟡 | Phase D1 — `npm run tauri:dev`; native folder + FS via local server |
| DeepSeek / local model defaults | 🟡 | User-configurable in settings |
| Offline / local inference | ⬜ | Phase D |
| Affordable pricing / onboarding | ⬜ | Product, not code |

---

## Explicitly not core (defer)

| Item | Status | Notes |
|------|--------|-------|
| Domain recipe scaffolds (bookings, SIS, …) | ⬜ | Backend exists; **not** product priority |
| Problem Space submission flows | ⬜ | Adoption layer after parity |
| "Solutions" template browser | 🟡 | Placeholder modal |

---

## Phase roadmap (summary)

| Phase | Focus | Key exit criteria |
|-------|--------|-------------------|
| **A** | Agent touches code | @ context works; edits show diff; Accept writes to disk |
| **B** | Daily driver | PTY by default; Git status; TS/LSP path |
| **C** | Cursor-class AI | Index, inline edit, composer, rules |
| **D** | Ship for Africa | Desktop, models, pricing |

See [`VISION.md`](./VISION.md) for north star and positioning.
