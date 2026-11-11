import { compileDesign } from "../../../lib/compile";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  const brief = body && typeof body === "object" ? (body as { brief?: unknown }).brief : "";
  if (typeof brief !== "string" || !brief.trim()) {
    return Response.json({ error: "先写一句研究简报。" }, { status: 400 });
  }
  try {
    const design = compileDesign(brief.trim());
    return Response.json({
      design,
      retrieval: [],
      zhihuCalls: 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "COMPILE_FAILED";
    return Response.json({ error: message }, { status: 400 });
  }
}
