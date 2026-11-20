import {
  buildActionPlanPrompt,
  normaliseActionPlan,
  type ActionPlan,
} from "../../../../lib/v2/action-plan";
import type { FeasibilityAssessment, InterviewProfile } from "../../../../lib/v2/interview";
import { hasOpenCode, opencodeGenerateText } from "../../../../lib/v2/server/opencode";
import type { Lang } from "../../../../lib/v2/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function isLang(value: unknown): value is Lang {
  return value === "zh" || value === "en" || value === "fr" || value === "ja" || value === "ru" || value === "ko";
}

function text(value: unknown, limit = 4000): string {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function parseJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("PLAN_JSON");
  return JSON.parse(trimmed.slice(start, end + 1));
}

function isPlan(value: unknown): value is ActionPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as Record<string, unknown>;
  const mvp = plan.mvp as Record<string, unknown> | undefined;
  return Boolean(
    typeof plan.title === "string" &&
      typeof plan.positioning === "string" &&
      mvp &&
      Array.isArray(mvp.must) &&
      Array.isArray(plan.roadmap) &&
      Array.isArray(plan.experiments),
  );
}

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const rawProfile = record.profile && typeof record.profile === "object" ? (record.profile as Record<string, unknown>) : {};
  const language: Lang = isLang(record.language) ? record.language : isLang(rawProfile.language) ? rawProfile.language : "zh";
  const profile: InterviewProfile = {
    age: text(rawProfile.age, 40),
    occupation: text(rawProfile.occupation, 300),
    idea: text(rawProfile.idea, 600),
    audience: text(rawProfile.audience, 600),
    problem: text(rawProfile.problem, 800),
    market: text(rawProfile.market, 300),
    edge: text(rawProfile.edge, 600),
    model: text(rawProfile.model, 600),
    evidence: text(rawProfile.evidence, 800),
    decision: text(rawProfile.decision, 800),
    constraints: text(rawProfile.constraints, 400),
    language,
    capturedAt: text(rawProfile.capturedAt, 60) || new Date().toISOString(),
  };
  if (!profile.idea && !profile.audience) {
    return Response.json({ error: "PROFILE_REQUIRED" }, { status: 400 });
  }

  const assessment = (record.assessment && typeof record.assessment === "object" ? record.assessment : null) as FeasibilityAssessment | null;
  if (!assessment || !Array.isArray(assessment.dimensions)) {
    return Response.json({ error: "ASSESSMENT_REQUIRED" }, { status: 400 });
  }

  const fallback = record.fallback;
  if (!isPlan(fallback)) {
    return Response.json({ error: "FALLBACK_REQUIRED" }, { status: 400 });
  }
  const researchMatch = record.researchMatch === true;

  if (!hasOpenCode()) {
    return Response.json({ plan: fallback, source: "fallback", error: "OPENCODE_NOT_CONFIGURED" });
  }

  try {
    const multilingual = language === "ru" || language === "ko" || language === "ja";
    const model = multilingual
      ? process.env.OPENCODE_PLAN_MODEL_MULTILINGUAL || process.env.OPENCODE_PLAN_MODEL_RU_KO || "glm-5.3-flash"
      : process.env.OPENCODE_PLAN_MODEL || "minimax-m3.1-flash";
    const variant = (multilingual ? process.env.OPENCODE_PLAN_VARIANT_MULTILINGUAL : process.env.OPENCODE_PLAN_VARIANT) || "low";
    const prompt = buildActionPlanPrompt(profile, assessment, fallback, researchMatch);
    const raw = await opencodeGenerateText(prompt, { timeoutMs: 40000, modelID: model, variant });
    const planResult = normaliseActionPlan(parseJson(raw), fallback);
    return Response.json({ plan: planResult, source: "opencode" });
  } catch (error) {
    return Response.json({
      plan: fallback,
      source: "fallback",
      error: error instanceof Error ? error.message : "PLAN_FAILED",
    });
  }
}
