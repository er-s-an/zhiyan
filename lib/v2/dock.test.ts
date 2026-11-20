import assert from "node:assert/strict";
import test from "node:test";
import mainCase from "./briefs/main-case.json";
import type { DecisionBriefV21 } from "./brief";
import {
  buildDockContext,
  buildFallbackAnswer,
  buildFallbackClarify,
  clarifyQuestions,
} from "./dock";

const MAIN_BRIEF = (mainCase as { brief: DecisionBriefV21 }).brief;

test("research partner asks four quick clarify questions in every language", () => {
  for (const lang of ["zh", "en", "fr", "ja", "ru", "ko"] as const) {
    const questions = clarifyQuestions(lang);
    assert.equal(questions.length, 4);
    assert.ok(questions.every((question) => question.length > 0));
  }
});

test("clarify fallback always returns a usable brief and three actions", () => {
  const answers = [
    "帮中国自由职业者用 AI 管理合同和回款",
    "刚接私活的独立设计师",
    "改需求不好意思加钱，尾款拖两个月",
    "先确认这是不是高频问题",
  ];
  for (const lang of ["zh", "en", "fr", "ja", "ru", "ko"] as const) {
    const result = buildFallbackClarify(answers, lang);
    assert.ok(result.reply.length > 0);
    assert.ok(result.brief.includes("独立设计师"));
    assert.equal(result.actions.length, 3);
  }
});

test("dock context reads the current research brief", () => {
  const context = buildDockContext(MAIN_BRIEF, null, "zh");
  assert.ok(context);
  assert.ok(context?.decision.includes("自由职业者"));
  assert.ok(context?.topOpportunity);
  assert.ok(context?.topOpportunity?.evidenceCount && context.topOpportunity.evidenceCount > 0);
});

test("interview-only context can answer before research exists", () => {
  const context = buildDockContext(null, null, "zh", {
    idea: "帮自由职业者管合同",
    audience: "独立设计师",
    problem: "尾款拖延",
    score: 72,
    level: "值得小步验证",
    risks: ["付费意愿未验证"],
    mustValidate: ["先访谈 5 个用户", "验证是否愿意预付"],
  });
  assert.ok(context);
  assert.equal(context?.kind, "interview");
  assert.equal(context?.decision, "帮自由职业者管合同");
  const answer = buildFallbackAnswer("下一步做什么？", context, "zh");
  assert.ok(answer.includes("访谈初判"));
  assert.ok(answer.includes("还没有研究证据"));
  assert.ok(answer.includes("先访谈 5 个用户"));
});

test("without research, the partner does not invent context", () => {
  const answer = buildFallbackAnswer("下一步做什么？", null, "zh");
  assert.ok(answer.includes("还没有研究上下文"));
  assert.ok(answer.includes("完整访谈") || answer.includes("研究计划"));
});

test("with research, the partner answers from evidence", () => {
  const context = buildDockContext(MAIN_BRIEF, null, "zh");
  const answer = buildFallbackAnswer("下一步做什么？", context, "zh");
  assert.ok(answer.includes("证据强度") || answer.includes("下一步") || answer.includes("先"));
  assert.ok(answer.length > 40);
});
