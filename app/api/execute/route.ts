import { executeConfirmed } from "../../../lib/run";
import { translateExcerpts } from "../../../lib/server/translate";
import { zhihuPort } from "../../../lib/server/zhihu";
import type { ResearchDesign } from "../../../lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isDesign(value: unknown): value is ResearchDesign {
  if (!value || typeof value !== "object") return false;
  const design = value as ResearchDesign;
  return typeof design.decision === "string" && Array.isArray(design.queries) && Array.isArray(design.scenes);
}

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  const record = body && typeof body === "object" ? (body as { confirmed?: unknown; design?: unknown }) : {};
  if (record.confirmed !== true) {
    return Response.json(
      { error: "请先确认研究设计，再发起检索。", code: "CONFIRM_REQUIRED" },
      { status: 400 },
    );
  }
  if (!isDesign(record.design)) {
    return Response.json({ error: "研究设计不完整。", code: "DESIGN_INVALID" }, { status: 400 });
  }
  try {
    const study = await executeConfirmed({
      design: record.design,
      confirmed: true,
      port: zhihuPort,
      translate: translateExcerpts,
    });
    return Response.json({ study });
  } catch (error) {
    const message = error instanceof Error ? error.message : "EXECUTE_FAILED";
    const status = message === "CONFIRM_REQUIRED" ? 400 : 502;
    return Response.json({ error: message, code: message }, { status });
  }
}
