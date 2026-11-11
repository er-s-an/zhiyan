import { isResponse, json, readGate } from "../../../lib/server/gate";
import { zhidaHint } from "../../../lib/server/zhihu";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  const gate = await readGate(request);
  if (isResponse(gate)) return gate;
  const titles = Array.isArray(gate.record.titles)
    ? gate.record.titles.filter((title): title is string => typeof title === "string" && title.trim().length > 0).slice(0, 24)
    : [];
  if (titles.length === 0) {
    return json({ text: "", error: "ZHIDA_SKIPPED" });
  }
  const prompt = `下面是已经检索到的知乎标题。请只列出搜索词可能漏掉的使用场景，用简短中文。不要判断会不会购买，不要做产品结论。标题：${titles.join(" / ")}`;
  try {
    const text = await zhidaHint(prompt, 8000);
    return json({ text, error: undefined });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ZHIDA_FAILED";
    return json({ text: "", error: message });
  }
}
