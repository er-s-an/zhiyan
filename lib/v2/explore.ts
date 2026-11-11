import type { HotScan, RetrievalEntry, ZhihuContent } from "../types";
import { completeJson, hasLlm } from "./llm";
import { extendPlan } from "./plan";
import type {
  CoverageRowV2,
  QueryDimension,
  QueryRunV2,
  QuerySeedV2,
  ResearchPlanV2,
  SampleFlagsV2,
  SampleItemV2,
  Stance,
  VocabType,
  VocabularyItemV2,
} from "./types";
import { clipText, dedupeKey, stableId, toIsoDate } from "./zhihu";

export interface ExplorePort {
  search(query: string, count: number): Promise<ZhihuContent[]>;
  hot(limit: number): Promise<ZhihuContent[]>;
  zhida(prompt: string): Promise<string>;
}

export interface ExploreProgress {
  step: "seed" | "expand" | "counter" | "hot" | "done";
  messageZh: string;
  messageEn: string;
  query?: string;
}

interface Candidate {
  content: ZhihuContent;
  queryRunId: string;
  round: number;
  query: string;
  purposeZh: string;
  purposeEn: string;
}

export interface ExplorationResult {
  plan: ResearchPlanV2;
  rounds: number;
  runs: QueryRunV2[];
  candidates: Candidate[];
  sample: SampleItemV2[];
  vocabulary: VocabularyItemV2[];
  coverage: CoverageRowV2[];
  retrieval: RetrievalEntry[];
  hotScan: HotScan;
  auxiliary: { text: string; error?: string; usedAsFinding: false };
  candidatesScanned: number;
  stopReasonZh: string;
  stopReasonEn: string;
}

const SCENE_TERMS = [
  "接单",
  "报价",
  "改需求",
  "需求变更",
  "验收",
  "尾款",
  "定金",
  "合同",
  "稿费",
  "拖款",
  "回款",
  "甲方",
  "外包",
  "约稿",
  "私活",
];

const ALT_TERMS = ["模板", "电子签", "平台担保", "熟人", "口头", "闲鱼", "微信", "合同范本", "第三方担保"];
const SUPPORT_TERMS = ["有必要", "必须", "需要", "靠谱", "有用", "应该签"];
const OPPOSE_TERMS = ["没必要", "不需要", "鸡肋", "没用", "不签", "看情况", "熟人"];
const POPULATION_TERMS = ["设计师", "开发者", "程序员", "撰稿", "插画", "顾问", "自由职业", "独立开发", "剪辑", "翻译"];

const FALLBACK_VOCAB: { raw: string; type: VocabType; query: string; gapZh: string; gapEn: string }[] = [
  { raw: "改需求", type: "symptom", query: "私活 改需求 加钱 怎么谈", gapZh: "范围变更和加价的原生表达", gapEn: "Native language for scope changes and renegotiation" },
  { raw: "尾款", type: "task", query: "自由职业 尾款 不给 怎么办", gapZh: "尾款回收的实际做法", gapEn: "How freelancers actually collect final payment" },
  { raw: "验收", type: "scene", query: "外包 验收 标准 尾款", gapZh: "验收标准与付款节点的关系", gapEn: "How acceptance criteria connect to payment milestones" },
  { raw: "电子签", type: "alternative", query: "自由职业 电子签 合同 有用吗", gapZh: "电子签是否能解决纠纷", gapEn: "Whether e-signature actually solves disputes" },
  { raw: "平台担保", type: "alternative", query: "接私活 平台担保 靠谱吗", gapZh: "平台担保的覆盖与不足", gapEn: "Coverage and gaps of platform guarantees" },
  { raw: "定金", type: "task", query: "约稿 定金 比例 多少", gapZh: "定金的常见比例与谈判", gapEn: "Common deposit ratios and negotiation" },
  { raw: "跑单", type: "symptom", query: "接私活 跑单 怎么防", gapZh: "跑单/失联的风险与预防", gapEn: "Risk and prevention of clients disappearing" },
  { raw: "发票", type: "task", query: "自由职业 发票 税 合同", gapZh: "发票与税务对合同的影响", gapEn: "How invoicing and tax affect contracts" },
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function planTerms(plan: ResearchPlanV2): string[] {
  const terms = new Set<string>();
  for (const query of plan.queryMatrix) {
    for (const part of query.query.split(/\s+/)) {
      if (part.length >= 2) terms.add(part);
    }
  }
  for (const term of [...SCENE_TERMS, ...ALT_TERMS, ...POPULATION_TERMS]) terms.add(term);
  return [...terms];
}

function textOf(hit: ZhihuContent): string {
  return `${hit.title}\n${hit.text}`;
}

function isRelevant(hit: ZhihuContent, terms: string[]): boolean {
  const text = textOf(hit).toLowerCase();
  return terms.some((term) => term && text.includes(term.toLowerCase()));
}

function flagsFor(hit: ZhihuContent, text: string, duplicate: boolean, windowStart: string): SampleFlagsV2 {
  const marketingTerms = ["广告", "软广", "品牌方", "赞助", "优惠券", "购买链接", "旗舰店", "淘宝", "京东", "种草", "加微信", "课程", "训练营", "代写", "模板下载"];
  const secondhandTerms = ["听说", "朋友说", "网传", "据说", "有人说", "好像是"];
  const date = toIsoDate(hit.publishTime);
  return {
    marketing: marketingTerms.some((term) => text.includes(term)) || /官方|机构/.test(hit.badge || ""),
    duplicate,
    secondhand: secondhandTerms.some((term) => text.includes(term)),
    stale: date !== "unknown" && date < windowStart,
  };
}

function matchedTerms(text: string, terms: string[]): string[] {
  return terms.filter((term) => term && text.includes(term));
}

function quoteAround(text: string, raw: string, limit = 90): string {
  const index = text.indexOf(raw);
  if (index < 0) return text.slice(0, limit);
  const start = Math.max(0, index - Math.floor(limit / 2));
  return text.slice(start, Math.min(text.length, start + limit)).replace(/\s+/g, " ").trim();
}

function fallbackVocabulary(samples: SampleItemV2[], plan: ResearchPlanV2, existing: VocabularyItemV2[]): VocabularyItemV2[] {
  const known = new Set([...existing.map((item) => item.raw), ...plan.queryMatrix.map((seed) => seed.query)]);
  const found: VocabularyItemV2[] = [];
  for (const term of FALLBACK_VOCAB) {
    if (known.has(term.raw)) continue;
    const sample = samples.find((item) => item.textZh.includes(term.raw));
    if (!sample) continue;
    found.push({
      id: stableId("voc", term.raw),
      raw: term.raw,
      normalizedZh: term.raw,
      normalizedEn: term.raw,
      type: term.type,
      source: "sample",
      sourceSampleId: sample.id,
      sourceQuoteZh: quoteAround(sample.textZh, term.raw),
      sourceQuoteEn: "",
      proposedQuery: term.query,
      gapZh: term.gapZh,
      gapEn: term.gapEn,
      broughtNewTheme: !plan.queryMatrix.some((seed) => seed.query.includes(term.raw)),
    });
    if (found.length >= 6) break;
  }
  return found;
}

async function proposeVocabulary(
  samples: SampleItemV2[],
  plan: ResearchPlanV2,
  existing: VocabularyItemV2[],
): Promise<VocabularyItemV2[]> {
  const fallback = fallbackVocabulary(samples, plan, existing);
  if (!hasLlm() || samples.length === 0) return fallback;
  const payload = samples.slice(0, 14).map((item) => ({ id: item.id, text: item.textZh.slice(0, 700) }));
  const prompt = [
    "You are a bilingual research assistant. Read the real Zhihu samples and propose vocabulary that the initial research plan did not include.",
    "Return ONLY JSON: {\"items\":[{\"raw\":\"原生表达\",\"normalizedZh\":\"规范化中文\",\"normalizedEn\":\"English gloss\",\"type\":\"population|scene|task|symptom|alternative|stance\",\"sourceSampleId\":\"id\",\"quote\":\"a short quote from that sample\",\"proposedQuery\":\"a Chinese Zhihu query that would find more of this\",\"gapZh\":\"which coverage gap it fills\",\"gapEn\":\"English gap description\"}]}.",
    "Rules: every item must cite an existing sourceSampleId and the quote must appear in that sample. Do not invent words not present in samples. Max 6 items. Do not repeat words already present in the plan or existing vocabulary.",
    `Existing vocabulary: ${JSON.stringify(existing.map((item) => item.raw))}`,
    `Plan queries: ${JSON.stringify(plan.queryMatrix.map((seed) => seed.query))}`,
    `Samples: ${JSON.stringify(payload)}`,
  ].join("\n");
  try {
    const raw = await completeJson<{ items?: unknown }>(prompt, { timeoutMs: 60000, maxTokens: 3500, retries: 1 });
    const items = Array.isArray(raw.items) ? raw.items : [];
    const out: VocabularyItemV2[] = [];
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const rawWord = typeof record.raw === "string" ? record.raw.trim() : "";
      const sourceId = typeof record.sourceSampleId === "string" ? record.sourceSampleId : "";
      const sample = samples.find((entry) => entry.id === sourceId);
      if (!rawWord || !sample) continue;
      const quote = typeof record.quote === "string" && record.quote.trim() ? record.quote.trim() : quoteAround(sample.textZh, rawWord);
      const known = new Set([...existing.map((entry) => entry.raw), ...plan.queryMatrix.map((seed) => seed.query)]);
      if (known.has(rawWord)) continue;
      const type = (["population", "scene", "task", "symptom", "alternative", "stance"] as VocabType[]).includes(record.type as VocabType)
        ? (record.type as VocabType)
        : "task";
      out.push({
        id: stableId("voc", rawWord),
        raw: rawWord,
        normalizedZh: typeof record.normalizedZh === "string" ? record.normalizedZh : rawWord,
        normalizedEn: typeof record.normalizedEn === "string" ? record.normalizedEn : rawWord,
        type,
        source: "sample",
        sourceSampleId: sample.id,
        sourceQuoteZh: quote,
        sourceQuoteEn: "",
        proposedQuery: typeof record.proposedQuery === "string" ? record.proposedQuery : `${rawWord} 自由职业`,
        gapZh: typeof record.gapZh === "string" ? record.gapZh : "补充该维度的真实表达",
        gapEn: typeof record.gapEn === "string" ? record.gapEn : "Add real language for this dimension",
        broughtNewTheme: !plan.queryMatrix.some((seed) => seed.query.includes(rawWord)),
      });
      if (out.length >= 6) break;
    }
    return out.length > 0 ? out : fallback;
  } catch {
    return fallback;
  }
}

function fallbackQueries(
  round: number,
  vocab: VocabularyItemV2[],
  plan: ResearchPlanV2,
  counterDone: boolean,
): QuerySeedV2[] {
  const existing = new Set(plan.queryMatrix.map((seed) => seed.query));
  const seeds: QuerySeedV2[] = [];
  for (const item of vocab) {
    if (!item.proposedQuery || existing.has(item.proposedQuery)) continue;
    seeds.push({
      id: "",
      query: item.proposedQuery,
      dimension: item.type === "alternative" ? "alternative" : item.type === "stance" ? "stance" : item.type === "population" ? "population" : "task",
      purposeZh: `补齐「${item.raw}」带来的覆盖缺口`,
      purposeEn: `Fill the coverage gap introduced by "${item.raw}"`,
      source: "sample_evidence",
      isCounterExample: false,
      triggerVocabularyId: item.id,
      triggerSampleId: item.sourceSampleId,
    });
    if (seeds.length >= 3) break;
  }
  if (round >= 1 && !counterDone) {
    const counter = plan.counterExampleDirectionsZh[0] || "反例";
    seeds.push({
      id: "",
      query: "自由职业 合同 没必要 熟人",
      dimension: "counter",
      purposeZh: `反例检索：${counter}`,
      purposeEn: "Counter-example retrieval: find cases where the problem does not hold",
      source: "model_prior",
      isCounterExample: true,
    });
  }
  return seeds.slice(0, 3);
}

async function proposeNextQueries(
  round: number,
  vocab: VocabularyItemV2[],
  samples: SampleItemV2[],
  plan: ResearchPlanV2,
  counterDone: boolean,
): Promise<QuerySeedV2[]> {
  const fallback = fallbackQueries(round, vocab, plan, counterDone);
  if (!hasLlm()) return fallback;
  const prompt = [
    "You are designing the next round of Zhihu queries for a qualitative product study.",
    "Return ONLY JSON: {\"queries\":[{\"query\":\"中文查询\",\"dimension\":\"population|scene|task|symptom|alternative|stance|counter\",\"purposeZh\":\"补齐哪个覆盖缺口\",\"purposeEn\":\"which gap it fills\",\"triggerVocabularyId\":\"optional id\",\"triggerSampleId\":\"optional id\",\"isCounterExample\":true|false}]}.",
    "Rules: 2-3 queries. Each must target a specific coverage gap, not a synonym. Use only vocabulary that appears in the provided vocabulary list or samples. Include exactly one counter-example query if counterDone is false.",
    `Plan queries so far: ${JSON.stringify(plan.queryMatrix.map((seed) => seed.query))}`,
    `Vocabulary: ${JSON.stringify(vocab.map((item) => ({ id: item.id, raw: item.raw, proposedQuery: item.proposedQuery })))}`,
    `Counter directions: ${JSON.stringify(plan.counterExampleDirectionsZh)}`,
    `Counter done: ${counterDone}`,
    `Recent sample ids: ${JSON.stringify(samples.slice(-8).map((item) => item.id))}`,
  ].join("\n");
  try {
    const raw = await completeJson<{ queries?: unknown }>(prompt, { timeoutMs: 55000, maxTokens: 2500, retries: 1 });
    const list = Array.isArray(raw.queries) ? raw.queries : [];
    const seeds: QuerySeedV2[] = [];
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const query = typeof record.query === "string" ? record.query.trim() : "";
      if (!query || plan.queryMatrix.some((seed) => seed.query === query)) continue;
      const dimension = (["population", "scene", "task", "symptom", "alternative", "stance", "counter"] as QueryDimension[]).includes(record.dimension as QueryDimension)
        ? (record.dimension as QueryDimension)
        : "task";
      seeds.push({
        id: "",
        query,
        dimension,
        purposeZh: typeof record.purposeZh === "string" ? record.purposeZh : "补齐覆盖缺口",
        purposeEn: typeof record.purposeEn === "string" ? record.purposeEn : "Fill a coverage gap",
        source: "sample_evidence",
        isCounterExample: record.isCounterExample === true || dimension === "counter",
        triggerVocabularyId: typeof record.triggerVocabularyId === "string" ? record.triggerVocabularyId : undefined,
        triggerSampleId: typeof record.triggerSampleId === "string" ? record.triggerSampleId : undefined,
      });
      if (seeds.length >= 3) break;
    }
    return seeds.length > 0 ? seeds : fallback;
  } catch {
    return fallback;
  }
}

function toSample(candidate: Candidate, index: number, windowStart: string, duplicate: boolean): SampleItemV2 {
  const text = textOf(candidate.content);
  const date = toIsoDate(candidate.content.publishTime);
  const flags = flagsFor(candidate.content, text, duplicate, windowStart);
  const included = !duplicate && !flags.stale;
  return {
    id: stableId("src", `${candidate.content.url || candidate.content.title}_${index}`),
    source: "zhihu_search",
    title: candidate.content.title,
    url: candidate.content.url,
    author: candidate.content.author || "匿名用户",
    contentType: candidate.content.contentType || "回答",
    textZh: clipText(text, 1600),
    textEn: "",
    excerptZh: clipText(candidate.content.text || candidate.content.title, 500),
    excerptEn: "",
    publishDate: date,
    queryRunId: candidate.queryRunId,
    round: candidate.round,
    query: candidate.query,
    purposeZh: candidate.purposeZh,
    purposeEn: candidate.purposeEn,
    sceneIds: [],
    sceneLabelsZh: [],
    sceneLabelsEn: [],
    populationZh: "",
    populationEn: "",
    stance: "unclear",
    flags,
    included,
    whyIncludedZh: duplicate
      ? "与前面的条目是同一链接，先搁置。"
      : flags.stale
        ? "早于研究时间窗，先搁置，避免把旧帖当成当前事实。"
        : `由第 ${candidate.round + 1} 轮查询「${candidate.query}」检索到：${candidate.purposeZh}。`,
    whyIncludedEn: duplicate
      ? "Same link as an earlier item; held out."
      : flags.stale
        ? "Older than the study time window; held out to avoid treating old posts as current facts."
        : `Retrieved by round ${candidate.round + 1} query "${candidate.query}": ${candidate.purposeEn}.`,
    codes: [],
    traces: [],
    supportFindingIds: [],
    refuteFindingIds: [],
    votes: candidate.content.votes,
    comments: candidate.content.comments,
  };
}

function buildCoverage(plan: ResearchPlanV2, sample: SampleItemV2[], vocab: VocabularyItemV2[]): CoverageRowV2[] {
  const included = sample.filter((item) => item.included);
  const termsFor = (type: VocabType, fallbackTerms: string[]) => {
    const discovered = vocab.filter((item) => item.type === type).map((item) => item.raw);
    return [...new Set([...fallbackTerms, ...discovered])];
  };
  const populationTerms = termsFor("population", POPULATION_TERMS);
  const sceneTerms = termsFor("scene", [...SCENE_TERMS, ...termsFor("task", []), ...termsFor("symptom", [])]);
  const altTerms = termsFor("alternative", ALT_TERMS);
  const stanceTerms = [...SUPPORT_TERMS, ...OPPOSE_TERMS];
  const row = (dimension: CoverageRowV2["dimension"], value: string, valueEn: string, terms: string[], noteZh?: string, noteEn?: string): CoverageRowV2 => {
    const itemIds = included.filter((item) => terms.some((term) => `${item.title}
${item.textZh}`.includes(term))).map((item) => item.id);
    return {
      dimension,
      value,
      valueEn,
      status: itemIds.length >= 2 ? "covered" : itemIds.length === 1 ? "partial" : "missing",
      itemIds,
      noteZh,
      noteEn,
    };
  };
  const rows: CoverageRowV2[] = [];
  for (const term of populationTerms.slice(0, 6)) rows.push(row("population", term, term, [term]));
  for (const term of sceneTerms.slice(0, 7)) rows.push(row("scene", term, term, [term]));
  const supports = included.filter((item) => SUPPORT_TERMS.some((term) => item.textZh.includes(term))).map((item) => item.id);
  const opposes = included.filter((item) => OPPOSE_TERMS.some((term) => item.textZh.includes(term))).map((item) => item.id);
  rows.push({
    dimension: "stance",
    value: "支持 / 反对 / 条件性",
    valueEn: "Support / oppose / conditional",
    status: supports.length >= 2 && opposes.length >= 2 ? "covered" : supports.length + opposes.length >= 2 ? "partial" : "missing",
    itemIds: [...new Set([...supports, ...opposes])],
    noteZh: `支持类 ${supports.length} 条；反对/条件类 ${opposes.length} 条。`,
    noteEn: `${supports.length} supportive; ${opposes.length} opposing/conditional.`,
  });
  for (const term of altTerms.slice(0, 5)) rows.push(row("alternative", term, term, [term]));
  const stale = sample.filter((item) => !item.included && item.flags.stale).length;
  const recent = included.filter((item) => item.publishDate !== "unknown").length;
  rows.push({
    dimension: "time",
    value: "时间窗",
    valueEn: "Time window",
    status: stale === 0 && recent >= 4 ? "covered" : recent >= 2 ? "partial" : "missing",
    itemIds: included.slice(0, 8).map((item) => item.id),
    noteZh: `时间窗起点 ${plan.budget.timeWindowMonths} 个月前；${stale} 条旧帖已搁置。`,
    noteEn: `Window starts ${plan.budget.timeWindowMonths} months ago; ${stale} stale posts held out.`,
  });
  return rows;
}

function missingCoverage(coverage: CoverageRowV2[]): CoverageRowV2[] {
  return coverage.filter((row) => row.status !== "covered");
}

export async function runAdaptiveExploration(
  inputPlan: ResearchPlanV2,
  port: ExplorePort,
  onProgress?: (progress: ExploreProgress) => void,
): Promise<ExplorationResult> {
  let plan = inputPlan;
  const runs: QueryRunV2[] = [];
  const candidates: Candidate[] = [];
  const sample: SampleItemV2[] = [];
  const vocabulary: VocabularyItemV2[] = [];
  const retrieval: RetrievalEntry[] = [];
  const seen = new Set<string>();
  const windowStartDate = new Date();
  windowStartDate.setUTCMonth(windowStartDate.getUTCMonth() - plan.budget.timeWindowMonths);
  const windowStart = windowStartDate.toISOString().slice(0, 10);
  let allTerms = planTerms(plan);
  let candidatesScanned = 0;
  let counterDone = plan.queryMatrix.some((seed) => seed.dimension === "counter");
  let round = 0;
  let stopReasonZh = "达到研究预算";
  let stopReasonEn = "Reached the research budget";

  const runQuery = async (seed: QuerySeedV2, currentRound: number): Promise<QueryRunV2 | null> => {
    if (runs.some((run) => run.query === seed.query)) return null;
    const runId = stableId("run", `${currentRound}_${seed.query}_${runs.length}`);
    let items: ZhihuContent[] = [];
    let error: string | undefined;
    try {
      items = await port.search(seed.query, 5);
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "SEARCH_FAILED";
    }
    const resultCount = items.length;
    let deduped = 0;
    let included = 0;
    let excluded = 0;
    for (const item of items) {
      candidatesScanned += 1;
      if (candidates.length >= plan.budget.maxCandidates) break;
      const key = dedupeKey(item.url, item.title);
      const duplicate = seen.has(key);
      if (duplicate) deduped += 1;
      seen.add(key);
      if (!item.title || !item.url) continue;
      const candidate: Candidate = {
        content: item,
        queryRunId: runId,
        round: currentRound,
        query: seed.query,
        purposeZh: seed.purposeZh,
        purposeEn: seed.purposeEn,
      };
      candidates.push(candidate);
      const sampleItem = toSample(candidate, sample.length, windowStart, duplicate);
      const relevant = isRelevant(item, allTerms);
      if (!relevant) {
        excluded += 1;
        continue;
      }
      if (!sampleItem.included) excluded += 1;
      else included += 1;
      sample.push(sampleItem);
    }
    const run: QueryRunV2 = {
      id: runId,
      round: currentRound,
      query: seed.query,
      dimension: seed.dimension,
      purposeZh: seed.purposeZh,
      purposeEn: seed.purposeEn,
      triggerSampleId: seed.triggerSampleId,
      triggerVocabularyId: seed.triggerVocabularyId,
      planVersion: plan.version,
      resultCount,
      dedupedCount: deduped,
      includedCount: included,
      excludedCount: excluded,
      error,
      executedAt: new Date().toISOString(),
    };
    runs.push(run);
    retrieval.push({ kind: "zhihu_search", query: seed.query, resultCount, error });
    onProgress?.({
      step: seed.isCounterExample ? "counter" : currentRound === 0 ? "seed" : "expand",
      messageZh: `第 ${currentRound + 1} 轮 · ${seed.query}`,
      messageEn: `Round ${currentRound + 1} · ${seed.query}`,
      query: seed.query,
    });
    await sleep(250);
    return run;
  };

  // Round 0: initial seeds.
  const initialSeeds = plan.queryMatrix.slice(0, plan.budget.seedQueries);
  for (const seed of initialSeeds) {
    if (runs.length >= plan.budget.maxQueries) break;
    await runQuery(seed, 0);
  }
  round = 1;

  // Round 1: vocabulary from real samples.
  let newVocabulary = await proposeVocabulary(sample, plan, vocabulary);
  vocabulary.push(...newVocabulary);
  if (newVocabulary.length > 0) {
    const seeds = await proposeNextQueries(1, newVocabulary, sample, plan, counterDone);
    if (seeds.length > 0) {
      plan = extendPlan(plan, seeds, "第一轮检索发现新表达，追加查询", "Round-one retrieval surfaced new expressions; added follow-up queries");
      const fresh = plan.queryMatrix.slice(plan.queryMatrix.length - seeds.length);
      for (const seed of fresh) {
        if (runs.length >= plan.budget.maxQueries) break;
        await runQuery({ ...seed, isCounterExample: seed.isCounterExample }, 1);
      }
      allTerms = [...new Set([...allTerms, ...newVocabulary.map((item) => item.raw)])];
      if (fresh.some((seed) => seed.isCounterExample)) counterDone = true;
    }
  }
  round = 2;

  // Round 2: counter-example / largest gap.
  newVocabulary = await proposeVocabulary(sample.slice(-14), plan, vocabulary);
  vocabulary.push(...newVocabulary.filter((item) => !vocabulary.some((existing) => existing.raw === item.raw)));
  const coverageBefore = buildCoverage(plan, sample, vocabulary);
  const gaps = missingCoverage(coverageBefore);
  if (runs.length < plan.budget.maxQueries && (gaps.length > 0 || !counterDone)) {
    const seeds = await proposeNextQueries(2, newVocabulary, sample, plan, counterDone);
    const counterSeeds = fallbackQueries(2, [], plan, counterDone).filter((seed) => seed.isCounterExample);
    const withCounter = counterDone ? seeds : [...counterSeeds, ...seeds].slice(0, 3);
    if (withCounter.length > 0) {
      const before = plan.queryMatrix.length;
      plan = extendPlan(plan, withCounter, "第二轮补齐覆盖缺口并执行反例检索", "Round two fills coverage gaps and runs counter-example retrieval");
      const fresh = plan.queryMatrix.slice(before);
      for (const seed of fresh) {
        if (runs.length >= plan.budget.maxQueries) break;
        await runQuery(seed, 2);
      }
      allTerms = [...new Set([...allTerms, ...newVocabulary.map((item) => item.raw)])];
      if (withCounter.some((seed) => seed.isCounterExample)) counterDone = true;
    }
  }

  // Hot list is a scan only; include only if clearly relevant.
  let hotScan: HotScan = { scanned: 0, included: 0, droppedTitles: [] };
  try {
    const hot = await port.hot(30);
    hotScan = { scanned: hot.length, included: 0, droppedTitles: [] };
    for (const item of hot) {
      if (!item.title || !item.url) continue;
      const text = textOf(item);
      if (!isRelevant(item, allTerms)) {
        hotScan.droppedTitles.push(item.title);
        continue;
      }
      const key = dedupeKey(item.url, item.title);
      if (seen.has(key)) continue;
      seen.add(key);
      const runId = stableId("run", `hot_${hotScan.included}`);
      const sampleItem: SampleItemV2 = {
        ...toSample({ content: item, queryRunId: runId, round: 0, query: "知乎热榜", purposeZh: "核对当天站内议程里是否有相关讨论", purposeEn: "Check whether today's Zhihu agenda contains relevant discussion" }, sample.length, windowStart, false),
        source: "hot_list",
      };
      sampleItem.included = isRelevant(item, allTerms);
      if (sampleItem.included) {
        hotScan.included += 1;
        sample.push(sampleItem);
        candidates.push({ content: item, queryRunId: runId, round: 0, query: "知乎热榜", purposeZh: sampleItem.purposeZh, purposeEn: sampleItem.purposeEn });
      }
    }
    retrieval.push({ kind: "hot_list", query: "热榜", resultCount: hotScan.scanned });
  } catch (error) {
    retrieval.push({ kind: "hot_list", query: "热榜", resultCount: 0, error: error instanceof Error ? error.message : "HOT_LIST_FAILED" });
  }

  // Zhida is auxiliary only.
  let auxiliary: ExplorationResult["auxiliary"] = { text: "", error: "ZHIDA_SKIPPED", usedAsFinding: false };
  const titles = sample.slice(0, 24).map((item) => item.title);
  if (titles.length > 0) {
    try {
      const text = await port.zhida(`下面是已经检索到的知乎标题。请只列出搜索词可能漏掉的使用场景，用简短中文。不要判断会不会购买，不要做产品结论。标题：${titles.join(" / ")}`);
      auxiliary = { text, usedAsFinding: false };
      retrieval.push({ kind: "zhida", query: "gap hint", resultCount: text ? 1 : 0 });
    } catch (error) {
      auxiliary = { text: "", error: error instanceof Error ? error.message : "ZHIDA_FAILED", usedAsFinding: false };
      retrieval.push({ kind: "zhida", query: "gap hint", resultCount: 0, error: auxiliary.error });
    }
  }

  const coverage = buildCoverage(plan, sample, vocabulary);
  const included = sample.filter((item) => item.included);
  if (runs.length >= plan.budget.maxQueries) {
    stopReasonZh = "达到研究预算（查询次数或候选样本上限），本次预算内主题趋于稳定。";
    stopReasonEn = "Reached the research budget (query or candidate cap); themes stabilized within this budget.";
  } else if (vocabulary.length === 0) {
    stopReasonZh = "连续检索没有出现新的重要主题，按停止规则结束。";
    stopReasonEn = "No important new themes appeared in the latest round; stopped by rule.";
  } else if (coverage.every((row) => row.status === "covered")) {
    stopReasonZh = "主要研究维度已覆盖，继续查询只增加重复证据，按停止规则结束。";
    stopReasonEn = "Main research dimensions are covered; further queries would add duplicates. Stopped by rule.";
  } else {
    stopReasonZh = "本次预算内主题趋于稳定；仍有覆盖缺口，已在质检中标出。";
    stopReasonEn = "Themes stabilized within this budget; remaining coverage gaps are disclosed in Quality.";
  }

  onProgress?.({ step: "done", messageZh: stopReasonZh, messageEn: stopReasonEn });
  return {
    plan,
    rounds: round + 1,
    runs,
    candidates,
    sample,
    vocabulary,
    coverage,
    retrieval,
    hotScan,
    auxiliary,
    candidatesScanned,
    stopReasonZh,
    stopReasonEn,
  };
}
