import { getJob } from "../../../../../lib/v2/jobs";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await context.params;
  const job = getJob(id);
  if (!job) return Response.json({ error: "JOB_NOT_FOUND" }, { status: 404 });
  return Response.json({ job });
}
