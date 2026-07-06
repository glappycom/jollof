import { useEffect, useRef, useState } from "react";
import FileMenu from "@/components/welcome/menus/FileMenu";
import EditMenu from "@/components/welcome/menus/EditMenu";
import ViewMenu from "@/components/welcome/menus/ViewMenu";
import GoMenu from "@/components/welcome/menus/GoMenu";
import RunMenu from "@/components/welcome/menus/RunMenu";
import TerminalMenu from "@/components/welcome/menus/TerminalMenu";
import HelpMenu from "@/components/welcome/menus/HelpMenu";
import { cn } from "@/lib/utils";

const MENU_FOCUSABLE =
  'button, [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getMenuFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(MENU_FOCUSABLE));
}

const menus = [
  { key: "File", component: <FileMenu /> },
  { key: "Edit", component: <EditMenu /> },
  { key: "View", component: <ViewMenu /> },
  { key: "Go", component: <GoMenu /> },
  { key: "Run", component: <RunMenu /> },
  { key: "Terminal", component: <TerminalMenu /> },
  { key: "Help", component: <HelpMenu /> },
];

const MenuBar = () => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!barRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // When a menu opens, focus the first focusable item inside it
  useEffect(() => {
    if (!openMenu) return;
    const panel = document.getElementById(`menu-${openMenu.toLowerCase()}`);
    if (!panel) return;
    const focusable = getMenuFocusables(panel);
    const first = focusable[0];
    if (first) requestAnimationFrame(() => first.focus());
  }, [openMenu]);

  // Keyboard: Escape close, Arrow Left/Right switch menus, Arrow Down/Up in panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!barRef.current) return;

      if (openMenu) {
        const panel = document.getElementById(`menu-${openMenu.toLowerCase()}`);
        const triggerId = `menubar-${openMenu.toLowerCase()}`;
        const currentIndex = menus.findIndex((m) => m.key === openMenu);

        if (e.key === "Escape") {
          e.preventDefault();
          setOpenMenu(null);
          document.getElementById(triggerId)?.focus();
          return;
        }

        if (e.key === "ArrowRight" && currentIndex < menus.length - 1) {
          e.preventDefault();
          const next = menus[currentIndex + 1]!;
          setOpenMenu(next.key);
          requestAnimationFrame(() => document.getElementById(`menubar-${next.key.toLowerCase()}`)?.focus());
          return;
        }

        if (e.key === "ArrowLeft" && currentIndex > 0) {
          e.preventDefault();
          const prev = menus[currentIndex - 1]!;
          setOpenMenu(prev.key);
          requestAnimationFrame(() => document.getElementById(`menubar-${prev.key.toLowerCase()}`)?.focus());
          return;
        }

        if (panel && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
          const focusable = getMenuFocusables(panel);
          if (focusable.length === 0) return;
          const current = document.activeElement as HTMLElement;
          const idx = focusable.indexOf(current);
          if (idx >= 0) {
            e.preventDefault();
            if (e.key === "ArrowDown") {
              const next = focusable[idx + 1] ?? focusable[0];
              next?.focus();
            } else {
              const prev = focusable[idx - 1] ?? focusable[focusable.length - 1];
              prev?.focus();
            }
          }
          return;
        }
      } else {
        // No menu open: Enter/Space/ArrowDown opens menu; Arrow Left/Right move between triggers
        const target = e.target as HTMLElement;
        if (!barRef.current.contains(target)) return;
        const trigger = target.closest?.("[id^='menubar-']") as HTMLElement | null;
        if (!trigger) return;
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
          const key = trigger.id.replace("menubar-", "");
          const menu = menus.find((m) => m.key.toLowerCase() === key);
          if (menu) {
            e.preventDefault();
            setOpenMenu(menu.key);
          }
          return;
        }
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          const idx = menus.findIndex((m) => trigger.id === `menubar-${m.key.toLowerCase()}`);
          if (idx === -1) return;
          const next = e.key === "ArrowRight" ? menus[idx + 1] : menus[idx - 1];
          if (next) {
            e.preventDefault();
            document.getElementById(`menubar-${next.key.toLowerCase()}`)?.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openMenu]);

  return (
    <div ref={barRef} className="flex items-center gap-1">
      {menus.map((menu) => (
        <div key={menu.key} className="relative">
          <button
            type="button"
            id={`menubar-${menu.key.toLowerCase()}`}
            className={cn(
              "rounded-sm px-2 py-0.5 text-[11px] font-medium text-cursor-text-muted transition-colors duration-fast hover:bg-cursor-border hover:text-cursor-text",
              openMenu === menu.key && "bg-cursor-border text-cursor-text"
            )}
            onClick={() =>
              setOpenMenu((prev) => (prev === menu.key ? null : menu.key))
            }
            aria-haspopup="true"
            aria-expanded={openMenu === menu.key}
            aria-controls={openMenu === menu.key ? `menu-${menu.key.toLowerCase()}` : undefined}
          >
            {menu.key}
          </button>
          {openMenu === menu.key ? (
            <div
              id={`menu-${menu.key.toLowerCase()}`}
              role="menu"
              className="absolute left-0 top-full z-50 mt-1 w-56 rounded border border-cursor-border/80 bg-cursor-dropdown p-1 text-[11px] text-cursor-text shadow-dropdown"
            >
              {menu.component}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

export default MenuBar;
