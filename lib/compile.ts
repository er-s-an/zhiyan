import { scenarioForBrief } from "./scenarios";
import {
  LOCKED_LIMITS,
  STAGES,
  SUBJECTS,
  type CodeDef,
  type ResearchDesign,
  type SceneDef,
  type Stage,
  type Subject,
} from "./types";
import { windowFor } from "./window";

const STOP = new Set(
  "我们 准备 面向 想知道 应该 哪些 以及 这个 一个 进行 如何 什么 还是 可以 不是 没有 自己 他们 因为 所以 如果 已经 需要 希望 了解 研究 产品 知道 定义 宣称 支撑 购买 家庭 一款 做一 不足 团队 大家 真实 计划 落地 一套 能力 场景 痛点".split(
    " ",
  ),
);

function languageOf(brief: string): "en" | "zh" {
  const cjk = brief.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  return cjk >= 4 ? "zh" : "en";
}

function segments(brief: string): string[] {
  const parts = brief
    .split(/[，。！？、\s,.!?;；：:“”"'（）()【】\[\]的了和与或以及应该哪些想要知道准备面向一款我们不足以支撑]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2 && part.length <= 12 && !STOP.has(part));
  const out: string[] = [];
  for (const part of parts) {
    if (!out.includes(part)) out.push(part);
  }
  return out;
}

function stageFor(brief: string): Stage {
  if (/概念测试|concept test|原型测试/i.test(brief)) return "concept_test";
  if (/竞品|对比|哪个更|versus|competitor/i.test(brief)) return "competitive_analysis";
  if (/购买|入手|值不值|purchase|pricing/i.test(brief)) return "purchase_friction";
  return "needs_exploration";
}

function subjectsFor(brief: string): Subject[] {
  const subjects = new Set<Subject>();
  if (/医生|工程师|老师|运营|兽医|从业|practitioner/i.test(brief)) subjects.add("practitioners");
  if (/购买|买家|入手|buyer|purchase/i.test(brief)) subjects.add("buyers");
  if (/用户|家庭|使用|user|household/i.test(brief) || subjects.size === 0) subjects.add("users");
  return SUBJECTS.filter((subject) => subjects.has(subject));
}

function scene(id: string, label: string, keywords: string[]): SceneDef {
  return { id, label, keywords };
}

function code(id: string, label: string, definition: string, keywords: string[]): CodeDef {
  return { id, label, definition, keywords };
}

function genericDesign(brief: string, now: Date): ResearchDesign {
  const bits = segments(brief).slice(0, 6);
  const labels = bits.length > 0 ? bits : [brief.slice(0, 24) || "主题"];
  const scenes = labels.slice(0, 4).map((label, index) => scene(`scene_${index + 1}`, label, [label]));
  const queries = (bits.length > 0 ? bits : [brief.slice(0, 32)]).slice(0, 6);
  return {
    brief,
    briefLanguage: languageOf(brief),
    decision: brief.trim(),
    subjects: subjectsFor(brief),
    stage: stageFor(brief),
    zhihuCanAnswer: [
      "知乎上直接经历过的人如何描述这个问题、失败，以及他们用了什么词。",
      "计划中的哪些场景在检索里出现，哪些没有出现。",
    ],
    zhihuCannotAnswer: [
      ...LOCKED_LIMITS,
      "市场规模、付费意愿，以及一份排好序的产品路线图。",
    ],
    scenes,
    populations: [
      "有直接经历的人",
      "买单的人（当帖子把使用者和付费者分开时）",
      "从业者（当作者从职业视角写作时）",
    ],
    timeWindow: windowFor(now),
    inclusion: [
      "帖子描述了与这份简报有关的具体经历、失败或宣称。",
      "帖子由计划查询或热榜检索到，并且命中了产品词或场景。",
    ],
    exclusion: ["与简报无关的热榜条目。", "同一链接的重复出现。", "没有具体经历、失败或宣称的帖子。"],
    stoppingRule:
      "跑完计划内的全部查询就停。某个场景的纳入条目少于两条，就保持未覆盖。不追加查询来制造一致性。",
    queries,
    productTerms: labels.slice(0, 6),
    codebook: labels.slice(0, 6).map((label, index) =>
      code(`topic_${index + 1}`, label, `帖子中出现了「${label}」这一说法。`, [label]),
    ),
  };
}

export function compileDesign(brief: string, now = new Date()): ResearchDesign {
  const text = brief.trim();
  if (!text) {
    throw new Error("BRIEF_REQUIRED");
  }
  const scenario = scenarioForBrief(text);
  if (scenario) {
    return { ...scenario.build(now), brief: text, briefLanguage: languageOf(text) };
  }
  return genericDesign(text, now);
}

export function normalizeDesign(design: ResearchDesign): ResearchDesign {
  if (!design.decision.trim()) throw new Error("DECISION_REQUIRED");
  if (!STAGES.includes(design.stage)) throw new Error("STAGE_INVALID");
  if (design.subjects.length === 0) throw new Error("SUBJECTS_REQUIRED");
  if (design.scenes.length === 0) throw new Error("SCENES_REQUIRED");
  if (design.populations.length === 0) throw new Error("POPULATIONS_REQUIRED");
  if (design.queries.length === 0) throw new Error("QUERIES_REQUIRED");
  if (design.inclusion.length === 0 || design.exclusion.length === 0) {
    throw new Error("RULES_REQUIRED");
  }
  if (!design.stoppingRule.trim()) throw new Error("STOPPING_RULE_REQUIRED");
  if (!design.timeWindow.start || !design.timeWindow.end) throw new Error("WINDOW_REQUIRED");
  const extra = design.zhihuCannotAnswer.filter(
    (line) => !LOCKED_LIMITS.includes(line as (typeof LOCKED_LIMITS)[number]),
  );
  return {
    ...design,
    zhihuCanAnswer: design.zhihuCanAnswer.map((line) => line.trim()).filter(Boolean),
    zhihuCannotAnswer: [...LOCKED_LIMITS, ...extra],
    queries: design.queries.map((query) => query.trim()).filter(Boolean),
  };
}

export function designHasChineseQueries(design: ResearchDesign): boolean {
  return design.queries.some((query) => /[\u4e00-\u9fff]/.test(query));
}
