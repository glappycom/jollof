/**
 * Map file paths to CodeMirror language support.
 */

import type { Extension } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";

export function extensionOf(path: string): string {
  const base = path.replace(/\\/g, "/").split("/").pop() ?? path;
  const i = base.lastIndexOf(".");
  return i >= 0 ? base.slice(i).toLowerCase() : "";
}

/** CodeMirror language extension for a file path (empty if plain text). */
export function languageSupportForPath(path: string): Extension | null {
  const ext = extensionOf(path);
  switch (ext) {
    case ".ts":
    case ".mts":
    case ".cts":
      return javascript({ typescript: true });
    case ".tsx":
      return javascript({ typescript: true, jsx: true });
    case ".jsx":
      return javascript({ jsx: true });
    case ".js":
    case ".mjs":
    case ".cjs":
      return javascript();
    case ".json":
    case ".jsonc":
      return json();
    case ".html":
    case ".htm":
      return html();
    case ".css":
      return css();
    case ".md":
    case ".mdx":
    case ".markdown":
      return markdown();
    case ".py":
      return python();
    default:
      return null;
  }
}

export function languageLabelForPath(path: string): string {
  const ext = extensionOf(path);
  const map: Record<string, string> = {
    ".ts": "TypeScript",
    ".tsx": "TypeScript React",
    ".mts": "TypeScript",
    ".cts": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript React",
    ".mjs": "JavaScript",
    ".cjs": "JavaScript",
    ".json": "JSON",
    ".jsonc": "JSON",
    ".html": "HTML",
    ".htm": "HTML",
    ".css": "CSS",
    ".md": "Markdown",
    ".mdx": "Markdown",
    ".markdown": "Markdown",
    ".py": "Python",
  };
  return map[ext] || "Plain Text";
}
