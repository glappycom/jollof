import { createContext, useContext } from "react";
import type { RecentFolderEntry } from "@/lib/recent-folders";

export type { RecentFolderEntry };

export interface EditorActions {
  openFolder: () => void | Promise<void>;
  /** Open a folder from the Open Recent list (handle already has permission). */
  openRecentFolder?: (entry: RecentFolderEntry) => void | Promise<void>;
  /** Recent folder list for File → Open Recent submenu. */
  recentFolders?: RecentFolderEntry[];
  openFile: () => void | Promise<void>;
  newFile: () => void;
  save: () => void | Promise<void>;
  saveAll: () => void | Promise<void>;
  saveAs: () => void | Promise<void>;
  revertFile: () => void | Promise<void>;
  closeEditor: () => void;
  openPreferences: () => void;
  toggleSidebar: () => void;
  togglePanel: () => void;
  toggleRightSidebar: () => void;
  /** View menu */
  openCommandPalette: () => void;
  showExplorer: () => void;
  showSourceControl: () => void;
  showSearch: () => void;
  showReplaceInFiles: () => void;
  showTerminal: () => void;
  newTerminal: () => void;
  showOutput: () => void;
  showProblems: () => void;
  /** Run menu */
  runTask: () => void;
  /** Prefer npm run build, else prompt / first script */
  runBuildTask?: () => void;
  /** Run a specific package.json script */
  runNpmScript?: (script: string) => void;
  /** Run the active editor file (JS/TS/Python) via local server. */
  runActiveFile: () => void;
  /** Run selected launch config without treating it as a debug session label-wise */
  runWithoutDebugging?: () => void;
  /** Start selected debug configuration (F5). */
  startDebugging?: () => void;
  /** Start a specific config by id */
  startDebuggingWithConfig?: (configId: string) => void;
  /** Stop then start again */
  restartDebugging?: () => void;
  /** Mark debug session stopped */
  stopDebugging?: () => void;
  /** Open or create .vscode/launch.json */
  openLaunchConfig?: () => void;
  /** Ensure launch.json exists with a template, then open it */
  addLaunchConfig?: () => void;
  /** Show Debug Console panel */
  showDebugConsole?: () => void;
  /** Go menu */
  openGoToFile: () => void;
  openGoToLineDialog: () => void;
  openGoToSymbol: () => void;
  goBack: () => void;
  goForward: () => void;
  /** Edit menu: require active editor view */
  undo: () => void;
  redo: () => void;
  cut: () => void | Promise<void>;
  copy: () => void | Promise<void>;
  paste: () => void | Promise<void>;
  copyPath?: () => void | Promise<void>;
  copyRelativePath?: () => void | Promise<void>;
  toggleLineComment: () => void;
  toggleBlockComment: () => void;
  findInEditor: () => void;
  replaceInEditor: () => void;
  findNext?: () => void;
  findPrevious?: () => void;
  selectAll?: () => void;
  copyLineUp?: () => void;
  copyLineDown?: () => void;
  moveLineUp?: () => void;
  moveLineDown?: () => void;
  deleteLine?: () => void;
  /** Help menu */
  showWelcome: () => void;
  openAbout: () => void;
  openDocumentation: () => void;
  openReleaseNotes: () => void;
  openReportIssue: () => void;
}

const EditorActionsContext = createContext<EditorActions | null>(null);

export function useEditorActions(): EditorActions | null {
  return useContext(EditorActionsContext);
}

export const EditorActionsProvider = EditorActionsContext.Provider;
