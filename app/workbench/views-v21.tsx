"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CheckCircle2, ChevronDown, ExternalLink, FileText, Quote, ShieldCheck } from "lucide-react";
import { useLang } from "../components/LanguageProvider";
import { FINDING_CATEGORY_LABEL } from "../../lib/v2/i18n";
import type { BeliefUpdateV21, BriefEvidence, DecisionBriefV21, HighImpactTermV21, OpportunityHypothesisV21, RoundSnapshotV21 } from "../../lib/v2/brief";
import type { StudyV2 } from "../../lib/v2/types";
import type { PublicJob } from "../../lib/v2/jobs";
import { AnalysisView, QualityView, SampleView } from "./views-v2";

function local(lang: "zh" | "en", zh: string, en: string): string {
  return lang === "zh" ? zh : en;
}

function recommendationLabel(lang: "zh" | "en", value: DecisionBriefV21["recommendation"]): string {
  if (value === "conditional_proceed") return local(lang, "有条件下一步：先验证，不直接开发", "Conditional next step: validate first, do not build yet");
  if (value === "hold") return local(lang, "先暂停，补充证据", "Hold and gather more evidence");
  if (value === "stop") return local(lang, "停止这个方向", "Stop this direction");
  return local(lang, "证据不足，暂不形成建议", "Insufficient evidence; no recommendation yet");
}

function changeLabel(lang: "zh" | "en", value: BeliefUpdateV21["changeType"]): string {
  return {
    support: local(lang, "支持", "Support"),
    revise: local(lang, "修正", "Revise"),
    refute: local(lang, "反驳", "Refute"),
    new_angle: local(lang, "新增角度", "New angle"),
  }[value];
}

function strengthLabel(lang: "zh" | "en", value: OpportunityHypothesisV21["evidenceStrength"]): string {
  return {
    strong: local(lang, "强", "Strong"),
    medium: local(lang, "中", "Medium"),
    weak: local(lang, "弱", "Weak"),
    insufficient: local(lang, "不足", "Insufficient"),
  }[value];
}

function EvidenceList({ brief, ids, lang, title }: { brief: DecisionBriefV21; ids: string[]; lang: "zh" | "en"; title: string }) {
  const [open, setOpen] = useState(false);
  const items = ids.map((id) => brief.evidenceIndex[id]).filter(Boolean);
  if (items.length === 0) return <span className="v2-mini v2-muted">{title}: 0</span>;
  return (
    <div className="v21-evidence">
      <button className="v21-evidence-toggle" type="button" onClick={() => setOpen(!open)}>
        {title} {items.length} {open ? <ChevronDown size={11} /> : <ChevronDown size={11} style={{ transform: "rotate(-90deg)" }} />}
      </button>
      {open ? (
        <div className="v21-evidence-list">
          {items.map((item) => <EvidenceItem key={item.itemId} item={item} lang={lang} />)}
        </div>
      ) : null}
    </div>
  );
}

function EvidenceItem({ item, lang }: { item: BriefEvidence; lang: "zh" | "en" }) {
  return (
    <div className="v21-quote">
      <p>{lang === "zh" ? item.quoteZh : item.quoteEn}</p>
      <p className="en">{lang === "zh" ? item.quoteEn : item.quoteZh}</p>
      <a href={item.url} target="_blank" rel="noreferrer">{item.author} · {item.publishDate} · 知乎原文 <ArrowUpRight size={10} /></a>
    </div>
  );
}

function OpportunityCard({ card, brief, lang, lead = false }: { card: OpportunityHypothesisV21; brief: DecisionBriefV21; lang: "zh" | "en"; lead?: boolean }) {
  return (
    <article className={`v21-opportunity${lead ? " is-lead" : ""}`} data-testid="v21-opportunity">
      <div className="v21-opportunity-head">
        <span className="v2-tag v2-tag-blue">{lead ? local(lang, "最值得先验证", "First to validate") : local(lang, "机会假设", "Opportunity hypothesis")}</span>
        <span className={`v21-strength ${card.evidenceStrength}`}>{local(lang, "证据强度", "Evidence")}: {strengthLabel(lang, card.evidenceStrength)}</span>
      </div>
      <h3>{lang === "zh" ? `${card.targetUserZh} · ${card.scenarioZh}` : `${card.targetUserEn} · ${card.scenarioEn}`}</h3>
      <p><b>{local(lang, "问题", "Problem")}：</b>{lang === "zh" ? card.problemZh : card.problemEn}</p>
      <p><b>{local(lang, "现有替代方案", "Current alternatives")}：</b>{(lang === "zh" ? card.currentAlternativesZh : card.currentAlternativesEn).join(" / ")}</p>
      <p><b>{local(lang, "为什么仍不够", "Why not enough")}：</b>{lang === "zh" ? card.whyAlternativesInsufficientZh : card.whyAlternativesInsufficientEn}</p>
      <p className="v21-direction"><b>{local(lang, "可能的产品方向", "Product direction")}：</b>{lang === "zh" ? card.productDirectionZh : card.productDirectionEn}</p>
      <p><b>{local(lang, "证伪条件", "Falsification")}：</b>{lang === "zh" ? card.falsificationSignalZh : card.falsificationSignalEn}</p>
      <p className="v2-mini v2-muted">{lang === "zh" ? card.strengthReasonZh : card.strengthReasonEn}</p>
      <div className="v21-evidence-row">
        <EvidenceList brief={brief} ids={card.evidenceIds} lang={lang} title={local(lang, "支持证据", "Evidence")} />
        <EvidenceList brief={brief} ids={card.counterIds} lang={lang} title={local(lang, "反例/条件", "Counter/conditional")} />
      </div>
    </article>
  );
}

export function DecisionBriefView({ brief, study, onOpenEvidence }: { brief: DecisionBriefV21; study: StudyV2; onOpenEvidence: () => void }) {
  const { lang } = useLang();
  const beliefs = brief.beliefUpdates.slice(0, 3);
  const opportunities = brief.opportunities.filter((item) => !item.hidden).slice(0, 3);
  const lead = opportunities[0];
  const others = opportunities.slice(1);
  const firstUpdate = beliefs[0];
  const nextTest = lang === "zh" ? brief.nextValidation.cheapestTestZh : brief.nextValidation.cheapestTestEn;
  return (
    <div className="v2-stack">
      <section className="v21-brief-hero">
        <div>
          <p className="v2-kicker">{local(lang, "产品决策简报", "Product decision brief")}</p>
          <h1>{lang === "zh" ? brief.decisionQuestionZh : brief.decisionQuestionEn}</h1>
          <p className="v2-lede">{lang === "zh" ? brief.recommendationReasonZh : brief.recommendationReasonEn}</p>
        </div>
        <div className={`v21-rec ${brief.recommendation}`}>
          <span className="v2-tag v2-tag-blue">{local(lang, "建议", "Recommendation")}</span>
          <strong>{recommendationLabel(lang, brief.recommendation)}</strong>
        </div>
      </section>

      <section className="v21-at-a-glance" data-testid="v21-glance">
        <div>
          <span className="v21-glance-label">{local(lang, "最值得先验证", "First to validate")}</span>
          <strong>{lead ? (lang === "zh" ? lead.productDirectionZh : lead.productDirectionEn) : local(lang, "暂无足够证据", "Not enough evidence")}</strong>
        </div>
        <div>
          <span className="v21-glance-label">{local(lang, "讨论改变了什么", "What changed")}</span>
          <strong>{firstUpdate ? (lang === "zh" ? firstUpdate.newUnderstandingZh : firstUpdate.newUnderstandingEn) : "—"}</strong>
        </div>
        <div>
          <span className="v21-glance-label">{local(lang, "下一步", "Next step")}</span>
          <strong>{nextTest}</strong>
        </div>
      </section>

      {lead ? (
        <section className="v2-card v2-card-pad v21-lead-opp">
          <div className="v2-between" style={{ marginBottom: 2 }}>
            <h2 style={{ fontSize: 17 }}>{local(lang, "现在最值得验证的机会", "The opportunity to validate first")}</h2>
            <span className="v2-mini v2-muted">{local(lang, "先看这一张，其他机会在下方", "Start here; other opportunities are below")}</span>
          </div>
          <OpportunityCard card={lead} brief={brief} lang={lang} lead />
        </section>
      ) : null}

      <section className="v2-card v2-card-pad">
        <div className="v2-between">
          <h2 style={{ fontSize: 17 }}>{local(lang, "原来的想法 → 讨论后的新理解", "Original belief → what changed")}</h2>
          <span className="v2-mini v2-muted">{local(lang, "检索前捕获", "Captured before retrieval")} · {brief.initialBelief.capturedAt.slice(0, 10)}</span>
        </div>
        <div className="v21-belief-original v21-original-compact">
          <div><h4>{local(lang, "产品想法", "Product idea")}</h4><p>{lang === "zh" ? brief.initialBelief.productIdeaZh : brief.initialBelief.productIdeaEn}</p></div>
          <div><h4>{local(lang, "目标人群", "Target users")}</h4><p>{(lang === "zh" ? brief.initialBelief.targetUsersZh : brief.initialBelief.targetUsersEn).join(" / ")}</p></div>
          <div><h4>{local(lang, "最担心", "Biggest concern")}</h4><p>{lang === "zh" ? brief.initialBelief.concernsZh[0] : brief.initialBelief.concernsEn[0]}</p></div>
        </div>
        <div className="v21-belief-table">
          <div className="v21-belief-head"><span>{local(lang, "原来的假设", "Original assumption")}</span><span>{local(lang, "新理解", "New understanding")}</span><span>{local(lang, "所以下一步", "Next step")}</span></div>
          {beliefs.map((update) => (
            <article className="v21-belief-row" key={update.id}>
              <div><span className={`v2-tag ${update.changeType === "refute" ? "v2-tag-amber" : "v2-tag-blue"}`}>{changeLabel(lang, update.changeType)}</span><p>{lang === "zh" ? update.initialAssumptionZh : update.initialAssumptionEn}</p></div>
              <div>
                <p>{lang === "zh" ? update.newUnderstandingZh : update.newUnderstandingEn}</p>
                <p className="v2-mini v2-muted">{lang === "zh" ? update.productImplicationZh : update.productImplicationEn}</p>
                <EvidenceList brief={brief} ids={update.evidenceIds} lang={lang} title={local(lang, "支持证据", "Evidence")} />
                {update.counterIds.length > 0 ? <EvidenceList brief={brief} ids={update.counterIds} lang={lang} title={local(lang, "反例", "Counter")} /> : null}
              </div>
              <div><p>{lang === "zh" ? update.nextActionZh : update.nextActionEn}</p><span className={`v2-tag ${update.status === "supported" ? "v2-tag-green" : "v2-tag-amber"}`}>{update.status === "supported" ? local(lang, "证据支持", "Supported") : local(lang, "待验证", "To validate")}</span></div>
            </article>
          ))}
        </div>
      </section>

      <section className="v2-card v2-card-pad">
        <h2 style={{ fontSize: 17 }}>{local(lang, "建议做什么，不做什么", "What to do and not do")}</h2>
        <div className="v21-action-grid">
          <div>
            <h4>{local(lang, "先验证", "Validate first")}</h4>
            <ul>{brief.validateFirstZh.length > 0 ? (lang === "zh" ? brief.validateFirstZh : brief.validateFirstEn).map((item) => <li key={item}>{item}</li>) : <li>—</li>}</ul>
            <h4 style={{ marginTop: 12 }}>{local(lang, "暂时不要做", "Do not do yet")}</h4>
            <ul>{(lang === "zh" ? brief.doNotDoZh : brief.doNotDoEn).map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div>
            <h4>{local(lang, "下一步怎么验证", "How to validate next")}</h4>
            <p className="v2-small">{nextTest}</p>
            <div className="v2-row" style={{ marginTop: 7 }}>
              {(lang === "zh" ? brief.nextValidation.personasZh : brief.nextValidation.personasEn).map((item) => <span className="v2-tag" key={item}>{item}</span>)}
            </div>
            <details className="v21-details" style={{ marginTop: 9 }}>
              <summary>{local(lang, "查看访谈问题与证伪条件", "View interview questions and falsification")}</summary>
              <ol className="v21-questions">
                {(lang === "zh" ? brief.nextValidation.questionsZh : brief.nextValidation.questionsEn).map((item) => <li key={item}>{item}</li>)}
              </ol>
              <div className="v21-falsify"><b>{local(lang, "证伪条件", "Falsification")}：</b>{lang === "zh" ? brief.nextValidation.falsificationZh : brief.nextValidation.falsificationEn}</div>
            </details>
          </div>
        </div>
      </section>

      <section className="v2-card v2-card-pad v21-unanswered">
        <h2 style={{ fontSize: 17 }}>{local(lang, "这份研究没有回答的问题", "What this study does not answer")}</h2>
        <ul>{((lang === "zh" ? brief.unansweredZh : brief.unansweredEn)).map((item) => <li key={item}>{item}</li>)}</ul>
        <div className="v2-mini v2-muted" style={{ marginTop: 8 }}>
          <ShieldCheck size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          {lang === "zh" ? brief.aiDisclosureZh : brief.aiDisclosureEn}
        </div>
      </section>

      {others.length > 0 ? (
        <section className="v2-card v2-card-pad">
          <h2 style={{ fontSize: 17 }}>{local(lang, "另一个机会方向", "Another opportunity")}</h2>
          <p className="v2-mini v2-muted">{local(lang, "第一机会验证通过前，不并行开发。", "Do not build in parallel before the first opportunity is validated.")}</p>
          {others.map((card) => (
            <details className="v21-other-opp" key={card.id}>
              <summary>
                <b>{lang === "zh" ? card.targetUserZh : card.targetUserEn}</b>
                <span>{lang === "zh" ? card.problemZh : card.problemEn}</span>
                <em className={`v21-strength ${card.evidenceStrength}`}>{strengthLabel(lang, card.evidenceStrength)}</em>
              </summary>
              <OpportunityCard card={card} brief={brief} lang={lang} />
            </details>
          ))}
        </section>
      ) : null}

      <section className="v2-card v2-card-pad">
        <div className="v2-between">
          <h2 style={{ fontSize: 17 }}>{local(lang, "完整报告与证据", "Full report and evidence")}</h2>
          <button className="v2-btn v2-btn-sm" type="button" onClick={onOpenEvidence}>{local(lang, "打开证据与质检", "Open evidence & QA")} <ArrowUpRight size={12} /></button>
        </div>
        <details className="v21-full-report">
          <summary>{local(lang, "查看完整报告与全部发现", "View full report and all findings")}</summary>
          {study.report.sections.map((section) => (
            <div key={section.titleZh} className="v21-report-section">
              <h3>{lang === "zh" ? section.titleZh : section.titleEn}</h3>
              <p style={{ whiteSpace: "pre-wrap" }}>{lang === "zh" ? section.bodyZh : section.bodyEn}</p>
            </div>
          ))}
          <div className="v2-row">
            {study.findings.filter((finding) => !finding.hidden).map((finding) => (
              <span className="v2-tag" key={finding.id}>{FINDING_CATEGORY_LABEL[lang][finding.category]} · {lang === "zh" ? finding.titleZh : finding.titleEn}</span>
            ))}
          </div>
        </details>
      </section>
    </div>
  );
}

export function ResearchProcessView({ brief, study }: { brief: DecisionBriefV21; study: StudyV2 }) {
  const { lang } = useLang();
  const snapshots = brief.roundSnapshots;
  return (
    <div className="v2-stack">
      <section className="v2-card v2-card-pad">
        <h2 style={{ fontSize: 19 }}>{local(lang, "三轮认知演进", "Three rounds of learning")}</h2>
        <p className="v2-lede" style={{ fontSize: 13.5, marginTop: 4 }}>{local(lang, "默认只展示改变研究方向的判断；查询日志和覆盖矩阵折叠在下面。", "Only the judgments that changed the research direction are shown by default; query logs and coverage are folded below.")}</p>
        <div className="v21-round-list">
          {snapshots.map((snapshot) => (
            <article className="v21-round" key={snapshot.round}>
              <div className="v21-round-num">{snapshot.round + 1}</div>
              <div>
                <h3>{local(lang, `第 ${snapshot.round + 1} 轮`, `Round ${snapshot.round + 1}`)} · {lang === "zh" ? snapshot.objectiveZh : snapshot.objectiveEn}</h3>
                <p>{lang === "zh" ? snapshot.newUnderstandingZh : snapshot.newUnderstandingEn}</p>
                {snapshot.newTerms.length > 0 ? (
                  <div className="v2-row" style={{ marginTop: 7 }}>
                    {snapshot.newTerms.map((term) => (
                      <span className="v2-tag v2-tag-blue" key={term.raw}>{term.raw}</span>
                    ))}
                  </div>
                ) : null}
                {snapshot.nextRoundReasonZh ? <p className="v21-because">{lang === "zh" ? snapshot.nextRoundReasonZh : snapshot.nextRoundReasonEn}</p> : null}
                {snapshot.stopReason ? <p className="v21-stop"><b>{local(lang, "停止", "Stop")}：</b>{lang === "zh" ? snapshot.stopReason.detailZh : snapshot.stopReason.detailEn}</p> : null}
                <details className="v21-details">
                  <summary>{local(lang, "本轮查询与覆盖", "Queries and coverage in this round")}</summary>
                  <ul className="v2-list">
                    {study.runs.filter((run) => run.round === snapshot.round).map((run) => <li key={run.id}>{run.query} · {run.resultCount} results · {run.includedCount} included</li>)}
                  </ul>
                  <p className="v2-mini v2-muted">{lang === "zh" ? snapshot.coverageChangeZh : snapshot.coverageChangeEn}</p>
                </details>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="v2-card v2-card-pad">
        <h2 style={{ fontSize: 17 }}>{local(lang, "真正改变研究方向的词", "Terms that changed the research")}</h2>
        <p className="v2-mini v2-muted">{local(lang, "只展示 3–5 个，其余在完整词表中。数量不是成绩。", "Only 3–5 terms are shown; the rest are in the vocabulary log. Quantity is not the point.")}</p>
        <div className="v21-term-list">
          {brief.highImpactTerms.map((term) => (
            <div className="v21-term" key={term.raw}>
              <strong>{term.raw}</strong>
              <span>{lang === "zh" ? term.whyZh : term.whyEn}</span>
              {term.sourceQuoteZh ? <blockquote>“{term.sourceQuoteZh.slice(0, 100)}”</blockquote> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="v2-card v2-card-pad">
        <details className="v21-details">
          <summary>{local(lang, "全部查询、覆盖与计划版本", "All queries, coverage and plan versions")}</summary>
          <div className="v21-log">
            {study.runs.map((run) => (
              <div key={run.id} className="v21-log-row">
                <span>{run.round + 1}</span><b>{run.query}</b><span>{run.dimension}</span><span>{run.resultCount} / {run.includedCount}</span>
              </div>
            ))}
          </div>
          <h3 style={{ marginTop: 14 }}>{local(lang, "覆盖矩阵", "Coverage")}</h3>
          <div style={{ overflowX: "auto" }}>
            <table className="v2-coverage-table">
              <thead><tr><th>{local(lang, "维度", "Dimension")}</th><th>{local(lang, "目标", "Target")}</th><th>{local(lang, "状态", "Status")}</th><th>{local(lang, "证据", "Evidence")}</th></tr></thead>
              <tbody>{study.coverage.map((row, index) => <tr key={`${row.value}-${index}`}><td>{row.dimension}</td><td>{lang === "zh" ? row.value : row.valueEn}</td><td>{row.status}</td><td>{row.itemIds.length}</td></tr>)}</tbody>
            </table>
          </div>
          <h3 style={{ marginTop: 14 }}>{local(lang, "计划版本", "Plan versions")}</h3>
          {study.plan.versions.map((version) => <p className="v2-small" key={version.version}><b>v{version.version}</b> · {lang === "zh" ? version.reasonZh : version.reasonEn}</p>)}
        </details>
      </section>
    </div>
  );
}

export function EvidenceQualityView({ brief, study, onCommit }: { brief: DecisionBriefV21; study: StudyV2; onCommit: (next: StudyV2) => void }) {
  const { lang } = useLang();
  const [showAll, setShowAll] = useState(false);
  const evidence = Object.values(brief.evidenceIndex).filter((item) => study.sample.find((sample) => sample.id === item.itemId)?.included);
  return (
    <div className="v2-stack">
      <section className="v2-card v2-card-pad">
        <div className="v2-between">
          <div>
            <h2 style={{ fontSize: 17 }}>{local(lang, "关键证据", "Key evidence")}</h2>
            <p className="v2-mini v2-muted">{local(lang, "默认只展示关键证据；全部样本在证据库中。", "Only key evidence is shown by default; all samples remain in the evidence library.")}</p>
          </div>
          <span className="v2-tag">{evidence.length} {local(lang, "条", "items")}</span>
        </div>
        <div className="v21-key-evidence">
          {(showAll ? evidence : evidence.slice(0, 6)).map((item) => <EvidenceItem key={item.itemId} item={item} lang={lang} />)}
        </div>
        {evidence.length > 6 ? <button className="v2-btn v2-btn-sm" type="button" onClick={() => setShowAll(!showAll)}>{showAll ? local(lang, "收起", "Collapse") : local(lang, "查看全部证据", "View all evidence")}</button> : null}
      </section>

      <section className="v2-card v2-card-pad">
        <h2 style={{ fontSize: 17 }}>{local(lang, "样本工作台", "Sample desk")}</h2>
        <p className="v2-mini v2-muted">{local(lang, "搁置样本或修改编码后，决策简报和报告会重算。", "Holding out a sample or editing codes recomputes the decision brief and report.")}</p>
      </section>
      <SampleView study={study} onCommit={onCommit} />

      <section className="v2-card v2-card-pad">
        <h2 style={{ fontSize: 17 }}>{local(lang, "质检", "Quality check")}</h2>
      </section>
      <QualityView study={study} />

      <section className="v2-card v2-card-pad">
        <details className="v21-details">
          <summary>{local(lang, "完整六类发现与编码（默认折叠）", "All six finding categories and codes (folded)")}</summary>
          <AnalysisView study={study} onCommit={onCommit} />
        </details>
      </section>

      <section className="v2-card v2-card-pad">
        <details className="v21-details">
          <summary>{local(lang, "研究过程与停止原因", "Research process and stop reason")}</summary>
          <p className="v2-small">{lang === "zh" ? brief.stopReason.detailZh : brief.stopReason.detailEn}</p>
          <p className="v2-small v2-muted">
            {local(lang, "候选计数：", "Candidate counts: ")}
            {local(lang, "搜索候选", "search candidates")} {study.runs.reduce((total, run) => total + run.resultCount, 0)} +
            {local(lang, " 热榜纳入 ", " hot-list inclusions ")} {study.hotScan.included}
            {" = "}{study.sample.length}
            {local(lang, " 条候选样本；三者含义不同，避免 60 scanned / 61 sampled 的并置。", " sample candidates. They are distinct and are not juxtaposed as 60 scanned / 61 sampled.")}
          </p>
        </details>
      </section>
    </div>
  );
}


export function JobProgressView({ job, onRetry }: { job: PublicJob; onRetry: () => void }) {
  const { lang } = useLang();
  const rounds = job.rounds;
  const running = job.status === "queued" || job.status === "running";
  return (
    <div className="v2-stack">
      <section className="v2-card v2-card-pad">
        <div className="v2-between">
          <div>
            <p className="v2-kicker">{local(lang, "研究进行中 · 未完成", "Study running · not complete")}</p>
            <h2 style={{ fontSize: 20, marginTop: 5 }}>{lang === "zh" ? job.stage.messageZh : job.stage.messageEn}</h2>
            <p className="v2-mini v2-muted" style={{ marginTop: 4 }}>
              {local(lang, "未完成前只展示轮次快照和临时认知，不输出最终决策建议。", "Before completion, only round snapshots and provisional learning are shown; no final recommendation.")}
            </p>
          </div>
          {running ? <span className="v2-spinner" /> : null}
        </div>
        {job.status === "failed" ? (
          <div className="v21-job-error">
            <AlertTriangle size={14} />
            <span>{job.error || local(lang, "任务失败", "Job failed")} · {local(lang, "已完成轮次保留，可重试；已完成的查询不会重复调用接口。", "Completed rounds are preserved; retry reuses cached queries and does not repeat the API calls.")}</span>
            <button className="v2-btn v2-btn-sm" type="button" onClick={onRetry}>{local(lang, "重试", "Retry")}</button>
          </div>
        ) : null}
        <div className="v21-progress-meta">
          <span>{local(lang, "计划", "Plan")} v{job.plan.version}</span>
          <span>{rounds.length} / 3 {local(lang, "轮", "rounds")}</span>
          <span>{job.plan.budget.maxQueries} {local(lang, "次查询预算", "query budget")}</span>
          <span>{job.status}</span>
        </div>
      </section>

      <section className="v2-card v2-card-pad">
        <h2 style={{ fontSize: 17 }}>{local(lang, "已完成的轮次", "Completed rounds")}</h2>
        {rounds.length === 0 ? <p className="v2-small v2-muted">{local(lang, "第一轮正在执行，完成后会在这里出现本轮样本、新词和下一轮计划。", "Round one is running; samples, new terms and the next-round plan will appear here.")}</p> : null}
        <div className="v21-round-list">
          {rounds.map(({ snapshot }) => (
            <article className="v21-round" key={snapshot.round}>
              <div className="v21-round-num">{snapshot.round + 1}</div>
              <div>
                <h3>{local(lang, `第 ${snapshot.round + 1} 轮`, `Round ${snapshot.round + 1}`)} · {lang === "zh" ? snapshot.objectiveZh : snapshot.objectiveEn}</h3>
                <p>{lang === "zh" ? snapshot.newUnderstandingZh : snapshot.newUnderstandingEn}</p>
                {snapshot.newTerms.length > 0 ? <div className="v2-row" style={{ marginTop: 6 }}>{snapshot.newTerms.map((term) => <span className="v2-tag v2-tag-blue" key={term.raw}>{term.raw}</span>)}</div> : null}
                {snapshot.stopReason ? <p className="v21-stop">{lang === "zh" ? snapshot.stopReason.detailZh : snapshot.stopReason.detailEn}</p> : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      {job.nextQueries.length > 0 && running ? (
        <section className="v2-card v2-card-pad">
          <h2 style={{ fontSize: 17 }}>{local(lang, "下一轮准备研究什么", "What the next round will study")}</h2>
          <ul className="v2-list">
            {job.nextQueries.map((item) => <li key={item.query}><b>{item.query}</b> · {lang === "zh" ? item.purposeZh : item.purposeEn}</li>)}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
