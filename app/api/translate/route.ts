import { isResponse, json, readGate } from "../../../lib/server/gate";
import { translateExcerpts } from "../../../lib/server/translate";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  const gate = await readGate(request);
  if (isResponse(gate)) return gate;
  const raw = Array.isArray(gate.record.pairs) ? gate.record.pairs : [];
  const pairs = raw
    .map((pair) => {
      if (!pair || typeof pair !== "object") return null;
      const record = pair as { id?: unknown; zh?: unknown };
      if (typeof record.id !== "string" || typeof record.zh !== "string" || !record.zh.trim()) return null;
      return { id: record.id, zh: record.zh.slice(0, 480) };
    })
    .filter((pair): pair is { id: string; zh: string } => Boolean(pair))
    .slice(0, 1);
  if (pairs.length === 0) return json({ translations: {} });
  const translations = await translateExcerpts(pairs, { timeoutMs: 22000, retries: 0 });
  return json({ translations });
}
