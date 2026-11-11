function llmConfig(): { base: string; key: string; model: string } | null {
  const base = process.env.LLM_BASE_URL;
  const key = process.env.LLM_API_KEY || process.env.OPENCODE_GO_API_KEY;
  const model = process.env.LLM_MODEL || "deepseek-v4.1-flash";
  if (!base || !key) return null;
  return { base: base.replace(/\/$/, ""), key, model };
}

export function hasLlm(): boolean {
  return llmConfig() !== null;
}

function parseJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("LLM_JSON");
  return JSON.parse(trimmed.slice(start, end + 1));
}

export async function completeText(
  prompt: string,
  options?: { timeoutMs?: number; maxTokens?: number; retries?: number; json?: boolean },
): Promise<string> {
  const config = llmConfig();
  if (!config) throw new Error("LLM_NOT_CONFIGURED");
  const timeoutMs = options?.timeoutMs ?? 60000;
  const maxTokens = options?.maxTokens ?? 6000;
  const retries = options?.retries ?? 2;
  const json = options?.json === true;
  let lastError: unknown = new Error("LLM_FAILED");

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${config.base}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.key}`,
          "Content-Type": "application/json",
          "x-opencode-session": process.env.LLM_SESSION_ID || `zhiyan-v2-${process.pid}`,
        },
        body: JSON.stringify({
          model: config.model,
          temperature: 0.2,
          max_tokens: maxTokens,
          reasoning_effort: "low",
          ...(json ? { response_format: { type: "json_object" } } : {}),
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controller.signal,
        cache: "no-store",
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(`LLM_HTTP_${response.status}`);
      const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
      const choices = Array.isArray(record?.choices) ? record.choices : [];
      const first = choices[0] && typeof choices[0] === "object" ? (choices[0] as Record<string, unknown>) : null;
      const message = first?.message && typeof first.message === "object" ? (first.message as Record<string, unknown>) : null;
      const content = typeof message?.content === "string" ? message.content : "";
      if (!content.trim()) throw new Error("LLM_EMPTY");
      return content;
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

export async function completeJson<T>(
  prompt: string,
  options?: { timeoutMs?: number; maxTokens?: number; retries?: number },
): Promise<T> {
  const raw = await completeText(prompt, { ...options, json: true });
  try {
    return parseJson(raw) as T;
  } catch (error) {
    console.warn("LLM_JSON_PARSE_FAILED", raw.length, raw.slice(-260));
    throw error;
  }
}
