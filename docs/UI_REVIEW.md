# Jollof IDE — UI review vs international standards

## What already meets standards

- **HTML:** `lang="en"` on `<html>`; charset UTF-8; viewport meta.
- **ARIA:** Dialogs use `role="dialog"`, `aria-modal="true"`, `aria-label`; tabs use `role="tab"` and `aria-selected`; status bar has `role="status"`; many controls have `aria-label`.
- **Semantics:** Buttons for actions; labels with `htmlFor` where used (e.g. Auto Save); icons decorative where appropriate (`aria-hidden`).
- **Focus:** Button component uses `focus-visible:ring-2` for keyboard focus.

---

## Gaps and recommended changes

### 1. Accessibility (WCAG 2.x)

| Issue | Recommendation |
|-------|----------------|
| No **skip link** | Add "Skip to main content" as first focusable element for keyboard/screen-reader users. |
| **Menu bar** | Add `aria-haspopup="true"`, `aria-expanded`, and `aria-controls` on menu triggers; support keyboard (Enter/Space to open, Escape to close, arrows to move). |
| **Modals** | Trap focus inside open dialog; restore focus to trigger on close; ensure Escape closes (already in some). |
| **Form inputs** | Associate every input with a label (e.g. `id` + `htmlFor` or `aria-labelledby`); add `aria-invalid` and `aria-describedby` for errors/hints where needed. |
| **Focus visibility** | Apply a consistent visible focus ring (e.g. `outline` or `ring`) to all interactive elements, not only the Button component. |
| **Color contrast** | Verify `--cursor-text-muted` on sidebar/dropdown backgrounds meets WCAG AA (4.5:1 for normal text); adjust if needed. |

### 2. Internationalization (i18n)

| Issue | Recommendation |
|-------|----------------|
| All strings hardcoded in English | Introduce an i18n layer (e.g. react-i18next) and keys for UI strings so locales can be added later. |
| **RTL** | Support `dir="rtl"` on `<html>` or a container and use logical CSS (`margin-inline`, `padding-inline`, `start`/`end`) for layout so RTL languages work. |
| **Status bar** | "Ln", "Col" are English; move to translatable strings or use neutral symbols when adding i18n. |
| **Dates/numbers** | Use locale-aware formatting (e.g. `Intl.DateTimeFormat`, `Intl.NumberFormat`) where relevant. |

### 3. UX and consistency

| Issue | Recommendation |
|-------|----------------|
| **Submenus** | Open Recent opens on hover only; add keyboard support (e.g. Enter/Space to open submenu, arrows to move, Escape to close). |
| **Escape** | Ensure every modal and overlay (Search, Quick Open, Command Palette, Settings, etc.) closes on Escape and documents that behavior. |
| **Loading/errors** | Use consistent patterns (e.g. disabled + spinner, or aria-live for status) so users get clear feedback. |

---

## Priority order for implementation

1. **High impact, low effort:** Skip link; menu bar ARIA (haspopup/expanded); global focus-visible style; form labels/ids in Settings.
2. **High impact, medium effort:** Focus trap + return focus in modals; Escape for all overlays.
3. **Medium term:** i18n framework and string extraction; RTL and logical CSS.
4. **Ongoing:** Contrast audit; keyboard navigation for all menus/submenus.
