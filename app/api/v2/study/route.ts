import { confirmPlan, extendPlan } from "../../../../lib/v2/plan";
import { runStudy } from "../../../../lib/v2/pipeline";
import type { ResearchPlanV2 } from "../../../../lib/v2/types";
import { hotListV2, searchZhihuV2, zhidaV2 } from "../../../../lib/v2/zhihu";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isPlan(value: unknown): value is ResearchPlanV2 {
  if (!value || typeof value !== "object") return false;
  const plan = value as ResearchPlanV2;
  return typeof plan.decisionZh === "string" && Array.isArray(plan.queryMatrix) && Boolean(plan.methodGate);
}

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  const record = body && typeof body === "object" ? (body as { plan?: unknown; confirmed?: unknown }) : {};
  if (record.confirmed !== true) {
    return Response.json({ error: "请先确认研究计划。", code: "CONFIRM_REQUIRED" }, { status: 400 });
  }
  if (!isPlan(record.plan)) {
    return Response.json({ error: "研究计划不完整。", code: "PLAN_INVALID" }, { status: 400 });
  }
  if (record.plan.queryMatrix.length === 0) {
    return Response.json({ error: "计划缺少查询。", code: "QUERIES_REQUIRED" }, { status: 400 });
  }
  try {
    let plan = confirmPlan(record.plan);
    const mode = (body as { mode?: unknown }).mode === "full" ? "full" : "lite";
    if (mode === "lite") {
      const counterSeed = {
        id: "seed_lite_counter",
        query: "自由职业 合同 没必要 熟人",
        dimension: "counter" as const,
        purposeZh: "轻量反例检索：是否存在问题不成立或现有方案足够的场景",
        purposeEn: "Lightweight counter-example retrieval: cases where the problem does not hold",
        source: "model_prior" as const,
        isCounterExample: true,
      };
      plan = extendPlan(
        { ...plan, queryMatrix: plan.queryMatrix.slice(0, 4) },
        [counterSeed],
        "轻量实时检索加入反例查询",
        "Lightweight live mode adds a counter-example query",
      );
      plan = { ...plan, budget: { ...plan.budget, seedQueries: 5, maxRounds: 1, perRound: 2, maxQueries: 7, maxCandidates: 28 } };
    }
    const study = await runStudy(plan, true, {
      port: { search: searchZhihuV2, hot: hotListV2, zhida: zhidaV2 },
      lite: mode === "lite",
    });
    return Response.json({ study });
  } catch (error) {
    const message = error instanceof Error ? error.message : "STUDY_FAILED";
    return Response.json({ error: message, code: message }, { status: 502 });
  }
}
