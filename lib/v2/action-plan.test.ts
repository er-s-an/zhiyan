import assert from "node:assert/strict";
import test from "node:test";
import mainCase from "./briefs/main-case.json";
import { assessFeasibility, buildInterviewProfile, type InterviewAnswers } from "./interview";
import {
  buildActionPlanMarkdown,
  buildFallbackActionPlan,
  normaliseActionPlan,
  researchMatchesInterview,
} from "./action-plan";
import type { DecisionBriefV21 } from "./brief";

const MAIN_BRIEF = (mainCase as { brief: DecisionBriefV21 }).brief;

const FREELANCER: InterviewAnswers = {
  age: "28",
  occupation: "互联网公司产品经理，业余做副业",
  idea: "帮中国自由职业者用 AI 管理合同和回款。",
  audience: "刚接私活 1–2 年、在社交平台接单的独立设计师",
  problem: "改需求后不好意思加钱，尾款拖两个月，只能反复催。",
  market: "中国大陆",
  edge: "我在这个行业做过 5 年，认识 200 个目标用户。",
  model: "按年订阅，省下的时间比订阅费更值钱。",
  evidence: "聊过 8 个用户，3 个愿意试用，还没人付钱。",
  decision: "要不要先做 MVP；如果 10 个访谈里不到 3 个遇到这问题就停。",
  constraints: "业余时间，每周 10 小时。",
};

const CAT_FEEDER: InterviewAnswers = {
  age: "31",
  occupation: "上班族",
  idea: "给多猫家庭做智能喂食器。",
  audience: "养两只以上猫、经常加班的上班族",
  problem: "加班时猫吃不到饭，普通喂食器不能分餐。",
  market: "中国大陆",
  edge: "我自己养三只猫，踩过很多坑。",
  model: "硬件一次性收费 + 耗材订阅。",
  evidence: "还没验证。",
  decision: "要不要先做样机；如果 5 个用户里不到 3 个愿意付定金就停。",
  constraints: "1 个月，预算 5000 元。",
};

test("matched research merges into a concrete action plan", () => {
  const profile = buildInterviewProfile(FREELANCER, "zh");
  const assessment = assessFeasibility(profile);
  assert.equal(researchMatchesInterview(profile, MAIN_BRIEF, null), true);
  const plan = buildFallbackActionPlan({ profile, assessment, brief: MAIN_BRIEF, plan: null, study: null });
  assert.equal(plan.mode, "research_merged");
  assert.ok(plan.researchUsed);
  assert.ok(plan.researchUsed.evidenceStrength.length > 0);
  assert.equal(plan.roadmap.length, 4);
  assert.ok(plan.experiments.length >= 3);
  assert.ok(plan.mvp.must.length >= 2);
  assert.ok(plan.killCriteria.length >= 2);
  assert.ok(plan.nextSevenDays.length >= 3);
});

test("a demo case that does not match the interview is not used as evidence", () => {
  const profile = buildInterviewProfile(CAT_FEEDER, "zh");
  const assessment = assessFeasibility(profile);
  assert.equal(researchMatchesInterview(profile, MAIN_BRIEF, null), false);
  const plan = buildFallbackActionPlan({ profile, assessment, brief: MAIN_BRIEF, plan: null, study: null });
  assert.equal(plan.mode, "research_mismatch");
  assert.equal(plan.researchUsed, null);
  assert.ok(plan.evidence.fromResearch.some((item) => item.includes("没有") || item.includes("No matching")));
});

test("interview-only plan still produces a usable roadmap", () => {
  const profile = buildInterviewProfile(CAT_FEEDER, "zh");
  const assessment = assessFeasibility(profile);
  const plan = buildFallbackActionPlan({ profile, assessment, brief: null, plan: null, study: null });
  assert.equal(plan.mode, "interview_only");
  assert.equal(plan.researchUsed, null);
  assert.equal(plan.roadmap.length, 4);
  assert.ok(plan.mvp.must.length >= 2);
  assert.ok(plan.evidence.gaps.length >= 2);
});

test("malformed model output falls back to a safe plan shape", () => {
  const profile = buildInterviewProfile(FREELANCER, "zh");
  const assessment = assessFeasibility(profile);
  const fallback = buildFallbackActionPlan({ profile, assessment, brief: MAIN_BRIEF, plan: null, study: null });
  const normalised = normaliseActionPlan(
    {
      title: "新方案",
      mvp: { must: ["只做验收"], later: [], notNow: [] },
      roadmap: [],
      confidence: "high",
      mode: "interview_only",
    },
    fallback,
  );
  assert.equal(normalised.title, "新方案");
  assert.deepEqual(normalised.mvp.must, ["只做验收"]);
  assert.equal(normalised.roadmap.length, fallback.roadmap.length);
  assert.equal(normalised.mode, "research_merged");
  assert.equal(normalised.language, fallback.language);
});

test("action plan markdown exports the full plan", () => {
  const profile = buildInterviewProfile(FREELANCER, "zh");
  const assessment = assessFeasibility(profile);
  const plan = buildFallbackActionPlan({ profile, assessment, brief: MAIN_BRIEF, plan: null, study: null });
  const markdown = buildActionPlanMarkdown(plan);
  assert.ok(markdown.includes("## MVP"));
  assert.ok(markdown.includes("## 路线图"));
  assert.ok(markdown.includes("## 接下来 7 天"));
  assert.ok(markdown.includes(plan.beachhead));
});
