import { useRef } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
  version?: string;
}

export default function AboutModal({ open, onClose, version = "0.0.0" }: AboutModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, onClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="About Jollof IDE"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="w-full max-w-sm rounded-lg border border-cursor-border bg-cursor-sidebar p-4 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-semibold text-cursor-text">Jollof IDE</h2>
        <p className="mb-4 text-xs text-cursor-text-muted">Cursor-like IDE for Problem Space</p>
        <p className="text-xs text-cursor-text-muted">Version {version}</p>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="rounded bg-cursor-accent px-3 py-1.5 text-xs text-black hover:opacity-90"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
