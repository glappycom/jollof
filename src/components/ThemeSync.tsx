import { useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";

/**
 * Applies settings.theme to the document so CSS variables and editor themes follow.
 */
export default function ThemeSync() {
  const { settings } = useSettings();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  return null;
}
