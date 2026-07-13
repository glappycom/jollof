/**
 * VS Code–style key chord helpers (e.g. Ctrl+K then P).
 */

export const DEFAULT_CHORD_TIMEOUT_MS = 1500;

export type ChordSecondMatcher = {
  /** Lowercase key from KeyboardEvent.key */
  key: string;
  shift?: boolean;
  /** If true, require Ctrl/Meta. If omitted, Ctrl is optional (still holding leader is OK). */
  ctrl?: boolean;
  alt?: boolean;
  run: () => void;
};

export function isModifierOnlyKey(key: string): boolean {
  return (
    key === "Control" ||
    key === "Meta" ||
    key === "Shift" ||
    key === "Alt" ||
    key === "OS"
  );
}

/**
 * Match a second keypress against chord bindings.
 * Ctrl/Meta is optional unless a binding sets `ctrl: true` or `ctrl: false` explicitly —
 * when `ctrl` is omitted, both held and released Ctrl match (typical after Ctrl+K).
 */
export function matchChordSecond(
  e: KeyboardEvent,
  bindings: ChordSecondMatcher[]
): ChordSecondMatcher | null {
  if (isModifierOnlyKey(e.key)) return null;
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
  const shift = e.shiftKey;
  const ctrl = e.ctrlKey || e.metaKey;
  const alt = e.altKey;

  for (const b of bindings) {
    if (b.key !== key) continue;
    if (Boolean(b.shift) !== shift) continue;
    if (Boolean(b.alt) !== alt) continue;
    if (b.ctrl === true && !ctrl) continue;
    if (b.ctrl === false && ctrl) continue;
    // b.ctrl === undefined → allow either
    return b;
  }
  return null;
}
