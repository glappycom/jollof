import { localServerBaseUrl } from "@/lib/local-server";

export interface RunCommandResult {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  cwd: string;
}

export async function runWorkspaceCommand(
  localServerUrl: string,
  cwd: string,
  command: string,
  timeoutMs = 60_000
): Promise<RunCommandResult> {
  const url = `${localServerBaseUrl(localServerUrl)}/api/run`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cwd, command, timeoutMs }),
  });
  const data = (await res.json()) as RunCommandResult & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Run failed (${res.status})`);
  }
  return data;
}
