import { listDemos } from "../../../lib/server/demos";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const demos = await listDemos();
  return Response.json({ demos });
}
