import type { DecisionBriefV21 } from "./brief";
import type { Lang, StudyV2 } from "./types";

function quoteBlock(brief: DecisionBriefV21, id: string, lang: Lang): string {
  const evidence = brief.evidenceIndex[id];
  if (!evidence) return "";
  return `> ${lang === "zh" ? evidence.quoteZh : evidence.quoteEn}\n> — ${evidence.author}, ${evidence.url}`;
}

export function briefMarkdown(brief: DecisionBriefV21, study: StudyV2, lang: Lang): string {
  const lines: string[] = [];
  lines.push(lang === "zh" ? "# 知研台 V2.1 产品决策简报" : "# Zhiyan V2.1 Product Decision Brief");
  lines.push("");
  lines.push(`## ${lang === "zh" ? "决策问题" : "Decision question"}`);
  lines.push(lang === "zh" ? brief.decisionQuestionZh : brief.decisionQuestionEn);
  lines.push("");
  lines.push(`## ${lang === "zh" ? "建议" : "Recommendation"}`);
  lines.push(lang === "zh" ? brief.recommendationReasonZh : brief.recommendationReasonEn);
  lines.push("");
  lines.push(`## ${lang === "zh" ? "原来的想法 vs 讨论后的新理解" : "Original belief vs revised understanding"}`);
  for (const update of brief.beliefUpdates) {
    lines.push(`### ${lang === "zh" ? update.initialAssumptionZh : update.initialAssumptionEn} → ${lang === "zh" ? update.newUnderstandingZh : update.newUnderstandingEn}`);
    lines.push(`${lang === "zh" ? "影响" : "Implication"}: ${lang === "zh" ? update.productImplicationZh : update.productImplicationEn}`);
    lines.push(`${lang === "zh" ? "下一步" : "Next"}: ${lang === "zh" ? update.nextActionZh : update.nextActionEn}`);
    for (const id of update.evidenceIds) lines.push(quoteBlock(brief, id, lang));
    lines.push("");
  }
  lines.push(`## ${lang === "zh" ? "机会假设" : "Opportunity hypotheses"}`);
  for (const card of brief.opportunities.filter((item) => !item.hidden)) {
    lines.push(`### ${lang === "zh" ? card.targetUserZh : card.targetUserEn} · ${lang === "zh" ? card.scenarioZh : card.scenarioEn}`);
    lines.push(`- ${lang === "zh" ? "问题" : "Problem"}: ${lang === "zh" ? card.problemZh : card.problemEn}`);
    lines.push(`- ${lang === "zh" ? "产品方向" : "Product direction"}: ${lang === "zh" ? card.productDirectionZh : card.productDirectionEn}`);
    lines.push(`- ${lang === "zh" ? "证据强度" : "Evidence strength"}: ${card.evidenceStrength} — ${lang === "zh" ? card.strengthReasonZh : card.strengthReasonEn}`);
    lines.push(`- ${lang === "zh" ? "证伪条件" : "Falsification"}: ${lang === "zh" ? card.falsificationSignalZh : card.falsificationSignalEn}`);
    for (const id of card.evidenceIds) lines.push(quoteBlock(brief, id, lang));
    lines.push("");
  }
  lines.push(`## ${lang === "zh" ? "下一步验证" : "Next validation"}`);
  lines.push(lang === "zh" ? brief.nextValidation.cheapestTestZh : brief.nextValidation.cheapestTestEn);
  for (const question of lang === "zh" ? brief.nextValidation.questionsZh : brief.nextValidation.questionsEn) lines.push(`- ${question}`);
  lines.push("");
  lines.push(`## ${lang === "zh" ? "这份研究没有回答的问题" : "What this study does not answer"}`);
  for (const item of lang === "zh" ? brief.unansweredZh : brief.unansweredEn) lines.push(`- ${item}`);
  lines.push("");
  lines.push(`## ${lang === "zh" ? "证据边界" : "Evidence boundaries"}`);
  for (const item of lang === "zh" ? brief.boundariesZh : brief.boundariesEn) lines.push(`- ${item}`);
  lines.push("");
  lines.push(`## ${lang === "zh" ? "完整报告" : "Full report"}`);
  for (const section of study.report.sections) {
    lines.push(`### ${lang === "zh" ? section.titleZh : section.titleEn}`);
    lines.push(lang === "zh" ? section.bodyZh : section.bodyEn);
    lines.push("");
  }
  lines.push(`${lang === "zh" ? "AI 披露" : "AI disclosure"}: ${lang === "zh" ? brief.aiDisclosureZh : brief.aiDisclosureEn}`);
  return lines.join("\n");
}

export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
