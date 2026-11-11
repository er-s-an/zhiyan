import { runAdaptiveExploration, type ExplorePort } from "./explore";
import { buildDecisionMemo, buildReport, codeSamples, induceCodebook, projectStudy, synthesizeFindings } from "./semantic";
import type { ResearchPlanV2, StudyV2 } from "./types";

export interface PipelineDeps {
  port: ExplorePort;
  lite?: boolean;
  onProgress?: (progress: { step: string; messageZh: string; messageEn: string; query?: string }) => void;
}

export async function runStudy(plan: ResearchPlanV2, confirmed: boolean, deps: PipelineDeps): Promise<StudyV2> {
  if (!confirmed) throw new Error("CONFIRM_REQUIRED");
  if (plan.queryMatrix.length === 0) throw new Error("PLAN_INVALID");
  if (!plan.methodGate) throw new Error("METHOD_GATE_REQUIRED");

  const exploration = await runAdaptiveExploration(plan, deps.port, deps.onProgress && ((progress) => deps.onProgress?.({ step: progress.step, messageZh: progress.messageZh, messageEn: progress.messageEn, query: progress.query })));
  const included = exploration.sample.filter((item) => item.included);
  if (included.length === 0) throw new Error("NO_INCLUDED_SAMPLES");

  deps.onProgress?.({ step: "code", messageZh: "正在做 LLM 辅助语义编码", messageEn: "Running LLM-assisted semantic coding" });
  const codebook = await induceCodebook(included, exploration.plan);
  let coded = await codeSamples(exploration.sample, codebook, exploration.plan, deps.lite ? 12 : undefined);
  coded = coded.map((item) => ({ ...item, sceneIds: item.sceneLabelsEn.map((_, index) => `scene_${index}`) }));

  deps.onProgress?.({ step: "report", messageZh: "正在生成发现、反例与双语简报", messageEn: "Building findings, counter-evidence and the bilingual brief" });
  const findings = await synthesizeFindings(coded, codebook, exploration.plan, exploration.coverage);
  const memo = buildDecisionMemo(exploration.plan, findings, exploration.coverage);
  const generatedAt = new Date().toISOString();
  const skeleton = {
    id: `study_${Date.now()}`,
    plan: exploration.plan,
    confirmedAt: exploration.plan.confirmedAt || generatedAt,
    generatedAt,
    rounds: exploration.rounds,
    runs: exploration.runs,
    retrieval: exploration.retrieval,
    candidatesScanned: exploration.candidatesScanned,
    sample: coded,
    vocabulary: exploration.vocabulary,
    coverage: exploration.coverage,
    stopReasonZh: exploration.stopReasonZh,
    stopReasonEn: exploration.stopReasonEn,
    coding: codebook,
    findings,
    memo,
    auxiliary: exploration.auxiliary,
    hotScan: exploration.hotScan,
    demo: false,
  } satisfies Omit<StudyV2, "report">;
  const study: StudyV2 = { ...skeleton, report: buildReport(skeleton) };
  return projectStudy(study);
}

export function validateStudy(study: StudyV2): string[] {
  const errors: string[] = [];
  if (!study.plan.confirmed) errors.push("PLAN_NOT_CONFIRMED");
  if (study.sample.filter((item) => item.included).length === 0) errors.push("NO_INCLUDED_SAMPLES");
  if (study.vocabulary.filter((item) => item.source === "sample" && item.sourceSampleId).length < 3) errors.push("NO_SOURCED_VOCABULARY");
  if (!study.retrieval.some((entry) => entry.kind === "zhihu_search" && !entry.error)) errors.push("NO_SEARCH");
  if (!study.rounds || study.rounds < 1) errors.push("NO_ROUNDS");
  if (study.plan.versions.length < 2) errors.push("NO_PLAN_EXPANSION");
  if (!study.runs.some((run) => run.round >= 1)) errors.push("NO_FOLLOWUP_QUERY");
  if (!study.runs.some((run) => run.dimension === "counter")) errors.push("NO_COUNTER_QUERY");
  if (!study.findings.some((finding) => finding.category === "disagreement" || finding.counterEvidence.length > 0)) errors.push("NO_COUNTER_EVIDENCE");
  if (study.findings.length === 0) errors.push("NO_FINDINGS");
  if (!study.findings.every((finding) => finding.titleZh && finding.titleEn && finding.bodyZh && finding.bodyEn)) errors.push("FINDING_BILINGUAL_INCOMPLETE");
  if (!study.report.decisionZh || !study.report.decisionEn) errors.push("REPORT_BILINGUAL_INCOMPLETE");
  if (study.report.quotes.some((quote) => !quote.url.startsWith("https://"))) errors.push("QUOTE_LINK_MISSING");
  const narrative = [study.report.summaryZh, study.report.summaryEn, ...study.report.sections.map((section) => `${section.bodyZh} ${section.bodyEn}`)].join(" ");
  if (/(市场规模|购买率|整体人群比例|market size|purchase rate|population ratio)/i.test(narrative)) errors.push("UNSUPPORTED_NUMERIC_CLAIM");
  if (study.report.findings.length !== study.findings.filter((finding) => !finding.hidden).length) errors.push("BILINGUAL_FINDING_MISMATCH");
  for (const finding of study.findings.filter((item) => !item.hidden)) {
    if (finding.evidence.length === 0 && finding.category !== "unknown_gap" && finding.category !== "disagreement") errors.push(`FINDING_WITHOUT_EVIDENCE:${finding.id}`);
    if (!finding.titleZh || !finding.titleEn || !finding.bodyZh || !finding.bodyEn) errors.push(`FINDING_BILINGUAL_INCOMPLETE:${finding.id}`);
  }
  return errors;
}
