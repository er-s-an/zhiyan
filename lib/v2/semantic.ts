import { translateExcerpts } from "../server/translate";
import { completeJson, hasLlm } from "./llm";
import type {
  BilingualReportV2,
  CodeDefV2,
  CodebookV2,
  Confidence,
  CoverageRowV2,
  DecisionMemoV2,
  EvidenceRefV2,
  FindingCategory,
  FindingV2,
  InterviewPlanV2,
  ResearchPlanV2,
  SampleItemV2,
  Stance,
  StudyV2,
} from "./types";
import { clipText, stableId } from "./zhihu";

const CATEGORY_ORDER: FindingCategory[] = [
  "population_scene",
  "task_pain",
  "alternative",
  "choice_reason",
  "disagreement",
  "unknown_gap",
];

function nowIso(): string {
  return new Date().toISOString();
}

function evidenceRef(sample: SampleItemV2, quote?: string): EvidenceRefV2 {
  return {
    itemId: sample.id,
    quoteZh: quote || clipText(sample.excerptZh, 160),
    quoteEn: sample.excerptEn || "Translation unavailable. Use the Chinese excerpt as the evidence.",
    url: sample.url,
    author: sample.author,
  };
}

function fallbackCodebook(): CodeDefV2[] {
  return [
    { id: "freelancer_designer", labelZh: "独立设计师", labelEn: "Independent designers", definitionZh: "设计师以自由职业身份接单。", definitionEn: "Designers taking freelance work.", category: "population", keywords: ["设计师", "插画", "视觉", "UI", "设计"] },
    { id: "freelancer_developer", labelZh: "独立开发者", labelEn: "Independent developers", definitionZh: "开发者以自由职业身份接单。", definitionEn: "Developers taking freelance work.", category: "population", keywords: ["程序员", "开发", "代码", "前端", "后端"] },
    { id: "freelancer_writer", labelZh: "自由撰稿人", labelEn: "Freelance writers", definitionZh: "撰稿、翻译、内容创作者以自由职业身份接单。", definitionEn: "Writers, translators and content creators taking freelance work.", category: "population", keywords: ["撰稿", "写手", "翻译", "文案", "约稿"] },
    { id: "quoting", labelZh: "报价与议价", labelEn: "Quoting and negotiation", definitionZh: "用户描述报价、压价、加钱或议价的过程。", definitionEn: "The process of quoting, price pressure, renegotiation or bargaining.", category: "task", keywords: ["报价", "压价", "加钱", "价格", "多少钱"] },
    { id: "scope_change", labelZh: "改需求与范围蔓延", labelEn: "Scope changes", definitionZh: "用户在交付过程中遇到需求变更、反复修改或范围蔓延。", definitionEn: "Requirement changes, repeated revisions or scope creep during delivery.", category: "task", keywords: ["改需求", "需求变更", "改稿", "反复修改", "加需求"] },
    { id: "acceptance", labelZh: "验收标准", labelEn: "Acceptance", definitionZh: "用户描述验收标准、交付确认或验收争议。", definitionEn: "Acceptance criteria, sign-off or disputes over delivery.", category: "scene", keywords: ["验收", "交付", "确认", "尾款", "签字"] },
    { id: "late_payment", labelZh: "尾款与拖款", labelEn: "Final payment and late payment", definitionZh: "用户描述尾款拖欠、催款、跑单或回款困难。", definitionEn: "Late final payment, chasing payment, disappearing clients or collection difficulty.", category: "scene", keywords: ["尾款", "拖款", "欠钱", "不付款", "跑单", "回款"] },
    { id: "deposit", labelZh: "定金与付款节点", labelEn: "Deposits and milestones", definitionZh: "用户描述定金比例、付款节点或预付安排。", definitionEn: "Deposit ratios, payment milestones or upfront arrangements.", category: "task", keywords: ["定金", "预付款", "首付", "付款节点"] },
    { id: "template", labelZh: "合同模板", labelEn: "Contract templates", definitionZh: "用户使用合同模板、范本或自行起草合同。", definitionEn: "Using templates, samples or self-drafted contracts.", category: "alternative", keywords: ["模板", "范本", "合同模板", "自己写"] },
    { id: "esign", labelZh: "电子签", labelEn: "E-signature", definitionZh: "用户使用电子签、在线签约或第三方签约工具。", definitionEn: "Using e-signature, online signing or third-party signing tools.", category: "alternative", keywords: ["电子签", "在线签", "签约", "第三方"] },
    { id: "platform_guarantee", labelZh: "平台担保", labelEn: "Platform guarantees", definitionZh: "用户使用平台担保、托管或平台介入。", definitionEn: "Using platform guarantees, escrow or platform mediation.", category: "alternative", keywords: ["平台担保", "担保", "托管", "平台介入", "闲鱼"] },
    { id: "contract_needed", labelZh: "合同必要性", labelEn: "Whether contracts are needed", definitionZh: "用户对合同是否必要、何时必要的条件性判断。", definitionEn: "Conditional views on whether contracts are necessary.", category: "stance", keywords: ["有必要", "没必要", "必须签", "不签", "看情况", "熟人"] },
    { id: "informal_trust", labelZh: "熟人合作与口头约定", labelEn: "Trusted relationships and verbal agreements", definitionZh: "用户依靠熟人、口头约定或长期关系而不签合同。", definitionEn: "Relying on trusted contacts, verbal agreements or long-term relationships instead of contracts.", category: "alternative", keywords: ["熟人", "口头", "朋友", "长期合作", "信任"] },
    { id: "evidence_gap", labelZh: "证据缺口", labelEn: "Evidence gaps", definitionZh: "当前样本无法覆盖的人群、场景或反例。", definitionEn: "Populations, scenes or counter-examples not covered by the current sample.", category: "gap", keywords: [] },
  ];
}

function keywordCodes(sample: SampleItemV2, codebook: CodeDefV2[]): { codes: string[]; traces: SampleItemV2["traces"] } {
  const text = sample.textZh;
  const codes: string[] = [];
  const traces: SampleItemV2["traces"] = [];
  for (const code of codebook) {
    const keyword = code.keywords.find((term) => term && text.includes(term));
    if (!keyword) continue;
    codes.push(code.id);
    traces.push({ codeId: code.id, quoteZh: text.slice(Math.max(0, text.indexOf(keyword) - 20), text.indexOf(keyword) + 80).replace(/\s+/g, " ").trim(), confidence: "medium" });
    if (codes.length >= 5) break;
  }
  return { codes, traces };
}

export async function induceCodebook(samples: SampleItemV2[], plan: ResearchPlanV2): Promise<CodebookV2> {
  const fallback: CodebookV2 = { version: "v1", method: "keyword_fallback", createdAt: nowIso(), codes: fallbackCodebook() };
  if (!hasLlm() || samples.length === 0) return fallback;
  const prompt = [
    "You are a bilingual qualitative research coder. Build a compact codebook for this study.",
    "Return ONLY JSON: {\"codes\":[{\"id\":\"snake_case\",\"labelZh\":\"中文标签\",\"labelEn\":\"English label\",\"definitionZh\":\"中文定义\",\"definitionEn\":\"English definition\",\"category\":\"population|scene|task|alternative|stance|gap\",\"keywords\":[\"中文关键词\"]}]}.",
    "Rules: 8-12 codes. Cover populations, tasks, scenes, alternatives, stance and gaps. Ground every code in the supplied real samples; no invented themes. Keep ids stable and unique.",
    `Decision: ${plan.decisionZh}`,
    `Research questions: ${JSON.stringify(plan.researchQuestions.map((item) => item.questionZh))}`,
    `Samples: ${JSON.stringify(samples.slice(0, 16).map((item) => ({ id: item.id, text: item.textZh.slice(0, 700) })))}`,
  ].join("\n");
  try {
    const raw = await completeJson<{ codes?: unknown }>(prompt, { timeoutMs: 65000, maxTokens: 5000, retries: 1 });
    const codes: CodeDefV2[] = [];
    for (const item of Array.isArray(raw.codes) ? raw.codes : []) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id.replace(/[^a-z0-9_]/g, "_") : "";
      const labelZh = typeof record.labelZh === "string" ? record.labelZh : "";
      if (!id || !labelZh) continue;
      codes.push({
        id,
        labelZh,
        labelEn: typeof record.labelEn === "string" ? record.labelEn : labelZh,
        definitionZh: typeof record.definitionZh === "string" ? record.definitionZh : labelZh,
        definitionEn: typeof record.definitionEn === "string" ? record.definitionEn : labelZh,
        category: (["population", "scene", "task", "alternative", "stance", "gap"] as CodeDefV2["category"][]).includes(record.category as CodeDefV2["category"])
          ? (record.category as CodeDefV2["category"])
          : "task",
        keywords: Array.isArray(record.keywords) ? record.keywords.filter((term): term is string => typeof term === "string").slice(0, 8) : [],
      });
      if (codes.length >= 12) break;
    }
    if (codes.length < 6) return fallback;
    return { version: "v1", method: "llm", createdAt: nowIso(), codes };
  } catch {
    return fallback;
  }
}

interface CodingPayload {
  items?: unknown;
}

export async function codeSamples(samples: SampleItemV2[], codebook: CodebookV2, plan: ResearchPlanV2, limit?: number): Promise<SampleItemV2[]> {
  const coded = samples.map((sample) => {
    if (sample.codes.length > 0) return sample;
    const keyword = keywordCodes(sample, codebook.codes);
    return {
      ...sample,
      codes: keyword.codes,
      traces: keyword.traces,
      populationZh: codebook.codes.find((code) => code.category === "population" && keyword.codes.includes(code.id))?.labelZh || "未标注",
      populationEn: codebook.codes.find((code) => code.category === "population" && keyword.codes.includes(code.id))?.labelEn || "Unlabelled",
      sceneLabelsZh: codebook.codes.filter((code) => code.category === "scene" && keyword.codes.includes(code.id)).map((code) => code.labelZh),
      sceneLabelsEn: codebook.codes.filter((code) => code.category === "scene" && keyword.codes.includes(code.id)).map((code) => code.labelEn),
      stance: inferStance(sample.textZh),
    };
  });
  if (!hasLlm()) return translateMissing(coded);

  const included = coded.filter((item) => item.included).slice(0, limit && limit > 0 ? limit : undefined);
  for (let index = 0; index < included.length; index += 8) {
    const batch = included.slice(index, index + 8);
    const prompt = [
      "You are a bilingual qualitative coder. Code the real Zhihu samples with the given codebook.",
      "Return ONLY JSON: {\"items\":[{\"id\":\"sample id\",\"codes\":[{\"codeId\":\"existing code id\",\"quote\":\"exact short quote from the Chinese text\",\"confidence\":\"low|medium|high\"}],\"populationZh\":\"who is speaking, or 未标注\",\"populationEn\":\"English\",\"scenesZh\":[\"scene label from codebook\"],\"scenesEn\":[\"English scene labels\"],\"stance\":\"support|oppose|conditional|neutral|unclear\",\"excerptEn\":\"one or two sentence faithful English translation of the excerpt\"}]}.",
      "Rules: 1-4 codes per sample; only codebook ids; quote must be a real substring of the sample; do not infer purchase intent; translate the excerpt faithfully and skeptically.",
      `Codebook: ${JSON.stringify(codebook.codes)}`,
      `Samples: ${JSON.stringify(batch.map((item) => ({ id: item.id, title: item.title, text: item.textZh.slice(0, 1000) })))}`,
    ].join("\n");
    try {
      const raw = await completeJson<CodingPayload>(prompt, { timeoutMs: 80000, maxTokens: 7000, retries: 1 });
      const items = Array.isArray(raw.items) ? raw.items : [];
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const record = item as Record<string, unknown>;
        const id = typeof record.id === "string" ? record.id : "";
        const target = coded.find((sample) => sample.id === id);
        if (!target) continue;
        const codeIds: string[] = [];
        const traces: SampleItemV2["traces"] = [];
        for (const codeRaw of Array.isArray(record.codes) ? record.codes : []) {
          if (!codeRaw || typeof codeRaw !== "object") continue;
          const code = codeRaw as Record<string, unknown>;
          const codeId = typeof code.codeId === "string" ? code.codeId : "";
          if (!codebook.codes.some((entry) => entry.id === codeId)) continue;
          const quote = typeof code.quote === "string" ? code.quote.trim() : "";
          const confidence: Confidence = ["low", "medium", "high"].includes(code.confidence as string) ? (code.confidence as Confidence) : "medium";
          if (!codeIds.includes(codeId)) codeIds.push(codeId);
          traces.push({ codeId, quoteZh: quote || target.excerptZh.slice(0, 160), confidence });
        }
        const stance = ["support", "oppose", "conditional", "neutral", "unclear"].includes(record.stance as string)
          ? (record.stance as Stance)
          : inferStance(target.textZh);
        Object.assign(target, {
          codes: codeIds,
          traces,
          populationZh: typeof record.populationZh === "string" ? record.populationZh : "未标注",
          populationEn: typeof record.populationEn === "string" ? record.populationEn : "Unlabelled",
          sceneLabelsZh: Array.isArray(record.scenesZh) ? record.scenesZh.filter((value): value is string => typeof value === "string").slice(0, 4) : [],
          sceneLabelsEn: Array.isArray(record.scenesEn) ? record.scenesEn.filter((value): value is string => typeof value === "string").slice(0, 4) : [],
          stance,
          excerptEn: typeof record.excerptEn === "string" ? record.excerptEn.trim().slice(0, 700) : target.excerptEn,
        });
      }
    } catch {
      // Keep keyword fallback for this batch.
    }
  }
  return translateMissing(coded);
}

function inferStance(text: string): Stance {
  if (/(看情况|视情况|分人|不一定|取决于|有时|看金额|看项目|熟人|长期合作)/.test(text)) return "conditional";
  if (/(没必要|不需要|鸡肋|不签|不推荐|没用|智商税|多此一举)/.test(text)) return "oppose";
  if (/(有必要|必须|建议签|靠谱|有用|应该签|一定要|需要合同|推荐)/.test(text)) return "support";
  return "unclear";
}

async function translateMissing(samples: SampleItemV2[]): Promise<SampleItemV2[]> {
  const pairs = samples
    .filter((item) => item.included && (!item.excerptEn || item.excerptEn.length < 8))
    .map((item) => ({ id: item.id, zh: item.excerptZh }));
  if (pairs.length === 0) return samples;
  const translations = await translateExcerpts(pairs, { timeoutMs: 30000, retries: 0 });
  return samples.map((item) => {
    if (item.excerptEn && item.excerptEn.length >= 8) return item;
    const translation = translations[item.id];
    return translation ? { ...item, excerptEn: translation, textEn: item.textEn || translation } : { ...item, excerptEn: item.excerptEn || "Translation unavailable. Use the Chinese excerpt as the evidence." };
  });
}

function codeById(codebook: CodebookV2, id: string): CodeDefV2 | undefined {
  return codebook.codes.find((code) => code.id === id);
}

function categoryForCode(code: CodeDefV2 | undefined): FindingCategory {
  if (!code) return "task_pain";
  if (code.category === "population" || code.category === "scene") return "population_scene";
  if (code.category === "alternative") return "alternative";
  if (code.category === "stance") return "choice_reason";
  return "task_pain";
}

function findingsFromCodes(samples: SampleItemV2[], codebook: CodebookV2, plan: ResearchPlanV2): FindingV2[] {
  const included = samples.filter((item) => item.included);
  const findings: FindingV2[] = [];
  for (const code of codebook.codes) {
    const items = included.filter((item) => item.codes.includes(code.id));
    if (items.length < 2) continue;
    const category = categoryForCode(code);
    const counter = included.filter((item) => item.codes.includes(code.id) && (item.stance === "oppose" || item.stance === "conditional")).slice(0, 2);
    findings.push({
      id: stableId("finding", code.id),
      category,
      type: items.length >= 2 ? "multi_sample" : "direct",
      titleZh: code.labelZh,
      titleEn: code.labelEn,
      bodyZh: `在本样本中，${items.length} 条纳入内容与「${code.labelZh}」有关。${code.definitionZh}`,
      bodyEn: `In this sample, ${items.length} included posts relate to "${code.labelEn}". ${code.definitionEn}`,
      codeIds: [code.id],
      evidence: items.slice(0, 5).map((item) => evidenceRef(item, item.traces.find((trace) => trace.codeId === code.id)?.quoteZh)),
      counterEvidence: counter.map((item) => evidenceRef(item)),
      populationsZh: [...new Set(items.map((item) => item.populationZh).filter(Boolean))].slice(0, 5),
      populationsEn: [...new Set(items.map((item) => item.populationEn).filter(Boolean))].slice(0, 5),
      scenesZh: [...new Set(items.flatMap((item) => item.sceneLabelsZh))].slice(0, 5),
      scenesEn: [...new Set(items.flatMap((item) => item.sceneLabelsEn))].slice(0, 5),
      boundaryZh: "这是本样本中的模式，不代表整体人群比例或购买意愿。",
      boundaryEn: "This is a pattern in this sample, not a population ratio or purchase intent.",
      productImpactZh: `如果这个模式成立，产品应围绕「${code.labelZh}」设计一个可验证的具体能力，而不是一次性做全流程。`,
      productImpactEn: `If this pattern holds, the product should test one concrete capability around "${code.labelEn}" rather than building a full workflow.`,
      aiInferenceZh: "以上产品影响是 AI 基于本样本提出的推断，需人工判断。",
      aiInferenceEn: "The product implication above is an AI inference from this sample and needs human judgment.",
      nextValidationZh: nextValidationForCode(code, plan),
      nextValidationEn: nextValidationForCodeEn(code, plan),
      confidence: items.length >= 4 ? "medium" : "low",
      manualEdited: false,
    });
    if (findings.length >= 10) break;
  }
  return findings;
}

function nextValidationForCode(code: CodeDefV2, plan: ResearchPlanV2): string {
  const user = plan.targetUsersZh[0] || "目标用户";
  return `找 5 位${user}做定向访谈，重点问「${code.labelZh}」最近一次真实经历、当时怎么处理、什么情况下会改变做法。`;
}

function nextValidationForCodeEn(code: CodeDefV2, plan: ResearchPlanV2): string {
  const user = plan.targetUsersEn[0] || "target users";
  return `Interview 5 ${user} about the most recent real experience with "${code.labelEn}", how they handled it, and what would change their approach.`;
}

function ensureCategories(findings: FindingV2[], samples: SampleItemV2[], plan: ResearchPlanV2, coverage: CoverageRowV2[], codebook?: CodebookV2): FindingV2[] {
  const out = [...findings];
  const included = samples.filter((item) => item.included);
  const has = (category: FindingCategory) => out.some((finding) => finding.category === category);
  if (!has("disagreement")) {
    const counter = included.filter((item) => item.stance === "oppose" || item.stance === "conditional").slice(0, 3);
    out.push({
      id: "finding_disagreement_gap",
      category: "disagreement",
      type: "direct",
      titleZh: counter.length > 0 ? "支持与反对同时存在" : "未找到足够反例",
      titleEn: counter.length > 0 ? "Support and opposition coexist" : "Not enough counter-examples found",
      bodyZh: counter.length > 0 ? "样本中存在条件性或反对观点；不能把主结论压成统一口径。" : "本次预算内没有找到足够反例，不能伪造平衡。",
      bodyEn: counter.length > 0 ? "Conditional or opposing views exist; the main conclusion should not be flattened into one voice." : "No sufficient counter-examples were found within this budget; do not fabricate balance.",
      codeIds: [],
      evidence: counter.map((item) => evidenceRef(item)),
      counterEvidence: [],
      populationsZh: [],
      populationsEn: [],
      scenesZh: [],
      scenesEn: [],
      boundaryZh: "反例不足本身就是证据边界。",
      boundaryEn: "A lack of counter-examples is itself an evidence boundary.",
      productImpactZh: "在验证阶段主动找反例，避免只确认原有想法。",
      productImpactEn: "Actively seek counter-examples in validation instead of confirming the original idea.",
      aiInferenceZh: "这是方法层面的提示，不是产品结论。",
      aiInferenceEn: "This is a method-level note, not a product conclusion.",
      nextValidationZh: "在访谈中专门招募 2 位「觉得没必要」的用户，问清条件。",
      nextValidationEn: "Recruit two users who think the tool is unnecessary and ask about their conditions.",
      confidence: "low",
      manualEdited: false,
    });
  }
  if (!has("unknown_gap")) {
    const gaps = coverage.filter((row) => row.status !== "covered").slice(0, 4);
    out.push({
      id: "finding_unknown_gap",
      category: "unknown_gap",
      type: "direct",
      titleZh: "仍未覆盖的问题",
      titleEn: "Still-uncovered questions",
      bodyZh: gaps.length > 0 ? `仍有 ${gaps.length} 个覆盖缺口：${gaps.map((row) => row.value).join("、")}。` : "主要维度已覆盖，但样本仍不是统计代表。",
      bodyEn: gaps.length > 0 ? `${gaps.length} coverage gaps remain: ${gaps.map((row) => row.valueEn).join(", ")}.` : "Main dimensions are covered, but the sample is not statistically representative.",
      codeIds: [],
      evidence: [],
      counterEvidence: [],
      populationsZh: [],
      populationsEn: [],
      scenesZh: [],
      scenesEn: [],
      boundaryZh: "缺口需要在下一步验证中补齐。",
      boundaryEn: "Gaps need to be filled in the next validation step.",
      productImpactZh: "不要基于未覆盖的维度做产品承诺。",
      productImpactEn: "Do not make product commitments on uncovered dimensions.",
      aiInferenceZh: "覆盖缺口由确定性覆盖表生成。",
      aiInferenceEn: "Coverage gaps are generated by the deterministic coverage table.",
      nextValidationZh: "优先用访谈补齐缺口，而不是继续增加知乎查询。",
      nextValidationEn: "Fill the gaps with interviews rather than more Zhihu queries.",
      confidence: "low",
      manualEdited: false,
    });
  }
  if (!has("population_scene")) {
    const sample = included[0];
    if (sample) {
      out.push({
        id: "finding_population_min",
        category: "population_scene",
        type: "direct",
        titleZh: "样本中的人群与场景",
        titleEn: "Populations and scenes in the sample",
        bodyZh: `样本包含 ${included.length} 条内容，来自不同作者；人群标注仍不完整。`,
        bodyEn: `The sample contains ${included.length} posts from different authors; population labels remain incomplete.`,
        codeIds: [],
        evidence: [evidenceRef(sample)],
        counterEvidence: [],
        populationsZh: [],
        populationsEn: [],
        scenesZh: [],
        scenesEn: [],
        boundaryZh: "未标注人群不等于没有人群差异。",
        boundaryEn: "Unlabelled populations do not mean population differences are absent.",
        productImpactZh: "先不要按人群细分做产品承诺。",
        productImpactEn: "Do not make population-specific product commitments yet.",
        aiInferenceZh: "这是确定性样本描述。",
        aiInferenceEn: "This is a deterministic sample description.",
        nextValidationZh: "访谈时按人群配额招募。",
        nextValidationEn: "Use quotas by population in interviews.",
        confidence: "low",
        manualEdited: false,
      });
    }
  }
  const codeSamples = (category: CodeDefV2["category"]) => {
    const ids = new Set((codebook?.codes || []).filter((code) => code.category === category).map((code) => code.id));
    return included.filter((item) => item.codes.some((codeId) => ids.has(codeId))).slice(0, 3);
  };
  if (!has("task_pain")) {
    const evidence = codeSamples("task");
    out.push({
      id: "finding_task_fallback",
      category: "task_pain",
      type: evidence.length >= 2 ? "multi_sample" : "direct",
      titleZh: "任务与痛点仍需补充",
      titleEn: "Tasks and pains need more evidence",
      bodyZh: evidence.length > 0 ? "样本中出现了任务环节的线索，但还不足以形成稳定归纳。" : "本样本没有形成稳定的任务/痛点归纳。",
      bodyEn: evidence.length > 0 ? "Task-step signals appear in the sample but are not yet stable enough for an induction." : "This sample did not produce a stable task/pain induction.",
      codeIds: [...new Set(evidence.flatMap((item) => item.codes))].slice(0, 3),
      evidence: evidence.map((item) => evidenceRef(item)),
      counterEvidence: [],
      populationsZh: [], populationsEn: [], scenesZh: [], scenesEn: [],
      boundaryZh: "仍需更多样本或访谈。", boundaryEn: "Needs more samples or interviews.",
      productImpactZh: "暂不据此做产品承诺。", productImpactEn: "Do not make product commitments from this yet.",
      aiInferenceZh: "这是回退生成的方法提示。", aiInferenceEn: "This is a fallback method note.",
      nextValidationZh: "在访谈中追问最近一次任务链。", nextValidationEn: "Ask about the most recent task chain in interviews.",
      confidence: "low", manualEdited: false,
    });
  }
  if (!has("alternative")) {
    const evidence = codeSamples("alternative");
    out.push({
      id: "finding_alternative_fallback",
      category: "alternative",
      type: evidence.length >= 2 ? "multi_sample" : "direct",
      titleZh: "替代方案证据仍需补充",
      titleEn: "Alternative evidence needs more work",
      bodyZh: evidence.length > 0 ? "样本提到了模板、电子签、平台担保或熟人合作，但不满与适用条件仍不完整。" : "本样本没有形成稳定的替代方案归纳。",
      bodyEn: evidence.length > 0 ? "The sample mentions templates, e-signature, platform guarantees or trusted relationships, but dissatisfaction and conditions remain incomplete." : "This sample did not produce a stable alternative induction.",
      codeIds: [...new Set(evidence.flatMap((item) => item.codes))].slice(0, 3),
      evidence: evidence.map((item) => evidenceRef(item)),
      counterEvidence: [],
      populationsZh: [], populationsEn: [], scenesZh: [], scenesEn: [],
      boundaryZh: "替代方案的适用条件仍需验证。", boundaryEn: "The conditions under which alternatives work still need validation.",
      productImpactZh: "先验证现有方案为何不够，再做替代。", productImpactEn: "Validate why current alternatives fall short before building a replacement.",
      aiInferenceZh: "这是回退生成的方法提示。", aiInferenceEn: "This is a fallback method note.",
      nextValidationZh: "访谈中让用户演示现有方案。", nextValidationEn: "Ask users to walk through their current alternative in interviews.",
      confidence: "low", manualEdited: false,
    });
  }
  if (!has("choice_reason")) {
    const evidence = included.filter((item) => item.stance === "support" || item.stance === "conditional" || item.stance === "oppose").slice(0, 4);
    out.push({
      id: "finding_choice_fallback",
      category: "choice_reason",
      type: evidence.length >= 2 ? "multi_sample" : "direct",
      titleZh: "选择理由与条件",
      titleEn: "Reasons and conditions",
      bodyZh: evidence.length > 0 ? "样本中存在支持、反对或条件性判断；选择理由与使用条件相互绑定，不能压成单一结论。" : "本样本没有形成稳定的选择理由归纳。",
      bodyEn: evidence.length > 0 ? "Support, opposition or conditional views coexist; reasons are bound to conditions and should not be flattened." : "This sample did not produce a stable reasons induction.",
      codeIds: [...new Set(evidence.flatMap((item) => item.codes))].slice(0, 3),
      evidence: evidence.map((item) => evidenceRef(item)),
      counterEvidence: [],
      populationsZh: [], populationsEn: [], scenesZh: [], scenesEn: [],
      boundaryZh: "条件性判断不能被平均成一个态度。", boundaryEn: "Conditional judgments cannot be averaged into one attitude.",
      productImpactZh: "产品定位必须写出适用条件，而不是对所有人宣称有用。", productImpactEn: "Positioning should state the conditions, not claim universal usefulness.",
      aiInferenceZh: "这是回退生成的方法提示。", aiInferenceEn: "This is a fallback method note.",
      nextValidationZh: "访谈中分别招募支持者、反对者和条件性用户。", nextValidationEn: "Recruit supporters, opponents and conditional users in interviews.",
      confidence: "low", manualEdited: false,
    });
  }
  return out.sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
}

export async function synthesizeFindings(
  samples: SampleItemV2[],
  codebook: CodebookV2,
  plan: ResearchPlanV2,
  coverage: CoverageRowV2[],
): Promise<FindingV2[]> {
  const deterministic = findingsFromCodes(samples, codebook, plan);
  if (!hasLlm()) return ensureCategories(deterministic, samples, plan, coverage, codebook);

  const included = samples.filter((item) => item.included);
  const compactSamples = included.slice(0, 20).map((item) => ({
    id: item.id,
    title: item.title,
    population: item.populationZh,
    stance: item.stance,
    codes: item.codes,
    excerpt: item.excerptZh.slice(0, 150),
  }));
  const common = [
    "You are a senior bilingual product researcher. Turn coded real Zhihu samples into findings that could change a product decision.",
    "Rules: every finding must cite existing included sample ids; prefer >=2 independent authors for multi-sample induction. Use only numbers derivable from the sample. Never claim market size, purchase rates, causal effects or population ratios. Distinguish direct expression, multi-sample induction and AI inference. Product implications are AI inference and must be phrased as such.",
    `Decision: ${plan.decisionZh}`,
    `Research questions: ${JSON.stringify(plan.researchQuestions.map((item) => item.questionZh))}`,
    `Codebook: ${JSON.stringify(codebook.codes)}`,
    `Coverage: ${JSON.stringify(coverage.map((row) => ({ dim: row.dimension, value: row.value, status: row.status })))}`,
  ];
  const schema = '{"findings":[{"category":"...","titleZh":"","titleEn":"","bodyZh":"","bodyEn":"","evidenceIds":[],"counterEvidenceIds":[],"populationsZh":[],"populationsEn":[],"scenesZh":[],"scenesEn":[],"boundaryZh":"","boundaryEn":"","productImpactZh":"","productImpactEn":"","aiInferenceZh":"","aiInferenceEn":"","nextValidationZh":"","nextValidationEn":"","confidence":"low|medium|high"}]}';
  const batches = [
    { categories: ["population_scene", "task_pain", "alternative"], count: 4 },
    { categories: ["choice_reason", "disagreement", "unknown_gap"], count: 4 },
  ];
  const out: FindingV2[] = [];
  for (const batch of batches) {
    const prompt = [
      ...common,
      `Categories for this call: ${batch.categories.join(", ")}.`,
      `Return ONLY JSON: ${schema}`,
      `Write exactly ${batch.count} findings covering these categories. Each finding needs 1-3 evidenceIds from the samples below; counterEvidenceIds should cite conditional/opposing samples when available. Return compact single-line JSON; escape newlines as \\n. No markdown.`,
      `Samples: ${JSON.stringify(compactSamples)}`,
    ].join("\n");
    try {
      const raw = await completeJson<{ findings?: unknown }>(prompt, { timeoutMs: 150000, maxTokens: 16000, retries: 2 });
      for (const item of Array.isArray(raw.findings) ? raw.findings : []) {
        if (!item || typeof item !== "object") continue;
        const record = item as Record<string, unknown>;
        const category = CATEGORY_ORDER.includes(record.category as FindingCategory) ? (record.category as FindingCategory) : "task_pain";
        if (!batch.categories.includes(category)) continue;
        const evidenceIds = Array.isArray(record.evidenceIds) ? record.evidenceIds.filter((id): id is string => typeof id === "string") : [];
        const evidence = included.filter((sample) => evidenceIds.includes(sample.id));
        if (evidence.length === 0 && category !== "unknown_gap" && category !== "disagreement") continue;
        const counterIds = Array.isArray(record.counterEvidenceIds) ? record.counterEvidenceIds.filter((id): id is string => typeof id === "string") : [];
        const counters = included.filter((sample) => counterIds.includes(sample.id));
        const titleZh = typeof record.titleZh === "string" ? record.titleZh : "未命名发现";
        const titleEn = typeof record.titleEn === "string" ? record.titleEn : titleZh;
        out.push({
          id: stableId("finding", `${category}_${titleZh}_${out.length}`),
          category,
          type: evidence.length >= 2 ? "multi_sample" : evidence.length === 1 ? "direct" : "ai_inference",
          titleZh,
          titleEn,
          bodyZh: typeof record.bodyZh === "string" ? record.bodyZh : "",
          bodyEn: typeof record.bodyEn === "string" ? record.bodyEn : "",
          codeIds: [...new Set(evidence.flatMap((sample) => sample.codes))].slice(0, 4),
          evidence: evidence.slice(0, 5).map((sample) => evidenceRef(sample)),
          counterEvidence: counters.slice(0, 4).map((sample) => evidenceRef(sample)),
          populationsZh: Array.isArray(record.populationsZh) ? record.populationsZh.filter((value): value is string => typeof value === "string") : [],
          populationsEn: Array.isArray(record.populationsEn) ? record.populationsEn.filter((value): value is string => typeof value === "string") : [],
          scenesZh: Array.isArray(record.scenesZh) ? record.scenesZh.filter((value): value is string => typeof value === "string") : [],
          scenesEn: Array.isArray(record.scenesEn) ? record.scenesEn.filter((value): value is string => typeof value === "string") : [],
          boundaryZh: typeof record.boundaryZh === "string" ? record.boundaryZh : "本样本内成立的模式，不代表整体人群。",
          boundaryEn: typeof record.boundaryEn === "string" ? record.boundaryEn : "A pattern within this sample, not a population claim.",
          productImpactZh: typeof record.productImpactZh === "string" ? record.productImpactZh : "",
          productImpactEn: typeof record.productImpactEn === "string" ? record.productImpactEn : "",
          aiInferenceZh: typeof record.aiInferenceZh === "string" ? record.aiInferenceZh : "产品影响属于 AI 推断，需人工判断。",
          aiInferenceEn: typeof record.aiInferenceEn === "string" ? record.aiInferenceEn : "The product implication is an AI inference and needs human judgment.",
          nextValidationZh: typeof record.nextValidationZh === "string" ? record.nextValidationZh : "用访谈验证这个发现。",
          nextValidationEn: typeof record.nextValidationEn === "string" ? record.nextValidationEn : "Validate this finding with interviews.",
          confidence: (["low", "medium", "high"] as Confidence[]).includes(record.confidence as Confidence) ? (record.confidence as Confidence) : evidence.length >= 2 ? "medium" : "low",
          manualEdited: false,
        });
      }
    } catch (error) {
      console.warn("synthesizeFindings batch failed:", error instanceof Error ? error.message : error);
    }
  }
  const merged = out.length >= 4 ? [...out, ...deterministic.filter((finding) => !out.some((item) => item.category === finding.category))] : deterministic;
  return ensureCategories(merged, samples, plan, coverage, codebook);
}

export function buildInterviewPlan(plan: ResearchPlanV2, findings: FindingV2[]): InterviewPlanV2 {
  const personasZh = plan.targetUsersZh.slice(0, 3);
  const personasEn = plan.targetUsersEn.slice(0, 3);
  const questionsZh = [
    "你最近一次接单/合作，从报价到收到尾款，实际经过了哪些步骤？",
    "有没有遇到过改需求或范围变化？当时怎么谈、最后怎么处理？",
    "验收标准是谁定的？写清楚了吗？出现过争议吗？",
    "尾款被拖过吗？你当时做了什么？最后收回了吗？",
    "你用过合同模板、电子签或平台担保吗？为什么用/为什么不用？",
    "什么情况下你会觉得合同或工具是必要的？什么情况下完全不需要？",
    "如果有一个工具能帮你处理其中一个环节，你最希望它解决哪一个？",
  ];
  const questionsEn = [
    "Walk me through your most recent freelance project, from quoting to receiving final payment. What actually happened?",
    "Have you had scope changes or repeated revisions? How did you negotiate and resolve them?",
    "Who set the acceptance criteria? Were they written down? Was there a dispute?",
    "Have you had late final payment? What did you do, and did you eventually get paid?",
    "Have you used contract templates, e-signature or platform guarantees? Why or why not?",
    "When do you feel a contract or tool is necessary, and when is it completely unnecessary?",
    "If a tool could help with one step, which step would you want it to solve first?",
  ];
  return {
    personasZh,
    personasEn,
    questionsZh,
    questionsEn,
    cheapestTestZh: "先做 5 个 30 分钟的定向访谈（2 位设计师、2 位开发者、1 位撰稿/顾问），不急着做原型。",
    cheapestTestEn: "Run five 30-minute interviews first (2 designers, 2 developers, 1 writer/consultant). Do not build a prototype yet.",
    falsificationZh: "如果多数受访者表示尾款很少拖延、现有模板/熟人合作已足够，或问题只影响体验不影响回款，则放弃或大幅收窄产品假设。",
    falsificationEn: "If most interviewees say late payment is rare, templates/trusted relationships are enough, or the problem only affects experience but not payment, abandon or substantially narrow the product hypothesis.",
  };
}

export function buildDecisionMemo(plan: ResearchPlanV2, findings: FindingV2[], coverage: CoverageRowV2[]): DecisionMemoV2 {
  const visible = findings.filter((finding) => !finding.hidden);
  const key = visible.filter((finding) => finding.category !== "unknown_gap" && finding.category !== "disagreement");
  const counter = visible.flatMap((finding) => [...finding.counterEvidence.map((item) => item.itemId), ...(finding.category === "disagreement" ? finding.evidence.map((item) => item.itemId) : [])]);
  const gaps = coverage.filter((row) => row.status !== "covered");
  const evidenceCount = visible.reduce((total, finding) => total + finding.evidence.length, 0);
  const confidence: Confidence = plan.methodGate.allowedOutput === "hypotheses_only" ? "low" : evidenceCount >= 10 && counter.length > 0 ? "medium" : "low";
  const nextTest = buildInterviewPlan(plan, visible);
  const recommendation = plan.methodGate.allowedOutput === "hypotheses_only" ? "validate_first" : "validate_first";
  const recommendationZh = plan.methodGate.fit === "mismatch"
    ? "先不要投入开发。知乎样本与目标市场不匹配，只能生成假设；先用目标市场的一手证据验证。"
    : "先验证「回款与验收」这一楔子，不要直接做完整合同工具。";
  const recommendationEn = plan.methodGate.fit === "mismatch"
    ? "Do not invest in building yet. The Zhihu sample does not match the target market; validate with first-hand evidence first."
    : "Validate the payment-and-acceptance wedge first; do not build a full contract tool yet.";
  return {
    recommendation,
    recommendationZh,
    recommendationEn,
    confidence,
    confidenceReasonZh: `本次共 ${key.length} 条关键发现、${counter.length} 条反例/条件性证据、${gaps.length} 个覆盖缺口。知乎是非概率公开样本，置信度只表示本样本内的证据密度。`,
    confidenceReasonEn: `${key.length} key findings, ${counter.length} counter/conditional evidence items, ${gaps.length} coverage gaps. Zhihu is a non-probability public sample; confidence only reflects evidence density within this sample.`,
    evidenceIds: [...new Set(key.flatMap((finding) => finding.evidence.map((item) => item.itemId)))].slice(0, 8),
    counterIds: [...new Set(counter)].slice(0, 8),
    assumptionsZh: plan.productHypothesesZh,
    assumptionsEn: plan.productHypothesesEn,
    killCriteriaZh: [
      "多数访谈对象表示尾款拖延很少发生，或现有模板/熟人合作已经足够。",
      "用户只愿意为「写合同」付费，而不愿意为「验收/回款」付费。",
      "问题只影响体验，不影响是否接单或是否收到钱。",
    ],
    killCriteriaEn: [
      "Most interviewees say late payment is rare, or templates/trusted relationships are already enough.",
      "Users would pay for contract writing but not for acceptance or payment collection.",
      "The problem only affects experience, not whether they take work or get paid.",
    ],
    nextTest,
    doNotDoZh: ["不要先做完整合同生成、电子签或全流程 SaaS。", "不要把知乎计数当成付费意愿或市场规模。", "不要先做企业采购版本。"],
    doNotDoEn: ["Do not build full contract generation, e-signature or an end-to-end SaaS first.", "Do not treat Zhihu counts as willingness to pay or market size.", "Do not build an enterprise procurement version first."],
    disclosureZh: `数据：知乎公开搜索，${plan.budget.maxQueries} 次查询预算内执行；非概率样本，不能外推。编码：LLM 辅助，用户可修改；计数由确定性程序生成。限制：${plan.methodGate.cannotProveZh.join("；")}。`,
    disclosureEn: `Data: public Zhihu search within a ${plan.budget.maxQueries}-query budget; non-probability sample, not projectable. Coding: LLM-assisted and human-editable; counts are deterministic. Limits: ${plan.methodGate.cannotProveEn.join("; ")}.`,
  };
}

export function buildReport(study: Omit<StudyV2, "report"> & { report?: BilingualReportV2 }): BilingualReportV2 {
  const findings = study.findings.filter((finding) => !finding.hidden);
  const included = study.sample.filter((item) => item.included);
  const categories = CATEGORY_ORDER.map((category) => {
    const rows = findings.filter((finding) => finding.category === category);
    return {
      titleZh: categoryZh(category),
      titleEn: categoryEn(category),
      bodyZh: rows.map((finding) => `- ${finding.titleZh}：${finding.bodyZh}`).join("\n"),
      bodyEn: rows.map((finding) => `- ${finding.titleEn}: ${finding.bodyEn}`).join("\n"),
    };
  });
  const quotes = included.slice(0, 24).map((item) => ({
    itemId: item.id,
    title: item.title,
    author: item.author,
    url: item.url,
    quoteZh: item.excerptZh,
    quoteEn: item.excerptEn,
    findingIds: findings.filter((finding) => finding.evidence.some((evidence) => evidence.itemId === item.id)).map((finding) => finding.id),
  }));
  return {
    generatedAt: nowIso(),
    decisionZh: study.plan.decisionZh,
    decisionEn: study.plan.decisionEn,
    summaryZh: `本简报基于 ${included.length} 条纳入样本、${study.vocabulary.length} 个从真实讨论中发现的关键词，服务一个产品决策：${study.plan.decisionZh}`,
    summaryEn: `This brief is based on ${included.length} included samples and ${study.vocabulary.length} vocabulary items discovered in real discussions. It serves one product decision: ${study.plan.decisionEn}`,
    sections: [
      {
        titleZh: "关键发现",
        titleEn: "Key findings",
        bodyZh: findings.filter((finding) => finding.category !== "unknown_gap").map((finding) => `${finding.titleZh}：${finding.bodyZh}`).join("\n\n"),
        bodyEn: findings.filter((finding) => finding.category !== "unknown_gap").map((finding) => `${finding.titleEn}: ${finding.bodyEn}`).join("\n\n"),
      },
      ...categories,
    ],
    findings,
    quotes,
    cannotProveZh: study.plan.methodGate.cannotProveZh,
    cannotProveEn: study.plan.methodGate.cannotProveEn,
    nextValidation: study.memo.nextTest,
    wordlist: study.vocabulary.map((item) => ({
      raw: item.raw,
      source: item.source,
      sourceSampleId: item.sourceSampleId,
      broughtNewTheme: item.broughtNewTheme,
      type: item.type,
    })),
  };
}

function categoryZh(category: FindingCategory): string {
  return { population_scene: "人群与场景", task_pain: "任务与痛点", alternative: "当前替代方案", choice_reason: "选择理由与不满", disagreement: "分歧与反例", unknown_gap: "未知问题与证据缺口" }[category];
}

function categoryEn(category: FindingCategory): string {
  return { population_scene: "Populations and scenes", task_pain: "Tasks and pains", alternative: "Current alternatives", choice_reason: "Reasons and dissatisfaction", disagreement: "Disagreements and counter-evidence", unknown_gap: "Unknowns and evidence gaps" }[category];
}

export function projectStudy(study: StudyV2): StudyV2 {
  const included = new Set(study.sample.filter((item) => item.included).map((item) => item.id));
  const findings = study.findings.map((finding) => {
    const evidence = finding.evidence.filter((item) => {
      if (!included.has(item.itemId)) return false;
      if (finding.codeIds.length === 0) return true;
      const sample = study.sample.find((row) => row.id === item.itemId);
      return Boolean(sample && sample.codes.some((codeId) => finding.codeIds.includes(codeId)));
    });
    const counter = finding.counterEvidence.filter((item) => included.has(item.itemId));
    const hidden = evidence.length === 0 && finding.category !== "unknown_gap" && finding.category !== "disagreement";
    return {
      ...finding,
      evidence,
      counterEvidence: counter,
      hidden,
      type: (evidence.length >= 2 ? "multi_sample" : evidence.length === 1 ? "direct" : "ai_inference") as FindingV2["type"],
      confidence: (evidence.length >= 3 ? "medium" : "low") as Confidence,
    };
  });
  const memo = buildDecisionMemo(study.plan, findings, study.coverage);
  const sample = study.sample.map((item) => ({
    ...item,
    supportFindingIds: findings.filter((finding) => finding.evidence.some((evidence) => evidence.itemId === item.id)).map((finding) => finding.id),
    refuteFindingIds: findings.filter((finding) => finding.counterEvidence.some((evidence) => evidence.itemId === item.id)).map((finding) => finding.id),
  }));
  const next = { ...study, sample, findings, memo };
  return { ...next, report: buildReport(next) };
}
