import type { AgentMessage, ActiveAgent } from "@/components/agents/AgentChatView";
import type { Settings } from "@/lib/settings";
import type { CodebaseIndex } from "@/lib/codebase-index";
import type { OpenFile } from "@/components/editor/EditorTabs";
import type { FileTreeNode } from "@/lib/workspace";
import { buildAgentContextBlock } from "@/lib/agent-context";
import { parseEditsFromResponse } from "@/lib/agent-edits";
import { streamAgentResponse, type AgentChatMessage } from "@/lib/agent-api";
import { loadMentionedWorkspaceFiles, hydrateAgentEdits } from "@/lib/agent-workspace";
import { getFlatFileList, type FlatFileEntry } from "@/lib/workspace";

export interface AgentWorkspaceContext {
  workspace: {
    rootName: string;
    rootHandle: FileSystemDirectoryHandle | null;
    rootLocalPath: string | null;
    topLevelNodes: FileTreeNode[];
  } | null;
  childCache: Record<string, FileTreeNode[]>;
  openFiles: OpenFile[];
  activeFileId: string;
  codebaseIndex: CodebaseIndex | null;
  localServerUrl: string;
  getEditorSelection: () =>
    | { text: string; line: number; column: number }
    | undefined;
}

interface RunAgentTurnOptions {
  content: string;
  images?: string[];
  session: ActiveAgent;
  systemPrompt: string;
  settings: Settings;
  ctx: AgentWorkspaceContext;
  setSession: React.Dispatch<React.SetStateAction<ActiveAgent | null>>;
  setStreaming: (v: boolean) => void;
}

export async function runAgentTurn({
  content,
  images,
  session,
  systemPrompt,
  settings,
  ctx,
  setSession,
  setStreaming,
}: RunAgentTurnOptions): Promise<void> {
  const assistantId = crypto.randomUUID();
  const hasApi = Boolean(settings.agentApiKey?.trim());

  const userMsg: AgentMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content,
    ...(images?.length ? { images } : {}),
  };

  const assistantMsg: AgentMessage = {
    id: assistantId,
    role: "assistant",
    content: hasApi ? "" : "Agent is not connected yet. Set API key in Preferences → Agent.",
  };

  setSession((prev) =>
    prev ? { ...prev, messages: [...prev.messages, userMsg, assistantMsg] } : null
  );

  if (!hasApi) return;

  const flatFiles: FlatFileEntry[] = ctx.workspace
    ? getFlatFileList(ctx.workspace.topLevelNodes, ctx.childCache)
    : [];
  const openPaths = new Set(
    ctx.openFiles.map((f) => f.path).filter(Boolean) as string[]
  );
  const mentionedFiles = await loadMentionedWorkspaceFiles(
    content,
    ctx.workspace?.rootName ?? "",
    flatFiles,
    openPaths,
    {
      rootLocalPath: ctx.workspace?.rootLocalPath,
      localServerUrl: ctx.localServerUrl,
    }
  );

  const contextBlock = buildAgentContextBlock({
    message: content,
    openFiles: ctx.openFiles
      .filter((f) => f.path)
      .map((f) => ({ path: f.path!, content: f.content })),
    activeFilePath: ctx.openFiles.find((f) => f.id === ctx.activeFileId)?.path,
    selection: ctx.getEditorSelection(),
    workspaceFiles: mentionedFiles,
    codebaseIndex: ctx.codebaseIndex,
  });

  const userContentWithContext = content + contextBlock;

  const conversation: AgentChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...session.messages.map((m) => {
      if (m.role === "user") {
        const msg: AgentChatMessage = { role: "user", content: m.content };
        if (m.images?.length) msg.images = m.images;
        return msg;
      }
      return { role: m.role, content: m.content };
    }),
    (() => {
      const msg: AgentChatMessage = { role: "user", content: userContentWithContext };
      if (images?.length) msg.images = images;
      return msg;
    })(),
  ];

  setStreaming(true);

  await new Promise<void>((resolve) => {
    streamAgentResponse(
      conversation,
      {
        apiKey: settings.agentApiKey.trim(),
        baseUrl: settings.agentApiUrl.trim() || "https://api.openai.com/v1",
        model: settings.agentModel.trim() || "gpt-4o-mini",
      },
      (chunk) => {
        setStreaming(false);
        setSession((prev) => {
          if (!prev) return prev;
          const msgs = [...prev.messages];
          const last = msgs.find((m) => m.id === assistantId);
          if (last?.role === "assistant")
            msgs[msgs.indexOf(last)] = { ...last, content: last.content + chunk };
          return { ...prev, messages: msgs };
        });
      },
      () => {
        setStreaming(false);
        setSession((prev) => {
          if (!prev) return prev;
          const last = prev.messages.find((m) => m.id === assistantId);
          if (!last?.content) return prev;
          const parsed = parseEditsFromResponse(last.content);
          if (parsed.length === 0) return prev;
          void (async () => {
            const hydrated = await hydrateAgentEdits(parsed, {
              rootName: ctx.workspace?.rootName ?? "",
              rootHandle: ctx.workspace?.rootHandle ?? null,
              rootLocalPath: ctx.workspace?.rootLocalPath,
              localServerUrl: ctx.localServerUrl,
              flatFileList: flatFiles,
              openFiles: ctx.openFiles,
            });
            setSession((p) => {
              if (!p) return p;
              const msgs = [...p.messages];
              const idx = msgs.findIndex((m) => m.id === assistantId);
              if (idx === -1) return p;
              msgs[idx] = { ...msgs[idx], pendingEdits: hydrated };
              return { ...p, messages: msgs };
            });
          })();
          return prev;
        });
        resolve();
      },
      (errMessage) => {
        setStreaming(false);
        setSession((prev) => {
          if (!prev) return prev;
          const msgs = [...prev.messages];
          const last = msgs.find((m) => m.id === assistantId);
          if (last?.role === "assistant")
            msgs[msgs.indexOf(last)] = {
              ...last,
              content: last.content || `Error: ${errMessage}`,
            };
          return { ...prev, messages: msgs };
        });
        resolve();
      }
    );
  });
}
