import { startJob } from "../../../../lib/v2/jobs";
import { confirmPlan, extendPlan } from "../../../../lib/v2/plan";
import type { ResearchPlanV2 } from "../../../../lib/v2/types";

export const dynamic = "force-dynamic";

function isPlan(value: unknown): value is ResearchPlanV2 {
  if (!value || typeof value !== "object") return false;
  const plan = value as ResearchPlanV2;
  return typeof plan.decisionZh === "string" && Array.isArray(plan.queryMatrix) && Boolean(plan.methodGate);
}

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  const record = body && typeof body === "object" ? (body as { plan?: unknown; confirmed?: unknown; mode?: unknown }) : {};
  if (record.confirmed !== true) return Response.json({ error: "请先确认研究计划。", code: "CONFIRM_REQUIRED" }, { status: 400 });
  if (!isPlan(record.plan)) return Response.json({ error: "研究计划不完整。", code: "PLAN_INVALID" }, { status: 400 });
  const mode = record.mode === "full" ? "full" : "lite";
  let plan = confirmPlan(record.plan);
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
  const job = startJob(plan, mode);
  return Response.json({ jobId: job.id, job });
}
