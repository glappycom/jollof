import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { EditorView } from "@codemirror/view";
import {
  openSearchPanel,
  findNext as cmFindNext,
  findPrevious as cmFindPrevious,
} from "@codemirror/search";
import {
  undo as cmUndo,
  redo as cmRedo,
  toggleLineComment as cmToggleLineComment,
  toggleBlockComment as cmToggleBlockComment,
  selectAll as cmSelectAll,
  copyLineUp as cmCopyLineUp,
  copyLineDown as cmCopyLineDown,
  moveLineUp as cmMoveLineUp,
  moveLineDown as cmMoveLineDown,
  deleteLine as cmDeleteLine,
} from "@codemirror/commands";
import { Group, Panel, Separator, useDefaultLayout, usePanelRef } from "react-resizable-panels";
import { Folder, PanelLeftClose, PanelRightClose, PanelLeftOpen, GitBranch } from "lucide-react";
import { layoutStorage } from "@/lib/layout-storage";
import TopBar from "@/components/welcome/TopBar";
import EditorTabs, { type OpenFile } from "@/components/editor/EditorTabs";
import CodeEditor from "@/components/editor/CodeEditor";
import FileTree from "@/components/sidebar/FileTree";
import SidebarActivityBar, { type LeftSidebarTab } from "@/components/sidebar/SidebarActivityBar";
import SourceControlPanel from "@/components/git/SourceControlPanel";
import CommandPalette, { type Command } from "@/components/command-palette/CommandPalette";
import {
  openFolder as pickFolder,
  openFolderFromHandle,
  openFilePicker,
  loadDirectoryChildren,
  readFileContent,
  writeFileContent,
  writeWorkspaceFileAtPath,
  readWorkspaceFile,
  readWorkspaceFileAtPath,
  getFlatFileList,
  collectFilesForIndex,
  isFileSystemAccessSupported,
  relPathFromWorkspacePath,
  type FileTreeNode,
  type FlatFileEntry,
  type SearchMatch,
} from "@/lib/workspace";
import { getRecentFolders, addRecentFolder, addRecentPathFolder, type RecentFolderEntry } from "@/lib/recent-folders";
import { getDiagnostics, getProjectDiagnostics, mergeDiagnostics, type ProblemEntry } from "@/lib/diagnostics";
import { buildRunActiveFileCommand, runFileKindForPath, runFileLabel } from "@/lib/run-file";
import { getSymbols } from "@/lib/symbols";
import { languageLabelForPath } from "@/lib/language";
import { streamAgentResponse } from "@/lib/agent-api";
import { parseInlineEditFromResponse } from "@/lib/agent-edits";
import { normalizeAgentPath } from "@/lib/agent-workspace";
import { buildChatSystemPrompt, buildComposerSystemPrompt, buildInlineEditSystemPrompt } from "@/lib/agent-prompts";
import { parseContextMentions } from "@/lib/agent-context";
import { DEFAULT_CHORD_TIMEOUT_MS, isModifierOnlyKey, matchChordSecond } from "@/lib/key-chords";
import { runAgentTurn, type AgentWorkspaceContext } from "@/lib/agent-session";
import { buildCodebaseIndex, type CodebaseIndex } from "@/lib/codebase-index";
import { loadProjectRules } from "@/lib/cursor-rules";
import InlineEditModal, { type InlineEditContext } from "@/components/editor/InlineEditModal";
import { resolveWorkspaceLocalPath, getWorkspaceLocalPath } from "@/lib/workspace-local-path";
import { terminalWsUrl } from "@/lib/local-server";
import { isTauri } from "@/lib/platform";
import { openDesktopFolder, loadDesktopDirectoryChildren, openFolderByAbsolutePath } from "@/lib/desktop-workspace";
import { runWorkspaceCommand } from "@/lib/run-api";
import { resolveDebugConfigs } from "@/lib/debug-launch";
import { formatRunResultForChat, buildContinueAfterRunPrompt } from "@/lib/agent-runs";
import { fetchGitStatus } from "@/lib/git-api";
import { useOutput } from "@/contexts/OutputContext";
import { useDebug } from "@/contexts/DebugContext";
import { toast } from "@/hooks/use-toast";
import QuickOpen from "@/components/quick-open/QuickOpen";
import SearchPanel from "@/components/search/SearchPanel";
import PanelTabs, { type PanelTabId } from "@/components/panel/PanelTabs";
import DebugConsolePanel from "@/components/panel/DebugConsolePanel";
import TerminalPanel from "@/components/terminal/TerminalPanel";
import ProblemsPanel from "@/components/panel/ProblemsPanel";
import OutputPanel from "@/components/panel/OutputPanel";
import SettingsModal from "@/components/settings/SettingsModal";
import GoToLineModal from "@/components/editor/GoToLineModal";
import GoToSymbolModal from "@/components/editor/GoToSymbolModal";
import AboutModal from "@/components/welcome/AboutModal";
import StatusBar from "@/components/status-bar/StatusBar";
import AgentsPanel from "@/components/agents/AgentsPanel";
import AgentChatView, { type AgentMessage, type ActiveAgent, type AgentMode } from "@/components/agents/AgentChatView";
import type { AgentSessionHistory } from "@/components/agents/AgentsPanel";
import ResizeHandle, { getStoredSidebarWidths, setStoredSidebarWidths } from "@/components/layout/ResizeHandle";
import { openDocumentation, openReleaseNotes, openReportIssue } from "@/lib/app-links";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EditorActionsProvider } from "@/contexts/EditorActionsContext";
import { useSettings } from "@/contexts/SettingsContext";

const defaultFile: OpenFile = {
  id: "welcome",
  name: "Welcome",
  path: "/Welcome",
  content: `// Jollof IDE — Cursor-like from the get-go
// Open a folder (Ctrl+Shift+O or command palette) and click a file to open it.

function hello() {
  console.log("Built for Problem Space.");
}
`,
};

type WorkspaceState = {
  rootName: string;
  rootHandle: FileSystemDirectoryHandle | null;
  rootLocalPath: string | null;
  topLevelNodes: FileTreeNode[];
};

const Index = () => {
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([defaultFile]);
  const [activeFileId, setActiveFileId] = useState<string>(defaultFile.id);
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [childCache, setChildCache] = useState<Record<string, FileTreeNode[]>>({});
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [quickOpenOpen, setQuickOpenOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchReplaceMode, setSearchReplaceMode] = useState(false);
  const [recentFolders, setRecentFolders] = useState<RecentFolderEntry[]>([]);
  const [problems, setProblems] = useState<ProblemEntry[]>([]);
  const [projectProblems, setProjectProblems] = useState<ProblemEntry[]>([]);
  const [bufferProblems, setBufferProblems] = useState<ProblemEntry[]>([]);
  const [pendingProblemGoTo, setPendingProblemGoTo] = useState<{ path: string; line: number } | null>(null);
  const [activePanelTab, setActivePanelTab] = useState<PanelTabId>("terminal");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [panelVisible, setPanelVisible] = useState(true);
  const [rightSidebarVisible, setRightSidebarVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [goToLineOpen, setGoToLineOpen] = useState(false);
  const [goToSymbolOpen, setGoToSymbolOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [leftSidebarTab, setLeftSidebarTab] = useState<LeftSidebarTab>("explorer");
  const [gitChangesCount, setGitChangesCount] = useState(0);
  const [workspaceLocalPathResolved, setWorkspaceLocalPathResolved] = useState<string | null>(null);

  type NavEntry = { fileId: string; line: number; column?: number };
  const MAX_NAV_STACK = 50;
  const [navBackStack, setNavBackStack] = useState<NavEntry[]>([]);
  const [navForwardStack, setNavForwardStack] = useState<NavEntry[]>([]);
  const [pendingNav, setPendingNav] = useState<NavEntry | null>(null);
  const [terminalTabs, setTerminalTabs] = useState<{ id: string; name: string }[]>([
    { id: "term-1", name: "Terminal 1" },
  ]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>("term-1");
  const [editorPosition, setEditorPosition] = useState<{ line: number; column: number } | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);

  const [leftSidebarWidthPx, setLeftSidebarWidthPx] = useState(() => getStoredSidebarWidths().left);
  const [rightSidebarWidthPx, setRightSidebarWidthPx] = useState(() => getStoredSidebarWidths().right);

  const [activeAgent, setActiveAgent] = useState<{
    id: string;
    name: string;
    messages: AgentMessage[];
  } | null>(null);
  const [agentHistory, setAgentHistory] = useState<AgentSessionHistory[]>([]);
  const [agentCounter, setAgentCounter] = useState(0);
  const [agentStreaming, setAgentStreaming] = useState(false);
  const [activeComposer, setActiveComposer] = useState<{
    id: string;
    name: string;
    messages: AgentMessage[];
  } | null>(null);
  const [composerStreaming, setComposerStreaming] = useState(false);
  const [codebaseIndex, setCodebaseIndex] = useState<CodebaseIndex | null>(null);
  const [chordHint, setChordHint] = useState<string | null>(null);
  const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [projectRules, setProjectRules] = useState("");
  const [inlineEditOpen, setInlineEditOpen] = useState(false);
  const [inlineEditContext, setInlineEditContext] = useState<InlineEditContext | null>(null);
  const [inlineEditLoading, setInlineEditLoading] = useState(false);
  const [inlineEditPreview, setInlineEditPreview] = useState<string | null>(null);
  const [inlineEditError, setInlineEditError] = useState<string | null>(null);
  const [isChatMaximized, setIsChatMaximized] = useState(false);
  const [isPanelMaximized, setIsPanelMaximized] = useState(false);

  const { settings } = useSettings();

  const registerEditorView = useCallback((view: EditorView | null) => {
    editorViewRef.current = view;
  }, []);

  const handleEditorSelectionChange = useCallback((line: number, column: number) => {
    setEditorPosition({ line, column });
  }, []);

  const bottomPanelRef = usePanelRef();
  const editorPanelLayout = useDefaultLayout({
    id: "jollof-editor-panel",
    storage: layoutStorage,
    panelIds: ["editor", "panel"],
  });

  useEffect(() => {
    setStoredSidebarWidths(leftSidebarWidthPx, rightSidebarWidthPx);
  }, [leftSidebarWidthPx, rightSidebarWidthPx]);

  useEffect(() => {
    getRecentFolders().then(setRecentFolders);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const panel = bottomPanelRef.current;
      if (!panel) return;
      if (panelVisible) panel.expand();
      else panel.collapse();
    }, 0);
    return () => clearTimeout(t);
  }, [panelVisible]);

  const handleLeftCollapse = useCallback(() => setSidebarVisible(false), []);
  const handleRightCollapse = useCallback(() => setRightSidebarVisible(false), []);

  const openLeftBar = useCallback(() => {
    setSidebarVisible(true);
    setLeftSidebarWidthPx((prev) => (prev < 150 ? getStoredSidebarWidths().left || 260 : prev));
  }, []);

  const openRightBar = useCallback(() => {
    setRightSidebarVisible(true);
    setRightSidebarWidthPx((prev) => (prev < 150 ? getStoredSidebarWidths().right || 300 : prev));
  }, []);

  const startNewAgent = useCallback(() => {
    setActiveComposer(null);
    if (activeAgent) {
      setAgentHistory((prev) => [
        {
          id: activeAgent.id,
          name: activeAgent.name,
          messages: activeAgent.messages,
          added: Math.floor(Math.random() * 500) + 100,
          removed: Math.floor(Math.random() * 100),
          filesCount: Math.floor(Math.random() * 60) + 1,
          closedAt: new Date(),
        },
        ...prev,
      ]);
    }
    const id = `agent-${Date.now()}-${agentCounter}`;
    setAgentCounter((c) => c + 1);
    setActiveAgent({
      id,
      name: agentHistory.length === 0 && !activeAgent ? "App shell review" : "New agent",
      messages: [],
    });
  }, [activeAgent, agentCounter, agentHistory.length]);

  const closeAgent = useCallback(() => {
    if (activeAgent) {
      setAgentHistory((prev) => [
        {
          id: activeAgent.id,
          name: activeAgent.name,
          messages: activeAgent.messages,
          added: Math.floor(Math.random() * 500) + 100,
          removed: Math.floor(Math.random() * 100),
          filesCount: Math.floor(Math.random() * 60) + 1,
          closedAt: new Date(),
        },
        ...prev,
      ]);
    }
    setActiveAgent(null);
  }, [activeAgent]);

  const chatSystemPrompt = useMemo(
    () => buildChatSystemPrompt(projectRules, "agent"),
    [projectRules]
  );
  const composerSystemPrompt = useMemo(
    () => buildComposerSystemPrompt(projectRules),
    [projectRules]
  );
  const inlineSystemPrompt = useMemo(
    () => buildInlineEditSystemPrompt(projectRules),
    [projectRules]
  );

  const deriveChatTitle = useCallback((content: string, maxLength = 48): string => {
    const firstLine = content.trim().split(/\r?\n/)[0]?.trim() ?? "";
    const title = firstLine.slice(0, maxLength);
    return title.length < firstLine.length ? `${title}…` : title;
  }, []);

  const getEditorSelection = useCallback(() => {
    const view = editorViewRef.current;
    if (!view) return undefined;
    const sel = view.state.selection.main;
    if (sel.empty) return undefined;
    const text = view.state.sliceDoc(sel.from, sel.to);
    if (!text.trim()) return undefined;
    const line = view.state.doc.lineAt(sel.from);
    return { text, line: line.number, column: sel.from - line.from + 1 };
  }, []);

  const getAgentWorkspaceContext = useCallback((): AgentWorkspaceContext => ({
    workspace,
    childCache,
    openFiles,
    activeFileId,
    codebaseIndex,
    localServerUrl: settings.localServerUrl,
    getEditorSelection,
  }), [workspace, childCache, openFiles, activeFileId, codebaseIndex, settings.localServerUrl, getEditorSelection]);

  const handleOpenFolderRef = useRef<() => void>(() => {});

  const sendAgentMessage = useCallback(
    (content: string, images?: string[], mode: AgentMode = "agent") => {
      if (!activeAgent) return;

      const wantsCodebase = parseContextMentions(content).some((m) => m.kind === "codebase");
      if (wantsCodebase && (!workspace || !codebaseIndex?.chunks.length)) {
        setSidebarVisible(true);
        setLeftSidebarTab("explorer");
        const tip = !workspace
          ? "Open a folder first (Explorer → Open Folder), wait for indexing, then ask again with @codebase."
          : "Codebase index is still building — wait a few seconds, then ask again with @codebase.";
        toast({
          title: !workspace ? "Open a folder for @codebase" : "Indexing…",
          description: tip,
        });
        const userMsg: AgentMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content,
          ...(images?.length ? { images } : {}),
        };
        const assistantMsg: AgentMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: tip,
        };
        setActiveAgent((prev) =>
          prev
            ? {
                ...prev,
                name:
                  prev.messages.length === 0 &&
                  (prev.name === "New agent" || prev.name === "App shell review")
                    ? deriveChatTitle(content)
                    : prev.name,
                messages: [...prev.messages, userMsg, assistantMsg],
              }
            : null
        );
        if (!workspace) handleOpenFolderRef.current();
        return;
      }

      const isFirstMessage = activeAgent.messages.length === 0;
      const useDefaultName =
        activeAgent.name === "New agent" || activeAgent.name === "App shell review";
      const titleContent = content.trim() && content !== "(image)" ? content : undefined;
      if (isFirstMessage && useDefaultName && titleContent) {
        setActiveAgent((prev) =>
          prev ? { ...prev, name: deriveChatTitle(content) } : null
        );
      }
      void runAgentTurn({
        content,
        images,
        session: activeAgent,
        systemPrompt: buildChatSystemPrompt(projectRules, mode),
        settings,
        ctx: getAgentWorkspaceContext(),
        setSession: setActiveAgent,
        setStreaming: setAgentStreaming,
        disallowActions: mode === "ask" || mode === "plan",
      });
    },
    [
      activeAgent,
      deriveChatTitle,
      getAgentWorkspaceContext,
      settings,
      workspace,
      codebaseIndex,
      projectRules,
    ]
  );

  const startComposer = useCallback(() => {
    setActiveAgent(null);
    setActiveComposer({
      id: `composer-${Date.now()}`,
      name: "Composer",
      messages: [],
    });
  }, []);

  const closeComposer = useCallback(() => {
    setActiveComposer(null);
  }, []);

  const sendComposerMessage = useCallback(
    (content: string, images?: string[]) => {
      if (!activeComposer) return;

      const wantsCodebase = parseContextMentions(content).some((m) => m.kind === "codebase");
      if (wantsCodebase && (!workspace || !codebaseIndex?.chunks.length)) {
        setSidebarVisible(true);
        setLeftSidebarTab("explorer");
        const tip = !workspace
          ? "Open a folder first (Explorer → Open Folder), wait for indexing, then ask again with @codebase."
          : "Codebase index is still building — wait a few seconds, then ask again with @codebase.";
        toast({
          title: !workspace ? "Open a folder for @codebase" : "Indexing…",
          description: tip,
        });
        const userMsg: AgentMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content,
          ...(images?.length ? { images } : {}),
        };
        const assistantMsg: AgentMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: tip,
        };
        setActiveComposer((prev) =>
          prev ? { ...prev, messages: [...prev.messages, userMsg, assistantMsg] } : null
        );
        if (!workspace) handleOpenFolderRef.current();
        return;
      }

      void runAgentTurn({
        content,
        images,
        session: activeComposer,
        systemPrompt: composerSystemPrompt,
        settings,
        ctx: getAgentWorkspaceContext(),
        setSession: setActiveComposer,
        setStreaming: setComposerStreaming,
      });
    },
    [
      activeComposer,
      composerSystemPrompt,
      getAgentWorkspaceContext,
      settings,
      workspace,
      codebaseIndex,
    ]
  );

  const applyAcceptEdit = useCallback(
    async (
      session: { messages: AgentMessage[] } | null,
      setSession: React.Dispatch<React.SetStateAction<{ id: string; name: string; messages: AgentMessage[] } | null>>,
      messageId: string,
      editId: string
    ) => {
      if (!session) return;
      const msg = session.messages.find((m) => m.id === messageId);
      const edit = msg?.pendingEdits?.find((e) => e.id === editId);
      if (!edit || edit.status !== "pending") return;

      const flatFiles = workspace
        ? getFlatFileList(workspace.topLevelNodes, childCache)
        : [];
      const rootName = workspace?.rootName ?? "";
      const { fullPath, relativePath } = normalizeAgentPath(edit.path, rootName, flatFiles);

      try {
        if (workspace && relativePath && (workspace.rootHandle || workspace.rootLocalPath)) {
          await writeWorkspaceFileAtPath(relativePath, edit.newContent, {
            rootHandle: workspace.rootHandle,
            rootLocalPath: workspace.rootLocalPath,
            localServerUrl: settings.localServerUrl,
          });
          const existing = openFiles.find((f) => f.path === fullPath);
          if (existing) {
            setOpenFiles((prev) =>
              prev.map((f) =>
                f.path === fullPath
                  ? { ...f, content: edit.newContent, dirty: false }
                  : f
              )
            );
          } else {
            const name = fullPath.split("/").pop() ?? fullPath;
            setOpenFiles((prev) => [
              ...prev,
              {
                id: fullPath,
                name,
                path: fullPath,
                content: edit.newContent,
                relPath: relativePath,
                dirty: false,
              },
            ]);
          }
        } else {
          toast({
            title: "Cannot apply edit",
            description: "Open a workspace folder first so files can be written.",
          });
          return;
        }

        setSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) =>
              m.id !== messageId
                ? m
                : {
                    ...m,
                    pendingEdits: m.pendingEdits?.map((e) =>
                      e.id === editId ? { ...e, status: "accepted" as const } : e
                    ),
                  }
            ),
          };
        });
        toast({ title: "Edit applied", description: fullPath });
      } catch (err) {
        toast({
          title: "Could not apply edit",
          description: err instanceof Error ? err.message : "Write failed.",
        });
      }
    },
    [childCache, openFiles, workspace]
  );

  const handleAcceptAgentEdit = useCallback(
    (messageId: string, editId: string) => {
      void applyAcceptEdit(activeAgent, setActiveAgent, messageId, editId);
    },
    [activeAgent, applyAcceptEdit]
  );

  const handleAcceptComposerEdit = useCallback(
    (messageId: string, editId: string) => {
      void applyAcceptEdit(activeComposer, setActiveComposer, messageId, editId);
    },
    [activeComposer, applyAcceptEdit]
  );

  const rejectEdit = useCallback(
    (
      setSession: React.Dispatch<React.SetStateAction<{ id: string; name: string; messages: AgentMessage[] } | null>>,
      messageId: string,
      editId: string
    ) => {
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((m) =>
            m.id !== messageId
              ? m
              : {
                  ...m,
                  pendingEdits: m.pendingEdits?.map((e) =>
                    e.id === editId ? { ...e, status: "rejected" as const } : e
                  ),
                }
          ),
        };
      });
    },
    []
  );

  const handleRejectAgentEdit = useCallback(
    (messageId: string, editId: string) => rejectEdit(setActiveAgent, messageId, editId),
    [rejectEdit]
  );

  const handleRejectComposerEdit = useCallback(
    (messageId: string, editId: string) => rejectEdit(setActiveComposer, messageId, editId),
    [rejectEdit]
  );

  const updateCommandInSession = useCallback(
    (
      setSession: React.Dispatch<React.SetStateAction<{ id: string; name: string; messages: AgentMessage[] } | null>>,
      messageId: string,
      commandId: string,
      patch: Partial<NonNullable<AgentMessage["pendingCommands"]>[number]>
    ) => {
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((m) =>
            m.id !== messageId
              ? m
              : {
                  ...m,
                  pendingCommands: m.pendingCommands?.map((c) =>
                    c.id === commandId ? { ...c, ...patch } : c
                  ),
                }
          ),
        };
      });
    },
    []
  );

  const applyAcceptCommand = useCallback(
    async (
      session: ActiveAgent | null,
      setSession: React.Dispatch<React.SetStateAction<ActiveAgent | null>>,
      messageId: string,
      commandId: string,
      opts: {
        systemPrompt: string;
        setStreaming: (v: boolean) => void;
      }
    ) => {
      if (!session) return;
      const msg = session.messages.find((m) => m.id === messageId);
      const cmd = msg?.pendingCommands?.find((c) => c.id === commandId);
      if (!cmd || cmd.status !== "pending") return;

      const cwd =
        cmd.cwd ||
        workspace?.rootLocalPath ||
        workspaceLocalPathResolved ||
        getWorkspaceLocalPath(workspace?.rootName ?? "") ||
        null;

      if (!cwd) {
        toast({
          title: "Cannot run command",
          description: "Open a folder and set the workspace path (Source Control) so the shell has a cwd.",
        });
        return;
      }

      updateCommandInSession(setSession, messageId, commandId, { status: "running", cwd });

      try {
        const result = await runWorkspaceCommand(settings.localServerUrl, cwd, cmd.command);
        const nextStatus = result.ok ? ("accepted" as const) : ("failed" as const);
        const updated = {
          status: nextStatus,
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          timedOut: result.timedOut,
          cwd: result.cwd,
        };

        const cmdForPrompt = { ...cmd, ...updated };
        const resultMsg: AgentMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content: formatRunResultForChat(cmdForPrompt),
        };

        // Build history with command status + result for the continue turn
        const historyWithResult: AgentMessage[] = session.messages.map((m) => {
          if (m.id !== messageId || !m.pendingCommands) return m;
          return {
            ...m,
            pendingCommands: m.pendingCommands.map((c) =>
              c.id === commandId ? { ...c, ...updated } : c
            ),
          };
        });
        historyWithResult.push(resultMsg);

        setSession((prev) =>
          prev ? { ...prev, messages: historyWithResult } : null
        );

        toast({
          title: result.ok ? "Command finished" : "Command failed",
          description: `Exit ${result.exitCode}${result.timedOut ? " (timed out)" : ""}`,
        });

        if (settings.autoContinueAfterRun && settings.agentApiKey?.trim()) {
          await runAgentTurn({
            content: buildContinueAfterRunPrompt(cmdForPrompt),
            session: { ...session, messages: historyWithResult },
            historyMessages: historyWithResult,
            hideUserMessage: true,
            skipContextBlock: true,
            systemPrompt: opts.systemPrompt,
            settings,
            ctx: getAgentWorkspaceContext(),
            setSession,
            setStreaming: opts.setStreaming,
          });
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : "Run failed";
        updateCommandInSession(setSession, messageId, commandId, {
          status: "failed",
          error,
          exitCode: 1,
        });
        toast({ title: "Could not run command", description: error });
      }
    },
    [
      settings,
      updateCommandInSession,
      workspace?.rootLocalPath,
      workspace?.rootName,
      workspaceLocalPathResolved,
      getAgentWorkspaceContext,
    ]
  );

  const rejectCommand = useCallback(
    (
      setSession: React.Dispatch<React.SetStateAction<ActiveAgent | null>>,
      messageId: string,
      commandId: string
    ) => {
      updateCommandInSession(setSession, messageId, commandId, { status: "rejected" });
    },
    [updateCommandInSession]
  );

  const handleAcceptAgentCommand = useCallback(
    (messageId: string, commandId: string) => {
      void applyAcceptCommand(activeAgent, setActiveAgent, messageId, commandId, {
        systemPrompt: chatSystemPrompt,
        setStreaming: setAgentStreaming,
      });
    },
    [activeAgent, applyAcceptCommand, chatSystemPrompt]
  );

  const handleAcceptComposerCommand = useCallback(
    (messageId: string, commandId: string) => {
      void applyAcceptCommand(activeComposer, setActiveComposer, messageId, commandId, {
        systemPrompt: composerSystemPrompt,
        setStreaming: setComposerStreaming,
      });
    },
    [activeComposer, applyAcceptCommand, composerSystemPrompt]
  );

  const handleRejectAgentCommand = useCallback(
    (messageId: string, commandId: string) => rejectCommand(setActiveAgent, messageId, commandId),
    [rejectCommand]
  );

  const handleRejectComposerCommand = useCallback(
    (messageId: string, commandId: string) => rejectCommand(setActiveComposer, messageId, commandId),
    [rejectCommand]
  );

  const closeInlineEdit = useCallback(() => {
    setInlineEditOpen(false);
    setInlineEditContext(null);
    setInlineEditPreview(null);
    setInlineEditError(null);
    setInlineEditLoading(false);
  }, []);

  const openInlineEdit = useCallback(() => {
    const view = editorViewRef.current;
    const file = openFiles.find((f) => f.id === activeFileId);
    if (!view || !file || file.id === "welcome") return;
    const sel = view.state.selection.main;
    const line = view.state.doc.lineAt(sel.from);
    setInlineEditContext({
      filePath: file.path ?? file.name,
      fileName: file.name,
      selectedText: sel.empty ? "" : view.state.sliceDoc(sel.from, sel.to),
      from: sel.from,
      to: sel.to,
      line: line.number,
    });
    setInlineEditPreview(null);
    setInlineEditError(null);
    setInlineEditOpen(true);
  }, [activeFileId, openFiles]);

  const handleInlineEditSubmit = useCallback(
    (instruction: string) => {
      if (!inlineEditContext) return;
      if (!settings.agentApiKey?.trim()) {
        setInlineEditError("Set API key in Preferences → Agent.");
        return;
      }
      setInlineEditLoading(true);
      setInlineEditError(null);
      const selectionBlock = inlineEditContext.selectedText
        ? `\n\nSelected code:\n\`\`\`\n${inlineEditContext.selectedText}\n\`\`\``
        : `\n\nCursor at line ${inlineEditContext.line} in ${inlineEditContext.filePath}.`;
      const userContent = `${instruction}${selectionBlock}`;

      let response = "";
      streamAgentResponse(
        [
          { role: "system", content: inlineSystemPrompt },
          { role: "user", content: userContent },
        ],
        {
          apiKey: settings.agentApiKey.trim(),
          baseUrl: settings.agentApiUrl.trim() || "https://api.openai.com/v1",
          model: settings.agentModel.trim() || "gpt-4o-mini",
        },
        (chunk) => {
          response += chunk;
        },
        () => {
          setInlineEditLoading(false);
          const parsed = parseInlineEditFromResponse(response);
          if (parsed === null) {
            setInlineEditError("No inline edit block in response. Try again.");
            return;
          }
          setInlineEditPreview(parsed);
        },
        (err) => {
          setInlineEditLoading(false);
          setInlineEditError(err);
        }
      );
    },
    [inlineEditContext, inlineSystemPrompt, settings]
  );

  const handleInlineEditAccept = useCallback(() => {
    const view = editorViewRef.current;
    if (!view || !inlineEditContext || inlineEditPreview === null) return;
    view.dispatch({
      changes: { from: inlineEditContext.from, to: inlineEditContext.to, insert: inlineEditPreview },
    });
    const newContent = view.state.doc.toString();
    if (activeFileId) {
      setOpenFiles((prev) =>
        prev.map((f) =>
          f.id === activeFileId ? { ...f, content: newContent, dirty: true } : f
        )
      );
    }
    closeInlineEdit();
    toast({ title: "Inline edit applied" });
  }, [activeFileId, closeInlineEdit, inlineEditContext, inlineEditPreview]);

  const openAgentInCenter = useCallback((id: string) => {
    const fromHistory = agentHistory.find((h) => h.id === id);
    if (fromHistory) {
      setActiveComposer(null);
      setAgentHistory((prev) => prev.filter((h) => h.id !== id));
      setActiveAgent({
        id: fromHistory.id,
        name: fromHistory.name,
        messages: fromHistory.messages ?? [],
      });
    }
  }, [agentHistory]);

  const maximizeChat = useCallback(() => {
    setIsChatMaximized(true);
    setSidebarVisible(false);
    setRightSidebarVisible(false);
    setPanelVisible(false);
  }, []);

  const restoreLayout = useCallback(() => {
    setIsChatMaximized(false);
    setSidebarVisible(true);
    setRightSidebarVisible(true);
  }, []);

  const maximizeBottomPanel = useCallback(() => {
    setPanelVisible(true);
    setIsPanelMaximized(true);
  }, []);

  const restoreBottomPanel = useCallback(() => {
    setIsPanelMaximized(false);
  }, []);

  const closeBottomPanel = useCallback(() => {
    setPanelVisible(false);
    setIsPanelMaximized(false);
  }, []);

  const { append: appendOutput } = useOutput();
  const {
    append: appendDebug,
    clear: clearDebug,
    configs: debugConfigs,
    setConfigs: setDebugConfigs,
    selectedId: debugSelectedId,
    setSelectedId: setDebugSelectedId,
    setRunning: setDebugRunning,
  } = useDebug();
  const activeFile = openFiles.find((f) => f.id === activeFileId) ?? null;

  // Fast buffer diagnostics (syntactic + semantic across open TS/JS files)
  useEffect(() => {
    if (!activeFile?.path || activeFile.content == null) {
      setBufferProblems([]);
      return;
    }
    const path = activeFile.path;
    const content = activeFile.content;
    const siblings = openFiles
      .filter((f) => f.path && f.id !== activeFile.id)
      .map((f) => ({ path: f.path!, content: f.content }));
    const t = setTimeout(() => {
      setBufferProblems(getDiagnostics(path, content, siblings));
    }, 400);
    return () => clearTimeout(t);
  }, [activeFile?.id, activeFile?.path, activeFile?.content, openFiles]);

  // Project diagnostics via tsc when a disk workspace path is available
  useEffect(() => {
    const cwd = workspaceLocalPathResolved;
    if (!cwd || !workspace?.rootName) {
      setProjectProblems([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      void (async () => {
        const next = await getProjectDiagnostics(
          settings.localServerUrl,
          cwd,
          workspace.rootName
        );
        if (!cancelled) setProjectProblems(next);
      })();
    }, 1800);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [
    workspaceLocalPathResolved,
    workspace?.rootName,
    settings.localServerUrl,
    // Re-check after saves (dirty flags clear)
    openFiles.map((f) => `${f.path}:${f.dirty ? 1 : 0}`).join("|"),
  ]);

  useEffect(() => {
    setProblems(
      mergeDiagnostics(projectProblems, bufferProblems, activeFile?.path)
    );
  }, [projectProblems, bufferProblems, activeFile?.path]);

  const applyOpenedFolder = useCallback(
    (result: {
      rootName: string;
      rootHandle: FileSystemDirectoryHandle | null;
      rootLocalPath: string | null;
      children: FileTreeNode[];
    }) => {
      setWorkspace({
        rootName: result.rootName,
        rootHandle: result.rootHandle,
        rootLocalPath: result.rootLocalPath,
        topLevelNodes: result.children,
      });
      setExpandedPaths(new Set());
      setChildCache({});
      if (result.rootLocalPath) {
        setWorkspaceLocalPathResolved(result.rootLocalPath);
        void addRecentPathFolder(result.rootName, result.rootLocalPath).then(async () => {
          setRecentFolders(await getRecentFolders());
        });
      }
    },
    []
  );

  const handleOpenFolderByPath = useCallback(async () => {
    setSidebarVisible(true);
    const suggested =
      workspaceLocalPathResolved ||
      (typeof window !== "undefined" && window.location.hostname !== "localhost"
        ? "/app"
        : "C:\\Users\\User\\jollof-ide");
    const entered = window.prompt(
      "Enter the absolute folder path on the server (cloud) or your PC (local).",
      suggested
    );
    if (!entered?.trim()) return;
    try {
      const result = await openFolderByAbsolutePath(settings.localServerUrl, entered.trim());
      if (!result) {
        toast({ title: "Could not open folder", description: "Empty path." });
        return;
      }
      applyOpenedFolder(result);
      toast({ title: "Folder opened", description: result.rootLocalPath });
    } catch (err) {
      toast({
        title: "Could not open folder",
        description:
          err instanceof Error
            ? err.message
            : "Check the path and that the local server is reachable (Preferences → Agent / server URL).",
      });
    }
  }, [applyOpenedFolder, settings.localServerUrl, workspaceLocalPathResolved]);

  const handleOpenFolder = useCallback(async () => {
    setSidebarVisible(true);
    if (isTauri()) {
      try {
        const result = await openDesktopFolder(settings.localServerUrl);
        if (!result) return;
        applyOpenedFolder(result);
      } catch (err) {
        toast({
          title: "Could not open folder",
          description: err instanceof Error ? err.message : "Desktop folder open failed.",
        });
      }
      return;
    }

    if (!isFileSystemAccessSupported()) {
      // Cloud / Firefox / insecure HTTP — fall back to absolute path via server FS API
      await handleOpenFolderByPath();
      return;
    }

    try {
      const result = await pickFolder();
      if (!result) return;
      applyOpenedFolder({
        rootName: result.rootName,
        rootHandle: result.rootHandle,
        rootLocalPath: null,
        children: result.children,
      });
      try {
        await addRecentFolder(result.rootName, result.rootHandle);
        setRecentFolders(await getRecentFolders());
      } catch {
        // IndexedDB or handle storage may fail
      }
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      toast({
        title: "Could not open folder",
        description: err instanceof Error ? err.message : "Folder picker failed.",
      });
    }
  }, [applyOpenedFolder, handleOpenFolderByPath, settings.localServerUrl]);

  handleOpenFolderRef.current = () => {
    void handleOpenFolder();
  };

  const handleOpenRecentFolder = useCallback(async (entry: RecentFolderEntry) => {
    // Path-based recent (cloud / desktop / HTTP)
    if (entry.localPath) {
      try {
        setSidebarVisible(true);
        const result = await openFolderByAbsolutePath(settings.localServerUrl, entry.localPath);
        if (!result) {
          toast({ title: "Could not open folder", description: "Empty or invalid path." });
          return;
        }
        applyOpenedFolder(result);
        toast({ title: "Folder opened", description: result.rootLocalPath });
      } catch (err) {
        toast({
          title: "Could not open folder",
          description: err instanceof Error ? err.message : "Path open failed.",
        });
      }
      return;
    }

    if (!entry.handle) {
      toast({
        title: "Could not open folder",
        description: "This recent entry has no handle or path. Use Open Folder instead.",
      });
      return;
    }

    try {
      const handle = entry.handle as FileSystemDirectoryHandle & {
        queryPermission?(opts: { mode: string }): Promise<PermissionState>;
        requestPermission?(opts: { mode: string }): Promise<PermissionState>;
      };
      const permission = await handle.queryPermission?.({ mode: "readwrite" });
      if (permission !== "granted") {
        const requested = await handle.requestPermission?.({ mode: "readwrite" });
        if (requested !== "granted") return;
      }
      const result = await openFolderFromHandle(entry.handle);
      setSidebarVisible(true);
      setWorkspace({
        rootName: result.rootName,
        rootHandle: result.rootHandle,
        rootLocalPath: null,
        topLevelNodes: result.children,
      });
      setExpandedPaths(new Set());
      setChildCache({});
    } catch (err) {
      toast({
        title: "Could not open folder",
        description: err instanceof Error ? err.message : "Permission or read error. Try Open Folder instead.",
      });
    }
  }, [applyOpenedFolder, settings.localServerUrl]);

  const handleExpandDirectory = useCallback(async (node: FileTreeNode) => {
    if (node.kind !== "directory") return;
    const path = node.path;
    if (childCache[path]) {
      setExpandedPaths((prev) => {
        const next = new Set(prev);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        return next;
      });
      return;
    }
    setLoadingPath(path);
    try {
      const children = workspace?.rootLocalPath
        ? await loadDesktopDirectoryChildren(
            settings.localServerUrl,
            workspace.rootLocalPath,
            workspace.rootName,
            node
          )
        : await loadDirectoryChildren(node);
      setChildCache((prev) => ({ ...prev, [path]: children }));
      setExpandedPaths((prev) => new Set([...prev, path]));
    } finally {
      setLoadingPath(null);
    }
  }, [childCache, workspace, settings.localServerUrl]);

  const openFileByEntry = useCallback(
    async (entry: FlatFileEntry) => {
      const { path, name, handle, relPath } = entry;
      const existing = openFiles.find((f) => f.path === path);
      if (existing) {
        setActiveFileId(existing.id);
        return;
      }
      try {
        const content = await readWorkspaceFile(entry, {
          rootLocalPath: workspace?.rootLocalPath,
          localServerUrl: settings.localServerUrl,
        });
        const newFile: OpenFile = {
          id: path,
          name,
          path,
          content,
          fileHandle: handle,
          relPath,
          dirty: false,
        };
        setOpenFiles((prev) => [...prev, newFile]);
        setActiveFileId(path);
      } catch (err) {
        toast({
          title: "Could not open file",
          description: err instanceof Error ? err.message : "Permission or read error.",
        });
      }
    },
    [openFiles, workspace?.rootLocalPath, settings.localServerUrl]
  );

  const handleOpenFileFromTree = useCallback(
    (node: FileTreeNode) => {
      if (node.kind !== "file") return;
      openFileByEntry({
        path: node.path,
        name: node.name,
        handle: node.handle as FileSystemFileHandle | undefined,
        relPath: node.relPath,
      });
    },
    [openFileByEntry]
  );

  const handleSelectFile = useCallback((id: string) => {
    setActiveFileId(id);
  }, []);

  const handleCloseFile = useCallback((id: string) => {
    setOpenFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      if (activeFileId === id && next.length > 0) {
        setActiveFileId(next[0].id);
      } else if (next.length === 0) {
        setActiveFileId("");
      }
      return next;
    });
  }, [activeFileId]);

  const handleNewFile = useCallback(() => {
    const id = `untitled-${Date.now()}`;
    const newFile: OpenFile = {
      id,
      name: "Untitled",
      content: "",
      dirty: true,
    };
    setOpenFiles((prev) => [...prev, newFile]);
    setActiveFileId(id);
  }, []);

  const handleOpenFile = useCallback(async () => {
    // Cloud / insecure HTTP: open by relative path under the workspace
    if (!isFileSystemAccessSupported() || !("showOpenFilePicker" in window)) {
      if (!workspace?.rootLocalPath && !workspace?.rootHandle) {
        toast({
          title: "Open a folder first",
          description: "Open Folder, then open a file from the tree or by relative path.",
        });
        return;
      }
      const input = window.prompt(
        "Open file (path relative to workspace root):",
        "src/main.tsx"
      );
      if (!input?.trim()) return;
      const rel = input.trim().replace(/\\/g, "/");
      const name = rel.split("/").pop() || rel;
      const path = `${workspace!.rootName}/${rel}`;
      await openFileByEntry({
        path,
        name,
        relPath: rel,
      });
      return;
    }

    try {
      const handles = await openFilePicker(true);
      for (const handle of handles) {
        const existing = openFiles.find((f) => f.fileHandle === handle);
        if (existing) {
          setActiveFileId(existing.id);
          continue;
        }
        try {
          const content = await readFileContent(handle);
          const id = `file-${handle.name}-${Date.now()}`;
          const newFile: OpenFile = {
            id,
            name: handle.name,
            path: handle.name,
            content,
            fileHandle: handle,
            dirty: false,
          };
          setOpenFiles((prev) => [...prev, newFile]);
          setActiveFileId(id);
        } catch (err) {
          toast({
            title: "Could not open file",
            description: `${handle.name}: ${err instanceof Error ? err.message : "Read error."}`,
          });
        }
      }
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      toast({
        title: "Could not open file",
        description: err instanceof Error ? err.message : "File picker failed.",
      });
    }
  }, [openFiles, workspace, openFileByEntry]);

  const handleSaveAs = useCallback(async () => {
    const file = openFiles.find((f) => f.id === activeFileId);
    if (!file) return;

    // Path-based / workspace root: prompt for relative path
    if (workspace?.rootLocalPath || workspace?.rootHandle) {
      const suggested =
        file.relPath ||
        relPathFromWorkspacePath(file.path, workspace.rootName) ||
        file.name ||
        "untitled.txt";
      const input = window.prompt("Save as (path relative to workspace root):", suggested);
      if (!input?.trim()) return;
      const rel = input.trim().replace(/\\/g, "/");
      try {
        await writeWorkspaceFileAtPath(rel, file.content, {
          rootHandle: workspace.rootHandle,
          rootLocalPath: workspace.rootLocalPath,
          localServerUrl: settings.localServerUrl,
        });
        const fullPath = `${workspace.rootName}/${rel}`;
        const newFile: OpenFile = {
          ...file,
          id: fullPath,
          name: rel.split("/").pop() || rel,
          path: fullPath,
          relPath: rel,
          dirty: false,
        };
        setOpenFiles((prev) => prev.map((f) => (f.id === activeFileId ? newFile : f)));
        setActiveFileId(fullPath);
        toast({ title: "Saved", description: rel });
      } catch (err) {
        toast({
          title: "Save As failed",
          description: err instanceof Error ? err.message : "Could not save file.",
        });
      }
      return;
    }

    if (typeof window === "undefined" || !("showSaveFilePicker" in window)) {
      toast({
        title: "Save As unavailable",
        description: "Open a workspace folder first, or use Chromium on HTTPS/localhost.",
      });
      return;
    }
    const w = window as Window & {
      showSaveFilePicker?(opts?: { suggestedName?: string }): Promise<FileSystemFileHandle>;
    };
    try {
      const handle = await w.showSaveFilePicker!({ suggestedName: file.name || "untitled" });
      await writeFileContent(handle, file.content);
      const newFile: OpenFile = {
        ...file,
        id: `file-${handle.name}-${Date.now()}`,
        name: handle.name,
        path: handle.name,
        fileHandle: handle,
        dirty: false,
      };
      setOpenFiles((prev) => prev.map((f) => (f.id === activeFileId ? newFile : f)));
      setActiveFileId(newFile.id);
      toast({ title: "Saved", description: handle.name });
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      toast({
        title: "Save As failed",
        description: err instanceof Error ? err.message : "Could not save file.",
      });
    }
  }, [activeFileId, openFiles, workspace, settings.localServerUrl]);

  const handleRevertFile = useCallback(async () => {
    const file = openFiles.find((f) => f.id === activeFileId);
    if (!file) return;
    const relPath =
      file.relPath || relPathFromWorkspacePath(file.path, workspace?.rootName) || null;
    try {
      let content: string | null = null;
      if (file.fileHandle) {
        content = await readFileContent(file.fileHandle);
      } else if (relPath && (workspace?.rootLocalPath || workspace?.rootHandle)) {
        content = await readWorkspaceFileAtPath(relPath, {
          rootHandle: workspace?.rootHandle ?? null,
          rootLocalPath: workspace?.rootLocalPath ?? null,
          localServerUrl: settings.localServerUrl,
        });
      }
      if (content == null) {
        toast({
          title: "Could not revert file",
          description: "No disk copy to reload from.",
        });
        return;
      }
      setOpenFiles((prev) =>
        prev.map((f) => (f.id === activeFileId ? { ...f, content, dirty: false } : f))
      );
    } catch (err) {
      toast({
        title: "Could not revert file",
        description: err instanceof Error ? err.message : "Permission or read error.",
      });
    }
  }, [activeFileId, openFiles, workspace, settings.localServerUrl]);

  const handleCloseEditor = useCallback(() => {
    if (activeFileId) handleCloseFile(activeFileId);
  }, [activeFileId, handleCloseFile]);

  const runEditorCommand = useCallback((fn: (view: EditorView) => boolean | void) => {
    const view = editorViewRef.current;
    if (!view) return;
    const result = fn(view);
    if (result === false) return;
  }, []);

  const handleUndo = useCallback(() => {
    runEditorCommand((view) => cmUndo({ state: view.state, dispatch: view.dispatch.bind(view) }));
  }, [runEditorCommand]);

  const handleRedo = useCallback(() => {
    runEditorCommand((view) => cmRedo({ state: view.state, dispatch: view.dispatch.bind(view) }));
  }, [runEditorCommand]);

  const handleToggleLineComment = useCallback(() => {
    const view = editorViewRef.current;
    if (!view) {
      toast({ title: "No editor", description: "Open a file in the editor first." });
      return;
    }
    const ok = cmToggleLineComment({
      state: view.state,
      dispatch: view.dispatch.bind(view),
    });
    if (!ok) {
      const { from, to } = view.state.selection.main;
      const startLine = view.state.doc.lineAt(from);
      const endLine = view.state.doc.lineAt(to);
      const lines: { from: number; text: string }[] = [];
      for (let n = startLine.number; n <= endLine.number; n++) {
        lines.push({ from: view.state.doc.line(n).from, text: view.state.doc.line(n).text });
      }
      const meaningful = lines.filter((l) => l.text.trim() !== "");
      const allCommented =
        meaningful.length > 0 && meaningful.every((l) => /^\s*\/\//.test(l.text));
      const ops = meaningful
        .map((l) => {
          if (allCommented) {
            const m = /^(\s*)\/\/ ?/.exec(l.text);
            if (!m) return null;
            return { from: l.from, to: l.from + m[0].length, insert: m[1] };
          }
          const m = /^(\s*)/.exec(l.text);
          const indent = m?.[1] ?? "";
          return {
            from: l.from,
            to: l.from + indent.length,
            insert: `${indent}// `,
          };
        })
        .filter(Boolean) as { from: number; to: number; insert: string }[];
      if (ops.length) view.dispatch({ changes: ops });
    }
    view.focus();
  }, []);

  const handleToggleBlockComment = useCallback(() => {
    const view = editorViewRef.current;
    if (!view) {
      toast({ title: "No editor", description: "Open a file in the editor first." });
      return;
    }
    const ok = cmToggleBlockComment({
      state: view.state,
      dispatch: view.dispatch.bind(view),
    });
    if (!ok) {
      const { from, to } = view.state.selection.main;
      const selected = view.state.sliceDoc(from, to);
      if (!selected) {
        view.dispatch({
          changes: { from, to, insert: "/*  */" },
          selection: { anchor: from + 3 },
        });
      } else if (/^\/\*[\s\S]*\*\/$/.test(selected.trim())) {
        const inner = selected.replace(/^\/\*\s?/, "").replace(/\s?\*\/$/, "");
        view.dispatch({
          changes: { from, to, insert: inner },
          selection: { anchor: from, head: from + inner.length },
        });
      } else {
        const wrapped = `/* ${selected} */`;
        view.dispatch({
          changes: { from, to, insert: wrapped },
          selection: { anchor: from, head: from + wrapped.length },
        });
      }
    }
    view.focus();
  }, []);

  const handleCopy = useCallback(async () => {
    const view = editorViewRef.current;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const text = view.state.sliceDoc(from, to);
    if (text) await navigator.clipboard.writeText(text);
  }, []);

  const handleCut = useCallback(async () => {
    const view = editorViewRef.current;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const text = view.state.sliceDoc(from, to);
    if (text) {
      await navigator.clipboard.writeText(text);
      view.dispatch({ changes: { from, to, insert: "" } });
    }
  }, []);

  const handlePaste = useCallback(async () => {
    const view = editorViewRef.current;
    if (!view) return;
    try {
      const text = await navigator.clipboard.readText();
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
      });
      view.focus();
    } catch {
      toast({
        title: "Paste failed",
        description: "Clipboard permission denied or unavailable.",
      });
    }
  }, []);

  const handleCopyPath = useCallback(async () => {
    const file = openFiles.find((f) => f.id === activeFileId);
    const path = file?.path || file?.name;
    if (!path) {
      toast({ title: "No file path", description: "Open a file first." });
      return;
    }
    await navigator.clipboard.writeText(path);
    toast({ title: "Path copied", description: path });
  }, [activeFileId, openFiles]);

  const handleCopyRelativePath = useCallback(async () => {
    const file = openFiles.find((f) => f.id === activeFileId);
    const rel =
      file?.relPath ||
      relPathFromWorkspacePath(file?.path, workspace?.rootName) ||
      file?.name;
    if (!rel) {
      toast({ title: "No relative path", description: "Open a workspace file first." });
      return;
    }
    await navigator.clipboard.writeText(rel);
    toast({ title: "Relative path copied", description: rel });
  }, [activeFileId, openFiles, workspace?.rootName]);

  const handleSelectAll = useCallback(() => {
    runEditorCommand((view) => cmSelectAll({ state: view.state, dispatch: view.dispatch.bind(view) }));
  }, [runEditorCommand]);

  const handleCopyLineUp = useCallback(() => {
    runEditorCommand((view) => cmCopyLineUp({ state: view.state, dispatch: view.dispatch.bind(view) }));
  }, [runEditorCommand]);

  const handleCopyLineDown = useCallback(() => {
    runEditorCommand((view) =>
      cmCopyLineDown({ state: view.state, dispatch: view.dispatch.bind(view) })
    );
  }, [runEditorCommand]);

  const handleMoveLineUp = useCallback(() => {
    runEditorCommand((view) => cmMoveLineUp({ state: view.state, dispatch: view.dispatch.bind(view) }));
  }, [runEditorCommand]);

  const handleMoveLineDown = useCallback(() => {
    runEditorCommand((view) =>
      cmMoveLineDown({ state: view.state, dispatch: view.dispatch.bind(view) })
    );
  }, [runEditorCommand]);

  const handleDeleteLine = useCallback(() => {
    runEditorCommand((view) => cmDeleteLine(view));
  }, [runEditorCommand]);

  const handleFindInEditor = useCallback(() => {
    const view = editorViewRef.current;
    if (view) {
      openSearchPanel(view);
      view.focus();
    }
  }, []);

  const handleReplaceInEditor = useCallback(() => {
    const view = editorViewRef.current;
    if (!view) return;
    openSearchPanel(view);
    // Focus the replace field in CodeMirror's search panel when present
    requestAnimationFrame(() => {
      const panel = view.dom.querySelector(".cm-search");
      const inputs = panel?.querySelectorAll("input");
      const replaceInput = inputs && inputs.length > 1 ? inputs[1] : null;
      if (replaceInput instanceof HTMLInputElement) {
        replaceInput.focus();
        replaceInput.select();
      } else {
        view.focus();
      }
    });
  }, []);

  const handleFindNext = useCallback(() => {
    runEditorCommand((view) => cmFindNext(view));
  }, [runEditorCommand]);

  const handleFindPrevious = useCallback(() => {
    runEditorCommand((view) => cmFindPrevious(view));
  }, [runEditorCommand]);

  const handleOpenCommandPalette = useCallback(() => setCommandPaletteOpen(true), []);
  const handleShowExplorer = useCallback(() => {
    setSidebarVisible(true);
    setLeftSidebarTab("explorer");
  }, []);
  const handleShowSourceControl = useCallback(() => {
    setSidebarVisible(true);
    setLeftSidebarTab("source-control");
  }, []);
  const handleShowSearch = useCallback(() => {
    setSearchReplaceMode(false);
    setSearchOpen(true);
  }, []);
  const handleShowReplaceInFiles = useCallback(() => {
    setSearchReplaceMode(true);
    setSearchOpen(true);
  }, []);
  const handleShowTerminal = useCallback(() => {
    setPanelVisible(true);
    setActivePanelTab("terminal");
  }, []);

  const handleShowWelcome = useCallback(() => {
    setOpenFiles((prev) =>
      prev.some((f) => f.id === "welcome") ? prev : [defaultFile, ...prev]
    );
    setActiveFileId("welcome");
  }, []);

  const handleOpenAbout = useCallback(() => setAboutOpen(true), []);
  const handleOpenDocumentation = useCallback(openDocumentation, []);
  const handleOpenReleaseNotes = useCallback(openReleaseNotes, []);
  const handleOpenReportIssue = useCallback(openReportIssue, []);

  const handleNewTerminal = useCallback(() => {
    const nextNum = terminalTabs.length + 1;
    const id = `term-${Date.now()}`;
    const name = `Terminal ${nextNum}`;
    setTerminalTabs((prev) => [...prev, { id, name }]);
    setActiveTerminalId(id);
    setPanelVisible(true);
    setActivePanelTab("terminal");
  }, [terminalTabs.length]);

  const handleCloseTerminal = useCallback((id: string) => {
    setTerminalTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeTerminalId === id) {
        setActiveTerminalId(next[0]?.id ?? null);
      }
      return next;
    });
  }, [activeTerminalId]);
  const handleShowOutput = useCallback(() => {
    setPanelVisible(true);
    setActivePanelTab("output");
  }, []);
  const handleShowProblems = useCallback(() => {
    setPanelVisible(true);
    setActivePanelTab("problems");
  }, []);
  const handleRunTask = useCallback(() => {
    appendOutput(`[${new Date().toLocaleTimeString()}] Run Task — use Terminal or run a build script (e.g. npm run build).`);
    setPanelVisible(true);
    setActivePanelTab("output");
  }, [appendOutput]);
  const handleOpenGoToFile = useCallback(() => setQuickOpenOpen(true), []);
  const handleOpenGoToLineDialog = useCallback(() => setGoToLineOpen(true), []);
  const handleOpenGoToSymbol = useCallback(() => setGoToSymbolOpen(true), []);

  const handleGoToLine = useCallback((line: number, column?: number) => {
    const view = editorViewRef.current;
    if (!view) return;
    const doc = view.state.doc;
    const maxLine = doc.lines;
    const lineNum = Math.max(1, Math.min(line, maxLine));
    const lineObj = doc.line(lineNum);
    let pos: number;
    if (column != null && column >= 1) {
      const colOffset = Math.min(column - 1, lineObj.length);
      pos = lineObj.from + colOffset;
    } else {
      pos = lineObj.from;
    }
    view.dispatch({
      selection: { anchor: pos, head: pos },
      scrollIntoView: true,
    });
    view.focus();
  }, []);

  const pushCurrentPosition = useCallback(() => {
    if (!activeFileId || !editorPosition) return;
    setNavBackStack((prev) =>
      [...prev, { fileId: activeFileId, line: editorPosition!.line, column: editorPosition.column }].slice(-MAX_NAV_STACK)
    );
    setNavForwardStack([]);
  }, [activeFileId, editorPosition]);

  useEffect(() => {
    if (pendingProblemGoTo && activeFileId === pendingProblemGoTo.path) {
      handleGoToLine(pendingProblemGoTo.line);
      setPendingProblemGoTo(null);
    }
  }, [activeFileId, pendingProblemGoTo, handleGoToLine]);

  const handleEditorChange = useCallback((value: string) => {
    if (!activeFileId) return;
    setOpenFiles((prev) =>
      prev.map((f) =>
        f.id === activeFileId ? { ...f, content: value, dirty: true } : f
      )
    );
  }, [activeFileId]);

  const handleSave = useCallback(async () => {
    const file = openFiles.find((f) => f.id === activeFileId);
    if (!file) return;

    const relPath =
      file.relPath || relPathFromWorkspacePath(file.path, workspace?.rootName) || null;
    const canWriteHandle = Boolean(file.fileHandle);
    const canWritePath =
      Boolean(relPath) && Boolean(workspace?.rootLocalPath || workspace?.rootHandle);

    if (!canWriteHandle && !canWritePath) {
      await handleSaveAs();
      return;
    }

    try {
      if (file.fileHandle) {
        await writeFileContent(file.fileHandle, file.content);
      } else if (relPath) {
        await writeWorkspaceFileAtPath(relPath, file.content, {
          rootHandle: workspace?.rootHandle ?? null,
          rootLocalPath: workspace?.rootLocalPath ?? null,
          localServerUrl: settings.localServerUrl,
        });
      }
      setOpenFiles((prev) =>
        prev.map((f) =>
          f.id === activeFileId
            ? { ...f, dirty: false, relPath: f.relPath || relPath || undefined }
            : f
        )
      );
    } catch (err) {
      toast({
        title: "Could not save file",
        description: err instanceof Error ? err.message : "Permission or write error.",
      });
    }
  }, [activeFileId, openFiles, workspace, settings.localServerUrl, handleSaveAs]);

  const handleRunActiveFile = useCallback(async () => {
    const file = openFiles.find((f) => f.id === activeFileId);
    if (!file) {
      toast({ title: "No file open", description: "Open a .js, .ts, .tsx, or .py file to run." });
      return;
    }
    const rel =
      file.relPath ||
      relPathFromWorkspacePath(file.path, workspace?.rootName) ||
      null;
    const cwd = workspaceLocalPathResolved;
    if (!rel || !cwd) {
      toast({
        title: "Local folder path required",
        description:
          "Open a folder with a disk path (desktop Open Folder, or set path in Source Control) to run files.",
      });
      return;
    }
    const kind = runFileKindForPath(rel);
    const command = buildRunActiveFileCommand(rel);
    if (!command) {
      toast({
        title: "Cannot run this file type",
        description: "Supported: JavaScript, TypeScript, and Python.",
      });
      return;
    }
    if (file.dirty) {
      await handleSave();
    }
    const stamp = new Date().toLocaleTimeString();
    appendOutput(`[${stamp}] Running (${runFileLabel(kind)}): ${command}`);
    setPanelVisible(true);
    setActivePanelTab("output");
    try {
      const result = await runWorkspaceCommand(settings.localServerUrl, cwd, command, 120_000);
      if (result.stdout?.trim()) appendOutput(result.stdout.replace(/\r\n/g, "\n").trimEnd());
      if (result.stderr?.trim()) appendOutput(result.stderr.replace(/\r\n/g, "\n").trimEnd());
      appendOutput(
        `[${new Date().toLocaleTimeString()}] Exit ${result.exitCode}${result.timedOut ? " (timed out)" : ""}${result.ok ? "" : " — failed"}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      appendOutput(`[run error] ${message}`);
      toast({ title: "Could not run file", description: message });
    }
  }, [
    activeFileId,
    openFiles,
    workspace?.rootName,
    workspaceLocalPathResolved,
    settings.localServerUrl,
    handleSave,
    appendOutput,
  ]);

  const handleShowDebugConsole = useCallback(() => {
    setPanelVisible(true);
    setActivePanelTab("debug");
  }, []);

  const handleStopDebugging = useCallback(() => {
    setDebugRunning(false);
    appendDebug(
      `[${new Date().toLocaleTimeString()}] Stop requested (process may still finish on the server).`
    );
  }, [appendDebug, setDebugRunning]);

  const handleStartDebugging = useCallback(async () => {
    const cwd = workspaceLocalPathResolved;
    if (!cwd) {
      toast({
        title: "Local folder path required",
        description: "Open a folder with a disk path to run debug configurations.",
      });
      handleShowDebugConsole();
      return;
    }
    const file = openFiles.find((f) => f.id === activeFileId);
    const rel =
      file?.relPath ||
      relPathFromWorkspacePath(file?.path, workspace?.rootName) ||
      null;

    let configs = debugConfigs;
    if (configs.length === 0) {
      configs = await resolveDebugConfigs({
        localServerUrl: settings.localServerUrl,
        cwd,
        fileRel: rel,
      });
      setDebugConfigs(configs);
      if (configs[0] && !debugSelectedId) setDebugSelectedId(configs[0].id);
    }

    const selected =
      configs.find((c) => c.id === (debugSelectedId || configs[0]?.id)) || configs[0];
    if (!selected) {
      toast({
        title: "No debug configuration",
        description: "Open a runnable file (.js/.ts/.py) or add .vscode/launch.json.",
      });
      handleShowDebugConsole();
      return;
    }

    if (file?.dirty && selected.id === "auto-current-file") {
      await handleSave();
    }

    setDebugSelectedId(selected.id);
    handleShowDebugConsole();
    clearDebug();
    setDebugRunning(true);
    const stamp = new Date().toLocaleTimeString();
    appendDebug(`[${stamp}] ${selected.name}`);
    appendDebug(`> ${selected.command}`);
    try {
      const result = await runWorkspaceCommand(
        settings.localServerUrl,
        cwd,
        selected.command,
        5 * 60_000
      );
      if (result.stdout?.trim()) appendDebug(result.stdout.replace(/\r\n/g, "\n").trimEnd());
      if (result.stderr?.trim()) appendDebug(result.stderr.replace(/\r\n/g, "\n").trimEnd());
      appendDebug(
        `[${new Date().toLocaleTimeString()}] Exit ${result.exitCode}${result.timedOut ? " (timed out)" : ""}${result.ok ? "" : " — failed"}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      appendDebug(`[error] ${message}`);
      toast({ title: "Debug run failed", description: message });
    } finally {
      setDebugRunning(false);
    }
  }, [
    workspaceLocalPathResolved,
    openFiles,
    activeFileId,
    workspace?.rootName,
    debugConfigs,
    debugSelectedId,
    settings.localServerUrl,
    setDebugConfigs,
    setDebugSelectedId,
    handleShowDebugConsole,
    handleSave,
    clearDebug,
    setDebugRunning,
    appendDebug,
  ]);

  useEffect(() => {
    const cwd = workspaceLocalPathResolved;
    if (!cwd) {
      setDebugConfigs([]);
      return;
    }
    const file = openFiles.find((f) => f.id === activeFileId);
    const rel =
      file?.relPath ||
      relPathFromWorkspacePath(file?.path, workspace?.rootName) ||
      null;
    let cancelled = false;
    const t = setTimeout(() => {
      void resolveDebugConfigs({
        localServerUrl: settings.localServerUrl,
        cwd,
        fileRel: rel,
      }).then((configs) => {
        if (cancelled) return;
        setDebugConfigs(configs);
        setDebugSelectedId((prev) => {
          if (prev && configs.some((c) => c.id === prev)) return prev;
          return configs[0]?.id ?? null;
        });
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [
    workspaceLocalPathResolved,
    workspace?.rootName,
    activeFileId,
    openFiles,
    settings.localServerUrl,
    setDebugConfigs,
    setDebugSelectedId,
  ]);

  const handleSaveAll = useCallback(async () => {
    const failed: string[] = [];
    const savedIds = new Set<string>();
    for (const file of openFiles) {
      if (!file.dirty) continue;
      const relPath =
        file.relPath || relPathFromWorkspacePath(file.path, workspace?.rootName) || null;
      if (!file.fileHandle && !(relPath && (workspace?.rootLocalPath || workspace?.rootHandle))) {
        failed.push(file.name ?? file.path ?? "file");
        continue;
      }
      try {
        if (file.fileHandle) {
          await writeFileContent(file.fileHandle, file.content);
        } else if (relPath) {
          await writeWorkspaceFileAtPath(relPath, file.content, {
            rootHandle: workspace?.rootHandle ?? null,
            rootLocalPath: workspace?.rootLocalPath ?? null,
            localServerUrl: settings.localServerUrl,
          });
        }
        savedIds.add(file.id);
      } catch {
        failed.push(file.name ?? file.path ?? "file");
      }
    }
    if (savedIds.size > 0) {
      setOpenFiles((prev) =>
        prev.map((f) => (savedIds.has(f.id) ? { ...f, dirty: false } : f))
      );
    }
    if (failed.length > 0) {
      toast({
        title: "Could not save some files",
        description:
          failed.length <= 2 ? failed.join(", ") : `${failed.length} files failed to save.`,
      });
    }
  }, [openFiles, workspace, settings.localServerUrl]);

  useEffect(() => {
    if (!settings.autoSave || !openFiles.some((f) => f.dirty)) return;
    const t = setTimeout(() => handleSaveAll(), 1500);
    return () => clearTimeout(t);
  }, [openFiles, settings.autoSave, handleSaveAll]);

  useEffect(() => {
    const clearChord = () => {
      if (chordTimerRef.current) {
        clearTimeout(chordTimerRef.current);
        chordTimerRef.current = null;
      }
      setChordHint(null);
    };

    const startChord = (label: string) => {
      if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
      setChordHint(label);
      chordTimerRef.current = setTimeout(clearChord, DEFAULT_CHORD_TIMEOUT_MS);
    };

    const onKey = (e: KeyboardEvent) => {
      // --- Chord second key (must run first) ---
      if (chordHint) {
        if (isModifierOnlyKey(e.key)) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.key === "Escape") {
          clearChord();
          return;
        }
        const hit = matchChordSecond(e, [
          { key: "p", shift: false, run: () => void handleCopyPath() },
          { key: "p", shift: true, run: () => void handleCopyRelativePath() },
          { key: "i", shift: false, run: () => openInlineEdit() },
        ]);
        clearChord();
        if (hit) hit.run();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "n" && !e.shiftKey) {
        e.preventDefault();
        handleNewFile();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "o" && !e.shiftKey) {
        e.preventDefault();
        handleOpenFile();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s" && !e.shiftKey) {
        e.preventDefault();
        void handleSave();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSaveAs();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p" && !e.shiftKey) {
        e.preventDefault();
        setQuickOpenOpen((open) => !open);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "g" && !e.shiftKey) {
        e.preventDefault();
        setGoToLineOpen(true);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        setGoToSymbolOpen(true);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f" && !e.shiftKey) {
        e.preventDefault();
        handleFindInEditor();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "h" && !e.shiftKey) {
        e.preventDefault();
        handleReplaceInEditor();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setSearchReplaceMode(false);
        setSearchOpen((open) => !open);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setSearchReplaceMode(true);
        setSearchOpen(true);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        setPanelVisible(true);
        setActivePanelTab("problems");
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "F5") {
        e.preventDefault();
        void handleRunActiveFile();
        return;
      }
      if (e.key === "F5" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        void handleStartDebugging();
        return;
      }
      // Ctrl+K — chord leader (P = path, Shift+P = relative path, I = inline edit)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        startChord("Ctrl+K");
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handleDeleteLine();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        startComposer();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        handleShowExplorer();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        handleShowSourceControl();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
        setPanelVisible(true);
        setActivePanelTab("output");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "`") {
        e.preventDefault();
        if (e.shiftKey) {
          handleNewTerminal();
        } else {
          setPanelVisible(true);
          setActivePanelTab("terminal");
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        appendOutput(
          `[${new Date().toLocaleTimeString()}] Run Task — use Terminal or run a build script.`
        );
        setPanelVisible(true);
        setActivePanelTab("output");
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
        return;
      }
      if (e.key === "F3") {
        e.preventDefault();
        if (e.shiftKey) handleFindPrevious();
        else handleFindNext();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        handleToggleLineComment();
        return;
      }
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === "a" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleToggleBlockComment();
        return;
      }
      // Selection / line shortcuts
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === "ArrowUp") {
        e.preventDefault();
        if (e.shiftKey) handleCopyLineUp();
        else handleMoveLineUp();
        return;
      }
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === "ArrowDown") {
        e.preventDefault();
        if (e.shiftKey) handleCopyLineDown();
        else handleMoveLineDown();
        return;
      }
      if (e.key === "F4" && e.ctrlKey) {
        e.preventDefault();
        if (activeFileId) handleCloseFile(activeFileId);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      if (chordTimerRef.current) clearTimeout(chordTimerRef.current);
    };
  }, [
    chordHint,
    handleSave,
    handleSaveAs,
    handleNewFile,
    handleOpenFile,
    activeFileId,
    handleCloseFile,
    appendOutput,
    handleNewTerminal,
    handleShowExplorer,
    handleShowSourceControl,
    openInlineEdit,
    startComposer,
    handleFindNext,
    handleFindPrevious,
    handleToggleLineComment,
    handleToggleBlockComment,
    handleCopyPath,
    handleCopyRelativePath,
    handleFindInEditor,
    handleReplaceInEditor,
    handleDeleteLine,
    handleCopyLineUp,
    handleCopyLineDown,
    handleMoveLineUp,
    handleMoveLineDown,
    handleRunActiveFile,
    handleStartDebugging,
  ]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!openFiles.some((f) => f.dirty)) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [openFiles]);

  const handleSelectSearchMatch = useCallback(
    (m: SearchMatch) => {
      openFileByEntry({ path: m.path, name: m.name, handle: m.handle });
    },
    [openFileByEntry]
  );

  const handleFileContentReplaced = useCallback((path: string, newContent: string) => {
    setOpenFiles((prev) =>
      prev.map((f) => (f.path === path ? { ...f, content: newContent, dirty: false } : f))
    );
  }, []);

  const commands: Command[] = [
    { id: "open-folder", label: "Open Folder", run: handleOpenFolder },
    { id: "open-composer", label: "Open Composer", shortcut: "Ctrl+Shift+I", run: startComposer },
    { id: "inline-edit", label: "Inline Edit", shortcut: "Ctrl+K I", run: openInlineEdit },
    { id: "copy-path", label: "Copy Path", shortcut: "Ctrl+K P", run: () => void handleCopyPath() },
    { id: "copy-relative-path", label: "Copy Relative Path", shortcut: "Ctrl+K Shift+P", run: () => void handleCopyRelativePath() },
    { id: "save", label: "Save", shortcut: "Ctrl+S", run: handleSave },
    { id: "save-all", label: "Save All", run: handleSaveAll },
    { id: "undo", label: "Undo", shortcut: "Ctrl+Z", run: handleUndo },
    { id: "redo", label: "Redo", shortcut: "Ctrl+Y", run: handleRedo },
    { id: "find", label: "Find", shortcut: "Ctrl+F", run: handleFindInEditor },
    { id: "replace", label: "Replace", shortcut: "Ctrl+H", run: handleReplaceInEditor },
    { id: "find-next", label: "Find Next", shortcut: "F3", run: handleFindNext },
    { id: "find-previous", label: "Find Previous", shortcut: "Shift+F3", run: handleFindPrevious },
    { id: "go-to-file", label: "Go to File...", shortcut: "Ctrl+P", run: () => setQuickOpenOpen(true) },
    { id: "go-to-line", label: "Go to Line/Column...", shortcut: "Ctrl+G", run: () => setGoToLineOpen(true) },
    { id: "go-to-symbol", label: "Go to Symbol in Editor...", shortcut: "Ctrl+Shift+O", run: handleOpenGoToSymbol },
    { id: "search-files", label: "Search in Files", shortcut: "Ctrl+Shift+F", run: handleShowSearch },
    { id: "replace-files", label: "Replace in Files", shortcut: "Ctrl+Shift+H", run: handleShowReplaceInFiles },
    { id: "toggle-sidebar", label: "Toggle Sidebar", run: () => setSidebarVisible((v) => !v) },
    { id: "toggle-panel", label: "Toggle Panel", run: () => setPanelVisible((v) => { if (v) setIsPanelMaximized(false); return !v; }) },
    { id: "new-terminal", label: "Terminal: New Terminal", shortcut: "Ctrl+Shift+`", run: handleNewTerminal },
    { id: "preferences", label: "Preferences", shortcut: "Ctrl+,", run: () => setSettingsOpen(true) },
    {
      id: "show-output",
      label: "Output: Show",
      run: handleShowOutput,
    },
    { id: "run-task", label: "Run Task...", shortcut: "Ctrl+Shift+B", run: handleRunTask },
    { id: "run-active-file", label: "Run Active File", shortcut: "Ctrl+F5", run: () => void handleRunActiveFile() },
    { id: "start-debugging", label: "Start Debugging", shortcut: "F5", run: () => void handleStartDebugging() },
    { id: "stop-debugging", label: "Stop Debugging", run: handleStopDebugging },
    { id: "show-debug-console", label: "Debug Console: Show", run: handleShowDebugConsole },
    { id: "show-problems", label: "Problems: Show", shortcut: "Ctrl+Shift+M", run: handleShowProblems },
  ];

  const flatFileList = workspace
    ? getFlatFileList(workspace.topLevelNodes, childCache)
    : [];

  const workspaceLocalPath = workspaceLocalPathResolved;
  const terminalCwd = workspaceLocalPath ?? "";
  const effectiveTerminalWsUrl = terminalWsUrl(settings.terminalWsUrl);

  const handleOpenGitFile = useCallback(
    (workspacePath: string) => {
      const entry = flatFileList.find((e) => e.path === workspacePath);
      if (entry) void openFileByEntry(entry);
    },
    [flatFileList, openFileByEntry]
  );

  useEffect(() => {
    if (!workspaceLocalPath) {
      setGitChangesCount(0);
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const status = await fetchGitStatus(settings.localServerUrl, workspaceLocalPath);
        if (!cancelled) setGitChangesCount(status.files.length);
      } catch {
        if (!cancelled) setGitChangesCount(0);
      }
    };
    void poll();
    const interval = setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [workspaceLocalPath, settings.localServerUrl]);

  useEffect(() => {
    if (!workspace) {
      setWorkspaceLocalPathResolved(null);
      return;
    }
    const stored = getWorkspaceLocalPath(workspace.rootName);
    if (stored) {
      setWorkspaceLocalPathResolved(stored);
      return;
    }
    if (workspace.rootLocalPath) {
      setWorkspaceLocalPathResolved(workspace.rootLocalPath);
      return;
    }
    let cancelled = false;
    void resolveWorkspaceLocalPath(
      workspace.rootName,
      workspace.rootHandle,
      settings.localServerUrl
    ).then((path) => {
      if (!cancelled) setWorkspaceLocalPathResolved(path);
    });
    return () => {
      cancelled = true;
    };
  }, [workspace, settings.localServerUrl]);

  useEffect(() => {
    if (!workspace) {
      setCodebaseIndex(null);
      setProjectRules("");
      return;
    }
    let cancelled = false;
    void (async () => {
      const flat = await collectFilesForIndex({
        rootName: workspace.rootName,
        rootHandle: workspace.rootHandle,
        rootLocalPath: workspace.rootLocalPath,
        localServerUrl: settings.localServerUrl,
        topLevelNodes: workspace.topLevelNodes,
        childCache,
      });
      const fsOpts = {
        rootLocalPath: workspace.rootLocalPath,
        localServerUrl: settings.localServerUrl,
      };
      const [index, rules] = await Promise.all([
        buildCodebaseIndex(flat, fsOpts),
        loadProjectRules(workspace.rootHandle, workspace.rootName, flat, fsOpts),
      ]);
      if (!cancelled) {
        setCodebaseIndex(index);
        setProjectRules(rules);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspace, childCache, settings.localServerUrl]);

  const goBack = useCallback(() => {
    if (navBackStack.length === 0) return;
    const current: NavEntry = activeFileId && editorPosition
      ? { fileId: activeFileId, line: editorPosition.line, column: editorPosition.column }
      : { fileId: "", line: 1 };
    setNavForwardStack((prev) => (current.fileId ? [...prev, current] : prev));
    const entry = navBackStack[navBackStack.length - 1]!;
    setNavBackStack((prev) => prev.slice(0, -1));
    if (entry.fileId === activeFileId) {
      handleGoToLine(entry.line, entry.column);
      return;
    }
    const isOpen = openFiles.some((f) => f.id === entry.fileId);
    if (isOpen) {
      setActiveFileId(entry.fileId);
      setPendingNav(entry);
      return;
    }
    const fileEntry = flatFileList.find((e) => e.path === entry.fileId);
    if (fileEntry) {
      setPendingNav(entry);
      openFileByEntry(fileEntry);
    }
  }, [navBackStack, activeFileId, editorPosition, openFiles, flatFileList, openFileByEntry, handleGoToLine]);

  const goForward = useCallback(() => {
    if (navForwardStack.length === 0) return;
    const current: NavEntry = activeFileId && editorPosition
      ? { fileId: activeFileId, line: editorPosition.line, column: editorPosition.column }
      : { fileId: "", line: 1 };
    setNavBackStack((prev) => (current.fileId ? [...prev, current] : prev));
    const entry = navForwardStack[navForwardStack.length - 1]!;
    setNavForwardStack((prev) => prev.slice(0, -1));
    if (entry.fileId === activeFileId) {
      handleGoToLine(entry.line, entry.column);
      return;
    }
    const isOpen = openFiles.some((f) => f.id === entry.fileId);
    if (isOpen) {
      setActiveFileId(entry.fileId);
      setPendingNav(entry);
      return;
    }
    const fileEntry = flatFileList.find((e) => e.path === entry.fileId);
    if (fileEntry) {
      setPendingNav(entry);
      openFileByEntry(fileEntry);
    }
  }, [navForwardStack, activeFileId, editorPosition, openFiles, flatFileList, openFileByEntry, handleGoToLine]);

  useEffect(() => {
    if (!pendingNav || activeFileId !== pendingNav.fileId) return;
    const { line, column } = pendingNav;
    setPendingNav(null);
    const t = requestAnimationFrame(() => {
      handleGoToLine(line, column);
    });
    return () => cancelAnimationFrame(t);
  }, [activeFileId, pendingNav, handleGoToLine]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      }
      if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        goForward();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goBack, goForward]);

  const handleSelectProblem = useCallback(
    (problem: ProblemEntry) => {
      pushCurrentPosition();
      const problemPath = problem.file.replace(/\\/g, "/");
      const active = openFiles.find((f) => f.id === activeFileId);
      const activePath = (active?.path || "").replace(/\\/g, "/");
      if (activePath && (activePath === problemPath || activePath.endsWith("/" + problemPath) || problemPath.endsWith("/" + activePath))) {
        handleGoToLine(problem.line ?? 1);
        return;
      }
      setPendingProblemGoTo({ path: problem.file, line: problem.line ?? 1 });
      const entry =
        flatFileList.find((e) => e.path.replace(/\\/g, "/") === problemPath) ||
        flatFileList.find((e) => {
          const p = e.path.replace(/\\/g, "/");
          return p.endsWith("/" + problemPath) || problemPath.endsWith("/" + p) || p.endsWith(problemPath);
        });
      if (entry) openFileByEntry(entry);
      else {
        toast({
          title: "Could not open problem file",
          description: problem.file,
        });
      }
    },
    [activeFileId, openFiles, flatFileList, openFileByEntry, handleGoToLine, pushCurrentPosition]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "F8" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (problems.length === 0) return;
      e.preventDefault();
      const currentIndex = problems.findIndex(
        (p) => p.file === activeFileId && p.line === editorPosition?.line
      );
      if (e.shiftKey) {
        const prevIndex = currentIndex <= 0 ? problems.length - 1 : currentIndex - 1;
        handleSelectProblem(problems[prevIndex]!);
      } else {
        const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % problems.length;
        handleSelectProblem(problems[nextIndex]!);
      }
      setPanelVisible(true);
      setActivePanelTab("problems");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [problems, activeFileId, editorPosition?.line, handleSelectProblem]);

  const symbolList = useMemo(() => {
    if (!goToSymbolOpen) return [];
    const file = openFiles.find((f) => f.id === activeFileId);
    if (!file) return [];
    return getSymbols(file.path ?? file.name ?? "", file.content);
  }, [goToSymbolOpen, activeFileId, openFiles]);

  const editorActions = {
    openFolder: handleOpenFolder,
    openRecentFolder: handleOpenRecentFolder,
    recentFolders,
    openFile: handleOpenFile,
    newFile: handleNewFile,
    save: handleSave,
    saveAll: handleSaveAll,
    saveAs: handleSaveAs,
    revertFile: handleRevertFile,
    closeEditor: handleCloseEditor,
    openPreferences: () => setSettingsOpen(true),
    toggleSidebar: () => setSidebarVisible((v) => !v),
    togglePanel: () => setPanelVisible((v) => { if (v) setIsPanelMaximized(false); return !v; }),
    toggleRightSidebar: () => setRightSidebarVisible((v) => !v),
    openCommandPalette: handleOpenCommandPalette,
    showExplorer: handleShowExplorer,
    showSourceControl: handleShowSourceControl,
    showSearch: handleShowSearch,
    showReplaceInFiles: handleShowReplaceInFiles,
    showTerminal: handleShowTerminal,
    newTerminal: handleNewTerminal,
    showOutput: handleShowOutput,
    showProblems: handleShowProblems,
    runTask: handleRunTask,
    runActiveFile: () => void handleRunActiveFile(),
    startDebugging: () => void handleStartDebugging(),
    stopDebugging: handleStopDebugging,
    showDebugConsole: handleShowDebugConsole,
    openGoToFile: handleOpenGoToFile,
    openGoToLineDialog: handleOpenGoToLineDialog,
    openGoToSymbol: handleOpenGoToSymbol,
    goBack,
    goForward,
    undo: handleUndo,
    redo: handleRedo,
    cut: handleCut,
    copy: handleCopy,
    paste: handlePaste,
    copyPath: handleCopyPath,
    copyRelativePath: handleCopyRelativePath,
    toggleLineComment: handleToggleLineComment,
    toggleBlockComment: handleToggleBlockComment,
    findInEditor: handleFindInEditor,
    replaceInEditor: handleReplaceInEditor,
    findNext: handleFindNext,
    findPrevious: handleFindPrevious,
    selectAll: handleSelectAll,
    copyLineUp: handleCopyLineUp,
    copyLineDown: handleCopyLineDown,
    moveLineUp: handleMoveLineUp,
    moveLineDown: handleMoveLineDown,
    deleteLine: handleDeleteLine,
    showWelcome: handleShowWelcome,
    openAbout: handleOpenAbout,
    openDocumentation: handleOpenDocumentation,
    openReleaseNotes: handleOpenReleaseNotes,
    openReportIssue: handleOpenReportIssue,
  };

  return (
    <EditorActionsProvider value={editorActions}>
    <div className="flex h-screen min-h-0 flex-col bg-cursor-editor">
      <TopBar workspaceName={workspace?.rootName ?? "jollof-ide"} panelVisible={panelVisible} onOpenSearch={handleShowSearch} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <InlineEditModal
        open={inlineEditOpen}
        context={inlineEditContext}
        loading={inlineEditLoading}
        preview={inlineEditPreview}
        error={inlineEditError}
        onClose={closeInlineEdit}
        onSubmit={handleInlineEditSubmit}
        onAccept={handleInlineEditAccept}
        onReject={() => setInlineEditPreview(null)}
      />
      <GoToLineModal
        open={goToLineOpen}
        onClose={() => setGoToLineOpen(false)}
        onGo={(line, col) => {
          pushCurrentPosition();
          handleGoToLine(line, col);
        }}
      />
      <GoToSymbolModal
        open={goToSymbolOpen}
        symbols={symbolList}
        onClose={() => setGoToSymbolOpen(false)}
        onSelect={(sym) => {
          pushCurrentPosition();
          handleGoToLine(sym.line);
        }}
      />
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} version={typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0"} />
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        commands={commands}
      />
      <QuickOpen
        open={quickOpenOpen}
        onClose={() => setQuickOpenOpen(false)}
        files={flatFileList}
        onSelectFile={(entry) => {
          pushCurrentPosition();
          openFileByEntry(entry);
        }}
      />
      <SearchPanel
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        files={flatFileList}
        onSelectMatch={handleSelectSearchMatch}
        replaceMode={searchReplaceMode}
        onFileContentReplaced={handleFileContentReplaced}
        rootLocalPath={workspace?.rootLocalPath}
        localServerUrl={settings.localServerUrl}
      />

      <div
        className="flex min-h-0 min-w-0 flex-1"
        style={{
          display: "grid",
          gridTemplateColumns: [
            isChatMaximized ? "24px" : (sidebarVisible ? `${leftSidebarWidthPx}px` : "24px"),
            isChatMaximized ? "0px" : (sidebarVisible ? "4px" : "0px"),
            "minmax(0, 1fr)",
            isChatMaximized ? "0px" : (rightSidebarVisible ? "4px" : "0px"),
            isChatMaximized ? "24px" : (rightSidebarVisible ? `${rightSidebarWidthPx}px` : "24px"),
          ].join(" "),
        }}
      >
        {/* Left column: Restore (when maximized), full sidebar, or re-open strip */}
        <div className="flex h-full min-w-0 flex-col overflow-hidden border-r border-cursor-border bg-cursor-sidebar">
          {isChatMaximized ? (
            <button
              type="button"
              className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 py-2 text-cursor-text-muted hover:bg-cursor-border hover:text-white"
              onClick={restoreLayout}
              aria-label="Restore layout"
              title="Restore layout"
            >
              <PanelLeftOpen className="h-4 w-4 rotate-180" />
              <span className="text-[10px]">Restore</span>
            </button>
          ) : sidebarVisible ? (
            <div className="flex h-full min-w-0 flex-1 overflow-hidden">
              <SidebarActivityBar
                active={leftSidebarTab}
                onSelect={setLeftSidebarTab}
                onSearch={handleShowSearch}
                changesCount={gitChangesCount}
              />
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <div className="flex h-9 shrink-0 items-center justify-between gap-px border-b border-cursor-border px-2">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-cursor-text">
                    {leftSidebarTab === "explorer" ? (
                      <>
                        <Folder className="h-4 w-4" />
                        Explorer
                      </>
                    ) : (
                      <>
                        <GitBranch className="h-4 w-4" />
                        Source Control
                      </>
                    )}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-cursor-text-muted hover:bg-cursor-border hover:text-white"
                        onClick={() => setSidebarVisible(false)}
                        aria-label="Close left bar"
                      >
                        <PanelLeftClose className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Close left bar</TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
                  {leftSidebarTab === "source-control" ? (
                    <SourceControlPanel
                      workspaceRootName={workspace?.rootName ?? null}
                      workspaceRootHandle={workspace?.rootHandle ?? null}
                      localServerUrl={settings.localServerUrl}
                      onOpenFile={handleOpenGitFile}
                    />
                  ) : !workspace ? (
                    <EmptyState
                      icon={<Folder className="h-8 w-8" />}
                      message={
                        isFileSystemAccessSupported()
                          ? "No folder opened. Open a folder to browse files."
                          : "No secure folder picker here (cloud uses HTTP). Use Open Folder and enter a server path like /app."
                      }
                      action={{ label: "Open Folder", onClick: () => void handleOpenFolder() }}
                      className="flex-1"
                    />
                  ) : (
                    <>
                      <FileTree
                        rootName={workspace.rootName}
                        topLevelNodes={workspace.topLevelNodes}
                        expandedPaths={expandedPaths}
                        childCache={childCache}
                        loadingPath={loadingPath}
                        onExpandDirectory={handleExpandDirectory}
                        onOpenFile={handleOpenFileFromTree}
                        onOpenFolder={handleOpenFolder}
                      />
                      <div className="shrink-0 border-t border-cursor-border px-2 py-1.5">
                        <button
                          type="button"
                          className="w-full text-left text-xs text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
                          onClick={maximizeChat}
                        >
                          Maximize Chat
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 py-2 text-cursor-text-muted hover:bg-cursor-border hover:text-white"
              onClick={openLeftBar}
              aria-label="Open left bar"
              title="Open left bar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Resize handle between left and center */}
        {sidebarVisible ? (
          <ResizeHandle
            side="left"
            panelSizePx={leftSidebarWidthPx}
            onResize={setLeftSidebarWidthPx}
            onCollapse={handleLeftCollapse}
          />
        ) : (
          <div className="shrink-0" style={{ width: 0 }} />
        )}

        {/* Center: editor + bottom panel (skip link target) */}
        <div id="main-content" className="flex min-h-0 min-w-0 flex-col overflow-hidden" tabIndex={-1}>
          {isPanelMaximized ? (
            /* Maximized: fixed 5% top (editor) / 95% bottom (panel) */
            <>
              <div className="flex min-h-0 flex-[0_0_5%] flex-col overflow-hidden">
                {activeComposer ? (
                  <AgentChatView
                    variant="composer"
                    agent={activeComposer}
                    onClose={closeComposer}
                    onSendMessage={sendComposerMessage}
                    isStreaming={composerStreaming}
                    onAcceptEdit={handleAcceptComposerEdit}
                    onRejectEdit={handleRejectComposerEdit}
                    onAcceptCommand={handleAcceptComposerCommand}
                    onRejectCommand={handleRejectComposerCommand}
                  />
                ) : activeAgent ? (
                  <AgentChatView
                    agent={activeAgent}
                    onClose={closeAgent}
                    onNewChat={startNewAgent}
                    onSendMessage={sendAgentMessage}
                    isStreaming={agentStreaming}
                    pastChats={agentHistory.map((h) => ({ id: h.id, name: h.name, closedAt: h.closedAt }))}
                    onSelectPastChat={openAgentInCenter}
                    onViewAllPastChats={() => setRightSidebarVisible(true)}
                    onAcceptEdit={handleAcceptAgentEdit}
                    onRejectEdit={handleRejectAgentEdit}
                    onAcceptCommand={handleAcceptAgentCommand}
                    onRejectCommand={handleRejectAgentCommand}
                  />
                ) : (
                  <>
                    <EditorTabs
                      files={openFiles}
                      activeId={activeFileId || null}
                      onSelect={handleSelectFile}
                      onClose={handleCloseFile}
                      onSave={() => void handleSave()}
                      canSave={Boolean(activeFile)}
                    />
                    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-cursor-editor">
                      {activeFile ? (
                        <CodeEditor
                          key={activeFile.id}
                          content={activeFile.content}
                          filePath={activeFile.path ?? activeFile.name}
                          onChange={handleEditorChange}
                          onSave={() => void handleSave()}
                          className="h-full min-h-0 min-w-0 w-full overflow-auto text-sm"
                          fontSize={settings.fontSize}
                          tabSize={settings.tabSize}
                          theme={settings.theme as "dark" | "light"}
                          registerView={registerEditorView}
                          onSelectionChange={handleEditorSelectionChange}
                        />
                      ) : (
                        <div className="flex flex-1 items-center justify-center text-sm text-cursor-text-muted">
                          Open a file to start
                        </div>
                      )}
                    </main>
                  </>
                )}
              </div>
              <div className="flex min-h-0 flex-[1_1_95%] flex-col overflow-hidden border-t border-cursor-border">
                <PanelTabs
                  active={activePanelTab}
                  onSelect={setActivePanelTab}
                  problemCount={problems.length}
                  onClosePanel={closeBottomPanel}
                  onMaximizePanel={maximizeBottomPanel}
                  onRestorePanel={restoreBottomPanel}
                  isPanelMaximized={true}
                >
                  {activePanelTab === "terminal" && (
                    <div className="flex h-full min-h-0 flex-col p-2">
                      <TerminalPanel
                        tabs={terminalTabs}
                        activeId={activeTerminalId}
                        onNewTerminal={handleNewTerminal}
                        onCloseTerminal={handleCloseTerminal}
                        onSelectTerminal={setActiveTerminalId}
                        terminalWsUrl={effectiveTerminalWsUrl}
                        terminalCwd={terminalCwd}
                      />
                      <p className="mt-auto pt-2 text-center text-[11px] text-cursor-text-muted">
                        Real shell via local server (npm run dev)
                      </p>
                    </div>
                  )}
                  {activePanelTab === "output" && <OutputPanel />}
                  {activePanelTab === "problems" && <ProblemsPanel problems={problems} onSelectProblem={handleSelectProblem} />}
                  {activePanelTab === "debug" && <DebugConsolePanel />}
                </PanelTabs>
              </div>
            </>
          ) : (
            <Group
              orientation="vertical"
              id="jollof-editor-panel"
              className="flex min-h-0 min-w-0 flex-1"
              defaultLayout={editorPanelLayout.defaultLayout}
              onLayoutChanged={editorPanelLayout.onLayoutChanged}
            >
              <Panel id="editor" defaultSize={75} minSize={5} className="flex min-h-0 min-w-0 flex-col">
                {activeComposer ? (
                  <AgentChatView
                    variant="composer"
                    agent={activeComposer}
                    onClose={closeComposer}
                    onSendMessage={sendComposerMessage}
                    isStreaming={composerStreaming}
                    onAcceptEdit={handleAcceptComposerEdit}
                    onRejectEdit={handleRejectComposerEdit}
                    onAcceptCommand={handleAcceptComposerCommand}
                    onRejectCommand={handleRejectComposerCommand}
                  />
                ) : activeAgent ? (
                  <AgentChatView
                    agent={activeAgent}
                    onClose={closeAgent}
                    onNewChat={startNewAgent}
                    onSendMessage={sendAgentMessage}
                    isStreaming={agentStreaming}
                    pastChats={agentHistory.map((h) => ({ id: h.id, name: h.name, closedAt: h.closedAt }))}
                    onSelectPastChat={openAgentInCenter}
                    onViewAllPastChats={() => setRightSidebarVisible(true)}
                    onAcceptEdit={handleAcceptAgentEdit}
                    onRejectEdit={handleRejectAgentEdit}
                    onAcceptCommand={handleAcceptAgentCommand}
                    onRejectCommand={handleRejectAgentCommand}
                  />
                ) : (
                  <>
                    <EditorTabs
                      files={openFiles}
                      activeId={activeFileId || null}
                      onSelect={handleSelectFile}
                      onClose={handleCloseFile}
                      onSave={() => void handleSave()}
                      canSave={Boolean(activeFile)}
                    />
                    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-cursor-editor">
                      {activeFile ? (
                        <CodeEditor
                          key={activeFile.id}
                          content={activeFile.content}
                          filePath={activeFile.path ?? activeFile.name}
                          onChange={handleEditorChange}
                          onSave={() => void handleSave()}
                          className="h-full min-h-0 min-w-0 w-full overflow-auto text-sm"
                          fontSize={settings.fontSize}
                          tabSize={settings.tabSize}
                          theme={settings.theme as "dark" | "light"}
                          registerView={registerEditorView}
                          onSelectionChange={handleEditorSelectionChange}
                        />
                      ) : (
                        <div className="flex flex-1 items-center justify-center text-sm text-cursor-text-muted">
                          Open a file to start
                        </div>
                      )}
                    </main>
                  </>
                )}
              </Panel>

              <Separator className="h-1 bg-cursor-editor hover:bg-cursor-border data-[resize-handle-active]:bg-cursor-accent transition-colors" />

              <Panel
                id="panel"
                defaultSize={25}
                minSize={32}
                maxSize={95}
                collapsible
                collapsedSize={32}
                panelRef={bottomPanelRef}
                className="flex min-h-0 min-w-0 flex-col"
                onResize={(size) => {
                  if (size.inPixels > 60) setPanelVisible(true);
                }}
              >
                <PanelTabs
                  active={activePanelTab}
                  onSelect={setActivePanelTab}
                  problemCount={problems.length}
                  onClosePanel={closeBottomPanel}
                  onMaximizePanel={maximizeBottomPanel}
                  onRestorePanel={restoreBottomPanel}
                  isPanelMaximized={false}
                >
                  {activePanelTab === "terminal" && (
                    <div className="flex h-full min-h-0 flex-col p-2">
                      <TerminalPanel
                        tabs={terminalTabs}
                        activeId={activeTerminalId}
                        onNewTerminal={handleNewTerminal}
                        onCloseTerminal={handleCloseTerminal}
                        onSelectTerminal={setActiveTerminalId}
                        terminalWsUrl={effectiveTerminalWsUrl}
                        terminalCwd={terminalCwd}
                      />
                      <p className="mt-auto pt-2 text-center text-[11px] text-cursor-text-muted">
                        Real shell via local server (npm run dev)
                      </p>
                    </div>
                  )}
                  {activePanelTab === "output" && <OutputPanel />}
                  {activePanelTab === "problems" && <ProblemsPanel problems={problems} onSelectProblem={handleSelectProblem} />}
                  {activePanelTab === "debug" && <DebugConsolePanel />}
                </PanelTabs>
              </Panel>
            </Group>
          )}
        </div>

        {/* Resize handle between center and right */}
        {rightSidebarVisible ? (
          <ResizeHandle
            side="right"
            panelSizePx={rightSidebarWidthPx}
            onResize={setRightSidebarWidthPx}
            onCollapse={handleRightCollapse}
          />
        ) : (
          <div className="shrink-0" style={{ width: 0 }} />
        )}

        {/* Right column: Agents or re-open strip */}
        <div className="flex h-full min-w-0 flex-col overflow-hidden border-l border-cursor-border bg-cursor-sidebar">
          {rightSidebarVisible ? (
            <>
              <div className="flex h-9 shrink-0 items-center justify-between border-b border-cursor-border px-2">
                <span className="text-xs font-medium text-cursor-text">Agents</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-cursor-text-muted hover:bg-cursor-border hover:text-white"
                      onClick={() => setRightSidebarVisible(false)}
                      aria-label="Close right bar (Agents)"
                    >
                      <PanelRightClose className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Close right bar (Agents)</TooltipContent>
                </Tooltip>
              </div>
              <div className="flex min-h-0 flex-1 overflow-hidden">
                <AgentsPanel
                  activeAgent={activeAgent ? { id: activeAgent.id, name: activeAgent.name } : null}
                  agentHistory={agentHistory}
                  onNewAgent={startNewAgent}
                  onOpenComposer={startComposer}
                  onSelectAgent={openAgentInCenter}
                />
              </div>
            </>
          ) : (
            <button
              type="button"
              className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 py-2 text-cursor-text-muted hover:bg-cursor-border hover:text-white"
              onClick={openRightBar}
              aria-label="Open right bar (Agents)"
              title="Open right bar (Agents)"
            >
              <PanelLeftOpen className="h-4 w-4 rotate-180" />
            </button>
          )}
        </div>
      </div>
      <StatusBar
        branch="main"
        encoding="UTF-8"
        language={
          activeFile
            ? languageLabelForPath(activeFile.path ?? activeFile.name)
            : undefined
        }
        position={activeFile ? editorPosition : null}
        indexStatus={
          workspace
            ? codebaseIndex?.fileCount
              ? `Indexed ${codebaseIndex.fileCount} files`
              : "Indexing…"
            : null
        }
        chordHint={chordHint}
      />
    </div>
    </EditorActionsProvider>
  );
};

export default Index;
