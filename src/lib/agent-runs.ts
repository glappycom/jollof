/**
 * Parse structured shell run proposals from agent responses.
 */

export type AgentRunStatus = "pending" | "running" | "accepted" | "rejected" | "failed";

export interface AgentCommand {
  id: string;
  command: string;
  status: AgentRunStatus;
  /** Absolute workspace cwd when known */
  cwd?: string;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  timedOut?: boolean;
  error?: string;
}

/** Fence: ```jollof-run\nnpm test\n``` or ```jollof-run:optional-label\n...``` */
const RUN_FENCE_RE = /```jollof-run(?::[^\n`]*)?\n([\s\S]*?)```/g;

export function parseRunsFromResponse(content: string): Omit<AgentCommand, "status">[] {
  const runs: Omit<AgentCommand, "status">[] = [];
  const seen = new Set<string>();
  const re = new RegExp(RUN_FENCE_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const command = m[1]
      .replace(/\r\n/g, "\n")
      .replace(/\n$/, "")
      .trim();
    if (!command || seen.has(command)) continue;
    seen.add(command);
    // One logical command line preferred; allow multi-line scripts as-is
    runs.push({ id: crypto.randomUUID(), command });
  }
  return runs;
}

export function stripRunBlocksFromDisplay(content: string): string {
  return content
    .replace(RUN_FENCE_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Strip both edit and run fences for chat display. */
export function stripAgentActionBlocksFromDisplay(
  content: string,
  stripEdits: (s: string) => string
): string {
  return stripRunBlocksFromDisplay(stripEdits(content));
}

export function formatRunResultForChat(cmd: AgentCommand): string {
  const parts = [
    `### Command result`,
    `\`\`\`bash`,
    cmd.command,
    `\`\`\``,
    `Exit code: ${cmd.exitCode ?? "?"}${cmd.timedOut ? " (timed out)" : ""}`,
  ];
  if (cmd.stdout?.trim()) {
    parts.push("", "**stdout:**", "```", cmd.stdout.trim().slice(0, 12000), "```");
  }
  if (cmd.stderr?.trim()) {
    parts.push("", "**stderr:**", "```", cmd.stderr.trim().slice(0, 8000), "```");
  }
  if (cmd.error) {
    parts.push("", `**error:** ${cmd.error}`);
  }
  return parts.join("\n");
}

export const AGENT_RUN_SYSTEM_APPEND = `

## Terminal commands (when the user should run something)

When the user needs a shell command run (tests, install, build, git status, etc.), propose it with:

\`\`\`jollof-run
npm test
\`\`\`

Rules:
- One command (or short script) per block. Prefer non-interactive commands.
- Do **not** run destructive commands (\`rm -rf\`, \`git push --force\`, \`format\`) unless the user explicitly asked.
- Explain briefly in markdown **before** the block why the command is needed.
- After the user accepts and you receive the result, use it to continue (fix failures, summarize output).
- Prefer workspace-relative commands; assume the shell starts in the project root.`;
