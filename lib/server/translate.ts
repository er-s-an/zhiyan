function llmConfig(): { base: string; key: string; model: string } | null {
  const base = process.env.LLM_BASE_URL;
  const key = process.env.LLM_API_KEY || process.env.OPENCODE_GO_API_KEY;
  const model = process.env.LLM_MODEL || "deepseek-v4.1-flash";
  if (!base || !key) return null;
  return { base: base.replace(/\/$/, ""), key, model };
}

function parseMap(raw: string): Record<string, string> {
  const trimmed = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("TRANSLATION_JSON");
  const parsed: unknown = JSON.parse(trimmed.slice(start, end + 1));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("TRANSLATION_JSON");
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "string" && value.trim()) out[key] = value.trim();
  }
  return out;
}

async function complete(prompt: string, timeoutMs: number, maxTokens = 8000): Promise<string> {
  const config = llmConfig();
  if (!config) throw new Error("LLM_NOT_CONFIGURED");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const pending = fetch(`${config.base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      "x-opencode-session": process.env.LLM_SESSION_ID || `zhiyan-${process.pid}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0,
      max_tokens: maxTokens,
      reasoning_effort: "low",
      messages: [{ role: "user", content: prompt }],
    }),
    signal: controller.signal,
    cache: "no-store",
  });
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error("LLM_TIMEOUT")), timeoutMs);
  });
  let response: Response;
  try {
    response = await Promise.race([pending, timeout]);
  } finally {
    clearTimeout(timer);
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`LLM_HTTP_${response.status}`);
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const choices = Array.isArray(record?.choices) ? record.choices : [];
  const first = choices[0] && typeof choices[0] === "object" ? (choices[0] as Record<string, unknown>) : null;
  const message = first?.message && typeof first.message === "object" ? (first.message as Record<string, unknown>) : null;
  const content = typeof message?.content === "string" ? message.content : "";
  if (!content) throw new Error("LLM_EMPTY");
  return content;
}

function plainEnglish(raw: string, id: string): string {
  const stripped = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();
  if (stripped.startsWith("{")) {
    try {
      const map = parseMap(stripped);
      const value = map[id] || Object.values(map)[0];
      if (value) return value.replace(/\s+/g, " ").slice(0, 600);
    } catch {
      // A single excerpt can still be plain prose when the model skips JSON.
    }
  }
  return stripped.replace(/\s+/g, " ").slice(0, 600);
}

async function translateOne(pair: { id: string; zh: string }, timeoutMs: number): Promise<string> {
  const prompt = [
    "Translate the Zhihu excerpt into one or two restrained English sentences.",
    "Keep the skepticism. Do not add a buying conclusion or product recommendation.",
    "Return only the English sentences.",
    pair.zh.slice(0, 300),
  ].join("\n");
  const text = plainEnglish(await complete(prompt, timeoutMs, 5000), pair.id);
  if (text.length < 8) throw new Error("LLM_EMPTY");
  return text;
}

export async function translateExcerpts(
  pairs: { id: string; zh: string }[],
  options?: { timeoutMs?: number; retries?: number },
): Promise<Record<string, string>> {
  const timeoutMs = options?.timeoutMs ?? 25000;
  const retries = options?.retries ?? 1;
  const out: Record<string, string> = {};
  const queue = [...pairs];

  async function worker(): Promise<void> {
    for (;;) {
      const pair = queue.shift();
      if (!pair) return;
      for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
          out[pair.id] = await translateOne(pair, timeoutMs);
          break;
        } catch (error) {
          if (attempt === retries) {
            console.warn("translate failed:", pair.id, error instanceof Error ? error.message : error);
          }
        }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(4, pairs.length) }, () => worker()));
  for (const pair of pairs) {
    if (!out[pair.id]) out[pair.id] = "Translation unavailable. Use the Chinese excerpt as the evidence.";
  }
  return out;
}
