import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { DecisionBriefV21 } from "../lib/v2/brief.ts";

const dir = path.join(process.cwd(), "docs", "v2.1");
mkdirSync(dir, { recursive: true });
const brief = (JSON.parse(readFileSync(path.join(process.cwd(), "lib", "v2", "briefs", "main-case.json"), "utf8")) as { brief: DecisionBriefV21 }).brief;

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

const evidenceCard = (id: string) => {
  const item = brief.evidenceIndex[id];
  if (!item) return "";
  return `<div class="quote"><p>${escapeHtml(item.quoteZh)}</p><p class="en">${escapeHtml(item.quoteEn)}</p><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.author)} · 知乎原文</a></div>`;
};

const beliefRows = brief.beliefUpdates.map((update) => `
  <article class="belief">
    <div class="belief-head"><span class="tag">${update.changeType}</span><span class="status">${update.status === "supported" ? "证据支持" : "待验证"}</span></div>
    <div class="belief-grid">
      <div><h4>原来的想法</h4><p>${escapeHtml(update.initialAssumptionZh)}</p></div>
      <div><h4>讨论后的新理解</h4><p>${escapeHtml(update.newUnderstandingZh)}</p></div>
      <div><h4>下一步</h4><p>${escapeHtml(update.nextActionZh)}</p></div>
    </div>
    <p class="implication"><b>对产品的影响：</b>${escapeHtml(update.productImplicationZh)}</p>
    <details><summary>支持证据 ${update.evidenceIds.length} 条 · 反例 ${update.counterIds.length} 条</summary>${update.evidenceIds.map(evidenceCard).join("")}${update.counterIds.map(evidenceCard).join("")}</details>
  </article>
`).join("");

const opportunityCards = brief.opportunities.filter((item) => !item.hidden).map((card) => `
  <article class="opp">
    <div class="opp-head"><span class="tag blue">机会假设</span><span class="strength ${card.evidenceStrength}">证据强度：${card.evidenceStrength}</span></div>
    <h3>${escapeHtml(card.targetUserZh)} · ${escapeHtml(card.scenarioZh)}</h3>
    <p><b>问题：</b>${escapeHtml(card.problemZh)}</p>
    <p><b>现有替代方案：</b>${card.currentAlternativesZh.map(escapeHtml).join(" / ")}</p>
    <p><b>为什么仍不够：</b>${escapeHtml(card.whyAlternativesInsufficientZh)}</p>
    <p class="direction"><b>可能的产品方向：</b>${escapeHtml(card.productDirectionZh)}</p>
    <p><b>证伪条件：</b>${escapeHtml(card.falsificationSignalZh)}</p>
    <p class="muted">${escapeHtml(card.strengthReasonZh)}</p>
    <details><summary>支持证据 ${card.evidenceIds.length} 条 · 反例 ${card.counterIds.length} 条</summary>${card.evidenceIds.map(evidenceCard).join("")}${card.counterIds.map(evidenceCard).join("")}</details>
  </article>
`).join("");

const unanswered = brief.unansweredZh.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>知研台 V2.1 · 主案例决策简报手工样例</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f6f7f9;color:#121212;margin:0;line-height:1.7}
.page{max-width:900px;margin:0 auto;padding:32px 20px 80px}
.kicker{color:#8590a6;font-size:12px;letter-spacing:.06em;text-transform:uppercase}
h1{font-size:30px;line-height:1.4;margin:8px 0 10px}h2{font-size:20px;margin:32px 0 12px;padding-top:14px;border-top:1px solid #ebebeb}h3{font-size:17px;margin:6px 0 8px}h4{font-size:12px;color:#8590a6;margin:0 0 4px}
.card{background:#fff;border:1px solid #ebebeb;border-radius:4px;padding:20px 22px;margin-top:14px}
.badge{display:inline-block;padding:3px 8px;border-radius:3px;background:#eef4ff;color:#175199;font-size:12px}
.badge.conditional{background:#fff7e8;color:#8a5200}
.belief{border-top:1px solid #ebebeb;padding:18px 0}.belief:first-child{border-top:0}
.belief-grid{display:grid;grid-template-columns:1fr 1fr 160px;gap:14px}.belief-grid p{margin:0;font-size:14px}.belief-grid>div{background:#fafafa;padding:12px;border-radius:3px}
.tag{display:inline-block;padding:2px 7px;background:#f6f7f9;color:#646464;font-size:11px;border-radius:2px}.tag.blue{background:#eef4ff;color:#175199}
.status{font-size:11px;color:#0b7d4d;margin-left:6px}
.implication{margin-top:12px;color:#444;font-size:13px}
.opp{border-top:1px solid #ebebeb;padding:22px 0}.opp:first-child{border-top:0}.opp-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.strength{font-size:12px;color:#8590a6}.strength.strong{color:#0b7d4d}.strength.medium{color:#8a5200}
.opp p{margin:6px 0;font-size:14px;color:#444}.direction{background:#f8fbff;border-left:3px solid #0066ff;padding:10px 12px;color:#121212!important}
details{margin-top:10px;border:1px solid #ebebeb;border-radius:3px;padding:8px 12px;background:#fcfcfc}summary{cursor:pointer;color:#175199;font-size:12px}
.quote{border-top:1px dashed #ebebeb;padding:10px 0;font-size:13px}.quote p{margin:0 0 4px}.quote .en{color:#8590a6;font-size:12px}.quote a{color:#175199;font-size:11px}
.muted{color:#8590a6;font-size:12px!important}
ul{padding-left:1.3em}li{font-size:14px;color:#444;margin:4px 0}
.btn{display:inline-block;padding:7px 12px;background:#0066ff;color:#fff!important;border-radius:3px;font-size:13px;text-decoration:none;margin-right:8px}
.footer{color:#8590a6;font-size:11px;margin-top:32px}
@media(max-width:680px){.belief-grid{grid-template-columns:1fr}}
</style></head><body><div class="page">
<p class="kicker">知研台 V2.1 · 主案例手工样例 · Gate A</p>
<h1>${escapeHtml(brief.decisionQuestionZh)}</h1>
<p class="badge conditional">建议：${brief.recommendation === "conditional_proceed" ? "有条件下一步：先验证，不直接开发" : brief.recommendation}</p>
<div class="card"><p>${escapeHtml(brief.recommendationReasonZh)}</p><p class="muted">中文样例用于 Gate A 人工验收；完整双语版在应用内。</p></div>

<h2>原来的想法 vs 讨论后的新理解</h2>
<div class="card">${beliefRows}</div>

<h2>值得验证的机会</h2>
<div class="card">${opportunityCards}<p class="muted">本预算内未形成第三个机会：平台担保/电子签替代方向的直接用户证据不足，不凑数。</p></div>

<h2>现在建议做什么、不做什么</h2>
<div class="card"><p><b>先验证：</b>${brief.validateFirstZh.map(escapeHtml).join("；")}</p><p><b>暂时不要做：</b>${brief.doNotDoZh.map(escapeHtml).join("；")}</p></div>

<h2>下一步怎么验证</h2>
<div class="card"><p><b>最低成本验证：</b>${escapeHtml(brief.nextValidation.cheapestTestZh)}</p><ul>${brief.nextValidation.questionsZh.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><p><b>证伪条件：</b>${escapeHtml(brief.nextValidation.falsificationZh)}</p></div>

<h2>这份研究没有回答的问题</h2>
<div class="card"><ul>${unanswered}</ul></div>

<h2>证据边界</h2>
<div class="card"><ul>${brief.boundariesZh.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><p class="muted">${escapeHtml(brief.aiDisclosureZh)}</p></div>

<div class="footer">生成于 ${escapeHtml(brief.generatedAt)} · 主案例 ${brief.studyId} · <a class="btn" href="/workbench?demo=main-case">打开应用内完整版</a></div>
</div></body></html>`;

writeFileSync(path.join(dir, "main-case-decision-brief.html"), html, "utf8");

const evidenceIds = new Set<string>();
for (const update of brief.beliefUpdates) for (const id of [...update.evidenceIds, ...update.counterIds]) evidenceIds.add(id);
for (const card of brief.opportunities) for (const id of [...card.evidenceIds, ...card.counterIds]) evidenceIds.add(id);
for (const term of brief.highImpactTerms) if (term.sourceSampleId) evidenceIds.add(term.sourceSampleId);
const map = [...evidenceIds].map((id) => {
  const item = brief.evidenceIndex[id];
  return item ? `| ${id} | ${item.title.replaceAll("|", "/")} | ${item.author} | ${item.url} | ${item.quoteZh.slice(0, 60).replaceAll("|", "/")} |` : "";
}).filter(Boolean).join("\n");
writeFileSync(path.join(dir, "evidence-map.md"), `# 主案例证据映射（V2.1 Gate A）\n\n| 证据 ID | 标题 | 作者 | 链接 | 引用片段 |\n|---|---|---|---|---|\n${map}\n`, "utf8");
console.log(JSON.stringify({ html: path.join(dir, "main-case-decision-brief.html"), evidence: evidenceIds.size }, null, 1));
