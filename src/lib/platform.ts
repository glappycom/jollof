/** True when running inside the Tauri desktop shell. */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Browser dev mode (Vite in Chrome/Edge). */
export function isBrowserDev(): boolean {
  return !isTauri();
}
