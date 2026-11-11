export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return Response.json({
    ok: true,
    version: "v2",
    zhihuConfigured: Boolean(process.env.ZHIHU_ACCESS_SECRET),
    llmConfigured: Boolean(process.env.LLM_API_KEY && process.env.LLM_BASE_URL),
    writesToZhihu: false,
  });
}
