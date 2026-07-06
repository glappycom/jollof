/**
 * OpenAI-compatible streaming chat for the Agent panel.
 * Supports vision: user messages can include images (data URLs or URLs).
 */

export interface AgentChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  /** User messages only: image data URLs or URLs for vision APIs */
  images?: string[];
}

export interface AgentApiOptions {
  apiKey: string;
  baseUrl: string;
  model: string;
}

function buildMessageContent(m: AgentChatMessage): string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> {
  if (m.role !== "user" || !m.images?.length) {
    return m.content;
  }
  const parts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [];
  if (m.content) {
    parts.push({ type: "text", text: m.content });
  }
  for (const url of m.images) {
    parts.push({ type: "image_url", image_url: { url } });
  }
  return parts.length === 0 ? "" : parts;
}

/**
 * Stream a chat completion from an OpenAI-compatible API.
 * Supports vision: user messages with images are sent as multimodal content.
 * Calls onChunk with each content delta; onDone when stream ends or onError on failure.
 */
export async function streamAgentResponse(
  messages: AgentChatMessage[],
  options: AgentApiOptions,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (message: string) => void
): Promise<void> {
  const { apiKey, baseUrl, model } = options;
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

  const body = {
    model,
    messages: messages.map((m) => ({
      role: m.role,
      content: buildMessageContent(m),
    })),
    stream: true,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      onError(`API error ${res.status}: ${errText.slice(0, 200)}`);
      onDone();
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      onError("No response body");
      onDone();
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const content = parsed.choices?.[0]?.delta?.content;
            if (typeof content === "string") onChunk(content);
          } catch {
            // ignore parse errors for partial chunks
          }
        }
      }
    }

    onDone();
  } catch (err) {
    onError(err instanceof Error ? err.message : "Request failed");
    onDone();
  }
}
