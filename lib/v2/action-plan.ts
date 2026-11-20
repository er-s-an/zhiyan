import type { DecisionBriefV21 } from "./brief";
import type { FeasibilityAssessment, InterviewProfile } from "./interview";
import { pickList, pickText } from "./interview";
import { pickLang } from "./lang";
import type { Lang, ResearchPlanV2, StudyV2 } from "./types";

export type ActionPlanMode = "interview_only" | "research_merged" | "research_mismatch";

export interface ActionPlanExperiment {
  title: string;
  who: string;
  question: string;
  success: string;
  cost: string;
}

export interface ActionPlanPhase {
  name: string;
  window: string;
  actions: string[];
  output: string;
}

export interface ActionPlanEvidence {
  fromInterview: string[];
  fromResearch: string[];
  gaps: string[];
}

export interface ActionPlanMvp {
  must: string[];
  later: string[];
  notNow: string[];
}

export interface ActionPlanBusiness {
  model: string;
  price: string;
  firstPayers: string;
}

export interface ActionPlanResearchUse {
  opportunityTitle: string;
  productDirection: string;
  expectedOutcome: string;
  nextValidation: string;
  evidenceStrength: string;
  evidenceCount: number;
  counterCount: number;
}

export interface ActionPlan {
  title: string;
  positioning: string;
  beachhead: string;
  problem: string;
  valueProp: string;
  mvp: ActionPlanMvp;
  businessModel: ActionPlanBusiness;
  roadmap: ActionPlanPhase[];
  experiments: ActionPlanExperiment[];
  evidence: ActionPlanEvidence;
  risks: string[];
  killCriteria: string[];
  nextSevenDays: string[];
  confidence: "low" | "medium" | "high";
  confidenceReason: string;
  mode: ActionPlanMode;
  researchUsed: ActionPlanResearchUse | null;
  disclosure: string;
  language: Lang;
  generatedAt: string;
}

export interface ActionPlanInput {
  profile: InterviewProfile;
  assessment: FeasibilityAssessment;
  brief: DecisionBriefV21 | null;
  plan: ResearchPlanV2 | null;
  study: StudyV2 | null;
}

const STRENGTH_RANK: Record<string, number> = { strong: 4, medium: 3, weak: 2, insufficient: 1 };

function isZh(lang: Lang): boolean {
  return lang === "zh";
}

function tx(lang: Lang, zh: string, en: string): string {
  return pickLang(lang, zh, en, en, en);
}

function briefText(lang: Lang, zh: string, en: string): string {
  return isZh(lang) ? zh : en;
}

function briefList(lang: Lang, zh: string[], en: string[]): string[] {
  return isZh(lang) ? zh : en;
}

function short(value: string, fallback: string): string {
  const text = value.trim();
  return text || fallback;
}

function tokens(text: string): Set<string> {
  const lower = text.toLowerCase();
  const words = lower.match(/[a-z0-9]{3,}/g) ?? [];
  const hanChunks = lower.match(/[\u4e00-\u9fff]{2,}/g) ?? [];
  const grams: string[] = [];
  for (const chunk of hanChunks) {
    for (let index = 0; index < chunk.length - 1; index += 1) grams.push(chunk.slice(index, index + 2));
  }
  return new Set([...words, ...grams]);
}

export function researchMatchesInterview(
  profile: InterviewProfile,
  brief: DecisionBriefV21 | null,
  plan?: ResearchPlanV2 | null,
): boolean {
  if (!brief) return false;
  const source = tokens(`${profile.idea} ${profile.audience} ${profile.problem}`);
  const target = tokens(
    `${brief.decisionQuestionZh} ${brief.opportunities
      .filter((item) => !item.hidden)
      .map((item) => `${item.targetUserZh} ${item.scenarioZh} ${item.problemZh}`)
      .join(" ")} ${plan?.brief.raw ?? ""}`,
  );
  if (source.size === 0 || target.size === 0) return false;
  let overlap = 0;
  for (const token of source) if (target.has(token)) overlap += 1;
  return overlap / Math.min(source.size, target.size) >= 0.08;
}

export function topOpportunity(brief: DecisionBriefV21 | null): DecisionBriefV21["opportunities"][number] | null {
  if (!brief) return null;
  const visible = brief.opportunities.filter((item) => !item.hidden);
  if (visible.length === 0) return null;
  return visible.slice().sort((left, right) => (STRENGTH_RANK[right.evidenceStrength] ?? 0) - (STRENGTH_RANK[left.evidenceStrength] ?? 0))[0];
}

export function summariseResearch(input: ActionPlanInput): string {
  const { brief, study } = input;
  if (!brief) return "(No matching research brief yet.)";
  const opportunity = topOpportunity(brief);
  const lines = [
    `Decision: ${brief.decisionQuestionZh}`,
    `Recommendation: ${brief.recommendation}`,
    `Recommendation reason: ${brief.recommendationReasonEn || brief.recommendationReasonZh}`,
    `Validate first: ${brief.validateFirstEn.join("; ") || brief.validateFirstZh.join("; ")}`,
    `Do not do: ${brief.doNotDoEn.join("; ") || brief.doNotDoZh.join("; ")}`,
  ];
  if (opportunity) {
    lines.push(
      `Top opportunity: ${opportunity.targetUserEn} / ${opportunity.scenarioEn}`,
      `Problem: ${opportunity.problemEn}`,
      `Product direction: ${opportunity.productDirectionEn}`,
      `Expected outcome: ${opportunity.expectedOutcomeEn}`,
      `Evidence strength: ${opportunity.evidenceStrength} (${opportunity.evidenceIds.length} evidence, ${opportunity.counterIds.length} counter)`,
      `Falsification: ${opportunity.falsificationSignalEn}`,
      `Next validation: ${opportunity.nextValidationEn}`,
      `Unknowns: ${opportunity.unknownsEn.join("; ")}`,
    );
  }
  lines.push(
    `Belief updates: ${brief.beliefUpdates.map((item) => item.newUnderstandingEn).join(" | ")}`,
    `Product options: ${brief.productOptions.map((item) => `${item.titleEn}: ${item.scopeEn}`).join(" | ")}`,
    `Unanswered: ${brief.unansweredEn.join("; ")}`,
    `Boundaries: ${brief.boundariesEn.join("; ")}`,
    `Samples included: ${study ? study.sample.filter((item) => item.included).length : 0}`,
  );
  return lines.join("\n");
}

export function buildFallbackActionPlan(input: ActionPlanInput): ActionPlan {
  const { profile, assessment, brief, plan } = input;
  const matched = researchMatchesInterview(profile, brief, plan);
  const mode: ActionPlanMode = !brief ? "interview_only" : matched ? "research_merged" : "research_mismatch";
  const opportunity = matched ? topOpportunity(brief) : null;
  const lang: Lang = profile.language;
  const partTime = /学生|上学|业余|副业|上班|在职|兼职|student|part-time|side|étudiant|salarié|temps partiel|学生|会社員|副業/i.test(profile.occupation);
  const beachhead = opportunity
    ? briefText(lang, opportunity.targetUserZh, opportunity.targetUserEn)
    : short(profile.audience, tx(lang, "第一小群最痛的用户", "The first small group with the sharpest pain"));
  const problem = opportunity
    ? `${briefText(lang, opportunity.scenarioZh, opportunity.scenarioEn)}：${briefText(lang, opportunity.problemZh, opportunity.problemEn)}`
    : short(profile.problem, tx(lang, "一个具体、反复发生的场景", "One concrete, recurring situation"));
  const valueProp = opportunity
    ? briefText(lang, opportunity.expectedOutcomeZh, opportunity.expectedOutcomeEn)
    : tx(
        lang,
        `让${beachhead}在一个流程里完成「${problem}」，不用再靠聊天记录和口头约定。`,
        `Let ${beachhead} complete "${problem}" in one workflow instead of relying on chat logs and verbal agreements.`,
      );
  const productDirection = opportunity
    ? briefText(lang, opportunity.productDirectionZh, opportunity.productDirectionEn)
    : tx(
        lang,
        `先做人工版（Concierge MVP）：用文档、表格和聊天工具手工交付结果，验证用户是否愿意走完整个流程。`,
        "Start with a concierge MVP: deliver the outcome manually with documents, spreadsheets and chat, and test whether users will complete the whole workflow.",
      );
  const doNotDo = brief && matched ? briefList(lang, brief.doNotDoZh, brief.doNotDoEn) : [];
  const notNow = [
    ...doNotDo,
    tx(lang, "完整 SaaS 与多平台接入", "A full SaaS product and multi-platform integrations"),
    tx(lang, "市场规模、购买率或 TAM 结论", "Market-size, purchase-rate or TAM conclusions"),
    tx(lang, "自动访谈或多 Agent 聊天界面", "Automated interviews or a multi-agent chat UI"),
  ].slice(0, 5);
  const productOptions = brief && matched ? brief.productOptions : [];
  const later = productOptions.length > 0
    ? productOptions.slice(0, 2).map((item) => `${briefText(lang, item.titleZh, item.titleEn)}：${briefText(lang, item.scopeZh, item.scopeEn)}`)
    : [
        tx(lang, "把人工流程里重复的 2–3 个步骤做成软件", "Turn the two or three repeated manual steps into software"),
        tx(lang, "加自动提醒、记录和简单报表", "Add automated reminders, records and simple reports"),
      ];

  const model = short(profile.model, tx(lang, "先按次或按月收费，具体价格待验证", "Start with pay-per-use or monthly pricing; validate the exact price"));
  const price = /订阅|subscri|abonnement|サブスク|按月|年/i.test(model)
    ? tx(lang, "先卖 3 个种子用户的 3 个月使用权，收到钱再开发；不要先做免费版。", "Sell a three-month plan to three seed users first; build only after you collect money.")
    : tx(lang, "做 3 次价格试探：讲清方案，先收一笔小额定金，再决定是否开发。", "Run three price probes: explain the offer, collect a small deposit, then decide whether to build.");
  const firstPayers = tx(
    lang,
    `${beachhead}里最近 3 个月真实遇到「${problem}」、并且已经在花时间或花钱的人。`,
    `People in "${beachhead}" who hit "${problem}" in the last three months and already spend time or money on it.`,
  );

  const window1 = partTime ? tx(lang, "第 1 周（业余时间）", "Week 1 (part-time)") : tx(lang, "第 1 周", "Week 1");
  const window2 = partTime ? tx(lang, "第 2–4 周（业余时间）", "Weeks 2–4 (part-time)") : tx(lang, "第 2–4 周", "Weeks 2–4");
  const window3 = partTime ? tx(lang, "第 5–8 周（业余时间）", "Weeks 5–8 (part-time)") : tx(lang, "第 5–8 周", "Weeks 5–8");
  const window4 = partTime ? tx(lang, "第 9–12 周（业余时间）", "Weeks 9–12 (part-time)") : tx(lang, "第 9–12 周", "Weeks 9–12");
  const roadmap: ActionPlanPhase[] = [
    {
      name: tx(lang, "验证问题与付费意愿", "Validate the problem and willingness to pay"),
      window: window1,
      actions: [
        tx(lang, `找 5 个「${beachhead}」做访谈，问最近一次发生「${problem}」的经过，不问“你会不会用”。`, `Interview five people in "${beachhead}" about the last time "${problem}" happened; do not ask "would you use this?".`),
        tx(lang, "做一个一句话落地页，写清目标用户、问题和承诺结果，测点击与留资。", "Ship a one-line landing page with the target user, problem and promised outcome; test clicks and sign-ups."),
        tx(lang, "做 3 次价格试探，记录谁愿意付、愿意付多少、为什么现在付。", "Run three price probes; record who will pay, how much, and why now."),
      ],
      output: tx(lang, "5 份访谈记录 + 3 个愿意试用/预付的种子用户", "Five interview notes plus three seed users willing to try or prepay"),
    },
    {
      name: tx(lang, "人工跑通一单", "Run one job manually end to end"),
      window: window2,
      actions: [
        tx(lang, "用文档/表格/聊天工具人工交付，不先写代码。", "Deliver manually with documents, spreadsheets and chat; do not write code yet."),
        tx(lang, "让 3 个种子用户各跑一次完整流程，记录卡点和放弃点。", "Have three seed users complete the full workflow once; record where they get stuck or drop off."),
        tx(lang, "每周复盘：哪一步重复最多、哪一步用户最愿意付钱。", "Review weekly: which step repeats most, and which step users would pay for."),
      ],
      output: tx(lang, "一单完整流程 + 3 份反馈 + 明确的软件化范围", "One complete workflow, three feedback notes and a clear software scope"),
    },
    {
      name: tx(lang, "只自动化重复步骤", "Automate only the repeated steps"),
      window: window3,
      actions: [
        tx(lang, "把复盘中重复出现最多的 2–3 个步骤做成最小软件。", "Build the smallest software for the two or three steps that repeated most."),
        tx(lang, "保留人工兜底，不追求完整产品。", "Keep a manual fallback; do not chase a complete product."),
        tx(lang, "让同一批种子用户继续用，测留存而不是只测新鲜感。", "Keep the same seed users; measure retention, not novelty."),
      ],
      output: tx(lang, "可重复使用的 MVP + 使用记录", "A reusable MVP with usage records"),
    },
    {
      name: tx(lang, "收费与决策", "Charge and decide"),
      window: window4,
      actions: [
        tx(lang, "向 5 个用户收费（订阅/按次/服务费均可），不要只收反馈。", "Charge five users (subscription, per use or service fee); do not only collect feedback."),
        tx(lang, "记录付费、留存、推荐和退款原因。", "Track payment, retention, referrals and refund reasons."),
        tx(lang, "按停止条件做继续 / 转向 / 停止决定。", "Use the kill criteria to decide continue, pivot or stop."),
      ],
      output: tx(lang, "付费与留存数据 + 一份继续/转向/停止决定", "Payment and retention data plus a continue/pivot/stop decision"),
    },
  ];

  const experiments: ActionPlanExperiment[] = [
    {
      title: tx(lang, "5 次目标用户访谈", "Five target-user interviews"),
      who: beachhead,
      question: tx(lang, `最近一次「${problem}」是什么时候？当时怎么解决、损失了什么？`, `When did "${problem}" last happen? How did you handle it, and what did it cost?`),
      success: tx(lang, "5 人中至少 3 人在最近 3 个月真实遇到，并且已经在花时间或钱。", "At least three of five hit it in the last three months and already spend time or money."),
      cost: tx(lang, "2–3 天", "2–3 days"),
    },
    {
      title: tx(lang, "一句话落地页", "One-line landing page"),
      who: beachhead,
      question: tx(lang, "看到这句话后，是否愿意留下联系方式或预约演示？", "After reading the one-liner, will you leave contact details or book a demo?"),
      success: tx(lang, "10% 留资，或至少 3 个预约。", "10% sign-up rate, or at least three bookings."),
      cost: tx(lang, "1 天", "1 day"),
    },
    {
      title: tx(lang, "价格试探", "Price probe"),
      who: tx(lang, "最痛的 3 个种子用户", "The three seed users with the sharpest pain"),
      question: tx(lang, "如果现在开始，你愿意先付一笔定金/首月费用吗？", "If we start now, would you pay a deposit or the first month?"),
      success: tx(lang, "至少 3 人愿意付，而不是只说“听起来不错”。", "At least three actually pay, not just say it sounds good."),
      cost: tx(lang, "3 天", "3 days"),
    },
  ];
  if (opportunity) {
    experiments.push({
      title: tx(lang, "研究台建议的下一步验证", "Next validation from the research desk"),
      who: briefText(lang, opportunity.targetUserZh, opportunity.targetUserEn),
      question: briefText(lang, opportunity.nextValidationZh, opportunity.nextValidationEn),
      success: tx(lang, "能推翻或确认机会假设里的关键未知。", "Can confirm or falsify the key unknown in the opportunity hypothesis."),
      cost: tx(lang, "3–5 天", "3–5 days"),
    });
  }

  const weak = assessment.dimensions.filter((item) => item.status !== "strong");
  const gaps = [
    ...pickList(assessment.mustValidate, lang),
    ...(brief && matched ? briefList(lang, brief.unansweredZh, brief.unansweredEn) : []),
    tx(lang, "付费意愿与价格敏感度（访谈/价格测试）", "Willingness to pay and price sensitivity (interviews / price tests)"),
  ].slice(0, 6);
  const risks = [
    ...pickList(assessment.risks, lang),
    ...(brief && matched ? briefList(lang, brief.boundariesZh, brief.boundariesEn) : []),
    tx(lang, "把知乎定性讨论当成市场规模或购买率证明。", "Treating qualitative Zhihu discussion as proof of market size or purchase rate."),
  ].slice(0, 6);
  const killCriteria = [
    profile.decision || tx(lang, "如果连续 5 个目标用户都不认为这是问题，就停止。", "Stop if five consecutive target users do not see this as a problem."),
    ...(opportunity ? [briefText(lang, opportunity.falsificationSignalZh, opportunity.falsificationSignalEn)] : []),
    tx(lang, "如果 3 个种子用户都不愿意付任何费用，就先不开发。", "If none of the three seed users will pay anything, do not build yet."),
  ].slice(0, 4);

  const researchStrength = opportunity?.evidenceStrength;
  const confidence: ActionPlan["confidence"] =
    assessment.level === "promising" && (researchStrength === "strong" || researchStrength === "medium")
      ? "medium"
      : assessment.level === "promising" || researchStrength === "strong"
        ? "medium"
        : assessment.level === "needs_validation"
          ? "low"
          : "low";
  const confidenceReason = tx(
    lang,
    `访谈初判 ${assessment.score}/100（${pickText(assessment.levelLabel, lang)}）；${
      opportunity
        ? `研究台最强机会证据为 ${researchStrength}（${opportunity.evidenceIds.length} 条证据 / ${opportunity.counterIds.length} 条反证）`
        : "还没有匹配的研究证据"
    }。`,
    `Interview read ${assessment.score}/100 (${pickText(assessment.levelLabel, lang)}); ${
      opportunity
        ? `the strongest research opportunity is ${researchStrength} (${opportunity.evidenceIds.length} evidence / ${opportunity.counterIds.length} counter)`
        : "no matching research evidence yet"
    }.`,
  );

  return {
    title: tx(lang, `${short(profile.idea, "新产品方向")} · 落地方案`, `${short(profile.idea, "New product")} · action plan`),
    positioning: tx(
      lang,
      `${short(profile.idea, "这个产品")} 先服务「${beachhead}」，围绕「${problem}」做一个最小可用流程，而不是先做完整平台。`,
      `${short(profile.idea, "This product")} starts with "${beachhead}" and builds the smallest usable workflow around "${problem}" instead of a full platform.`,
    ),
    beachhead,
    problem,
    valueProp,
    mvp: {
      must: [
        productDirection,
        tx(lang, "先人工跑通 3 个真实用户/项目，不先写代码。", "Run it manually with three real users/projects before writing code."),
        tx(lang, "把流程拆成可观察的 3 个步骤：开始、交付、收钱/复盘。", "Split the workflow into three observable steps: start, deliver, collect/review."),
      ],
      later,
      notNow,
    },
    businessModel: { model, price, firstPayers },
    roadmap,
    experiments,
    evidence: {
      fromInterview: [
        tx(lang, `访谈初判 ${assessment.score}/100：${pickText(assessment.levelLabel, lang)}`, `Interview read ${assessment.score}/100: ${pickText(assessment.levelLabel, lang)}`),
        short(profile.evidence, tx(lang, "还没有验证记录", "No validation recorded yet")),
        ...weak.slice(0, 2).map((item) => `${pickText(item.label, lang)}：${pickText(item.reason, lang)}`),
      ],
      fromResearch: opportunity
        ? [
            tx(lang, `研究台最强机会：${briefText(lang, opportunity.targetUserZh, opportunity.targetUserEn)}`, `Top research opportunity: ${briefText(lang, opportunity.targetUserZh, opportunity.targetUserEn)}`),
            tx(lang, `产品方向：${briefText(lang, opportunity.productDirectionZh, opportunity.productDirectionEn)}`, `Product direction: ${briefText(lang, opportunity.productDirectionZh, opportunity.productDirectionEn)}`),
            tx(lang, `证据强度：${opportunity.evidenceStrength}（${opportunity.evidenceIds.length} 条证据 / ${opportunity.counterIds.length} 条反证）`, `Evidence strength: ${opportunity.evidenceStrength} (${opportunity.evidenceIds.length} evidence / ${opportunity.counterIds.length} counter)`),
          ]
        : [tx(lang, "还没有与本次访谈匹配的研究台证据；当前方案基于访谈假设。", "No matching research-desk evidence yet; this plan is based on interview assumptions.")],
      gaps,
    },
    risks,
    killCriteria,
    nextSevenDays: [
      tx(lang, `列出 10 个「${beachhead}」候选人，约到 5 个访谈。`, `List ten people in "${beachhead}" and book five interviews.`),
      tx(lang, "写出一句话定位和落地页，今天上线。", "Write the one-line positioning and landing page; ship it today."),
      tx(lang, "准备价格试探话术，记录谁愿意付定金。", "Prepare the price-probe script and record who will pay a deposit."),
    ],
    confidence,
    confidenceReason,
    mode,
    researchUsed: opportunity
      ? {
          opportunityTitle: briefText(lang, opportunity.targetUserZh, opportunity.targetUserEn),
          productDirection: briefText(lang, opportunity.productDirectionZh, opportunity.productDirectionEn),
          expectedOutcome: briefText(lang, opportunity.expectedOutcomeZh, opportunity.expectedOutcomeEn),
          nextValidation: briefText(lang, opportunity.nextValidationZh, opportunity.nextValidationEn),
          evidenceStrength: opportunity.evidenceStrength,
          evidenceCount: opportunity.evidenceIds.length,
          counterCount: opportunity.counterIds.length,
        }
      : null,
    disclosure: tx(
      lang,
      "本方案由访谈回答、研究台证据和规则合成；不构成市场验证、法律或财务建议。上线前请用真实用户和真实付费验证。",
      "This plan combines interview answers, research-desk evidence and deterministic rules. It is not market validation, legal or financial advice. Validate with real users and real payments before building.",
    ),
    language: lang,
    generatedAt: new Date().toISOString(),
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

function asPhases(value: unknown, fallback: ActionPlanPhase[]): ActionPlanPhase[] {
  if (!Array.isArray(value)) return fallback;
  const out: ActionPlanPhase[] = [];
  for (const raw of value.slice(0, 6)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    out.push({
      name: asString(item.name, ""),
      window: asString(item.window, ""),
      actions: asStringArray(item.actions, []),
      output: asString(item.output, ""),
    });
  }
  const valid = out.filter((item) => item.name && item.actions.length > 0);
  return valid.length >= 3 ? valid : fallback;
}

function asExperiments(value: unknown, fallback: ActionPlanExperiment[]): ActionPlanExperiment[] {
  if (!Array.isArray(value)) return fallback;
  const out: ActionPlanExperiment[] = [];
  for (const raw of value.slice(0, 6)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    out.push({
      title: asString(item.title, ""),
      who: asString(item.who, ""),
      question: asString(item.question, ""),
      success: asString(item.success, ""),
      cost: asString(item.cost, ""),
    });
  }
  const valid = out.filter((item) => item.title && item.question);
  return valid.length >= 2 ? valid : fallback;
}

export function normaliseActionPlan(raw: unknown, fallback: ActionPlan): ActionPlan {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const mvpRaw = value.mvp && typeof value.mvp === "object" ? (value.mvp as Record<string, unknown>) : {};
  const businessRaw = value.businessModel && typeof value.businessModel === "object" ? (value.businessModel as Record<string, unknown>) : {};
  const evidenceRaw = value.evidence && typeof value.evidence === "object" ? (value.evidence as Record<string, unknown>) : {};
  return {
    ...fallback,
    title: asString(value.title, fallback.title),
    positioning: asString(value.positioning, fallback.positioning),
    beachhead: asString(value.beachhead, fallback.beachhead),
    problem: asString(value.problem, fallback.problem),
    valueProp: asString(value.valueProp, fallback.valueProp),
    mvp: {
      must: asStringArray(mvpRaw.must, fallback.mvp.must),
      later: asStringArray(mvpRaw.later, fallback.mvp.later),
      notNow: asStringArray(mvpRaw.notNow, fallback.mvp.notNow),
    },
    businessModel: {
      model: asString(businessRaw.model, fallback.businessModel.model),
      price: asString(businessRaw.price, fallback.businessModel.price),
      firstPayers: asString(businessRaw.firstPayers, fallback.businessModel.firstPayers),
    },
    roadmap: asPhases(value.roadmap, fallback.roadmap),
    experiments: asExperiments(value.experiments, fallback.experiments),
    evidence: {
      fromInterview: asStringArray(evidenceRaw.fromInterview, fallback.evidence.fromInterview),
      fromResearch: asStringArray(evidenceRaw.fromResearch, fallback.evidence.fromResearch),
      gaps: asStringArray(evidenceRaw.gaps, fallback.evidence.gaps),
    },
    risks: asStringArray(value.risks, fallback.risks),
    killCriteria: asStringArray(value.killCriteria, fallback.killCriteria),
    nextSevenDays: asStringArray(value.nextSevenDays, fallback.nextSevenDays),
    confidence: value.confidence === "low" || value.confidence === "medium" || value.confidence === "high" ? value.confidence : fallback.confidence,
    confidenceReason: asString(value.confidenceReason, fallback.confidenceReason),
    disclosure: asString(value.disclosure, fallback.disclosure),
  };
}

const LANGUAGE_NAME: Record<Lang, string> = {
  zh: "Simplified Chinese",
  en: "English",
  fr: "French",
  ja: "Japanese",
  ru: "Russian",
  ko: "Korean",
};

export function buildActionPlanPrompt(
  profile: InterviewProfile,
  assessment: FeasibilityAssessment,
  fallback: ActionPlan,
  researchMatch: boolean,
): string {
  const lang = profile.language;
  const languageRule =
    lang === "fr"
      ? "The draft contains Chinese source material. Translate every Chinese phrase into French. Do not copy Chinese characters into the output, except a proper noun or a short direct quote."
      : lang === "ja"
        ? "The draft contains Chinese source material. Translate every Chinese sentence into natural Japanese. Do not copy Chinese sentences into the output."
        : lang === "en"
          ? "The draft contains Chinese source material. Translate every Chinese sentence into natural English. Do not copy Chinese sentences into the output."
          : "请用简体中文输出，不要把英文段落原样留下。";
  return [
    "You are a pragmatic product strategy lead. Turn the interview and research evidence into one actionable plan.",
    `Write every string in ${LANGUAGE_NAME[lang]}.`,
    languageRule,
    "Use the draft plan below as the structure and factual base. Rewrite it so it reads naturally, but do not invent market size, purchase rates, evidence or user quotes.",
    "Keep the same JSON keys and roughly the same array lengths. Do not add new evidence links. Mark uncertain items as hypotheses.",
    "If the research is missing or does not match the interview, keep the plan interview-only and say what must be validated.",
    "Return ONLY a JSON object with keys: title, positioning, beachhead, problem, valueProp, mvp{must,later,notNow}, businessModel{model,price,firstPayers}, roadmap[{name,window,actions,output}], experiments[{title,who,question,success,cost}], evidence{fromInterview,fromResearch,gaps}, risks, killCriteria, nextSevenDays, confidence, confidenceReason, disclosure.",
    "",
    "Interview:",
    JSON.stringify(profile, null, 2),
    "",
    "Interview assessment:",
    JSON.stringify(
      {
        score: assessment.score,
        level: assessment.level,
        summary: pickText(assessment.summary, lang),
        risks: pickList(assessment.risks, lang),
        nextSteps: pickList(assessment.nextSteps, lang),
        mustValidate: pickList(assessment.mustValidate, lang),
      },
      null,
      2,
    ),
    "",
    `Research matches interview: ${researchMatch}`,
    "The draft below already contains the relevant research evidence. Do not invent additional research, evidence links or user quotes.",
    "",
    "Draft JSON:",
    JSON.stringify(fallback, null, 2),
  ].join("\n");
}

export function buildActionPlanMarkdown(plan: ActionPlan): string {
  const t = (zh: string, en: string, fr: string, ja: string): string => pickLang(plan.language, zh, en, fr, ja);
  const mode =
    plan.mode === "research_merged"
      ? t("已结合研究台证据", "Research merged", "Recherche intégrée", "リサーチ統合済み")
      : plan.mode === "research_mismatch"
        ? t("研究案例不匹配，仅用访谈", "Research mismatch: interview-only plan", "Cas de recherche non correspondant : plan fondé sur l'entretien", "リサーチ事例が一致せず、インタビューのみ")
        : t("仅基于访谈", "Interview-only plan", "Plan fondé sur l'entretien", "インタビューのみ");
  const lines = [
    `# ${plan.title}`,
    "",
    `- ${mode}`,
    `- ${t("置信度", "Confidence", "Confiance", "確信度")}: ${plan.confidence}`,
    `- ${plan.confidenceReason}`,
    "",
    `## ${t("定位", "Positioning", "Positionnement", "ポジショニング")}`,
    plan.positioning,
    "",
    `## ${t("首个切入人群", "Beachhead", "Première cible", "最初の対象")}`,
    plan.beachhead,
    "",
    `## ${t("问题", "Problem", "Problème", "問題")}`,
    plan.problem,
    "",
    `## ${t("价值主张", "Value proposition", "Proposition de valeur", "価値提案")}`,
    plan.valueProp,
    "",
    "## MVP",
    `### ${t("必须有", "Must", "Indispensable", "必須")}`,
    ...plan.mvp.must.map((item) => `- ${item}`),
    `### ${t("验证后再加", "Later", "À ajouter ensuite", "検証後に追加")}`,
    ...plan.mvp.later.map((item) => `- ${item}`),
    `### ${t("现在不做", "Not now", "Pas maintenant", "今はやらない")}`,
    ...plan.mvp.notNow.map((item) => `- ${item}`),
    "",
    `## ${t("商业模式", "Business model", "Modèle économique", "ビジネスモデル")}`,
    `- ${t("收费方式", "Model", "Modèle", "課金方法")}: ${plan.businessModel.model}`,
    `- ${t("价格假设", "Price hypothesis", "Hypothèse de prix", "価格仮説")}: ${plan.businessModel.price}`,
    `- ${t("第一批付费者", "First payers", "Premiers payeurs", "最初の支払者")}: ${plan.businessModel.firstPayers}`,
    "",
    `## ${t("路线图", "Roadmap", "Feuille de route", "ロードマップ")}`,
    ...plan.roadmap.flatMap((phase) => [
      `### ${phase.name} (${phase.window})`,
      ...phase.actions.map((item) => `- ${item}`),
      `- ${t("输出", "Output", "Résultat", "成果")}: ${phase.output}`,
      "",
    ]),
    `## ${t("实验", "Experiments", "Expériences", "実験")}`,
    ...plan.experiments.flatMap((experiment) => [
      `### ${experiment.title}`,
      `- ${t("找谁", "Who", "Qui", "誰に")}: ${experiment.who}`,
      `- ${t("问什么", "Question", "Question", "問い")}: ${experiment.question}`,
      `- ${t("成功标准", "Success", "Succès", "成功基準")}: ${experiment.success}`,
      `- ${t("成本/时间", "Cost / time", "Coût / temps", "コスト・時間")}: ${experiment.cost}`,
      "",
    ]),
    `## ${t("证据", "Evidence", "Preuves", "証拠")}`,
    `### ${t("来自访谈", "From interview", "Issu de l'entretien", "インタビューから")}`,
    ...plan.evidence.fromInterview.map((item) => `- ${item}`),
    `### ${t("来自研究台", "From research", "Issu de la recherche", "リサーチから")}`,
    ...plan.evidence.fromResearch.map((item) => `- ${item}`),
    `### ${t("缺口", "Gaps", "Lacunes", "不足")}`,
    ...plan.evidence.gaps.map((item) => `- ${item}`),
    "",
    `## ${t("风险", "Risks", "Risques", "リスク")}`,
    ...plan.risks.map((item) => `- ${item}`),
    "",
    `## ${t("停止条件", "Kill criteria", "Critères d'arrêt", "撤退条件")}`,
    ...plan.killCriteria.map((item) => `- ${item}`),
    "",
    `## ${t("接下来 7 天", "Next 7 days", "Les 7 prochains jours", "次の7日間")}`,
    ...plan.nextSevenDays.map((item, index) => `${index + 1}. ${item}`),
    "",
    `> ${plan.disclosure}`,
    "",
  ];
  return lines.join("\n");
}
