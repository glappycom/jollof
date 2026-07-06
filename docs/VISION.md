# Jollof IDE — Vision & Product North Star

## One line

**Build Cursor. Make it work for African developers.**

---

## What we are building

Jollof is a **Cursor replica**: an AI-native IDE that reads your codebase, edits files, runs commands, and helps you ship software. Same product category as Cursor — not a template generator, not a challenge portal with an editor attached.

The goal is **feature parity with Cursor's core loop**:

```
Open project → ask in chat (@ context) → agent proposes edits → review diff → accept → run terminal → ship
```

Everything else is secondary until that loop works end-to-end.

---

## What "for Africa" means

Africa is **market fit**, not a different product shape.

| Dimension | What it means for Jollof |
|-----------|--------------------------|
| **Cost** | Affordable pricing; DeepSeek and local models as first-class defaults |
| **Connectivity** | Works on slower networks; optional offline / local inference |
| **Access** | Desktop install (Tauri) — not browser-only forever |
| **Trust** | Clear data handling; API keys and models under user control |
| **Reach** | Problem Space teams, ministries, and startups adopt it because it is **as capable as Cursor**, not because it ships a booking template |

We do **not** differentiate by replacing the IDE with scaffolds or recipe wizards. Templates and domain packs may exist later as **optional accelerators**, not as the product definition.

---

## Guiding question

**If we were rebuilding Cursor from scratch, what would we do?**

Use this for every build decision:

- Does this make Jollof **work more like Cursor**? → Prioritize it.
- Is this only useful for one vertical (health, schools, bookings)? → Defer until core parity is solid.
- Does this help African developers **use** a Cursor-class IDE? → Yes, ship it in the adoption layer (pricing, models, packaging).

---

## Problem Space (adoption, not core)

Problem Space — connecting ministry challenges with teams and working software — is a **distribution and adoption channel**, not the IDE itself.

```
Ministry Challenge
  → Team builds in Jollof (full Cursor-class experience)
  → Working prototype
  → Demo Day → Pilot → Scale
```

Teams choose Jollof because they can **actually build** in it. The challenge workflow sits on top of a real IDE.

---

## Build order

Track detailed status in [`CURSOR_PARITY.md`](./CURSOR_PARITY.md).

1. **Phase A — Agent touches code** (@ context, structured edits, diff, accept/reject)
2. **Phase B — Daily driver** (real terminal, Git, LSP / multi-language)
3. **Phase C — Cursor-class AI** (codebase index, inline edit, composer, rules)
4. **Phase D — Ship for Africa** (desktop, model defaults, pricing, onboarding)

**Build the IDE first. Africa is how we win distribution — not how we avoid building Cursor.**
