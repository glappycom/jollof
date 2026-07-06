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
  toggleLineComment: () => void;
  toggleBlockComment: () => void;
  findInEditor: () => void;
  replaceInEditor: () => void;
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
