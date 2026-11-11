import { isResponse, json, readGate } from "../../../lib/server/gate";
import { hotList } from "../../../lib/server/zhihu";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  const gate = await readGate(request);
  if (isResponse(gate)) return gate;
  try {
    const items = await hotList(30);
    return json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "HOT_LIST_FAILED";
    return json({ error: message, code: message, items: [] }, 502);
  }
}
