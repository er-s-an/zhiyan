function llmConfig(): { base: string; key: string; model: string } | null {
  const base = process.env.LLM_BASE_URL;
  const key = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || "grok-4.5";
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

async function complete(prompt: string, timeoutMs: number): Promise<string> {
  const config = llmConfig();
  if (!config) throw new Error("LLM_NOT_CONFIGURED");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const pending = fetch(`${config.base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0,
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
      if (value) return value.replace(/\s+/g, " ").slice(0, 500);
    } catch {
      // A single excerpt can still be plain prose when the model skips JSON.
    }
  }
  return stripped.replace(/\s+/g, " ").slice(0, 500);
}

async function translateOne(pair: { id: string; zh: string }, timeoutMs: number): Promise<string> {
  const prompt = [
    "Translate the excerpt into one or two English sentences.",
    "Keep skepticism. Do not add a buying conclusion.",
    "Return only the English sentences.",
    pair.zh.slice(0, 280),
  ].join("\n");
  const text = plainEnglish(await complete(prompt, timeoutMs), pair.id);
  if (text.length < 8) throw new Error("LLM_EMPTY");
  return text;
}

export async function translateExcerpts(
  pairs: { id: string; zh: string }[],
  options?: { timeoutMs?: number; retries?: number },
): Promise<Record<string, string>> {
  const timeoutMs = options?.timeoutMs ?? 18000;
  const retries = options?.retries ?? 0;
  const out: Record<string, string> = {};
  for (const pair of pairs) {
    try {
      out[pair.id] = await translateOne(pair, timeoutMs);
    } catch {
      if (retries < 1) continue;
      try {
        out[pair.id] = await translateOne(pair, timeoutMs);
      } catch {
        // Leave this id for the fallback below.
      }
    }
  }
  for (const pair of pairs) {
    if (!out[pair.id]) out[pair.id] = "Translation unavailable. Use the Chinese excerpt as the evidence.";
  }
  return out;
}
