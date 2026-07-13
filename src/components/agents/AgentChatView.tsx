import { useState, useRef, useEffect, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { X, Send, Image, Plus, ChevronDown, Infinity, ListTodo, Bug, MessageCircle, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AgentEditBlock, { type AgentFileEdit } from "@/components/agents/AgentEditBlock";
import AgentRunBlock from "@/components/agents/AgentRunBlock";
import { stripEditBlocksFromDisplay } from "@/lib/agent-edits";
import { stripRunBlocksFromDisplay, type AgentCommand } from "@/lib/agent-runs";

const markdownComponents: Components = {
  p: ({ children }: { children?: ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  h1: ({ children }: { children?: ReactNode }) => <h1 className="mb-2 mt-3 text-base font-semibold text-cursor-text">{children}</h1>,
  h2: ({ children }: { children?: ReactNode }) => <h2 className="mb-2 mt-3 text-sm font-semibold text-cursor-text">{children}</h2>,
  h3: ({ children }: { children?: ReactNode }) => <h3 className="mb-1.5 mt-2.5 text-sm font-semibold text-cursor-text">{children}</h3>,
  ul: ({ children }: { children?: ReactNode }) => <ul className="my-1.5 list-disc pl-5 space-y-0.5">{children}</ul>,
  ol: ({ children }: { children?: ReactNode }) => <ol className="my-1.5 list-decimal pl-5 space-y-0.5">{children}</ol>,
  li: ({ children }: { children?: ReactNode }) => <li className="text-cursor-text">{children}</li>,
  strong: ({ children }: { children?: ReactNode }) => <strong className="font-semibold text-cursor-text">{children}</strong>,
  code: ({ children }: { children?: ReactNode }) => <code className="rounded bg-cursor-editor px-1 py-0.5 font-mono text-xs text-cursor-text">{children}</code>,
  pre: ({ children }: { children?: ReactNode }) => <pre className="my-2 overflow-x-auto rounded bg-cursor-editor p-2 font-mono text-xs text-cursor-text">{children}</pre>,
  hr: () => <hr className="my-2 border-cursor-border" />,
  a: ({ href, children }: { href?: string | null; children?: ReactNode }) => (
    <a href={href ?? undefined} className="text-cursor-accent underline hover:opacity-90" target="_blank" rel="noopener noreferrer">{children}</a>
  ),
};

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** User messages only: image data URLs for display and API */
  images?: string[];
  /** Assistant messages: proposed file edits awaiting accept/reject */
  pendingEdits?: AgentFileEdit[];
  /** Assistant messages: proposed shell commands awaiting approve/run */
  pendingCommands?: AgentCommand[];
  /** Synthetic / tool-continue nudges — sent to the model but not shown in chat */
  hidden?: boolean;
}

export interface ActiveAgent {
  id: string;
  name: string;
  messages: AgentMessage[];
}

export type AgentMode = "agent" | "plan" | "debug" | "ask";

const AGENT_MODE_LABELS: Record<AgentMode, string> = {
  agent: "Agent",
  plan: "Plan",
  debug: "Debug",
  ask: "Ask",
};

/** Minimal past-chat entry for the New Chat "Past Chats" list */
export interface PastChatEntry {
  id: string;
  name: string;
  closedAt: Date;
}

interface AgentChatViewProps {
  agent: ActiveAgent;
  onClose: () => void;
  onNewChat?: () => void;
  onSendMessage: (content: string, images?: string[], mode?: AgentMode) => void;
  /** Show "Thinking..." while waiting for first token */
  isStreaming?: boolean;
  /** Optional stats when closing (e.g. for display) */
  added?: number;
  removed?: number;
  filesCount?: number;
  /** Past chats for "New Chat" view (list + View All) */
  pastChats?: PastChatEntry[];
  onSelectPastChat?: (id: string) => void;
  onViewAllPastChats?: () => void;
  onAcceptEdit?: (messageId: string, editId: string) => void;
  onRejectEdit?: (messageId: string, editId: string) => void;
  onAcceptCommand?: (messageId: string, commandId: string) => void;
  onRejectCommand?: (messageId: string, commandId: string) => void;
  /** chat = Agent panel; composer = multi-file Composer */
  variant?: "chat" | "composer";
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

export default function AgentChatView({
  agent,
  onClose,
  onNewChat,
  onSendMessage,
  isStreaming = false,
  added = 0,
  removed = 0,
  filesCount = 0,
  pastChats = [],
  onSelectPastChat,
  onViewAllPastChats,
  onAcceptEdit,
  onRejectEdit,
  onAcceptCommand,
  onRejectCommand,
  variant = "chat",
}: AgentChatViewProps) {
  const isComposer = variant === "composer";
  const isNewChat = agent.messages.length === 0;
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [agentMode, setAgentMode] = useState<AgentMode>("agent");
  const [autoModel, setAutoModel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastUserMessage = agent.messages.filter((m) => m.role === "user").pop();

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 192)}px`;
  }, [input]);

  const handleAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      e.target.value = "";
      return;
    }
    let read = 0;
    const urls: string[] = [];
    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") urls.push(reader.result);
        read++;
        if (read === imageFiles.length) {
          setPendingImages((prev) => [...prev, ...urls]);
          e.target.value = "";
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    const q = input.trim();
    if (!q && pendingImages.length === 0) return;
    onSendMessage(
      q || "(image)",
      pendingImages.length ? pendingImages : undefined,
      isComposer ? "agent" : agentMode
    );
    setInput("");
    setPendingImages([]);
  };

  return (
    <div className="flex h-full flex-col bg-cursor-editor">
      {/* Cursor-style tabs: New Chat + current chat */}
      <div className="flex h-9 shrink-0 items-center gap-0.5 border-b border-cursor-border px-2">
        {onNewChat && !isComposer && (
          <button
            type="button"
            className="flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
            onClick={onNewChat}
            aria-label="New chat"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        )}
        <button
          type="button"
          className="flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium text-cursor-text bg-cursor-hover"
          aria-current="true"
        >
          {agent.name}
        </button>
        <button
          type="button"
          className="ml-auto rounded p-1 text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
          onClick={onClose}
          aria-label="Close agent and return to editor"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* New Chat: empty main area; existing chat: sticky query bar + messages */}
      {isNewChat ? (
        <div className="min-h-0 flex-1" aria-hidden />
      ) : (
        <>
          {/* Top: question modal (explicit neutral gray border, no blue) */}
          <div className="sticky top-0 z-10 shrink-0 px-4 py-3">
            <div
              className="rounded-xl border px-3 py-2.5 bg-cursor-sidebar shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
              style={{ borderColor: "#383838" }}
            >
              <p className="text-sm text-cursor-text">
                {lastUserMessage?.content ?? (
                  <span className="text-cursor-text-muted">Your question will appear here</span>
                )}
              </p>
            </div>
          </div>

          {/* Scrollable area: responses flow behind the sticky query */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="flex flex-col gap-4">
          {agent.messages.filter((m) => !m.hidden).map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[90%] text-sm",
                m.role === "user"
                  ? "ml-auto text-cursor-text-muted"
                  : "text-cursor-text"
              )}
            >
              {m.role === "assistant" ? (
                <div className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  {(() => {
                    const display = stripRunBlocksFromDisplay(stripEditBlocksFromDisplay(m.content));
                    return display ? (
                      <ReactMarkdown components={markdownComponents}>{display}</ReactMarkdown>
                    ) : m.pendingEdits?.length || m.pendingCommands?.length ? null : isStreaming && agent.messages[agent.messages.length - 1]?.id === m.id ? (
                      <p className="text-xs text-cursor-text-muted italic">Thinking...</p>
                    ) : null;
                  })()}
                  {!m.content && !m.pendingEdits?.length && !m.pendingCommands?.length && isStreaming && agent.messages[agent.messages.length - 1]?.id === m.id ? (
                    <p className="text-xs text-cursor-text-muted italic">Thinking...</p>
                  ) : null}
                  {m.pendingEdits?.map((edit) => (
                    <AgentEditBlock
                      key={edit.id}
                      edit={edit}
                      onAccept={() => onAcceptEdit?.(m.id, edit.id)}
                      onReject={() => onRejectEdit?.(m.id, edit.id)}
                    />
                  ))}
                  {m.pendingCommands?.map((cmd) => (
                    <AgentRunBlock
                      key={cmd.id}
                      command={cmd}
                      onAccept={() => onAcceptCommand?.(m.id, cmd.id)}
                      onReject={() => onRejectCommand?.(m.id, cmd.id)}
                    />
                  ))}
                </div>
              ) : (
                <>
                  {m.content && m.content !== "(image)" && <span>{m.content}</span>}
                  {m.images && m.images.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.images.map((src, i) => (
                        <a
                          key={i}
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block max-w-[200px] overflow-hidden rounded border border-cursor-border/50"
                        >
                          <img src={src} alt="" className="max-h-40 w-full object-contain" />
                        </a>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
            </div>
          </div>

          {/* Action bar: stats + Undo All, Keep All, Review */}
          {(added > 0 || removed > 0 || filesCount > 0) && (
        <div className="shrink-0 flex items-center justify-between gap-4 border-t border-cursor-border/50 px-4 py-2">
          <span className="text-xs text-cursor-text-muted">
            <span className="text-green-500">+{added}</span>
            {" "}
            <span className="text-red-400">-{removed}</span>
            {" · "}
            {filesCount} Files
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
            >
              Undo All
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
            >
              Keep All
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-cursor-accent hover:bg-cursor-hover"
            >
              Review
            </button>
          </div>
        </div>
          )}
        </>
      )}

      {/* Bottom: input area — pill dropdowns + responsive input with image/send inside */}
      <div className="shrink-0 p-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
          aria-label="Attach images"
        />
        <div
          className="flex min-h-[2.5rem] flex-col gap-2 rounded-xl border px-3 py-2.5 bg-cursor-sidebar shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
          style={{ borderColor: "#383838" }}
        >
          {pendingImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pendingImages.map((src, i) => (
                <div key={i} className="relative">
                  <img
                    src={src}
                    alt=""
                    className="h-12 w-12 rounded-lg border border-cursor-border/50 object-cover"
                  />
                  <button
                    type="button"
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cursor-editor text-cursor-text shadow hover:bg-cursor-hover"
                    onClick={() => removePendingImage(i)}
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Top row: input with cursor at left, then attach/send */}
          <div className="flex min-h-[2rem] items-center gap-2">
            <div className="min-h-[2rem] min-w-0 flex-1 rounded border-0 bg-transparent focus-within:outline-none">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  isComposer
                    ? "Describe a multi-file change… @codebase @file"
                    : "Plan, @ for context (@codebase @file @selection @open), / for commands"
                }
                rows={1}
                className="min-h-[2rem] w-full resize-none overflow-y-auto border-0 bg-transparent py-0 pl-0 pr-0 text-left text-xs text-cursor-text placeholder:text-cursor-text-muted focus:outline-none"
                style={{ maxHeight: "12rem" }}
              />
            </div>
            <button
              type="button"
              className="shrink-0 rounded p-1.5 text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
              title="Attach image"
              aria-label="Attach image"
              onClick={handleAttach}
            >
              <Image className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="shrink-0 rounded p-1.5 text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
              onClick={handleSend}
              title="Send"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          {/* Bottom row: Agent and Auto pills (like Cursor) */}
          <div className="flex items-center gap-2 pt-0.5">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex shrink-0 items-center gap-1 rounded-full bg-cursor-hover/80 px-3 py-1.5 text-xs text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
                  aria-label="Agent mode"
                >
                  <Infinity className="h-3.5 w-3.5" />
                  <span>{isComposer ? "Composer" : AGENT_MODE_LABELS[agentMode]}</span>
                  {!isComposer && <span className="text-[10px] opacity-70">Ctrl+I</span>}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-48 p-1">
                {(["agent", "plan", "debug", "ask"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs",
                      agentMode === mode ? "bg-cursor-hover text-cursor-text" : "text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
                    )}
                    onClick={() => setAgentMode(mode)}
                  >
                    {mode === "agent" && <Bot className="h-3.5 w-3.5" />}
                    {mode === "plan" && <ListTodo className="h-3.5 w-3.5" />}
                    {mode === "debug" && <Bug className="h-3.5 w-3.5" />}
                    {mode === "ask" && <MessageCircle className="h-3.5 w-3.5" />}
                    {AGENT_MODE_LABELS[mode]}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex shrink-0 items-center gap-1 rounded-full bg-cursor-hover/80 px-3 py-1.5 text-xs text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
                  aria-label="Auto model selection"
                >
                  <span>{autoModel ? "Auto" : "Off"}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-52 p-1">
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs",
                    !autoModel ? "bg-cursor-hover text-cursor-text" : "text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
                  )}
                  onClick={() => setAutoModel(false)}
                >
                  Off
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs",
                    autoModel ? "bg-cursor-hover text-cursor-text" : "text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
                  )}
                  onClick={() => setAutoModel(true)}
                >
                  Auto
                </button>
                <p className="mt-1.5 border-t border-cursor-border px-2 pt-1.5 text-[10px] text-cursor-text-muted">
                  When Auto is on, Jollof may try alternative models if the primary fails (future).
                </p>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex shrink-0 items-center gap-1 rounded-full bg-cursor-hover/80 px-3 py-1.5 text-xs text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
                  aria-label="Local context"
                >
                  <span>Local</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-48 p-1">
                <p className="px-2 py-1.5 text-xs text-cursor-text-muted">Local context (placeholder)</p>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        {/* Past Chats (New Chat view only) */}
        {isNewChat && !isComposer && (pastChats.length > 0 || onViewAllPastChats) && (
          <div className="mt-3 flex flex-col gap-1">
            <button
              type="button"
              className="flex w-full items-center gap-1 text-left text-xs font-medium text-cursor-text-muted hover:text-cursor-text"
              aria-expanded="true"
              aria-label="Past Chats"
            >
              <span>Past Chats</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {pastChats.length > 0 && (
              <ul className="flex flex-col gap-0.5">
                {pastChats.slice(0, 10).map((chat) => (
                  <li key={chat.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
                      onClick={() => onSelectPastChat?.(chat.id)}
                    >
                      <span className="truncate">{chat.name}</span>
                      <span className="shrink-0 pl-2 text-cursor-text-muted/80">
                        {formatTimeAgo(chat.closedAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {onViewAllPastChats && (
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  className="text-xs text-cursor-text-muted hover:text-cursor-text"
                  onClick={onViewAllPastChats}
                >
                  View All
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
