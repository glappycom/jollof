import { useState } from "react";
import { Send, MessageSquare } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function AIPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    const q = input.trim();
    if (!q) return;
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: q },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "AI is not connected yet. Connect a model or API to get responses.",
      },
    ]);
    setInput("");
  };

  return (
    <div className="flex h-full flex-col bg-cursor-editor">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-cursor-border px-3 text-xs font-medium text-cursor-text">
        <MessageSquare className="h-4 w-4 text-orange-500" />
        Chat
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
        {messages.length === 0 && (
          <div className="py-4 text-center text-xs text-cursor-text-muted">
            Ask anything about your code. AI responses will appear here when connected.
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded px-2 py-1.5 text-xs ${
              m.role === "user"
                ? "bg-cursor-border text-cursor-text ml-4"
                : "bg-cursor-sidebar text-cursor-text-muted mr-4"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-cursor-border p-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask Jollof..."
            className="flex-1 rounded border border-cursor-border bg-cursor-sidebar px-2 py-1.5 text-xs text-cursor-text placeholder:text-cursor-text-muted focus:outline-none focus:ring-1 focus:ring-cursor-accent"
          />
          <button
            type="button"
            className="rounded bg-orange-500 px-2 py-1.5 text-xs text-white hover:bg-orange-600"
            onClick={handleSend}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
