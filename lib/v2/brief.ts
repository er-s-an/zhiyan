import type { InitialBelief, ResearchPlanV2, SampleItemV2, StudyV2, VocabularyItemV2 } from "./types";

export type ChangeType = "support" | "revise" | "refute" | "new_angle";

export type EvidenceStrength = "strong" | "medium" | "weak" | "insufficient";

export type BriefRecommendation = "conditional_proceed" | "hold" | "stop" | "insufficient_evidence";

export type StopReasonType = "budget_exhausted" | "saturation" | "no_results" | "error";

export interface BriefEvidence {
  itemId: string;
  title: string;
  url: string;
  author: string;
  quoteZh: string;
  quoteEn: string;
  publishDate: string;
  marketing: boolean;
}

export interface BeliefUpdateV21 {
  id: string;
  initialAssumptionZh: string;
  initialAssumptionEn: string;
  newUnderstandingZh: string;
  newUnderstandingEn: string;
  changeType: ChangeType;
  evidenceIds: string[];
  counterIds: string[];
  productImplicationZh: string;
  productImplicationEn: string;
  nextActionZh: string;
  nextActionEn: string;
  status: "supported" | "to_validate";
}

export interface OpportunityHypothesisV21 {
  id: string;
  targetUserZh: string;
  targetUserEn: string;
  scenarioZh: string;
  scenarioEn: string;
  problemZh: string;
  problemEn: string;
  currentAlternativesZh: string[];
  currentAlternativesEn: string[];
  whyAlternativesInsufficientZh: string;
  whyAlternativesInsufficientEn: string;
  productDirectionZh: string;
  productDirectionEn: string;
  expectedOutcomeZh: string;
  expectedOutcomeEn: string;
  falsificationSignalZh: string;
  falsificationSignalEn: string;
  evidenceIds: string[];
  counterIds: string[];
  evidenceStrength: EvidenceStrength;
  strengthReasonZh: string;
  strengthReasonEn: string;
  unknownsZh: string[];
  unknownsEn: string[];
  nextValidationZh: string;
  nextValidationEn: string;
  hidden?: boolean;
}

export interface ProductOptionV21 {
  id: string;
  titleZh: string;
  titleEn: string;
  scopeZh: string;
  scopeEn: string;
  evidenceIds: string[];
  counterIds: string[];
  riskZh: string;
  riskEn: string;
  recommendation: "validate_first" | "hold" | "not_now";
  nextValidationZh: string;
  nextValidationEn: string;
}

export interface HighImpactTermV21 {
  raw: string;
  type: string;
  sourceSampleId?: string;
  sourceQuoteZh?: string;
  proposedQuery?: string;
  whyZh: string;
  whyEn: string;
}

export interface RoundSnapshotV21 {
  round: number;
  objectiveZh: string;
  objectiveEn: string;
  queryIds: string[];
  newTerms: HighImpactTermV21[];
  newUnderstandingZh: string;
  newUnderstandingEn: string;
  coverageChangeZh: string;
  coverageChangeEn: string;
  nextRoundReasonZh: string;
  nextRoundReasonEn: string;
  preliminaryOnly: boolean;
  stopReason?: StopReasonV21;
}

export interface StopReasonV21 {
  type: StopReasonType;
  detailZh: string;
  detailEn: string;
}

export interface NextValidationV21 {
  personasZh: string[];
  personasEn: string[];
  questionsZh: string[];
  questionsEn: string[];
  cheapestTestZh: string;
  cheapestTestEn: string;
  falsificationZh: string;
  falsificationEn: string;
}

export interface DecisionBriefV21 {
  id: string;
  studyId: string;
  initialBelief: InitialBelief;
  decisionQuestionZh: string;
  decisionQuestionEn: string;
  recommendation: BriefRecommendation;
  recommendationReasonZh: string;
  recommendationReasonEn: string;
  validateFirstZh: string[];
  validateFirstEn: string[];
  doNotDoZh: string[];
  doNotDoEn: string[];
  beliefUpdates: BeliefUpdateV21[];
  opportunities: OpportunityHypothesisV21[];
  productOptions: ProductOptionV21[];
  nextValidation: NextValidationV21;
  unansweredZh: string[];
  unansweredEn: string[];
  boundariesZh: string[];
  boundariesEn: string[];
  highImpactTerms: HighImpactTermV21[];
  roundSnapshots: RoundSnapshotV21[];
  stopReason: StopReasonV21;
  evidenceIndex: Record<string, BriefEvidence>;
  aiDisclosureZh: string;
  aiDisclosureEn: string;
  generatedAt: string;
  demo: boolean;
}

export function buildEvidence(study: StudyV2): Record<string, BriefEvidence> {
  const out: Record<string, BriefEvidence> = {};
  for (const item of study.sample) {
    out[item.id] = {
      itemId: item.id,
      title: item.title,
      url: item.url,
      author: item.author,
      quoteZh: item.excerptZh,
      quoteEn: item.excerptEn,
      publishDate: item.publishDate,
      marketing: item.flags.marketing,
    };
  }
  return out;
}

function independentAuthors(ids: string[], evidence: Record<string, BriefEvidence>): number {
  return new Set(ids.map((id) => evidence[id]?.author).filter(Boolean)).size;
}

export function strengthFor(ids: string[], counterIds: string[], evidence: Record<string, BriefEvidence>): { strength: EvidenceStrength; reasonZh: string; reasonEn: string } {
  const valid = ids.filter((id) => evidence[id]);
  const authors = independentAuthors(valid, evidence);
  const marketingCount = valid.filter((id) => evidence[id]?.marketing).length;
  const institutional = valid.filter((id) => /公司|科技|客栈|服务|机构|中心|团队|官方|IP|智能中枢/.test(evidence[id]?.author || "")).length;
  const counters = counterIds.filter((id) => evidence[id]).length;
  if (valid.length === 0) {
    return { strength: "insufficient", reasonZh: "没有可回查的纳入证据。", reasonEn: "No included evidence can be traced." };
  }
  if (valid.length === 1) {
    return { strength: "weak", reasonZh: "只有一条证据，不能作为稳定产品判断。", reasonEn: "Only one piece of evidence; not enough for a stable product judgment." };
  }
  if (marketingCount === valid.length) {
    return { strength: "weak", reasonZh: "证据全部来自营销/推广性质内容。", reasonEn: "All evidence is marketing or promotional." };
  }
  if (valid.length >= 4 && authors >= 3 && counters > 0 && institutional <= 1) {
    return {
      strength: "strong",
      reasonZh: `${valid.length} 条证据、${authors} 位不同作者，并有 ${counters} 条反例/条件性证据。`,
      reasonEn: `${valid.length} evidence items from ${authors} authors, with ${counters} counter/conditional evidence items.`,
    };
  }
  if (valid.length >= 3 && authors >= 3 && counters > 0 && institutional === 0) {
    return {
      strength: "strong",
      reasonZh: `${valid.length} 条证据、${authors} 位不同作者，并有 ${counters} 条反例/条件性证据。`,
      reasonEn: `${valid.length} evidence items from ${authors} authors, with ${counters} counter/conditional evidence items.`,
    };
  }
  return {
    strength: "medium",
    reasonZh: `${valid.length} 条证据、${authors} 位作者，${counters} 条反例/条件性证据；仍需访谈确认。`,
    reasonEn: `${valid.length} evidence items from ${authors} authors and ${counters} counter/conditional items; still needs interviews.`,
  };
}

export function buildRoundSnapshots(study: StudyV2, stopReason: StopReasonV21): RoundSnapshotV21[] {
  const rounds = [...new Set(study.runs.map((run) => run.round))].sort((a, b) => a - b);
  const sampleById = new Map(study.sample.map((item) => [item.id, item]));
  return rounds.map((round, index) => {
    const runs = study.runs.filter((run) => run.round === round);
    const previous = study.vocabulary.filter((item) => {
      const sample = item.sourceSampleId ? sampleById.get(item.sourceSampleId) : undefined;
      return sample?.round === round;
    });
    const terms = previous.slice(0, 4).map((item) => termToImpact(item, sampleById.get(item.sourceSampleId || "")));
    const next = study.runs.filter((run) => run.round === round + 1);
    const nextTermsZh = terms.map((term) => "「" + term.raw + "」").join("、") || "新的讨论角度";
    const nextTermsEn = terms.map((term) => '"' + term.raw + '"').join(", ") || "new angles";
    const nextReason = next.length > 0 ? "因为发现了 " + nextTermsZh + "，所以下一轮继续搜索这些表达。" : "";
    const nextReasonEn = next.length > 0 ? "Because the study found " + nextTermsEn + ", the next round searched for those expressions." : "";
    return {
      round,
      objectiveZh: index === 0 ? "从原始产品问题出发，验证用户是否在讨论这个问题。" : index === 1 ? "跟随新词，补齐场景、替代方案和交付环节。" : "寻找反例、条件性观点和仍未回答的问题。",
      objectiveEn: index === 0 ? "Start from the original product question and check whether users discuss it." : index === 1 ? "Follow new vocabulary into scenes, alternatives and delivery." : "Look for counter-examples, conditional views and unanswered questions.",
      queryIds: runs.map((run) => run.id),
      newTerms: terms,
      newUnderstandingZh: terms.length > 0 ? "这一轮出现了「" + terms.map((term) => term.raw).join("、") + "」等表达，说明问题不止停留在产品词本身。" : "这一轮没有出现足以改变研究方向的表达。",
      newUnderstandingEn: terms.length > 0 ? "This round surfaced expressions such as " + nextTermsEn + ", suggesting the problem is not limited to the product category." : "This round did not surface expressions that changed the research direction.",
      coverageChangeZh: "本轮执行 " + runs.length + " 条查询，新增纳入 " + runs.reduce((total, run) => total + run.includedCount, 0) + " 条样本。",
      coverageChangeEn: runs.length + " queries ran; " + runs.reduce((total, run) => total + run.includedCount, 0) + " samples were added.",
      nextRoundReasonZh: nextReason,
      nextRoundReasonEn: nextReasonEn,
      preliminaryOnly: true,
      stopReason: index === rounds.length - 1 ? stopReason : undefined,
    };
  });
}

function termToImpact(item: VocabularyItemV2, sample?: SampleItemV2): HighImpactTermV21 {
  return {
    raw: item.raw,
    type: item.type,
    sourceSampleId: item.sourceSampleId,
    sourceQuoteZh: item.sourceQuoteZh,
    proposedQuery: item.proposedQuery,
    whyZh: item.gapZh || (sample ? `来自「${sample.title}」的讨论` : "来自真实样本"),
    whyEn: item.gapEn || (sample ? `From the discussion "${sample.title}"` : "From a real sample"),
  };
}

export function highImpactTerms(study: StudyV2, limit = 5): HighImpactTermV21[] {
  const byId = new Map(study.sample.map((item) => [item.id, item]));
  const scored = study.vocabulary
    .filter((item) => item.source === "sample" && item.sourceSampleId)
    .map((item) => {
      const sample = byId.get(item.sourceSampleId || "");
      let score = 0;
      if (item.broughtNewTheme) score += 2;
      if (item.proposedQuery && study.runs.some((run) => run.query === item.proposedQuery)) score += 3;
      if (sample?.included) score += 2;
      if (item.type === "alternative" || item.type === "task" || item.type === "symptom") score += 1;
      return { item, sample, score };
    })
    .sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const out: HighImpactTermV21[] = [];
  for (const { item, sample } of scored) {
    if (seen.has(item.raw)) continue;
    seen.add(item.raw);
    out.push(termToImpact(item, sample));
    if (out.length >= limit) break;
  }
  return out;
}

export function stopReasonFor(study: StudyV2): StopReasonV21 {
  const maxQueries = study.plan.budget.maxQueries;
  const maxCandidates = study.plan.budget.maxCandidates;
  if (study.candidatesScanned >= maxCandidates || study.runs.length >= maxQueries) {
    return {
      type: "budget_exhausted",
      detailZh: "达到查询/候选预算上限。这是预算停止，不等于主题饱和。",
      detailEn: "Reached the query/candidate budget. This is a budget stop, not saturation.",
    };
  }
  if (study.findings.some((finding) => finding.category === "unknown_gap")) {
    return {
      type: "no_results",
      detailZh: "仍有未覆盖方向，但本次预算内没有形成新的稳定主题。",
      detailEn: "Some directions remain uncovered, but no new stable theme emerged within this budget.",
    };
  }
  return {
    type: "saturation",
    detailZh: "连续扩展没有新增重要主题，按停止规则结束。",
    detailEn: "Consecutive expansions produced no important new themes; stopped by rule.",
  };
}

export function defaultInitialBelief(study: StudyV2): InitialBelief {
  if (study.plan.initialBelief) return study.plan.initialBelief;
  return {
    decisionQuestionZh: study.plan.decisionZh,
    decisionQuestionEn: study.plan.decisionEn,
    productIdeaZh: study.plan.brief.product,
    productIdeaEn: study.plan.brief.product,
    targetUsersZh: study.plan.targetUsersZh,
    targetUsersEn: study.plan.targetUsersEn,
    assumptionsZh: study.plan.productHypothesesZh,
    assumptionsEn: study.plan.productHypothesesEn,
    concernsZh: [study.plan.brief.biggestRisk],
    concernsEn: [study.plan.brief.biggestRisk],
    capturedAt: study.plan.createdAt,
    planVersion: study.plan.version,
  };
}

function cleanFindingText(value: string): string {
  return value
    .replace(/src_[a-z0-9]+/gi, "")
    .replace(/(直接表达|多样本归纳|AI ?推断|Direct expression|Multi-sample|AI inference)[:：]\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanLines(value: string): string[] {
  return cleanFindingText(value)
    .split(/[。；;]|\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 4)
    .slice(0, 4);
}

export function buildHeuristicBrief(study: StudyV2): DecisionBriefV21 {
  const initialBelief = defaultInitialBelief(study);
  const evidence = buildEvidence(study);
  const visible = study.findings.filter((finding) => !finding.hidden);
  const stopReason = stopReasonFor(study);
  const highTerms = highImpactTerms(study);
  const updates: BeliefUpdateV21[] = visible.slice(0, 3).map((finding, index) => ({
    id: `belief_${index + 1}`,
    initialAssumptionZh: initialBelief.assumptionsZh[index] || initialBelief.assumptionsZh[0] || "",
    initialAssumptionEn: initialBelief.assumptionsEn[index] || initialBelief.assumptionsEn[0] || "",
    newUnderstandingZh: cleanFindingText(finding.bodyZh),
    newUnderstandingEn: cleanFindingText(finding.bodyEn),
    changeType: finding.category === "disagreement" ? "new_angle" : "revise",
    evidenceIds: finding.evidence.map((item) => item.itemId),
    counterIds: finding.counterEvidence.map((item) => item.itemId),
    productImplicationZh: cleanFindingText(finding.productImpactZh),
    productImplicationEn: cleanFindingText(finding.productImpactEn),
    nextActionZh: cleanFindingText(finding.nextValidationZh),
    nextActionEn: cleanFindingText(finding.nextValidationEn),
    status: finding.evidence.length >= 2 ? "supported" : "to_validate",
  }));
  const cluster = (categories: string[]) => visible.filter((finding) => categories.includes(finding.category));
  const groups = [cluster(["task_pain", "population_scene"]), cluster(["alternative", "choice_reason"]), cluster(["disagreement", "unknown_gap"])].filter((group) => group.length > 0);
  const opportunities: OpportunityHypothesisV21[] = groups.slice(0, 3).map((group, index) => {
    const evidenceIds = [...new Set(group.flatMap((finding) => finding.evidence.map((item) => item.itemId)))];
    const counterIds = [...new Set(group.flatMap((finding) => finding.counterEvidence.map((item) => item.itemId)))];
    const strength = strengthFor(evidenceIds, counterIds, evidence);
    return {
      id: `opportunity_${index + 1}`,
      targetUserZh: group[0].populationsZh.filter(Boolean).slice(0, 2).join("、") || study.plan.targetUsersZh[0] || "待确认人群",
      targetUserEn: group[0].populationsEn.filter(Boolean).slice(0, 2).join(", ") || study.plan.targetUsersEn[0] || "Population to confirm",
      scenarioZh: group[0].scenesZh.filter(Boolean).slice(0, 2).join("、") || "待确认场景",
      scenarioEn: group[0].scenesEn.filter(Boolean).slice(0, 2).join(", ") || "Scene to confirm",
      problemZh: cleanFindingText(group[0].titleZh),
      problemEn: cleanFindingText(group[0].titleEn),
      currentAlternativesZh: cleanLines(visible.find((finding) => finding.category === "alternative")?.bodyZh || ""),
      currentAlternativesEn: cleanLines(visible.find((finding) => finding.category === "alternative")?.bodyEn || ""),
      whyAlternativesInsufficientZh: cleanFindingText(visible.find((finding) => finding.category === "alternative")?.bodyZh || group.find((finding) => finding.category === "choice_reason")?.bodyZh || "需要进一步确认现有替代方案的不足。").slice(0, 300),
      whyAlternativesInsufficientEn: cleanFindingText(visible.find((finding) => finding.category === "alternative")?.bodyEn || group.find((finding) => finding.category === "choice_reason")?.bodyEn || "The gap in current alternatives needs further validation.").slice(0, 360),
      productDirectionZh: cleanFindingText(group[0].productImpactZh) || cleanFindingText(group[0].titleZh),
      productDirectionEn: cleanFindingText(group[0].productImpactEn) || cleanFindingText(group[0].titleEn),
      expectedOutcomeZh: "在验证阶段观察用户是否愿意改变现有流程。",
      expectedOutcomeEn: "Observe whether users are willing to change their current workflow during validation.",
      falsificationSignalZh: cleanFindingText(group[0].nextValidationZh),
      falsificationSignalEn: cleanFindingText(group[0].nextValidationEn),
      evidenceIds,
      counterIds,
      evidenceStrength: strength.strength,
      strengthReasonZh: strength.reasonZh,
      strengthReasonEn: strength.reasonEn,
      unknownsZh: study.memo.doNotDoZh,
      unknownsEn: study.memo.doNotDoEn,
      nextValidationZh: group[0].nextValidationZh,
      nextValidationEn: group[0].nextValidationEn,
    };
  });
  return {
    id: `brief_${study.id}`,
    studyId: study.id,
    initialBelief,
    decisionQuestionZh: study.plan.decisionZh,
    decisionQuestionEn: study.plan.decisionEn,
    recommendation: study.plan.methodGate.fit === "mismatch" ? "insufficient_evidence" : "conditional_proceed",
    recommendationReasonZh: study.plan.methodGate.fit === "mismatch" ? "目标市场与知乎样本不匹配，不能给出产品建议。" : "证据足以形成一个值得验证的方向，但不足以直接进入开发。",
    recommendationReasonEn: study.plan.methodGate.fit === "mismatch" ? "The target market does not match the Zhihu sample; no product recommendation is allowed." : "The evidence supports a direction worth validating, but not direct development.",
    validateFirstZh: study.memo.nextTest.questionsZh.slice(0, 3),
    validateFirstEn: study.memo.nextTest.questionsEn.slice(0, 3),
    doNotDoZh: study.memo.doNotDoZh,
    doNotDoEn: study.memo.doNotDoEn,
    beliefUpdates: updates,
    opportunities,
    productOptions: opportunities.map((item, index) => ({
      id: `option_${index + 1}`,
      titleZh: item.productDirectionZh,
      titleEn: item.productDirectionEn,
      scopeZh: item.problemZh,
      scopeEn: item.problemEn,
      evidenceIds: item.evidenceIds,
      counterIds: item.counterIds,
      riskZh: item.falsificationSignalZh,
      riskEn: item.falsificationSignalEn,
      recommendation: index === 0 ? "validate_first" : "hold",
      nextValidationZh: item.nextValidationZh,
      nextValidationEn: item.nextValidationEn,
    })),
    nextValidation: study.memo.nextTest,
    unansweredZh: [...new Set([...study.plan.methodGate.cannotProveZh, ...study.findings.filter((item) => item.category === "unknown_gap").map((item) => item.bodyZh)])],
    unansweredEn: [...new Set([...study.plan.methodGate.cannotProveEn, ...study.findings.filter((item) => item.category === "unknown_gap").map((item) => item.bodyEn)])],
    boundariesZh: study.plan.methodGate.cannotProveZh,
    boundariesEn: study.plan.methodGate.cannotProveEn,
    highImpactTerms: highTerms,
    roundSnapshots: buildRoundSnapshots(study, stopReason),
    stopReason,
    evidenceIndex: evidence,
    aiDisclosureZh: "研究由确定性程序执行，LLM 辅助语义编码与描述生成；用户可修改证据与主题，最终计数由程序重算。",
    aiDisclosureEn: "The study is executed by deterministic code; LLM assists semantic coding and descriptions. Users can edit evidence and themes; counts are recomputed by code.",
    generatedAt: new Date().toISOString(),
    demo: study.demo,
  };
}

export function recomputeBrief(brief: DecisionBriefV21, study: StudyV2): DecisionBriefV21 {
  const included = new Set(study.sample.filter((item) => item.included).map((item) => item.id));
  const evidence = buildEvidence(study);
  const opportunities = brief.opportunities.map((opportunity) => {
    const evidenceIds = opportunity.evidenceIds.filter((id) => included.has(id));
    const counterIds = opportunity.counterIds.filter((id) => included.has(id));
    const strength = strengthFor(evidenceIds, counterIds, evidence);
    return {
      ...opportunity,
      evidenceIds,
      counterIds,
      evidenceStrength: strength.strength,
      strengthReasonZh: strength.reasonZh,
      strengthReasonEn: strength.reasonEn,
      hidden: evidenceIds.length === 0,
    };
  });
  const updates = brief.beliefUpdates.map((update) => ({
    ...update,
    evidenceIds: update.evidenceIds.filter((id) => included.has(id)),
    counterIds: update.counterIds.filter((id) => included.has(id)),
    status: update.evidenceIds.some((id) => included.has(id)) ? update.status : "to_validate" as const,
  }));
  const visibleOpportunities = opportunities.filter((item) => !item.hidden);
  const recommendation: BriefRecommendation = visibleOpportunities.some((item) => item.evidenceStrength === "strong" || item.evidenceStrength === "medium")
    ? brief.recommendation
    : "insufficient_evidence";
  return {
    ...brief,
    opportunities,
    beliefUpdates: updates,
    recommendation,
    recommendationReasonZh: recommendation === "insufficient_evidence" ? "搁置关键证据后，当前证据不足以支持产品建议。" : brief.recommendationReasonZh,
    recommendationReasonEn: recommendation === "insufficient_evidence" ? "After holding out key evidence, the remaining evidence is insufficient for a product recommendation." : brief.recommendationReasonEn,
    evidenceIndex: evidence,
    generatedAt: new Date().toISOString(),
  };
}

export function validateBrief(brief: DecisionBriefV21, study: StudyV2): string[] {
  const errors: string[] = [];
  const included = new Set(study.sample.filter((item) => item.included).map((item) => item.id));
  if (brief.opportunities.length > 3) errors.push("TOO_MANY_OPPORTUNITIES");
  if (brief.beliefUpdates.length > 3) errors.push("TOO_MANY_BELIEF_UPDATES");
  for (const update of brief.beliefUpdates) {
    if (!update.initialAssumptionZh || !update.newUnderstandingZh) errors.push(`BELIEF_INCOMPLETE:${update.id}`);
    for (const id of update.evidenceIds) if (!included.has(id)) errors.push(`BELIEF_EVIDENCE_NOT_INCLUDED:${update.id}:${id}`);
  }
  for (const opportunity of brief.opportunities) {
    if (!opportunity.evidenceIds.length) errors.push(`OPPORTUNITY_WITHOUT_EVIDENCE:${opportunity.id}`);
    for (const id of opportunity.evidenceIds) if (!included.has(id)) errors.push(`OPPORTUNITY_EVIDENCE_NOT_INCLUDED:${opportunity.id}:${id}`);
    if (opportunity.evidenceStrength === "strong" && opportunity.counterIds.length === 0) errors.push(`STRONG_WITHOUT_COUNTER:${opportunity.id}`);
  }
  if (!brief.nextValidation.questionsZh.length) errors.push("NO_NEXT_VALIDATION");
  if (!brief.unansweredZh.length) errors.push("NO_UNANSWERED");
  if (brief.stopReason.type === "saturation" && brief.stopReason.detailZh.includes("预算")) errors.push("STOP_REASON_CONFLATED");
  for (const term of brief.highImpactTerms) {
    if (term.sourceSampleId && !included.has(term.sourceSampleId)) errors.push(`TERM_SOURCE_NOT_INCLUDED:${term.raw}`);
  }
  return errors;
}
