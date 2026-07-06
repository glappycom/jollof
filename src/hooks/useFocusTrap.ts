import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
}

/**
 * Trap focus inside a modal and restore focus on close.
 * Call with ref to the modal content (the inner panel, not the overlay).
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  isActive: boolean,
  onClose: () => void
) {
  const previousActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    previousActiveRef.current = document.activeElement as HTMLElement | null;

    const focusable = getFocusableElements(container);
    const first = focusable[0];
    if (first) {
      // Small delay so the modal is in the DOM
      const t = requestAnimationFrame(() => first.focus());
      return () => cancelAnimationFrame(t);
    }
  }, [isActive, containerRef]);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) return;

      const current = document.activeElement as HTMLElement;
      if (!container.contains(current)) {
        if (e.shiftKey) focusable[focusable.length - 1]?.focus();
        else focusable[0]?.focus();
        e.preventDefault();
        return;
      }

      const idx = focusable.indexOf(current);
      if (idx === -1) return;

      if (e.shiftKey) {
        const prev = focusable[idx - 1] ?? focusable[focusable.length - 1];
        prev?.focus();
        e.preventDefault();
      } else {
        const next = focusable[idx + 1] ?? focusable[0];
        next?.focus();
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      const prev = previousActiveRef.current;
      if (prev && typeof prev.focus === "function") prev.focus();
    };
  }, [isActive, containerRef, onClose]);
}
