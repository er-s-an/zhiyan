import { readBrief } from "../../../../../lib/v2/server/briefs";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await context.params;
  const brief = await readBrief(id);
  if (!brief) return Response.json({ error: "BRIEF_NOT_FOUND" }, { status: 404 });
  return Response.json({ brief });
}
