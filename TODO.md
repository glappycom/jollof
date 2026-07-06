# Jollof IDE — TODO

## File menu (leftover)

- [ ] **New Window** (Ctrl+Shift+N) — e.g. open app in new browser tab
- [ ] **New Window with Profile** — Cursor-style profile picker
- [ ] **Open Workspace from File…** — open `.code-workspace` (multi-root)
- [ ] **Open Recent** (›) — persist recent folder roots, show sub-menu
- [ ] **Add Folder to Workspace…** — multi-root workspace
- [ ] **Save Workspace As…** — save current workspace as file
- [ ] **Duplicate Workspace**
- [ ] **Share** (›)
*(Auto Save implemented: Preferences → Auto Save checkbox, 1.5s debounce.)*
- [ ] **Close Window** (Alt+F4) — e.g. `window.close()` in web
- [ ] **Exit**
- [ ] **Preferences** sub-menu: Keyboard Shortcuts, Configure Snippets, Themes

---

## Edit menu (leftover)

- [x] **Replace in Files** (Ctrl+Shift+H) — Search panel replace-all / replace-in-files ✅
- [ ] **Emmet: Expand Abbreviation** (Tab) — requires Emmet/extension
*(In-editor Find (Ctrl+F) and Replace (Ctrl+H) implemented via @codemirror/search.)*

*(Edit menu: Undo, Redo, Cut, Copy, Paste, Find, Replace, Find in Files, Replace in Files, Toggle Line/Comment, Toggle Block Comment.)*

---

## View menu (leftover)

- [ ] **Open View…** — generic view picker
- [ ] **Appearance** — theme / zoom sub-menu
- [ ] **Editor Layout** — split editor, single column, etc.
- [ ] **Source Control** (Ctrl+Shift+G) — git UI
- [ ] **Run** (Ctrl+Shift+D) — run/debug
- [ ] **Extensions** (Ctrl+Shift+X) — extensions panel
- [ ] **Debug Console** (Ctrl+Shift+Alt+Y)

*(View menu trimmed to implemented: Command Palette, Explorer, Search, Toggle Sidebar/Panel, Problems, Output, Terminal.)*

---

## Go menu (leftover)

- [ ] **Back** (Alt+Left) / **Forward** (Alt+Right) — navigation history (cursor/file positions)
- [ ] **Last Edit Location** (Ctrl+K Ctrl+Q)
- [ ] **Go to Symbol...** (Ctrl+Shift+O) — symbol outline / document outline
- [ ] **Next Problem** (F8) / **Previous Problem** (Shift+F8) — cycle through diagnostics

*(Go menu: Go to File..., Go to Line/Column... implemented.)*

---

## Run menu (leftover)

- [ ] **Start Debugging** (F5) — debugger + launch config
- [ ] **Run Without Debugging** (Ctrl+F5)
- [ ] **Stop Debugging** (Shift+F5) / **Restart Debugging** (Ctrl+Shift+F5)
- [ ] **Toggle Breakpoint** (F9) / **New Breakpoint**
- [ ] **Add Configuration…** / **Open Configurations** — launch.json

*(Run menu trimmed to implemented: Run Task... only — shows Output panel and appends a placeholder message.)*

---

## Terminal menu (leftover)

- [ ] **Run Build Task…** — run default/build task
- [ ] **Run Active File** — run current editor file (e.g. node/ts-node)
- [ ] **Configure Tasks…** / **Configure Default Build Task…** — tasks.json

*(Terminal menu: New Terminal (Ctrl+Shift+`), Split Terminal (Ctrl+Shift+5 — adds new tab), Run Task... (Ctrl+Shift+B). Terminal panel has multiple tabs with close button; each tab has its own xterm instance.)*

---

## Other menus

- Go — wire or trim as needed
- **Selection** — removed from menu bar

---

## Help menu (leftover)

*(Help menu: Welcome, Show All Commands, Keyboard Shortcuts, Documentation, Release Notes, Report Issue (open URLs from `src/lib/app-links.ts`), About (modal with version from package.json) implemented.)*

---

*(Selection menu not needed for now; `SelectionMenu.tsx` kept if we add it back later.)*

---

## Future release (Agent / Chat)

- [ ] **Voice input** — speech-to-text in the agent chat input (e.g. mic button); optional **language** selection for recognition.
