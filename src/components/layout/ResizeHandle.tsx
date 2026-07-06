import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const COLLAPSE_THRESHOLD_PX = 24;
const SIDEBAR_WIDTH_KEY_LEFT = "jollof-layout-sidebar-left-px";
const SIDEBAR_WIDTH_KEY_RIGHT = "jollof-layout-sidebar-right-px";
const DEFAULT_LEFT_PX = 260;
const DEFAULT_RIGHT_PX = 300;

export function getStoredSidebarWidths(): { left: number; right: number } {
  try {
    const left = localStorage.getItem(SIDEBAR_WIDTH_KEY_LEFT);
    const right = localStorage.getItem(SIDEBAR_WIDTH_KEY_RIGHT);
    return {
      left: left != null ? Math.max(150, Math.min(500, Number(left))) : DEFAULT_LEFT_PX,
      right: right != null ? Math.max(150, Math.min(500, Number(right))) : DEFAULT_RIGHT_PX,
    };
  } catch {
    return { left: DEFAULT_LEFT_PX, right: DEFAULT_RIGHT_PX };
  }
}

export function setStoredSidebarWidths(left: number, right: number) {
  try {
    localStorage.setItem(SIDEBAR_WIDTH_KEY_LEFT, String(left));
    localStorage.setItem(SIDEBAR_WIDTH_KEY_RIGHT, String(right));
  } catch {
    // ignore
  }
}

interface ResizeHandleProps {
  side: "left" | "right";
  onResize: (newSizePx: number) => void;
  onCollapse?: () => void;
  panelSizePx: number;
  minSizePx?: number;
  maxSizePx?: number;
  className?: string;
}

export default function ResizeHandle({
  side,
  onResize,
  onCollapse,
  panelSizePx,
  minSizePx = 150,
  maxSizePx = 500,
  className,
}: ResizeHandleProps) {
  const startX = useRef(0);
  const startSize = useRef(0);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      startX.current = e.clientX;
      startSize.current = panelSizePx;
      isDraggingRef.current = true;
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [panelSizePx]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      const delta = e.clientX - startX.current;
      const effectiveDelta = side === "left" ? delta : -delta;
      let next = startSize.current + effectiveDelta;
      if (next < COLLAPSE_THRESHOLD_PX && onCollapse) {
        onCollapse();
        isDraggingRef.current = false;
        setIsDragging(false);
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
        return;
      }
      next = Math.max(minSizePx, Math.min(maxSizePx, next));
      onResize(next);
    },
    [side, onResize, onCollapse, minSizePx, maxSizePx]
  );

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
  }, []);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={panelSizePx}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={cn(
        "w-1 shrink-0 cursor-col-resize bg-cursor-editor hover:bg-cursor-border transition-colors",
        side === "left" ? "border-r border-cursor-border" : "border-l border-cursor-border",
        isDragging && "bg-cursor-accent",
        className
      )}
      style={{ touchAction: "none" }}
    />
  );
}
