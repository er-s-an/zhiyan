import { listV2Demos } from "../../../../lib/v2/server/demos";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return Response.json({ demos: await listV2Demos() });
}
