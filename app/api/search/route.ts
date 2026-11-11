import { isResponse, json, readGate } from "../../../lib/server/gate";
import { searchZhihu } from "../../../lib/server/zhihu";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  const gate = await readGate(request);
  if (isResponse(gate)) return gate;
  const query = typeof gate.record.query === "string" ? gate.record.query.trim() : "";
  if (!gate.design.queries.includes(query)) {
    return json({ error: "这条检索词不在已确认的设计里。", code: "QUERY_NOT_IN_DESIGN" }, 400);
  }
  try {
    const items = await searchZhihu(query, 5);
    return json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SEARCH_FAILED";
    return json({ error: message, code: message, items: [] }, 502);
  }
}
