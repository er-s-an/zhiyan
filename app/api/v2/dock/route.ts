import {
  buildAskPrompt,
  buildClarifyPrompt,
  buildFallbackAnswer,
  buildFallbackClarify,
  type DockClarifyResult,
  type DockContext,
  type DockOpportunity,
} from "../../../../lib/v2/dock";
import { hasOpenCode, opencodeGenerateText } from "../../../../lib/v2/server/opencode";
import type { Lang } from "../../../../lib/v2/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isLang(value: unknown): value is Lang {
  return value === "zh" || value === "en" || value === "fr" || value === "ja" || value === "ru" || value === "ko";
}

function text(value: unknown, limit = 1200): string {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function strings(value: unknown, limit = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim().slice(0, 400)).slice(0, limit);
}

function parseContext(value: unknown): DockContext | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const topRaw = record.topOpportunity && typeof record.topOpportunity === "object" ? (record.topOpportunity as Record<string, unknown>) : null;
  const top: DockOpportunity | null = topRaw
    ? {
        targetUser: text(topRaw.targetUser, 300),
        scenario: text(topRaw.scenario, 500),
        problem: text(topRaw.problem, 600),
        productDirection: text(topRaw.productDirection, 600),
        evidenceStrength: text(topRaw.evidenceStrength, 40),
        nextValidation: text(topRaw.nextValidation, 600),
        evidenceCount: typeof topRaw.evidenceCount === "number" ? topRaw.evidenceCount : 0,
        counterCount: typeof topRaw.counterCount === "number" ? topRaw.counterCount : 0,
      }
    : null;
  const interviewRaw = record.interview && typeof record.interview === "object" ? (record.interview as Record<string, unknown>) : null;
  const interview = interviewRaw
    ? {
        idea: text(interviewRaw.idea, 600),
        audience: text(interviewRaw.audience, 600),
        problem: text(interviewRaw.problem, 800),
        score: typeof interviewRaw.score === "number" ? interviewRaw.score : 0,
        level: text(interviewRaw.level, 120),
        risks: strings(interviewRaw.risks, 5),
        mustValidate: strings(interviewRaw.mustValidate, 5),
      }
    : null;
  return {
    kind: record.kind === "interview" ? "interview" : "research",
    decision: text(record.decision, 800),
    recommendation: text(record.recommendation, 80),
    topOpportunity: top,
    validateFirst: strings(record.validateFirst),
    doNotDo: strings(record.doNotDo),
    unanswered: strings(record.unanswered),
    includedCount: typeof record.includedCount === "number" ? record.includedCount : 0,
    interview,
  };
}

function modelFor(language: Lang): string {
  const multilingual = language === "ru" || language === "ko" || language === "ja";
  return multilingual
    ? process.env.OPENCODE_DOCK_MODEL_MULTILINGUAL || process.env.OPENCODE_DOCK_MODEL_RU_KO || "glm-5.3-flash"
    : process.env.OPENCODE_DOCK_MODEL || "minimax-m3.1-flash";
}

function parseJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("DOCK_JSON");
  return JSON.parse(trimmed.slice(start, end + 1));
}

function normaliseClarify(raw: unknown, fallback: DockClarifyResult): DockClarifyResult {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const actions = strings(value.actions, 4);
  return {
    reply: text(value.reply, 800) || fallback.reply,
    brief: text(value.brief, 800) || fallback.brief,
    actions: actions.length >= 2 ? actions : fallback.actions,
  };
}

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const mode = record.mode === "ask" ? "ask" : record.mode === "clarify" ? "clarify" : "";
  const language: Lang = isLang(record.language) ? record.language : "zh";
  if (!mode) return Response.json({ error: "MODE_REQUIRED" }, { status: 400 });

  if (mode === "clarify") {
    const answers = strings(record.answers, 4);
    const fallback = buildFallbackClarify(answers, language);
    if (!hasOpenCode()) return Response.json({ result: fallback, source: "fallback" });
    try {
      const model = modelFor(language);
      const variant = process.env.OPENCODE_DOCK_VARIANT || "low";
      const raw = await opencodeGenerateText(buildClarifyPrompt(answers, language), { timeoutMs: 25000, modelID: model, variant });
      return Response.json({ result: normaliseClarify(parseJson(raw), fallback), source: "opencode" });
    } catch (error) {
      return Response.json({ result: fallback, source: "fallback", error: error instanceof Error ? error.message : "DOCK_FAILED" });
    }
  }

  const question = text(record.question, 1500);
  const context = parseContext(record.context);
  const intent = record.intent === "outline" ? "outline" : "answer";
  const fallback = buildFallbackAnswer(question, context, language);
  if (!hasOpenCode()) return Response.json({ reply: fallback, source: "fallback" });
  try {
    const model = modelFor(language);
    const variant = process.env.OPENCODE_DOCK_VARIANT || "low";
    const raw = await opencodeGenerateText(buildAskPrompt(question, context, language, intent), { timeoutMs: 25000, modelID: model, variant });
    return Response.json({ reply: raw.trim().slice(0, 1600) || fallback, source: "opencode" });
  } catch (error) {
    return Response.json({ reply: fallback, source: "fallback", error: error instanceof Error ? error.message : "DOCK_FAILED" });
  }
}
