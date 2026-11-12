import assert from "node:assert/strict";
import test from "node:test";
import { MAIN_CASE_BRIEF, confirmPlan, createResearchPlan, evaluateMethodGate, extendPlan } from "./plan";
import { buildDecisionMemo, buildReport, codeSamples, induceCodebook, projectStudy } from "./semantic";
import type {
  CoverageRowV2,
  FindingV2,
  ResearchPlanV2,
  SampleItemV2,
  StudyV2,
  VocabularyItemV2,
} from "./types";

const coverage: CoverageRowV2[] = [
  { dimension: "population", value: "独立设计师", valueEn: "Independent designers", status: "covered", itemIds: ["s1", "s2"] },
  { dimension: "scene", value: "尾款", valueEn: "Final payment", status: "partial", itemIds: ["s1"] },
];

function sample(partial: Partial<SampleItemV2> & { id: string }): SampleItemV2 {
  const { id, ...rest } = partial;
  return {
    id,
    source: "zhihu_search",
    title: "测试样本",
    url: `https://www.zhihu.com/question/${partial.id}`,
    author: "测试作者",
    contentType: "回答",
    textZh: "自由职业者接单后遇到改需求，尾款一直拖着。",
    textEn: "",
    excerptZh: "自由职业者接单后遇到改需求，尾款一直拖着。",
    excerptEn: "A freelancer faced scope changes and late final payment.",
    publishDate: "2026-01-01",
    queryRunId: "run_1",
    round: 0,
    query: "自由职业 尾款",
    purposeZh: "找到尾款场景",
    purposeEn: "Find payment scenes",
    sceneIds: ["scene_1"],
    sceneLabelsZh: ["尾款与拖款"],
    sceneLabelsEn: ["Final payment"],
    populationZh: "独立设计师",
    populationEn: "Independent designers",
    stance: "conditional",
    flags: { marketing: false, duplicate: false, secondhand: false, stale: false },
    included: true,
    whyIncludedZh: "由查询检索到",
    whyIncludedEn: "Retrieved by query",
    codes: [],
    traces: [],
    supportFindingIds: [],
    refuteFindingIds: [],
    votes: 1,
    comments: 0,
    ...rest,
  };
}

function finding(evidenceIds: string[]): FindingV2 {
  return {
    id: "finding_1",
    category: "task_pain",
    type: evidenceIds.length >= 2 ? "multi_sample" : "direct",
    titleZh: "尾款与改需求连在一起",
    titleEn: "Scope changes and final payment are linked",
    bodyZh: "测试发现",
    bodyEn: "Test finding",
    codeIds: ["late_payment"],
    evidence: evidenceIds.map((id) => ({ itemId: id, quoteZh: "quote", quoteEn: "quote", url: "https://www.zhihu.com", author: "author" })),
    counterEvidence: [],
    populationsZh: ["独立设计师"],
    populationsEn: ["Independent designers"],
    scenesZh: ["尾款"],
    scenesEn: ["Final payment"],
    boundaryZh: "本样本内",
    boundaryEn: "Within this sample",
    productImpactZh: "影响",
    productImpactEn: "Impact",
    aiInferenceZh: "AI 推断",
    aiInferenceEn: "AI inference",
    nextValidationZh: "访谈",
    nextValidationEn: "Interview",
    confidence: "medium",
    manualEdited: false,
  };
}

async function fixture(): Promise<{ plan: ResearchPlanV2; study: StudyV2 }> {
  const plan = confirmPlan(await createResearchPlan(MAIN_CASE_BRIEF, "en"));
  const samples = [sample({ id: "s1", codes: ["late_payment"] }), sample({ id: "s2", codes: [] })];
  const codebook = await induceCodebook(samples, plan);
  const coded = await codeSamples(samples, codebook, plan);
  const findingOne = finding(["s1"]);
  const memo = buildDecisionMemo(plan, [findingOne], coverage);
  const vocabulary: VocabularyItemV2[] = [
    { id: "v1", raw: "改需求", normalizedZh: "改需求", normalizedEn: "scope change", type: "symptom", source: "sample", sourceSampleId: "s1", sourceQuoteZh: "遇到改需求", sourceQuoteEn: "scope changes", proposedQuery: "私活 改需求 加钱", gapZh: "gap", gapEn: "gap", broughtNewTheme: true },
  ];
  const skeleton = {
    id: "study_test",
    plan,
    confirmedAt: new Date().toISOString(),
    generatedAt: new Date().toISOString(),
    rounds: 1,
    runs: [],
    retrieval: [{ kind: "zhihu_search" as const, query: "自由职业 尾款", resultCount: 2 }],
    candidatesScanned: 2,
    sample: coded,
    vocabulary,
    coverage,
    stopReasonZh: "达到预算",
    stopReasonEn: "Reached budget",
    coding: codebook,
    findings: [findingOne],
    memo,
    auxiliary: { text: "", usedAsFinding: false as const },
    hotScan: { scanned: 30, included: 0, droppedTitles: [] },
    demo: false,
  };
  return { plan, study: { ...skeleton, report: buildReport(skeleton) } };
}

test("method gate: China-facing study is fit, overseas market is mismatch", async () => {
  const plan = await createResearchPlan(MAIN_CASE_BRIEF, "en");
  assert.equal(plan.methodGate.fit, "fit");
  const overseas = evaluateMethodGate({ ...plan, targetMarketZh: "北美市场", targetMarketEn: "North America" });
  assert.equal(overseas.fit, "mismatch");
  assert.equal(overseas.allowedOutput, "hypotheses_only");
});

test("plan expansion increments version and whitelists new queries", async () => {
  const plan = await createResearchPlan(MAIN_CASE_BRIEF, "en");
  const extended = extendPlan(plan, [{
    id: "",
    query: "自由职业 尾款 不给 怎么办",
    dimension: "task",
    purposeZh: "补尾款缺口",
    purposeEn: "Fill payment gap",
    source: "sample_evidence",
    isCounterExample: false,
    triggerSampleId: "s1",
  }], "测试扩展", "test expansion");
  assert.equal(extended.version, plan.version + 1);
  assert.equal(extended.versions.length, plan.versions.length + 1);
  assert.equal(extended.queryMatrix.length, plan.queryMatrix.length + 1);
  assert.ok(extended.queryMatrix.some((seed) => seed.query === "自由职业 尾款 不给 怎么办"));
});

test("excluding the only evidence hides the finding and recomputes the bilingual report", async () => {
  const { study } = await fixture();
  const before = projectStudy(study);
  assert.equal(before.findings[0].hidden, false);
  const excluded = {
    ...before,
    sample: before.sample.map((item) => (item.id === "s1" ? { ...item, included: false } : item)),
  };
  const after = projectStudy(excluded);
  assert.equal(after.findings[0].hidden, true);
  assert.equal(after.report.findings.length, after.findings.filter((item) => !item.hidden).length);
});

test("bilingual report uses one structured finding list and keeps source links", async () => {
  const { study } = await fixture();
  const projected = projectStudy(study);
  assert.equal(projected.report.findings.length, projected.findings.filter((item) => !item.hidden).length);
  assert.ok(projected.report.decisionZh.length > 0);
  assert.ok(projected.report.decisionEn.length > 0);
  assert.ok(projected.report.quotes.every((quote) => quote.url.startsWith("https://")));
});

test("mismatched market never yields a build recommendation", async () => {
  const { plan } = await fixture();
  const overseasPlan = { ...plan, methodGate: evaluateMethodGate({ ...plan, targetMarketZh: "北美市场", targetMarketEn: "North America" }) };
  const memo = buildDecisionMemo(overseasPlan, [finding(["s1"])], coverage);
  assert.equal(memo.recommendation, "validate_first");
  assert.equal(memo.confidence, "low");
});

test("adaptive exploration grows vocabulary, adds a plan version and runs a counter query", async () => {
  const { runAdaptiveExploration } = await import("./explore");
  const plan = await createResearchPlan(MAIN_CASE_BRIEF, "en");
  let counter = 0;
  const port = {
    async search(query: string) {
      counter += 1;
      return Array.from({ length: 3 }, (_, index) => ({
        title: `${query} 测试 ${index}`,
        url: `https://www.zhihu.com/question/${counter}_${index}`,
        author: `author${index}`,
        contentType: "回答",
        text: "自由职业者接单后遇到改需求，尾款一直拖着，需要合同和验收标准。",
        publishTime: 1_760_000_000,
        votes: index,
        comments: 0,
        badge: "",
      }));
    },
    async hot() {
      return [];
    },
    async zhida() {
      return "辅助提示";
    },
  };
  const result = await runAdaptiveExploration(plan, port);
  assert.ok(result.runs.length >= 6);
  assert.ok(result.plan.versions.length >= 2);
  assert.ok(result.runs.some((run) => run.round >= 1));
  assert.ok(result.runs.some((run) => run.dimension === "counter"));
  assert.ok(result.vocabulary.filter((item) => item.source === "sample" && item.sourceSampleId).length >= 1);
  assert.ok(result.sample.filter((item) => item.included).length > 0);
});

test("V2.1 cached decision brief is grounded in included evidence", async () => {
  const { readFileSync } = await import("node:fs");
  const { recomputeBrief, validateBrief } = await import("./brief");
  const study = (JSON.parse(readFileSync("lib/v2/demos/main-case.json", "utf8")) as { study: StudyV2 }).study;
  const brief = (JSON.parse(readFileSync("lib/v2/briefs/main-case.json", "utf8")) as { brief: import("./brief").DecisionBriefV21 }).brief;
  assert.deepEqual(validateBrief(brief, study), []);
  assert.ok(brief.beliefUpdates.length <= 3);
  assert.ok(brief.opportunities.length <= 3);
  assert.equal(brief.stopReason.type, "budget_exhausted");
  assert.ok(brief.stopReason.detailZh.includes("预算"));
  assert.ok(brief.stopReason.detailZh.includes("不宣称主题"));
  assert.ok(new Date(brief.initialBelief.capturedAt).getTime() <= new Date(study.confirmedAt).getTime());
  for (const opportunity of brief.opportunities) {
    assert.ok(opportunity.evidenceIds.length >= 1);
    assert.ok(opportunity.evidenceIds.every((id) => study.sample.some((item) => item.id === id && item.included)));
  }
  const first = brief.opportunities[0];
  const removed = { ...study, sample: study.sample.map((item) => (item.id === first.evidenceIds[0] ? { ...item, included: false } : item)) };
  const recomputed = recomputeBrief(brief, removed);
  assert.ok(recomputed.opportunities[0].evidenceIds.length < first.evidenceIds.length);
});

test("V2.1 brief falls back to insufficient evidence when key evidence is removed", async () => {
  const { readFileSync } = await import("node:fs");
  const { recomputeBrief } = await import("./brief");
  const study = (JSON.parse(readFileSync("lib/v2/demos/main-case.json", "utf8")) as { study: StudyV2 }).study;
  const brief = (JSON.parse(readFileSync("lib/v2/briefs/main-case.json", "utf8")) as { brief: import("./brief").DecisionBriefV21 }).brief;
  const evidenceIds = new Set(brief.opportunities.flatMap((item) => item.evidenceIds));
  const removed = { ...study, sample: study.sample.map((item) => (evidenceIds.has(item.id) ? { ...item, included: false } : item)) };
  const recomputed = recomputeBrief(brief, removed);
  assert.equal(recomputed.recommendation, "insufficient_evidence");
  assert.ok(recomputed.opportunities.every((item) => item.hidden || item.evidenceIds.length === 0));
});
