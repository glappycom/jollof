import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { search, searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { indentUnit } from "@codemirror/language";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";

/** Minimal light theme for the editor (VS Code–style). */
const oneLightTheme = EditorView.theme({
  "&": { color: "#383a42", backgroundColor: "#ffffff" },
  ".cm-content": { caretColor: "#4078f2" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#4078f2" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: "#add6ff" },
  ".cm-gutters": { backgroundColor: "#f0f0f0", color: "#6e7681", border: "none" },
  ".cm-activeLineGutter": { backgroundColor: "#e8e8e8" },
  ".cm-searchMatch": { backgroundColor: "#ffeb3b59", outline: "1px solid #f59e0b" },
  ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "#f59e0b59" },
});

interface CodeEditorProps {
  content?: string;
  onChange?: (value: string) => void;
  className?: string;
  fontSize?: number;
  /** Number of spaces per indent level (Tab key and display). */
  tabSize?: number;
  /** "dark" | "light" – uses oneDark vs oneLightTheme. */
  theme?: "dark" | "light";
  /** Called when the editor view is mounted/unmounted so the app can run commands (undo, redo, etc.). */
  registerView?: (view: EditorView | null) => void;
  /** Called when selection/cursor changes (1-based line, 1-based column). */
  onSelectionChange?: (line: number, column: number) => void;
}

const CodeEditor = ({
  content = "",
  onChange,
  className = "",
  fontSize = 14,
  tabSize = 2,
  theme = "dark",
  registerView,
  onSelectionChange,
}: CodeEditorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const editorTheme = theme === "light" ? oneLightTheme : oneDark;
    const spaces = " ".repeat(Math.max(1, Math.min(8, tabSize)));

    const startState = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        history(),
        keymap.of(defaultKeymap),
        keymap.of(historyKeymap),
        keymap.of(searchKeymap),
        search(),
        highlightSelectionMatches(),
        javascript(),
        EditorState.tabSize.of(tabSize),
        indentUnit.of(spaces),
        editorTheme,
        EditorView.theme({ "&": { fontSize: `${fontSize}px` } }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && onChange) {
            onChange(update.state.doc.toString());
          }
          if (update.selectionSet && onSelectionChange) {
            const pos = update.state.selection.main.head;
            const line = update.state.doc.lineAt(pos);
            const col = pos - line.from + 1;
            onSelectionChange(line.number, col);
          }
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: containerRef.current,
    });

    viewRef.current = view;
    registerView?.(view);
    if (onSelectionChange) {
      const pos = view.state.selection.main.head;
      const line = view.state.doc.lineAt(pos);
      onSelectionChange(line.number, pos - line.from + 1);
    }
    return () => {
      registerView?.(null);
      view.destroy();
      viewRef.current = null;
    };
  }, [registerView, onSelectionChange, theme, fontSize, tabSize]); // remount when theme/font/tabSize change

  // Sync external content changes (e.g. open different file) without remounting
  useEffect(() => {
    const view = viewRef.current;
    if (!view || content === view.state.doc.toString()) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: content },
    });
  }, [content]);

  return (
    <div
      ref={containerRef}
      className={className}
      aria-label="Code editor"
    />
  );
};

export default CodeEditor;
