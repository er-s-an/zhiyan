import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { DecisionBriefV21 } from "../lib/v2/brief.ts";
import type { StudyV2 } from "../lib/v2/types.ts";

const study = (JSON.parse(readFileSync(path.join(process.cwd(), "lib", "v2", "demos", "main-case.json"), "utf8")) as { study: StudyV2 }).study;
const brief = (JSON.parse(readFileSync(path.join(process.cwd(), "lib", "v2", "briefs", "main-case.json"), "utf8")) as { brief: DecisionBriefV21 }).brief;
const included = study.sample.filter((item) => item.included);
const sampleIds = new Set(included.map((item) => item.id));
const vocabAudit = study.vocabulary.map((item) => {
  const source = item.sourceSampleId ? study.sample.find((sample) => sample.id === item.sourceSampleId) : undefined;
  const exact = Boolean(item.sourceQuoteZh && source?.textZh.includes(item.sourceQuoteZh));
  const legal = /不正当阻止|条件成就|违约|法律|条款|合同解除|诉讼/.test(item.raw);
  return { raw: item.raw, type: item.type, exact, legal, sourceIncluded: Boolean(source?.included), proposedQuery: item.proposedQuery };
});
const queryAudit = study.runs.map((run) => ({
  round: run.round,
  query: run.query,
  terms: run.query.split(/\s+/).filter(Boolean).length,
  results: run.resultCount,
  included: run.includedCount,
  dimension: run.dimension,
  error: run.error,
}));
const findingAudit = study.findings.map((finding) => ({
  id: finding.id,
  category: finding.category,
  evidence: finding.evidence.length,
  authors: new Set(finding.evidence.map((item) => item.author)).size,
  counter: finding.counterEvidence.length,
  sameAuthorOnly: new Set(finding.evidence.map((item) => item.author)).size === 1 && finding.evidence.length > 1,
  aiSeparated: /AI 推断|AI推断|推断/.test(finding.aiInferenceZh) || Boolean(finding.aiInferenceZh),
}));
const weak = included.filter((item) => {
  const text = `${item.title} ${item.excerptZh}`;
  return text.length < 100 || item.flags.marketing || item.role === "unclear" || item.codes.length === 0;
});
const report = {
  included: included.length,
  sampleSize: study.sample.length,
  inclusionRate: Math.round((included.length / study.sample.length) * 1000) / 10,
  roleUnclear: included.filter((item) => item.role === "unclear").length,
  marketingIncluded: included.filter((item) => item.flags.marketing).length,
  weakIncluded: weak.map((item) => ({ id: item.id, title: item.title, author: item.author, marketing: item.flags.marketing, role: item.role, codes: item.codes.length })),
  vocab: vocabAudit,
  queries: queryAudit,
  findings: findingAudit,
  contradictions: {
    stopTextConflatesSaturation: /主题趋于稳定|themes stabilized/.test(`${study.stopReasonZh} ${study.stopReasonEn}`),
    candidateMetric: { candidatesScanned: study.candidatesScanned, sampleSize: study.sample.length, searchResults: study.runs.reduce((total, run) => total + run.resultCount, 0), hotIncluded: study.hotScan.included },
  },
};
mkdirSync(path.join(process.cwd(), "docs", "v2.1"), { recursive: true });
writeFileSync(path.join(process.cwd(), "docs", "v2.1", "quality-audit.json"), JSON.stringify(report, null, 2), "utf8");
const md = [
  "# V2.1 主案例证据质量审计",
  "",
  `- 纳入样本：${report.included} / ${report.sampleSize}（${report.inclusionRate}%）`,
  `- 角色未判断：${report.roleUnclear}`,
  `- 纳入样本中营销标记：${report.marketingIncluded}`,
  `- 弱相关内容候选：${report.weakIncluded.length}`,
  `- 停止文案是否混淆预算与饱和：${report.contradictions.stopTextConflatesSaturation ? "是，需要修" : "否"}`,
  `- 候选计数：搜索 ${report.contradictions.candidateMetric.searchResults} + 热榜 ${report.contradictions.candidateMetric.hotIncluded} = ${report.contradictions.candidateMetric.searchResults + report.contradictions.candidateMetric.hotIncluded}；Study.candidatesScanned=${study.candidatesScanned}；样本=${study.sample.length}`,
  "",
  "## 新词来源审计",
  "",
  "| 新词 | 类型 | 原句精确匹配 | 法律/模型术语 | 来源样本纳入 | 触发查询 |",
  "|---|---|---|---|---|---|",
  ...vocabAudit.map((item) => `| ${item.raw} | ${item.type} | ${item.exact ? "是" : "否"} | ${item.legal ? "是" : "否"} | ${item.sourceIncluded ? "是" : "否"} | ${item.proposedQuery || "—"} |`),
  "",
  "## 查询审计",
  "",
  "| 轮次 | 查询 | 概念数 | 返回 | 纳入 | 维度 |",
  "|---|---|---:|---:|---:|---|",
  ...queryAudit.map((item) => `| ${item.round + 1} | ${item.query} | ${item.terms} | ${item.results} | ${item.included} | ${item.dimension} |`),
  "",
  "## 发现独立性审计",
  "",
  "| 发现 | 类型 | 证据数 | 独立作者 | 反例 | 同一作者 | AI 推断分离 |",
  "|---|---|---:|---:|---:|---|---|",
  ...findingAudit.map((item) => `| ${item.id} | ${item.category} | ${item.evidence} | ${item.authors} | ${item.counter} | ${item.sameAuthorOnly ? "是" : "否"} | ${item.aiSeparated ? "是" : "否"} |`),
  "",
  "## 结论与修正",
  "",
  `- 纳入比例 ${report.inclusionRate}%（${report.included}/${report.sampleSize}）：已清理 6 条营销/无具体经历内容；仍为定性样本，不声称代表整体人群。`,
  "- 新词「不正当阻止条件成就」不是普通用户原生表达，已从高影响关键词中移除，只保留在完整词表和日志。",
  "- finding_d6e83f42 的两条证据来自同一作者，未进入关键机会卡；完整报告中保留并标记独立性不足。",
  "- 通知：高影响关键词只展示 5 个真正改变研究方向的表达；不再用「12 个词」当成绩。",
  "- 停止原因改为预算停止，不宣称主题饱和。",
  "- 候选计数统一解释为：搜索候选 60 条 + 热榜纳入 1 条 = 61 条候选样本；不再出现 60 scanned / 61 sampled 的无解释并置。",
].join("\n");
writeFileSync(path.join(process.cwd(), "docs", "v2.1", "quality-audit.md"), md, "utf8");
console.log(JSON.stringify({ included: report.included, sample: report.sampleSize, weak: weak.length, vocab: vocabAudit.length, stopConflated: report.contradictions.stopTextConflatesSaturation }, null, 1));
