import { hasLlm, completeJson } from "./llm";
import type {
  BriefV2,
  BudgetV2,
  MethodGateV2,
  PlanVersionV2,
  QueryDimension,
  QuerySeedV2,
  ResearchPlanV2,
  ResearchQuestionV2,
} from "./types";

const DEFAULT_BUDGET: BudgetV2 = {
  seedQueries: 6,
  maxRounds: 2,
  perRound: 3,
  maxQueries: 12,
  maxCandidates: 60,
  timeWindowMonths: 24,
};

export const MAIN_CASE_BRIEF =
  "I'm a solo founder outside China. I want to build an AI contract and payment-collection tool for Chinese freelancers (designers, developers, writers, consultants). They struggle with quoting, scope changes, acceptance, and late payment. I need to know whether this is a real pain worth building, what scenarios matter, and what I should validate first.";

function nowIso(): string {
  return new Date().toISOString();
}

function q(
  index: number,
  query: string,
  dimension: QueryDimension,
  purposeZh: string,
  purposeEn: string,
  isCounterExample = false,
): QuerySeedV2 {
  return {
    id: `seed_${index}`,
    query,
    dimension,
    purposeZh,
    purposeEn,
    source: "model_prior",
    isCounterExample,
  };
}

function mainCasePlan(briefText: string, language: "zh" | "en"): ResearchPlanV2 {
  const queries = [
    q(1, "自由职业 接单 合同 尾款", "task", "找到自由职业者接单、签合同、收尾款的完整任务链", "Find the end-to-end task chain of taking work, signing and collecting final payment"),
    q(2, "私活 改需求 加钱", "symptom", "找到范围变更、加钱扯皮的原生表达", "Find native expressions for scope changes and renegotiation"),
    q(3, "外包 验收 尾款 不给", "scene", "找到验收和尾款拖欠的具体场景", "Find acceptance and late-payment scenes"),
    q(4, "约稿 定金 尾款 拖稿", "task", "找到创作者接稿、定金、拖稿与尾款的经历", "Find creators' experiences with deposits, delays and final payment"),
    q(5, "自由职业 合同 模板 电子签", "alternative", "找到合同模板、电子签等现有替代方案", "Find existing alternatives such as templates and e-signature"),
    q(6, "接私活 合同 有必要吗", "stance", "找到认为合同有必要/没必要的条件性判断", "Find conditional views on whether contracts are necessary"),
  ];
  return {
    id: "plan_main_freelancer_contract",
    version: 1,
    parentVersion: null,
    createdAt: nowIso(),
    confirmed: false,
    brief: {
      raw: briefText,
      language,
      product: "AI contract and payment-collection tool for Chinese freelancers",
      targetUser: "Chinese freelancers: designers, developers, writers, consultants",
      market: "Mainland China",
      hypotheses: [
        "The hardest part is not writing a contract, but the chain of quoting, scope changes, acceptance and collecting final payment.",
        "Templates, e-signature and platform guarantees do not solve the actual disputes, so there is room for a tool.",
        "Freelancers may pay to reduce collection risk, but willingness to pay cannot be proven by Zhihu posts.",
      ],
      biggestRisk: "The pain may be real but not frequent or valuable enough to build a standalone product.",
    },
    decisionZh: "海外 OPC 是否应该投入开发一款面向中国自由职业者的 AI 合同与回款工具，以及首版应优先解决哪一类问题。",
    decisionEn: "Should a global OPC invest in building an AI contract and payment-collection tool for Chinese freelancers, and which problem should the first version solve?",
    targetMarketZh: "中国大陆自由职业者市场",
    targetMarketEn: "Mainland China freelancer market",
    targetUsersZh: ["独立设计师", "独立开发者", "自由撰稿人 / 插画师", "独立顾问"],
    targetUsersEn: ["Independent designers", "Independent developers", "Freelance writers / illustrators", "Independent consultants"],
    productHypothesesZh: [
      "自由职业者最痛的不是写合同，而是报价、改需求、验收和尾款回收的链条。",
      "合同模板、电子签和平台担保不足以解决实际纠纷，因此存在工具机会。",
      "自由职业者可能愿意为降低回款风险付费，但付费意愿不能由知乎讨论证明。",
    ],
    productHypothesesEn: [
      "The hardest part is not writing a contract, but the chain of quoting, scope changes, acceptance and collecting final payment.",
      "Templates, e-signature and platform guarantees do not solve the actual disputes, so there is room for a tool.",
      "Freelancers may pay to reduce collection risk, but willingness to pay cannot be proven by Zhihu posts.",
    ],
    researchQuestions: [
      {
        id: "rq_1",
        questionZh: "哪些自由职业者在哪些接单环节遇到合同与回款问题？",
        questionEn: "Which freelancers encounter contract and payment problems, and at which stages?",
        hypothesisZh: "问题集中在报价、改需求、验收和尾款四个环节。",
        hypothesisEn: "Problems cluster around quoting, scope changes, acceptance and final payment.",
        disconfirmingSignalZh: "如果多数人只在单次纠纷中提到，且没有重复出现的链条，则假设需要收窄。",
        disconfirmingSignalEn: "If problems appear only in isolated disputes and no repeated chain emerges, narrow the hypothesis.",
        dimension: "population",
      },
      {
        id: "rq_2",
        questionZh: "报价、改需求、验收和尾款的具体失败模式是什么？",
        questionEn: "What are the concrete failure modes in quoting, scope changes, acceptance and final payment?",
        hypothesisZh: "失败模式包括范围蔓延、验收标准模糊、尾款拖延和证据缺失。",
        hypothesisEn: "Failure modes include scope creep, vague acceptance criteria, late payment and missing evidence.",
        disconfirmingSignalZh: "如果用户认为这些只是偶发的人际问题，而不是流程问题，工具机会需要重新定义。",
        disconfirmingSignalEn: "If users see these as rare interpersonal issues rather than process problems, the tool opportunity needs reframing.",
        dimension: "task",
      },
      {
        id: "rq_3",
        questionZh: "自由职业者现在用什么替代方案，为什么不满意？",
        questionEn: "What alternatives do freelancers use today, and why are they unsatisfied?",
        hypothesisZh: "替代方案是合同模板、电子签、平台担保、熟人合作和口头约定；不满意集中在执行与追款。",
        hypothesisEn: "Alternatives are templates, e-signature, platform guarantees, trusted contacts and verbal agreements; dissatisfaction centres on enforcement and collection.",
        disconfirmingSignalZh: "如果现有替代方案已经被认为足够，工具价值需要转向别的环节。",
        disconfirmingSignalEn: "If existing alternatives are already seen as sufficient, the value should move to another step.",
        dimension: "alternative",
      },
      {
        id: "rq_4",
        questionZh: "哪些人认为合同/工具必要或不必要？条件是什么？",
        questionEn: "Who considers contracts or tools necessary or unnecessary, and under what conditions?",
        hypothesisZh: "高频接单、金额较大、与陌生甲方合作的人更认为必要；熟人合作和小额单可能相反。",
        hypothesisEn: "Those with frequent, higher-value work and unfamiliar clients see more need; trusted contacts and small jobs may see less.",
        disconfirmingSignalZh: "如果条件性判断与金额/频率无关，产品定位需要重新考虑。",
        disconfirmingSignalEn: "If conditional views are unrelated to deal size or frequency, reconsider the positioning.",
        dimension: "stance",
      },
      {
        id: "rq_5",
        questionZh: "是否存在问题不严重、现有方案足够或工具反而添麻烦的反例？",
        questionEn: "Are there counter-examples where the problem is mild, alternatives suffice, or tools add friction?",
        hypothesisZh: "会存在少量反例，尤其在熟客、小额、长期合作场景。",
        hypothesisEn: "A small number of counter-examples likely exist, especially with repeat clients, small jobs and long-term relationships.",
        disconfirmingSignalZh: "如果反例占主导，应该放弃或大幅修改产品假设。",
        disconfirmingSignalEn: "If counter-examples dominate, abandon or substantially change the product hypothesis.",
        dimension: "counter",
      },
    ],
    methodGate: {
      fit: "fit",
      canExploreZh: ["自由职业者的接单场景与任务链", "报价、改需求、验收、尾款的原生表达", "合同模板、电子签、平台担保等替代方案", "不同人群的支持、反对和条件性判断", "反例与问题不成立的场景"],
      canExploreEn: ["Freelancers' task chain and scenes", "Native language for quoting, scope changes, acceptance and final payment", "Alternatives such as templates, e-signature and platform guarantees", "Support, opposition and conditional views across populations", "Counter-examples and cases where the problem does not hold"],
      needsOtherDataZh: ["付费意愿与价格敏感度（访谈/价格测试）", "企业采购与合同审批流程（内部数据/采购访谈）", "实际转化率与留存（产品行为数据）"],
      needsOtherDataEn: ["Willingness to pay and price sensitivity (interviews / price tests)", "Enterprise procurement and contract approval (internal data / buyer interviews)", "Actual conversion and retention (product analytics)"],
      cannotProveZh: ["中国自由职业者的整体比例", "市场规模和购买率", "因果结论", "法律合规意见"],
      cannotProveEn: ["The overall share of Chinese freelancers", "Market size and purchase rates", "Causal conclusions", "Legal or compliance advice"],
      allowedOutput: "directional",
      reasonsZh: ["目标用户在中国大陆，知乎是中文公开讨论的合理入口。", "问题属于经验、场景、替代方案和态度类，适合定性探索。", "付费意愿、采购流程和市场比例需要其他证据。"],
      reasonsEn: ["The target users are in mainland China, so Zhihu is a reasonable entry point for Chinese public discussion.", "The questions are about experience, scenes, alternatives and attitudes, suitable for qualitative exploration.", "Willingness to pay, procurement and market size need other evidence."],
      recommendedTier: "L0_public_ugc",
    },
    queryMatrix: queries,
    counterExampleDirectionsZh: ["寻找认为合同/工具没必要、熟人合作足够的反例", "寻找问题只影响体验、不影响接单或回款的条件", "寻找用了模板/电子签仍然出问题或反而添麻烦的经历"],
    counterExampleDirectionsEn: ["Find counter-examples where contracts or tools are unnecessary and trusted relationships suffice", "Find conditions where the problem affects experience but not taking work or getting paid", "Find cases where templates or e-signature still fail or add friction"],
    budget: DEFAULT_BUDGET,
    inclusionZh: ["描述了自由职业接单、报价、合同、改需求、验收或回款的具体经历/观点", "由计划查询或反例查询检索到"],
    inclusionEn: ["Describes a concrete experience or view on freelancing, quoting, contracts, scope changes, acceptance or payment", "Retrieved by a planned or counter-example query"],
    exclusionZh: ["与自由职业合同/回款无关", "纯广告、模板下载页或课程导流", "重复链接", "没有具体经历或观点的泛泛回答"],
    exclusionEn: ["Unrelated to freelancer contracts or payment", "Pure ads, template-download pages or course funnels", "Duplicate links", "Generic answers without concrete experience or views"],
    deliverablesZh: ["双语 Decision Memo", "研究词表（含每个新词来源）", "六类发现与证据附录", "下一步访谈提纲与证伪条件"],
    deliverablesEn: ["Bilingual Decision Memo", "Research vocabulary with sources", "Six finding categories and evidence appendix", "Next-step interview guide and falsification conditions"],
    versions: [
      {
        version: 1,
        parentVersion: null,
        createdAt: nowIso(),
        reasonZh: "初始研究计划",
        reasonEn: "Initial research plan",
        querySeeds: queries,
      },
    ],
  };
}

function genericFallbackPlan(briefText: string, language: "zh" | "en"): ResearchPlanV2 {
  const zh = /[\u4e00-\u9fff]/.test(briefText);
  const marketZh = zh ? "待确认（默认中国大陆）" : "Unspecified / global";
  const marketEn = zh ? "To be confirmed (mainland China by default)" : "Unspecified / global";
  const queries = [
    q(1, zh ? "产品 用户 需求 痛点" : "产品 用户 需求 痛点", "task", "找到用户任务与痛点", "Find user tasks and pains"),
    q(2, "用户 替代方案 现有工具", "alternative", "找到现有替代方案与不满", "Find current alternatives and dissatisfaction"),
    q(3, "竞品 评价 吐槽", "stance", "找到支持、反对和条件性评价", "Find support, opposition and conditional views"),
    q(4, "为什么不买 没必要", "counter", "寻找反例和不需要的理由", "Find counter-examples and reasons not to buy", true),
  ];
  const plan = mainCasePlan(briefText, language);
  plan.id = "plan_generic";
  plan.decisionZh = zh ? briefText.slice(0, 180) : "是否应该继续推进这个产品想法，以及首版优先解决什么问题。";
  plan.decisionEn = zh ? "Should this product idea move forward, and what should the first version solve?" : briefText.slice(0, 220);
  plan.targetMarketZh = marketZh;
  plan.targetMarketEn = marketEn;
  plan.targetUsersZh = ["待确认的目标用户"];
  plan.targetUsersEn = ["Target users to be confirmed"];
  plan.productHypothesesZh = ["用户存在值得解决的问题，但需要证据确认问题的频率和强度。"];
  plan.productHypothesesEn = ["A worthwhile problem may exist, but its frequency and intensity need evidence."];
  plan.researchQuestions = plan.researchQuestions.slice(0, 3);
  plan.queryMatrix = queries;
  plan.versions = [{ version: 1, parentVersion: null, createdAt: nowIso(), reasonZh: "初始研究计划", reasonEn: "Initial research plan", querySeeds: queries }];
  plan.counterExampleDirectionsZh = ["寻找认为问题不存在、现有方案足够或工具添麻烦的反例"];
  plan.counterExampleDirectionsEn = ["Find counter-examples where the problem does not exist, current alternatives suffice, or tools add friction"];
  plan.methodGate = evaluateMethodGate(plan);
  return plan;
}

export function evaluateMethodGate(plan: Pick<ResearchPlanV2, "targetMarketZh" | "targetMarketEn" | "decisionZh" | "decisionEn">): MethodGateV2 {
  const market = `${plan.targetMarketZh} ${plan.targetMarketEn}`.toLowerCase();
  const decision = `${plan.decisionZh} ${plan.decisionEn}`.toLowerCase();
  const chinaFacing = /中国|中文|大陆|国内|china|chinese|mainland/.test(market);
  const overseas = /north america|united states|europe|japan|global|overseas|美国|欧洲|日本|海外|北美/.test(market);
  const enterprise = /企业|采购|b2b|enterprise|procurement|buyer committee/.test(decision);
  const quantitative = /市场规模|购买率|付费|定价|价格|market size|purchase|pricing|willingness/.test(decision);
  const fit = chinaFacing && !enterprise ? "fit" : chinaFacing ? "partial" : overseas ? "mismatch" : "partial";
  const allowedOutput = fit === "fit" && !quantitative ? "directional" : "hypotheses_only";
  const reasonsZh = [
    chinaFacing ? "目标市场是中国大陆，知乎是中文公开讨论的合理入口。" : overseas ? "目标市场在海外，中文知乎不是当地用户的观察入口；只能作为海外华人或中国用户侧的假设来源。" : "目标市场不是中文知乎的完整观察对象；中文讨论只能作为部分用户的假设来源。",
    enterprise ? "决策涉及企业采购，公开个人发帖不能代表采购委员会。" : "决策属于用户经验、场景和替代方案类，适合定性探索。",
    quantitative ? "决策涉及付费/定价/市场比例，知乎讨论不能证明这些结论。" : "知乎讨论可以帮助收窄问题，但不能证明整体比例。",
  ];
  const reasonsEn = [
    chinaFacing ? "The target market is mainland China, so Zhihu is a reasonable entry point for Chinese public discussion." : overseas ? "The target market is overseas; Chinese Zhihu is not an entry point to local users and can only support hypotheses about overseas Chinese or Chinese-side users." : "The target market is not fully observable on Chinese Zhihu; Chinese posts can only be a partial hypothesis source.",
    enterprise ? "The decision involves enterprise procurement; public individual posts do not represent a buying committee." : "The decision is about user experience, scenes and alternatives, suitable for qualitative exploration.",
    quantitative ? "The decision involves willingness to pay, pricing or market ratios; Zhihu posts cannot prove these." : "Zhihu posts can narrow the problem but cannot prove population-level ratios.",
  ];
  return {
    fit,
    canExploreZh: ["用户经验、使用场景和任务链", "报价、改需求、验收、回款等具体问题", "现有替代方案、不满和条件性判断", "反例、分歧和不适用场景"],
    canExploreEn: ["User experience, scenes and task chains", "Concrete problems in quoting, scope changes, acceptance and payment", "Current alternatives, dissatisfaction and conditional views", "Counter-examples, disagreements and non-applicable cases"],
    needsOtherDataZh: ["付费意愿与价格敏感度", "企业采购与审批流程", "实际转化率、留存和市场规模"],
    needsOtherDataEn: ["Willingness to pay and price sensitivity", "Enterprise procurement and approval", "Actual conversion, retention and market size"],
    cannotProveZh: ["整体人群比例、市场规模和购买率", "因果结论", "法律或合规意见"],
    cannotProveEn: ["Population ratios, market size and purchase rates", "Causal conclusions", "Legal or compliance advice"],
    allowedOutput,
    reasonsZh,
    reasonsEn,
    recommendedTier: "L0_public_ugc",
  };
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const out = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
  return out.length > 0 ? out : fallback;
}

function normalizeDimension(value: unknown): QueryDimension {
  const allowed: QueryDimension[] = ["population", "scene", "task", "symptom", "alternative", "stance", "counter"];
  return typeof value === "string" && allowed.includes(value as QueryDimension) ? (value as QueryDimension) : "task";
}

function normalizeSeeds(value: unknown, fallback: QuerySeedV2[]): QuerySeedV2[] {
  if (!Array.isArray(value)) return fallback;
  const seeds: QuerySeedV2[] = [];
  for (const raw of value.slice(0, DEFAULT_BUDGET.seedQueries)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const query = asString(item.query, "");
    if (!query) continue;
    seeds.push({
      id: `seed_${seeds.length + 1}`,
      query,
      dimension: normalizeDimension(item.dimension),
      purposeZh: asString(item.purposeZh, "补充该维度的真实讨论"),
      purposeEn: asString(item.purposeEn, "Find real discussion for this dimension"),
      source: "model_prior",
      isCounterExample: item.isCounterExample === true,
    });
  }
  return seeds.length >= 4 ? seeds : fallback;
}

function normalizeQuestions(value: unknown, fallback: ResearchQuestionV2[]): ResearchQuestionV2[] {
  if (!Array.isArray(value)) return fallback;
  const questions: ResearchQuestionV2[] = [];
  for (const raw of value.slice(0, 6)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const questionZh = asString(item.questionZh ?? item.question, "");
    if (!questionZh) continue;
    questions.push({
      id: `rq_${questions.length + 1}`,
      questionZh,
      questionEn: asString(item.questionEn, questionZh),
      hypothesisZh: asString(item.hypothesisZh, "需要证据验证这个假设。"),
      hypothesisEn: asString(item.hypothesisEn, "This hypothesis needs evidence."),
      disconfirmingSignalZh: asString(item.disconfirmingSignalZh, "如果证据不支持，则收窄或放弃这个假设。"),
      disconfirmingSignalEn: asString(item.disconfirmingSignalEn, "If evidence does not support it, narrow or drop the hypothesis."),
      dimension: normalizeDimension(item.dimension),
    });
  }
  return questions.length >= 3 ? questions : fallback;
}

function normalizePlan(raw: unknown, fallback: ResearchPlanV2, briefText: string, language: "zh" | "en"): ResearchPlanV2 {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const brief = value.brief && typeof value.brief === "object" ? (value.brief as Record<string, unknown>) : {};
  const plan: ResearchPlanV2 = {
    ...fallback,
    id: fallback.id,
    createdAt: nowIso(),
    brief: {
      raw: briefText,
      language,
      product: asString(brief.product, fallback.brief.product),
      targetUser: asString(brief.targetUser, fallback.brief.targetUser),
      market: asString(brief.market, fallback.brief.market),
      hypotheses: asStringArray(brief.hypotheses, fallback.brief.hypotheses),
      biggestRisk: asString(brief.biggestRisk, fallback.brief.biggestRisk),
    },
    decisionZh: asString(value.decisionZh, fallback.decisionZh),
    decisionEn: asString(value.decisionEn, fallback.decisionEn),
    targetMarketZh: asString(value.targetMarketZh, fallback.targetMarketZh),
    targetMarketEn: asString(value.targetMarketEn, fallback.targetMarketEn),
    targetUsersZh: asStringArray(value.targetUsersZh, fallback.targetUsersZh),
    targetUsersEn: asStringArray(value.targetUsersEn, fallback.targetUsersEn),
    productHypothesesZh: asStringArray(value.productHypothesesZh, fallback.productHypothesesZh),
    productHypothesesEn: asStringArray(value.productHypothesesEn, fallback.productHypothesesEn),
    researchQuestions: normalizeQuestions(value.researchQuestions, fallback.researchQuestions),
    queryMatrix: normalizeSeeds(value.seedQueries, fallback.queryMatrix),
    counterExampleDirectionsZh: asStringArray(value.counterExampleDirectionsZh, fallback.counterExampleDirectionsZh),
    counterExampleDirectionsEn: asStringArray(value.counterExampleDirectionsEn, fallback.counterExampleDirectionsEn),
    inclusionZh: asStringArray(value.inclusionZh, fallback.inclusionZh),
    inclusionEn: asStringArray(value.inclusionEn, fallback.inclusionEn),
    exclusionZh: asStringArray(value.exclusionZh, fallback.exclusionZh),
    exclusionEn: asStringArray(value.exclusionEn, fallback.exclusionEn),
    deliverablesZh: asStringArray(value.deliverablesZh, fallback.deliverablesZh),
    deliverablesEn: asStringArray(value.deliverablesEn, fallback.deliverablesEn),
    budget: { ...DEFAULT_BUDGET, ...(fallback.budget ?? {}) },
  };
  plan.methodGate = evaluateMethodGate(plan);
  plan.versions = [
    {
      version: 1,
      parentVersion: null,
      createdAt: plan.createdAt,
      reasonZh: "初始研究计划",
      reasonEn: "Initial research plan",
      querySeeds: plan.queryMatrix,
    },
  ];
  return plan;
}

export async function createResearchPlan(briefText: string, language: "zh" | "en"): Promise<ResearchPlanV2> {
  const text = briefText.trim();
  const isMain = /freelanc|自由职业|合同|回款|contract|payment/i.test(text);
  const fallback = isMain ? mainCasePlan(text, language) : genericFallbackPlan(text, language);
  if (!hasLlm()) return fallback;

  const prompt = [
    "You are a senior product researcher designing a Zhihu-based qualitative study.",
    "The user brief may be English; the research plan must contain Chinese queries for Zhihu.",
    "Return ONLY JSON with these keys: brief{product,targetUser,market,hypotheses,biggestRisk}, decisionZh, decisionEn, targetMarketZh, targetMarketEn, targetUsersZh, targetUsersEn, productHypothesesZh, productHypothesesEn, researchQuestions[{questionZh,questionEn,hypothesisZh,hypothesisEn,disconfirmingSignalZh,disconfirmingSignalEn,dimension}], seedQueries[{query,dimension,purposeZh,purposeEn,isCounterExample}], counterExampleDirectionsZh, counterExampleDirectionsEn, inclusionZh, inclusionEn, exclusionZh, exclusionEn, deliverablesZh, deliverablesEn.",
    "Rules:",
    "- 4-6 seed queries, each from a DIFFERENT dimension (population/scene/task/symptom/alternative/stance), not a synonym list and not a cartesian product.",
    "- Queries must be Chinese and likely to surface first-hand accounts on Zhihu.",
    "- Include at least one stance query and one counter-example direction.",
    "- Unknown/ambiguous fields should be phrased as hypotheses, not facts.",
    "- Do not claim market size, purchase rates or causal conclusions.",
    `User brief (${language}): ${text}`,
  ].join("\n");

  try {
    const raw = await completeJson<Record<string, unknown>>(prompt, { timeoutMs: 40000, maxTokens: 7000, retries: 0 });
    return normalizePlan(raw, fallback, text, language);
  } catch {
    return fallback;
  }
}

export function extendPlan(plan: ResearchPlanV2, seeds: QuerySeedV2[], reasonZh: string, reasonEn: string): ResearchPlanV2 {
  const existing = new Set(plan.queryMatrix.map((seed) => seed.query));
  const fresh = seeds.filter((seed) => seed.query.trim() && !existing.has(seed.query)).slice(0, plan.budget.maxQueries - plan.queryMatrix.length);
  if (fresh.length === 0) return plan;
  const version = plan.version + 1;
  const normalized = fresh.map((seed, index) => ({
    ...seed,
    id: `seed_v${version}_${index + 1}`,
    source: seed.source === "model_prior" ? "sample_evidence" as const : seed.source,
  }));
  const queryMatrix = [...plan.queryMatrix, ...normalized];
  const versionEntry: PlanVersionV2 = {
    version,
    parentVersion: plan.version,
    createdAt: nowIso(),
    reasonZh,
    reasonEn,
    querySeeds: normalized,
  };
  return {
    ...plan,
    version,
    parentVersion: plan.version,
    queryMatrix,
    versions: [...plan.versions, versionEntry],
    changeReasonZh: reasonZh,
    changeReasonEn: reasonEn,
  };
}

export function confirmPlan(plan: ResearchPlanV2): ResearchPlanV2 {
  return { ...plan, confirmed: true, confirmedAt: nowIso() };
}
