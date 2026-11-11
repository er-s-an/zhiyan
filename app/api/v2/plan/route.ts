import { createResearchPlan } from "../../../../lib/v2/plan";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  const record = body && typeof body === "object" ? (body as { brief?: unknown; language?: unknown }) : {};
  const brief = typeof record.brief === "string" ? record.brief.trim() : "";
  const detectedLanguage = /[\u4e00-\u9fff]/.test(brief) ? "zh" : "en";
  const language = detectedLanguage;
  if (!brief) return Response.json({ error: "BRIEF_REQUIRED" }, { status: 400 });
  try {
    const plan = await createResearchPlan(brief, language);
    return Response.json({ plan, zhihuCalls: 0 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "PLAN_FAILED" }, { status: 502 });
  }
}
