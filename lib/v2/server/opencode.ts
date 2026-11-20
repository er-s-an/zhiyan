import fs from "node:fs";
import os from "node:os";
import path from "node:path";

interface OpenCodeConfig {
  url: string;
  password: string;
  providerID: string;
  modelID: string;
  variant: string;
}

function readJson(file: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function serviceFiles(): { state: Record<string, unknown> | null; config: Record<string, unknown> | null } {
  const home = os.homedir();
  return {
    state: readJson(path.join(home, ".local", "state", "opencode", "service.json")),
    config: readJson(path.join(home, ".config", "opencode", "service.json")),
  };
}

function pickString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function opencodeConfig(): OpenCodeConfig | null {
  const { state, config } = serviceFiles();
  const url = pickString(process.env.OPENCODE_BASE_URL) || pickString(state?.url);
  const password =
    pickString(process.env.OPENCODE_PASSWORD) ||
    pickString(state?.password) ||
    pickString(config?.password);
  if (!url || !password) return null;
  return {
    url: url.replace(/\/$/, ""),
    password,
    providerID: pickString(process.env.OPENCODE_PROVIDER) || "opencode-go",
    modelID: pickString(process.env.OPENCODE_MODEL) || "deepseek-v4.1-flash",
    variant: pickString(process.env.OPENCODE_VARIANT) || "low",
  };
}

export function hasOpenCode(): boolean {
  return opencodeConfig() !== null;
}

/**
 * One-shot text generation through the local OpenCode server.
 * The password never leaves the server; the browser only talks to our route.
 */
export async function opencodeGenerateText(
  prompt: string,
  options?: { timeoutMs?: number; modelID?: string; providerID?: string; variant?: string },
): Promise<string> {
  const config = opencodeConfig();
  if (!config) throw new Error("OPENCODE_NOT_CONFIGURED");

  const modelID = options?.modelID || config.modelID;
  const providerID = options?.providerID || config.providerID;
  const variant = options?.variant !== undefined ? options.variant : config.variant;
  const authorization = `Basic ${Buffer.from(`opencode:${config.password}`).toString("base64")}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options?.timeoutMs ?? 45000);
  try {
    const response = await fetch(`${config.url}/api/experimental/generate/text`, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        model: {
          id: modelID,
          providerID,
          ...(variant ? { variant } : {}),
        },
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
      const reason = pickString(record?.reason) || pickString(record?.message);
      throw new Error(`OPENCODE_HTTP_${response.status}${reason ? `_${reason}` : ""}`);
    }
    const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    const data = record?.data && typeof record.data === "object" ? (record.data as Record<string, unknown>) : null;
    const text = pickString(data?.text);
    if (!text) throw new Error("OPENCODE_EMPTY");
    return text;
  } finally {
    clearTimeout(timer);
  }
}
