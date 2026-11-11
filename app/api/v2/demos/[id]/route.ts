import { readV2Demo } from "../../../../../lib/v2/server/demos";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await context.params;
  const demo = await readV2Demo(id);
  if (!demo) return Response.json({ error: "DEMO_NOT_FOUND" }, { status: 404 });
  return Response.json(demo);
}
