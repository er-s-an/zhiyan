"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardCopy,
  Download,
  Edit3,
  FileText,
  Info,
  Link2,
  MessageSquare,
  Printer,
  Quote,
  ShieldCheck,
  ThumbsUp,
  X,
  XCircle,
} from "lucide-react";
import { useLang } from "../components/LanguageProvider";
import {
  DIMENSION_LABEL,
  FINDING_CATEGORY_LABEL,
  FINDING_TYPE_LABEL,
  FIT_LABEL,
  STANCE_LABEL,
  VOCAB_LABEL,
  t,
} from "../../lib/v2/i18n";
import type {
  CoverageRowV2,
  FindingCategory,
  FindingV2,
  InterviewPlanV2,
  QueryRunV2,
  SampleItemV2,
  StudyV2,
  VocabularyItemV2,
} from "../../lib/v2/types";

type Commit = (study: StudyV2) => void;

function fmtDate(value: string): string {
  return value && value !== "unknown" ? value : "—";
}

function clip(value: string, limit = 180): string {
  if (!value) return "";
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

function confidenceLabel(lang: "zh" | "en", value: string): string {
  return t(lang, `common.${value}`) || value;
}

function statusClass(status: CoverageRowV2["status"]): string {
  return status === "covered" ? "covered" : status === "partial" ? "partial" : "missing";
}

/* ----------------------------- explore ----------------------------- */

export function ExploreView({ study }: { study: StudyV2 }) {
  const { lang, t: tr } = useLang();
  const runs = study.runs;
  const roundIndexes = [...new Set(runs.map((run) => run.round))].sort((a, b) => a - b);
  const gaps = study.coverage.filter((row) => row.status !== "covered");
  const sampleById = new Map(study.sample.map((item) => [item.id, item]));

  return (
    <div className="v2-stack">
      <section className="v2-card v2-card-pad">
        <div className="v2-between">
          <div>
            <h2 style={{ fontSize: 19 }}>{tr("workbench.explore.title")}</h2>
            <p className="v2-lede" style={{ marginTop: 4, fontSize: 13.5 }}>{tr("workbench.explore.lede")}</p>
          </div>
          <span className={`v2-badge ${study.plan.methodGate.fit === "fit" ? "v2-badge-fit" : "v2-badge-partial"}`}>
            {FIT_LABEL[lang][study.plan.methodGate.fit]}
          </span>
        </div>
        <div className="v2-notice" style={{ marginTop: 12 }}>
          <b>{tr("workbench.stopReason")}：</b>
          {lang === "zh" ? study.stopReasonZh : study.stopReasonEn}
        </div>
      </section>

      <section className="v2-card v2-card-pad">
        <div className="v2-between">
          <h2 style={{ fontSize: 17 }}>{tr("workbench.explore.rounds")}</h2>
          <span className="v2-mini v2-muted">
            {study.candidatesScanned} scanned · {study.sample.length} sampled
          </span>
        </div>
        {roundIndexes.map((round) => (
          <div className="v2-explore-round" key={round}>
            <div className="v2-round-head">
              <b>{lang === "zh" ? `第 ${round + 1} 轮` : `Round ${round + 1}`}</b>
              <span className="v2-tag">{runs.filter((run) => run.round === round).length} queries</span>
            </div>
            {runs.filter((run) => run.round === round).map((run) => (
              <RunRow key={run.id} run={run} sample={run.triggerSampleId ? sampleById.get(run.triggerSampleId) : undefined} vocab={study.vocabulary.find((item) => item.id === run.triggerVocabularyId)} />
            ))}
          </div>
        ))}
      </section>

      <section className="v2-card v2-card-pad">
        <div className="v2-between">
          <h2 style={{ fontSize: 17 }}>{tr("workbench.explore.vocab")}</h2>
          <span className="v2-mini v2-muted">{study.vocabulary.length} items · {study.plan.versions.length} plan versions</span>
        </div>
        {study.vocabulary.length === 0 ? (
          <p className="v2-small v2-muted" style={{ marginTop: 8 }}>{tr("workbench.explore.vocabEmpty")}</p>
        ) : (
          <div className="v2-vocab-grid">
            {study.vocabulary.map((item) => (
              <VocabularyCard key={item.id} item={item} sample={item.sourceSampleId ? sampleById.get(item.sourceSampleId) : undefined} />
            ))}
          </div>
        )}
      </section>

      <section className="v2-card v2-card-pad">
        <div className="v2-between">
          <h2 style={{ fontSize: 17 }}>{tr("workbench.explore.coverage")}</h2>
          <span className="v2-mini v2-muted">{gaps.length} gaps</span>
        </div>
        <div style={{ overflowX: "auto", marginTop: 10 }}>
          <table className="v2-coverage-table">
            <thead>
              <tr>
                <th>{lang === "zh" ? "维度" : "Dimension"}</th>
                <th>{lang === "zh" ? "目标" : "Target"}</th>
                <th>{lang === "zh" ? "状态" : "Status"}</th>
                <th>{lang === "zh" ? "证据" : "Evidence"}</th>
                <th>{lang === "zh" ? "说明" : "Note"}</th>
              </tr>
            </thead>
            <tbody>
              {study.coverage.map((row, index) => (
                <tr key={`${row.dimension}-${row.value}-${index}`}>
                  <td>{row.dimension}</td>
                  <td>{lang === "zh" ? row.value : row.valueEn}</td>
                  <td>
                    <span className={`v2-status ${statusClass(row.status)}`}>
                      {row.status === "covered" ? <CheckCircle2 size={12} /> : row.status === "partial" ? <Circle size={11} /> : <AlertTriangle size={12} />}
                      {row.status}
                    </span>
                  </td>
                  <td>{row.itemIds.length}</td>
                  <td className="v2-muted">{lang === "zh" ? row.noteZh : row.noteEn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {gaps.length > 0 ? (
          <div className="v2-notice v2-tag-amber" style={{ marginTop: 10, background: "#fffbf5", borderColor: "#f0dfc0", color: "var(--z-amber)" }}>
            <b>{tr("workbench.explore.gaps")}：</b>
            {gaps.map((row) => (lang === "zh" ? row.value : row.valueEn)).join("、" + " ")}
          </div>
        ) : null}
      </section>

      {study.hotScan.scanned > 0 || study.auxiliary.text ? (
        <section className="v2-card v2-card-pad">
          <h2 style={{ fontSize: 15 }}>{lang === "zh" ? "辅助记录" : "Auxiliary record"}</h2>
          <p className="v2-small v2-muted" style={{ marginTop: 6 }}>
            {lang === "zh"
              ? `热榜扫描 ${study.hotScan.scanned} 条，纳入 ${study.hotScan.included} 条。直答仅作补漏提示，不进入发现。`
              : `Hot list scanned ${study.hotScan.scanned}, included ${study.hotScan.included}. Zhida is an auxiliary gap hint, not a finding.`}
          </p>
          {study.auxiliary.text ? <p className="v2-finding-block" style={{ marginTop: 8 }}>{study.auxiliary.text}</p> : null}
        </section>
      ) : null}
    </div>
  );
}

function RunRow({ run, sample, vocab }: { run: QueryRunV2; sample?: SampleItemV2; vocab?: VocabularyItemV2 }) {
  const { lang, t: tr } = useLang();
  return (
    <div className="v2-run">
      <div>
        <div className="v2-run-query">
          {run.query}
          {run.dimension === "counter" ? <span className="v2-tag v2-tag-amber" style={{ marginLeft: 6 }}>{lang === "zh" ? "反例" : "counter"}</span> : null}
        </div>
        <div className="v2-run-purpose">{lang === "zh" ? run.purposeZh : run.purposeEn}</div>
        {vocab ? (
          <div className="v2-mini v2-muted" style={{ marginTop: 3 }}>
            {tr("workbench.explore.trigger")}：<b>{vocab.raw}</b>
            {sample ? <> · <a href={sample.url} target="_blank" rel="noreferrer">{clip(sample.title, 36)}</a></> : null}
          </div>
        ) : null}
        {run.error ? <div className="v2-error">{run.error}</div> : null}
      </div>
      <div className="v2-run-stats">
        <div>{run.resultCount} results</div>
        <div>{run.includedCount} included</div>
        <div>{run.excludedCount} excluded</div>
      </div>
      <div className="v2-run-stats">{DIMENSION_LABEL[lang][run.dimension]}</div>
    </div>
  );
}

function VocabularyCard({ item, sample }: { item: VocabularyItemV2; sample?: SampleItemV2 }) {
  const { lang } = useLang();
  return (
    <article className="v2-vocab">
      <div className="v2-vocab-head">
        <span className="v2-vocab-word">{item.raw}</span>
        <span className="v2-tag v2-tag-blue">{VOCAB_LABEL[lang][item.type]}</span>
      </div>
      <div className="v2-vocab-quote">{lang === "zh" ? item.sourceQuoteZh : item.sourceQuoteEn || item.sourceQuoteZh}</div>
      <div className="v2-vocab-meta">
        <span>{item.gapZh && lang === "zh" ? item.gapZh : item.gapEn}</span>
        {item.broughtNewTheme ? <span className="v2-tag v2-tag-green">{lang === "zh" ? "带来新主题" : "new theme"}</span> : null}
        {sample ? (
          <a href={sample.url} target="_blank" rel="noreferrer" className="v2-tag v2-tag-line">
            {lang === "zh" ? "来源样本" : "source sample"} <ArrowUpRight size={10} />
          </a>
        ) : null}
      </div>
      {item.proposedQuery ? <div className="v2-mini v2-muted" style={{ marginTop: 6 }}>{lang === "zh" ? "触发查询：" : "Triggered query: "}{item.proposedQuery}</div> : null}
    </article>
  );
}

/* ----------------------------- protocol ----------------------------- */

export function ProtocolView({ study }: { study: StudyV2 }) {
  const { lang, t: tr } = useLang();
  const plan = study.plan;
  return (
    <div className="v2-stack">
      <section className="v2-card v2-gate">
        <div className="v2-between">
          <h2><ShieldCheck size={16} /> {tr("workbench.protocol.method")}</h2>
          <span className={`v2-badge ${plan.methodGate.fit === "fit" ? "v2-badge-fit" : plan.methodGate.fit === "partial" ? "v2-badge-partial" : "v2-badge-mismatch"}`}>
            {FIT_LABEL[lang][plan.methodGate.fit]}
          </span>
        </div>
        <div className="v2-gate-grid">
          <div className="v2-gate-col">
            <h3>{lang === "zh" ? "可以探索" : "Can explore"}</h3>
            <ul>{(lang === "zh" ? plan.methodGate.canExploreZh : plan.methodGate.canExploreEn).map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div className="v2-gate-col">
            <h3>{lang === "zh" ? "需要其他数据" : "Needs other data"}</h3>
            <ul>{(lang === "zh" ? plan.methodGate.needsOtherDataZh : plan.methodGate.needsOtherDataEn).map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div className="v2-gate-col">
            <h3>{lang === "zh" ? "不能单独证明" : "Cannot prove alone"}</h3>
            <ul>{(lang === "zh" ? plan.methodGate.cannotProveZh : plan.methodGate.cannotProveEn).map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </div>
      </section>

      <div className="v2-grid-2">
        <section className="v2-card v2-form-card">
          <h2>{lang === "zh" ? "决策与市场" : "Decision and market"}</h2>
          <p className="v2-small" style={{ marginTop: 8, color: "var(--z-ink-2)" }}>{lang === "zh" ? plan.decisionZh : plan.decisionEn}</p>
          <p className="v2-small v2-muted" style={{ marginTop: 6 }}>{lang === "zh" ? plan.targetMarketZh : plan.targetMarketEn}</p>
          <ul className="v2-list" style={{ marginTop: 8 }}>
            {(lang === "zh" ? plan.targetUsersZh : plan.targetUsersEn).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <section className="v2-card v2-form-card">
          <h2>{lang === "zh" ? "产品假设" : "Product hypotheses"}</h2>
          <ul className="v2-list" style={{ marginTop: 8 }}>
            {(lang === "zh" ? plan.productHypothesesZh : plan.productHypothesesEn).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      </div>

      <section className="v2-card v2-form-card">
        <h2>{lang === "zh" ? "研究问题与证伪信号" : "Research questions and falsification"}</h2>
        <div style={{ marginTop: 8 }}>
          {plan.researchQuestions.map((question) => (
            <div key={question.id} style={{ padding: "10px 0", borderTop: "1px solid var(--z-line)" }}>
              <b className="v2-small">{lang === "zh" ? question.questionZh : question.questionEn}</b>
              <p className="v2-small v2-muted" style={{ marginTop: 3 }}>{lang === "zh" ? question.hypothesisZh : question.hypothesisEn}</p>
              <p className="v2-mini" style={{ color: "var(--z-amber)" }}>{lang === "zh" ? "证伪：" : "Falsify: "}{lang === "zh" ? question.disconfirmingSignalZh : question.disconfirmingSignalEn}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="v2-card v2-form-card">
        <h2>{lang === "zh" ? "查询矩阵与版本" : "Query matrix and versions"}</h2>
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table className="v2-query-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{lang === "zh" ? "查询" : "Query"}</th>
                <th>{lang === "zh" ? "维度" : "Dimension"}</th>
                <th>{lang === "zh" ? "目的" : "Purpose"}</th>
                <th>{lang === "zh" ? "版本" : "Version"}</th>
              </tr>
            </thead>
            <tbody>
              {plan.queryMatrix.map((seed, index) => (
                <tr key={seed.id}>
                  <td>{index + 1}</td>
                  <td>{seed.query}</td>
                  <td>{DIMENSION_LABEL[lang][seed.dimension]}</td>
                  <td className="v2-muted">{lang === "zh" ? seed.purposeZh : seed.purposeEn}</td>
                  <td>{seed.source === "sample_evidence" ? "v2+" : "v1"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 12 }}>
          {plan.versions.slice().reverse().map((version) => (
            <div className="v2-version" key={version.version}>
              <b>v{version.version}</b>
              <span>{lang === "zh" ? version.reasonZh : version.reasonEn}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="v2-card v2-form-card">
        <h2>{tr("workbench.protocol.wordlist")}</h2>
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table className="v2-query-table">
            <thead>
              <tr>
                <th>{lang === "zh" ? "表达" : "Expression"}</th>
                <th>{lang === "zh" ? "类型" : "Type"}</th>
                <th>{lang === "zh" ? "来源" : "Source"}</th>
                <th>{lang === "zh" ? "是否带来新主题" : "New theme"}</th>
              </tr>
            </thead>
            <tbody>
              {study.vocabulary.map((item) => (
                <tr key={item.id}>
                  <td><b>{item.raw}</b></td>
                  <td>{VOCAB_LABEL[lang][item.type]}</td>
                  <td>{item.source === "sample" ? (lang === "zh" ? "真实样本" : "Real sample") : item.source}</td>
                  <td>{item.broughtNewTheme ? (lang === "zh" ? "是" : "Yes") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ----------------------------- sample ----------------------------- */

export function SampleView({ study, onCommit }: { study: StudyV2; onCommit: Commit }) {
  const { lang, t: tr } = useLang();
  const [status, setStatus] = useState("all");
  const [round, setRound] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState(study.sample[0]?.id || "");

  const filtered = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return study.sample.filter((item) => {
      if (status === "included" && !item.included) return false;
      if (status === "held" && item.included) return false;
      if (round !== "all" && String(item.round) !== round) return false;
      if (needle && !`${item.title} ${item.author} ${item.excerptZh}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [study.sample, status, round, keyword]);

  const selected = study.sample.find((item) => item.id === selectedId) || filtered[0] || null;
  const included = study.sample.filter((item) => item.included).length;

  function updateSample(patch: Partial<SampleItemV2>) {
    if (!selected) return;
    onCommit({ ...study, sample: study.sample.map((item) => (item.id === selected.id ? { ...item, ...patch } : item)) });
  }

  function toggleCode(codeId: string) {
    if (!selected) return;
    const has = selected.codes.includes(codeId);
    const codes = has ? selected.codes.filter((id) => id !== codeId) : [...selected.codes, codeId];
    const traces = has
      ? selected.traces.filter((trace) => trace.codeId !== codeId)
      : [...selected.traces, { codeId, quoteZh: selected.excerptZh.slice(0, 180), confidence: "medium" as const }];
    updateSample({ codes, traces });
  }

  return (
    <section>
      <div className="v2-notice" style={{ marginBottom: 12 }}>
        {lang === "zh"
          ? `下游所有分析只属于这个样本：纳入 ${included} 条，搁置 ${study.sample.length - included} 条。搁置或改编码后，发现和双语报告会重算。`
          : `All downstream analysis belongs to this sample: ${included} included, ${study.sample.length - included} held out. Findings and the bilingual report recompute after edits.`}
      </div>
      <div className="v2-sample-toolbar">
        <select className="v2-select" aria-label="status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">{tr("workbench.sample.filterAll")}</option>
          <option value="included">{tr("workbench.sample.filterIncluded")}</option>
          <option value="held">{tr("workbench.sample.filterHeld")}</option>
        </select>
        <select className="v2-select" aria-label="round" value={round} onChange={(event) => setRound(event.target.value)}>
          <option value="all">{lang === "zh" ? "全部轮次" : "All rounds"}</option>
          {[0, 1, 2, 3].map((value) => (study.sample.some((item) => item.round === value) ? <option key={value} value={value}>{lang === "zh" ? `第 ${value + 1} 轮` : `Round ${value + 1}`}</option> : null))}
        </select>
        <input className="v2-input" placeholder={tr("workbench.sample.search")} value={keyword} onChange={(event) => setKeyword(event.target.value)} />
        <span className="v2-sample-count">{filtered.length} / {study.sample.length}</span>
      </div>

      <div className="v2-sample-layout" style={{ marginTop: 12 }}>
        <div className="v2-sample-list">
          {filtered.map((item) => (
            <button key={item.id} type="button" className={`v2-sample-row${selected?.id === item.id ? " is-active" : ""}`} data-testid="v2-sample-item" onClick={() => setSelectedId(item.id)}>
              <div className="v2-sample-row-title">{item.title}</div>
              <div className="v2-sample-row-meta">
                <span>{item.author}</span>
                <span>{item.publishDate}</span>
                <span>{item.included ? (lang === "zh" ? "已纳入" : "included") : (lang === "zh" ? "搁置" : "held")}</span>
              </div>
              <div className="v2-sample-row-meta">
                <span className="v2-tag">{lang === "zh" ? `第 ${item.round + 1} 轮` : `R${item.round + 1}`}</span>
                {item.flags.marketing ? <span className="v2-tag v2-tag-amber">{lang === "zh" ? "营销" : "marketing"}</span> : null}
                {item.flags.stale ? <span className="v2-tag v2-tag-red">{lang === "zh" ? "过时" : "stale"}</span> : null}
                {item.stance !== "unclear" ? <span className="v2-tag v2-tag-line">{STANCE_LABEL[lang][item.stance]}</span> : null}
              </div>
            </button>
          ))}
        </div>

        {selected ? (
          <article className="v2-sample-detail" key={selected.id}>
            <h2 className="v2-sample-title">
              <a href={selected.url} target="_blank" rel="noreferrer">{selected.title} <ArrowUpRight size={14} /></a>
            </h2>
            <div className="v2-sample-meta">
              <span>{selected.author}</span>
              <span>{fmtDate(selected.publishDate)}</span>
              <span><ThumbsUp size={11} /> {selected.votes}</span>
              <span><MessageSquare size={11} /> {selected.comments}</span>
              <span className="v2-tag">{selected.contentType}</span>
            </div>
            <div className="v2-row" style={{ marginTop: 9 }}>
              <span className="v2-tag v2-tag-blue">{lang === "zh" ? `第 ${selected.round + 1} 轮` : `Round ${selected.round + 1}`}</span>
              <span className="v2-tag">{selected.query}</span>
              <span className="v2-tag v2-tag-line">{(lang === "zh" ? selected.populationZh : selected.populationEn) || (lang === "zh" ? "人群未标注" : "population unlabelled")}</span>
              {selected.stance !== "unclear" ? <span className="v2-tag">{STANCE_LABEL[lang][selected.stance]}</span> : null}
            </div>
            <p className="v2-mini v2-muted" style={{ marginTop: 6 }}>{lang === "zh" ? selected.purposeZh : selected.purposeEn}</p>
            {(selected.sceneLabelsZh.length > 0 || selected.sceneLabelsEn.length > 0) ? (
              <div className="v2-row" style={{ marginTop: 7 }}>
                <span className="v2-mini v2-muted">{tr("workbench.sample.scene")}:</span>
                {(lang === "zh" ? selected.sceneLabelsZh : selected.sceneLabelsEn).map((scene) => (
                  <span className="v2-tag" key={scene}>{scene}</span>
                ))}
              </div>
            ) : null}

            <div className="v2-sample-section">
              <h3>{tr("workbench.sample.why")}</h3>
              <p className="v2-small" style={{ color: "var(--z-ink-2)" }}>{lang === "zh" ? selected.whyIncludedZh : selected.whyIncludedEn}</p>
            </div>

            <div className="v2-sample-section">
              <h3>{lang === "zh" ? "中文原话 / 英文翻译" : "Chinese original / English translation"}</h3>
              <div className="v2-quote-pair">
                <div className="v2-quote-zh">{selected.excerptZh || "—"}</div>
                <div className="v2-quote-en">{selected.excerptEn || (lang === "zh" ? "暂无英文翻译，以中文原文为准。" : "No English translation yet; use the Chinese original.")}</div>
              </div>
            </div>

            <div className="v2-sample-section">
              <h3>{tr("workbench.sample.codes")}</h3>
              <div className="v2-code-chips">
                {study.coding.codes.map((code) => (
                  <button key={code.id} type="button" className={`v2-code-chip${selected.codes.includes(code.id) ? " is-on" : ""}`} onClick={() => toggleCode(code.id)}>
                    {selected.codes.includes(code.id) ? <Check size={11} /> : null}
                    {lang === "zh" ? code.labelZh : code.labelEn}
                  </button>
                ))}
              </div>
            </div>

            <div className="v2-sample-section">
              <h3>{lang === "zh" ? "支撑 / 反驳的发现" : "Supports / refutes findings"}</h3>
              <div className="v2-row">
                {selected.supportFindingIds.length === 0 && selected.refuteFindingIds.length === 0 ? <span className="v2-small v2-muted">—</span> : null}
                {selected.supportFindingIds.map((id) => {
                  const finding = study.findings.find((item) => item.id === id);
                  return finding ? <span className="v2-finding-link" key={id}>{lang === "zh" ? "支撑" : "supports"} · {lang === "zh" ? finding.titleZh : finding.titleEn}</span> : null;
                })}
                {selected.refuteFindingIds.map((id) => {
                  const finding = study.findings.find((item) => item.id === id);
                  return finding ? <span className="v2-finding-link" key={id}>{lang === "zh" ? "反驳" : "refutes"} · {lang === "zh" ? finding.titleZh : finding.titleEn}</span> : null;
                })}
              </div>
            </div>

            <div className="v2-sample-actions">
              <div className="v2-field">
                <label className="v2-label" htmlFor={`pop-${selected.id}`}>{tr("workbench.sample.role")}</label>
                <input id={`pop-${selected.id}`} className="v2-input" value={lang === "zh" ? selected.populationZh : selected.populationEn} onChange={(event) => updateSample(lang === "zh" ? { populationZh: event.target.value } : { populationEn: event.target.value })} />
              </div>
              <div className="v2-field">
                <label className="v2-label" htmlFor={`stance-${selected.id}`}>{tr("workbench.sample.stance")}</label>
                <select id={`stance-${selected.id}`} className="v2-select" value={selected.stance} onChange={(event) => updateSample({ stance: event.target.value as SampleItemV2["stance"] })}>
                  {Object.entries(STANCE_LABEL[lang]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              {selected.included ? (
                <button className="v2-btn v2-btn-danger" type="button" data-testid="v2-exclude" onClick={() => updateSample({ included: false })}><X size={13} /> {tr("workbench.sample.exclude")}</button>
              ) : (
                <button className="v2-btn" type="button" data-testid="v2-restore" onClick={() => updateSample({ included: true })}><CheckCircle2 size={13} /> {tr("workbench.sample.restore")}</button>
              )}
            </div>
          </article>
        ) : (
          <div className="v2-card v2-empty"><p>{tr("workbench.sample.noSelection")}</p></div>
        )}
      </div>
    </section>
  );
}

/* ----------------------------- analysis ----------------------------- */

export function AnalysisView({ study, onCommit }: { study: StudyV2; onCommit: Commit }) {
  const { lang, t: tr } = useLang();
  const [category, setCategory] = useState<FindingCategory | "all">("all");
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState({ titleZh: "", titleEn: "", bodyZh: "", bodyEn: "" });
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});
  const visible = study.findings.filter((finding) => !finding.hidden);
  const filtered = category === "all" ? visible : visible.filter((finding) => finding.category === category);
  const included = study.sample.filter((item) => item.included).length;

  function startEdit(finding: FindingV2) {
    setEditingId(finding.id);
    setDraft({ titleZh: finding.titleZh, titleEn: finding.titleEn, bodyZh: finding.bodyZh, bodyEn: finding.bodyEn });
  }

  function saveEdit() {
    if (!editingId) return;
    onCommit({
      ...study,
      findings: study.findings.map((finding) => (finding.id === editingId ? { ...finding, ...draft, manualEdited: true } : finding)),
    });
    setEditingId("");
  }

  return (
    <div className="v2-stack">
      <section className="v2-card v2-card-pad">
        <div className="v2-between">
          <div>
            <h2 style={{ fontSize: 19 }}>{tr("workbench.analysis.title")}</h2>
            <p className="v2-lede" style={{ marginTop: 4, fontSize: 13.5 }}>{tr("workbench.analysis.lede")}</p>
          </div>
          <span className="v2-mini v2-muted">{included} included · {visible.length} findings · counts describe this sample only</span>
        </div>
        <div className="v2-analysis-cats" style={{ marginTop: 12 }}>
          <button type="button" className={`v2-cat-btn${category === "all" ? " is-active" : ""}`} onClick={() => setCategory("all")}>{tr("workbench.analysis.all")}</button>
          {(Object.keys(FINDING_CATEGORY_LABEL[lang]) as FindingCategory[]).map((value) => (
            <button key={value} type="button" className={`v2-cat-btn${category === value ? " is-active" : ""}`} onClick={() => setCategory(value)}>
              {FINDING_CATEGORY_LABEL[lang][value]} ({visible.filter((finding) => finding.category === value).length})
            </button>
          ))}
        </div>
      </section>

      <section className="v2-card v2-card-pad">
        {filtered.length === 0 ? <p className="v2-small v2-muted">{tr("workbench.analysis.noFindings")}</p> : null}
        {filtered.map((finding) => (
          <article className="v2-finding" key={finding.id} data-testid="v2-finding">
            <div className="v2-finding-head">
              <div>
                {editingId === finding.id ? (
                  <div className="v2-edit-grid">
                    <input className="v2-input" value={draft.titleZh} onChange={(event) => setDraft({ ...draft, titleZh: event.target.value })} />
                    <input className="v2-input" value={draft.titleEn} onChange={(event) => setDraft({ ...draft, titleEn: event.target.value })} />
                    <textarea className="v2-textarea" value={draft.bodyZh} onChange={(event) => setDraft({ ...draft, bodyZh: event.target.value })} />
                    <textarea className="v2-textarea" value={draft.bodyEn} onChange={(event) => setDraft({ ...draft, bodyEn: event.target.value })} />
                    <div className="v2-row">
                      <button className="v2-btn v2-btn-primary v2-btn-sm" type="button" onClick={saveEdit}>{tr("workbench.analysis.save")}</button>
                      <button className="v2-btn v2-btn-sm" type="button" onClick={() => setEditingId("")}>{tr("common.cancel")}</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="v2-finding-title">{lang === "zh" ? finding.titleZh : finding.titleEn}</h3>
                    <div className="v2-finding-meta">
                      <span className="v2-tag v2-tag-blue">{FINDING_CATEGORY_LABEL[lang][finding.category]}</span>
                      <span className="v2-tag">{FINDING_TYPE_LABEL[lang][finding.type]}</span>
                      <span className="v2-tag">{tr("common.confidence")}: {confidenceLabel(lang, finding.confidence)}</span>
                      {finding.manualEdited ? <span className="v2-tag v2-tag-amber">{lang === "zh" ? "人工编辑" : "edited"}</span> : null}
                    </div>
                  </>
                )}
              </div>
              {editingId !== finding.id ? (
                <button className="v2-btn v2-btn-ghost v2-btn-sm" type="button" onClick={() => startEdit(finding)}><Edit3 size={12} /> {tr("workbench.analysis.edit")}</button>
              ) : null}
            </div>
            {editingId !== finding.id ? (
              <>
                <p className="v2-finding-body">{lang === "zh" ? finding.bodyZh : finding.bodyEn}</p>
                <div className="v2-finding-block"><strong>{tr("workbench.analysis.boundary")}：</strong>{lang === "zh" ? finding.boundaryZh : finding.boundaryEn}</div>
                <div className="v2-finding-block"><strong>{tr("workbench.analysis.impact")}：</strong>{lang === "zh" ? finding.productImpactZh : finding.productImpactEn}</div>
                {finding.aiInferenceZh ? <div className="v2-ai-note" style={{ marginTop: 8 }}><b>{tr("workbench.analysis.ai")}：</b>{lang === "zh" ? finding.aiInferenceZh : finding.aiInferenceEn}</div> : null}
                <div className="v2-finding-block"><strong>{tr("workbench.analysis.next")}：</strong>{lang === "zh" ? finding.nextValidationZh : finding.nextValidationEn}</div>
                {finding.evidence.length > 0 ? (
                  <div className="v2-evidence-list">
                    {(expandedEvidence[finding.id] ? finding.evidence : finding.evidence.slice(0, 1)).map((evidence) => (
                      <div className="v2-evidence-item" key={`${finding.id}-${evidence.itemId}`}>
                        <div className="zh">{evidence.quoteZh}</div>
                        <div className="en">{evidence.quoteEn}</div>
                        <div className="meta">
                          <span>{evidence.author}</span>
                          <a href={evidence.url} target="_blank" rel="noreferrer"><Link2 size={10} /> Zhihu</a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {finding.evidence.length > 1 ? (
                  <button className="v2-btn v2-btn-ghost v2-btn-sm" type="button" style={{ marginTop: 4 }} onClick={() => setExpandedEvidence({ ...expandedEvidence, [finding.id]: !expandedEvidence[finding.id] })}>
                    {expandedEvidence[finding.id]
                      ? (lang === "zh" ? "收起证据" : "Collapse evidence")
                      : (lang === "zh" ? `查看全部 ${finding.evidence.length} 条证据` : `View all ${finding.evidence.length} evidence items`)}
                  </button>
                ) : null}
                {finding.counterEvidence.length > 0 ? (
                  <div style={{ marginTop: 10 }}>
                    <p className="v2-mini v2-muted">{lang === "zh" ? "反例 / 条件性证据" : "Counter / conditional evidence"}</p>
                    <div className="v2-evidence-list">
                      {(expandedEvidence[finding.id] ? finding.counterEvidence : finding.counterEvidence.slice(0, 1)).map((evidence) => (
                        <div className="v2-evidence-item" key={`${finding.id}-counter-${evidence.itemId}`} style={{ borderColor: "#f0dfc0", background: "#fffbf5" }}>
                          <div className="zh">{evidence.quoteZh}</div>
                          <div className="en">{evidence.quoteEn}</div>
                          <div className="meta"><span>{evidence.author}</span><a href={evidence.url} target="_blank" rel="noreferrer"><Link2 size={10} /> Zhihu</a></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}

/* ----------------------------- quality ----------------------------- */

interface CheckItem {
  status: "pass" | "warn" | "fail";
  title: string;
  detail: string;
}

export function QualityView({ study }: { study: StudyV2 }) {
  const { lang, t: tr } = useLang();
  const included = study.sample.filter((item) => item.included);
  const visible = study.findings.filter((finding) => !finding.hidden);
  const sourcedVocab = study.vocabulary.filter((item) => item.source !== "sample" || item.sourceSampleId);
  const sampleVocab = study.vocabulary.filter((item) => item.source === "sample");
  const findingsWithoutEvidence = visible.filter((finding) => finding.category !== "unknown_gap" && finding.category !== "disagreement" && finding.evidence.length === 0);
  const singleStance = visible.filter((finding) => {
    const stances = new Set(finding.evidence.map((evidence) => study.sample.find((item) => item.id === evidence.itemId)?.stance).filter(Boolean));
    return stances.size <= 1 && finding.evidence.length > 1;
  });
  const includedStale = included.filter((item) => item.flags.stale);
  const hasCounter = included.some((item) => item.stance === "oppose" || item.stance === "conditional") || visible.some((finding) => finding.counterEvidence.length > 0);
  const numericClaims = /(市场规模|购买率|整体人群比例|market size|purchase rate|population ratio)/i.test(
    [study.report.summaryZh, study.report.summaryEn, ...study.report.sections.map((section) => `${section.bodyZh} ${section.bodyEn}`)].join(" "),
  );
  const bilingualOk = study.report.findings.length === visible.length && visible.every((finding) => finding.titleZh && finding.titleEn && finding.bodyZh && finding.bodyEn);
  const checks: CheckItem[] = [
    {
      status: sampleVocab.length === sourcedVocab.filter((item) => item.source === "sample").length ? "pass" : "warn",
      title: tr("workbench.quality.wordSources"),
      detail: lang === "zh" ? `${sampleVocab.length} 个来自样本的新词，${sampleVocab.filter((item) => item.sourceSampleId).length} 个有来源样本。` : `${sampleVocab.length} sample-derived words; ${sampleVocab.filter((item) => item.sourceSampleId).length} have a source sample.`,
    },
    {
      status: findingsWithoutEvidence.length === 0 ? "pass" : "fail",
      title: tr("workbench.quality.findingEvidence"),
      detail: lang === "zh" ? `${visible.length} 条可见发现中，${findingsWithoutEvidence.length} 条缺少证据。` : `${findingsWithoutEvidence.length} of ${visible.length} visible findings lack evidence.`,
    },
    {
      status: singleStance.length === 0 ? "pass" : "warn",
      title: tr("workbench.quality.singleStance"),
      detail: lang === "zh" ? `${singleStance.length} 条发现的证据来自单一立场。` : `${singleStance.length} findings rely on a single stance.`,
    },
    {
      status: includedStale.length === 0 ? "pass" : "warn",
      title: tr("workbench.quality.timeWindow"),
      detail: lang === "zh" ? `时间窗外的样本默认搁置；当前纳入样本中 ${includedStale.length} 条过时。` : `Out-of-window samples are held out; ${includedStale.length} included samples are stale.`,
    },
    {
      status: bilingualOk ? "pass" : "fail",
      title: tr("workbench.quality.bilingual"),
      detail: lang === "zh" ? `中英文发现数量 ${study.report.findings.length} / ${visible.length}，字段完整性已检查。` : `Bilingual finding counts ${study.report.findings.length} / ${visible.length}; field completeness checked.`,
    },
    {
      status: numericClaims ? "fail" : "pass",
      title: tr("workbench.quality.unsupported"),
      detail: numericClaims
        ? lang === "zh" ? "报告里出现了可能无法回查的比例或市场措辞。" : "The report contains a ratio or market claim that may not be traceable."
        : lang === "zh" ? "未发现市场规模、购买率等不可回查数字。" : "No unverifiable market-size or purchase-rate numbers found.",
    },
    {
      status: hasCounter ? "pass" : "warn",
      title: tr("workbench.quality.counter"),
      detail: hasCounter ? (lang === "zh" ? "存在反对/条件性样本或反例证据。" : "Opposing/conditional samples or counter-evidence exist.") : (lang === "zh" ? "未找到足够反例，已在报告中披露。" : "Not enough counter-evidence found; disclosed in the report."),
    },
    {
      status: study.stopReasonZh && study.stopReasonEn ? "pass" : "fail",
      title: tr("workbench.quality.stop"),
      detail: lang === "zh" ? study.stopReasonZh : study.stopReasonEn,
    },
  ];

  return (
    <div className="v2-stack">
      <section className="v2-honest">
        <div>
          <h3><CheckCircle2 size={14} color="var(--z-green)" /> {tr("workbench.quality.canSupport")}</h3>
          <p className="big">{lang === "zh" ? "知乎公开讨论可以支持早期需求、场景、替代方案和态度探索。" : "Public Zhihu discussion can support early exploration of needs, scenes, alternatives and attitudes."}</p>
          <p className="v2-small v2-muted" style={{ marginTop: 7 }}>{lang === "zh" ? "它帮助决定下一步验证什么，不代替市场统计。" : "It helps decide what to validate next; it does not replace market statistics."}</p>
        </div>
        <div>
          <h3><AlertTriangle size={14} color="var(--z-amber)" /> {tr("workbench.quality.cannotProve")}</h3>
          <p className="big">{(lang === "zh" ? study.plan.methodGate.cannotProveZh : study.plan.methodGate.cannotProveEn).slice(0, 4).join("；")}</p>
          <p className="v2-small v2-muted" style={{ marginTop: 7 }}>{lang === "zh" ? "报告措辞已受方法闸门限制。" : "Report language is constrained by the method-fit gate."}</p>
        </div>
      </section>

      <section className="v2-card v2-card-pad">
        <h2 style={{ fontSize: 17 }}>{tr("workbench.quality.checks")}</h2>
        <div className="v2-checklist" style={{ marginTop: 8 }}>
          {checks.map((check) => (
            <div className="v2-check-item" key={check.title} data-testid={`v2-check-${check.status}`}>
              <span className={`v2-check-icon ${check.status}`}>
                {check.status === "pass" ? <CheckCircle2 size={13} /> : check.status === "warn" ? <AlertTriangle size={13} /> : <XCircle size={13} />}
              </span>
              <div className="v2-check-body">
                <b>{check.title}</b>
                <span>{check.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="v2-card v2-card-pad">
        <h2 style={{ fontSize: 17 }}>{lang === "zh" ? "覆盖与缺口" : "Coverage and gaps"}</h2>
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table className="v2-coverage-table">
            <thead><tr><th>{lang === "zh" ? "维度" : "Dimension"}</th><th>{lang === "zh" ? "目标" : "Target"}</th><th>{lang === "zh" ? "状态" : "Status"}</th><th>{lang === "zh" ? "证据数" : "Evidence"}</th></tr></thead>
            <tbody>
              {study.coverage.map((row, index) => (
                <tr key={`${row.dimension}-${row.value}-${index}`}>
                  <td>{row.dimension}</td>
                  <td>{lang === "zh" ? row.value : row.valueEn}</td>
                  <td><span className={`v2-status ${statusClass(row.status)}`}>{row.status}</span></td>
                  <td>{row.itemIds.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ----------------------------- delivery ----------------------------- */

export function DeliveryView({ study }: { study: StudyV2 }) {
  const { lang, t: tr } = useLang();
  const [docLang, setDocLang] = useState<"zh" | "en">(lang);
  const [copied, setCopied] = useState("");
  const memo = study.memo;
  const report = study.report;

  async function copyMarkdown() {
    await navigator.clipboard.writeText(buildMarkdown(study, docLang));
    setCopied(tr("common.copyDone"));
    setTimeout(() => setCopied(""), 1600);
  }

  function download() {
    const blob = new Blob([buildMarkdown(study, docLang)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `zhiyan-${study.id}-${docLang}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="v2-delivery-layout">
      <div>
        <div className="v2-report-toggle">
          <button type="button" className={docLang === "zh" ? "is-active" : ""} onClick={() => setDocLang("zh")}>中文</button>
          <button type="button" className={docLang === "en" ? "is-active" : ""} onClick={() => setDocLang("en")}>English</button>
          <span className="v2-mini v2-muted" style={{ alignSelf: "center", marginLeft: 6 }}>{tr("workbench.delivery.langNote")}</span>
        </div>

        <section className="v2-memo">
          <div className="v2-memo-head">
            <div className="kicker"><FileText size={12} /> {tr("workbench.delivery.memo")}</div>
            <div className="rec">{docLang === "zh" ? memo.recommendationZh : memo.recommendationEn}</div>
            <div className="v2-finding-meta" style={{ marginTop: 7 }}>
              <span className="v2-tag v2-tag-blue">{tr("workbench.delivery.recommendation")}: {memo.recommendation}</span>
              <span className="v2-tag">{tr("common.confidence")}: {confidenceLabel(docLang, memo.confidence)}</span>
              <span className="v2-tag">{memo.evidenceIds.length} evidence · {memo.counterIds.length} counter</span>
            </div>
          </div>
          <div className="v2-memo-body">
            <div className="v2-memo-block">
              <h4>{tr("common.confidence")}</h4>
              <p>{docLang === "zh" ? memo.confidenceReasonZh : memo.confidenceReasonEn}</p>
            </div>
            <div className="v2-memo-block">
              <h4>{tr("workbench.delivery.cannot")}</h4>
              <ul>{(docLang === "zh" ? report.cannotProveZh : report.cannotProveEn).map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="v2-memo-block">
              <h4>{tr("workbench.delivery.kill")}</h4>
              <ul>{(docLang === "zh" ? memo.killCriteriaZh : memo.killCriteriaEn).map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="v2-memo-block">
              <h4>{tr("workbench.delivery.nextTest")}</h4>
              <p>{docLang === "zh" ? memo.nextTest.cheapestTestZh : memo.nextTest.cheapestTestEn}</p>
              <ul style={{ marginTop: 5 }}>
                {(docLang === "zh" ? memo.nextTest.questionsZh : memo.nextTest.questionsEn).slice(0, 6).map((item) => <li key={item}>{item}</li>)}
              </ul>
              <p className="v2-small" style={{ marginTop: 6 }}><b>{tr("workbench.delivery.kill")}:</b> {docLang === "zh" ? memo.nextTest.falsificationZh : memo.nextTest.falsificationEn}</p>
            </div>
            <div className="v2-memo-block">
              <h4>{tr("workbench.delivery.doNotDo")}</h4>
              <ul>{(docLang === "zh" ? memo.doNotDoZh : memo.doNotDoEn).map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <p className="v2-mini v2-muted">{docLang === "zh" ? memo.disclosureZh : memo.disclosureEn}</p>
          </div>
        </section>

        <article className="v2-doc" style={{ marginTop: 16 }} data-testid="v2-report">
          <div className="v2-doc-cover">
            <div className="kicker">{tr("workbench.delivery.report")}</div>
            <h2>{docLang === "zh" ? report.decisionZh : report.decisionEn}</h2>
            <p className="v2-small v2-muted" style={{ marginTop: 8 }}>{docLang === "zh" ? report.summaryZh : report.summaryEn}</p>
          </div>
          <div className="v2-doc-body">
            {report.sections.filter((section) => section.titleZh !== "关键发现" && section.titleEn !== "Key findings").map((section) => (
              <section className="v2-doc-section" key={section.titleZh}>
                <h3>{docLang === "zh" ? section.titleZh : section.titleEn}</h3>
                <p style={{ whiteSpace: "pre-wrap" }}>{docLang === "zh" ? section.bodyZh : section.bodyEn}</p>
              </section>
            ))}
            <section className="v2-doc-section">
              <h3>{tr("workbench.delivery.quotes")}</h3>
              <div className="v2-evidence-list">
                {report.quotes.slice(0, 10).map((quote) => (
                  <div className="v2-evidence-item" key={quote.itemId}>
                    <div className="zh">{docLang === "zh" ? quote.quoteZh : quote.quoteEn}</div>
                    <div className="en">{docLang === "zh" ? quote.quoteEn : quote.quoteZh}</div>
                    <div className="meta">
                      <span>{quote.author}</span>
                      <a href={quote.url} target="_blank" rel="noreferrer"><Link2 size={10} /> Zhihu</a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="v2-doc-section">
              <h3>{lang === "zh" ? "研究词表" : "Research vocabulary"}</h3>
              <div className="v2-row">
                {report.wordlist.map((item) => (
                  <span className="v2-tag v2-tag-line" key={`${item.raw}-${item.source}`}>{item.raw} · {item.source}{item.broughtNewTheme ? ` · ${lang === "zh" ? "新主题" : "new theme"}` : ""}</span>
                ))}
              </div>
            </section>
          </div>
        </article>
      </div>

      <aside className="v2-delivery-aside">
        <section className="v2-card v2-side-card">
          <h2>{tr("common.export")}</h2>
          <div className="v2-stack" style={{ marginTop: 8 }}>
            <button className="v2-btn v2-btn-primary" type="button" onClick={() => void copyMarkdown()}><ClipboardCopy size={13} /> {copied || tr("workbench.delivery.copyMd")}</button>
            <button className="v2-btn" type="button" onClick={download}><Download size={13} /> {tr("workbench.delivery.downloadMd")}</button>
            <button className="v2-btn" type="button" onClick={() => window.print()}><Printer size={13} /> {tr("workbench.delivery.print")}</button>
          </div>
          <p className="v2-aside-note" style={{ marginTop: 8 }}>{tr("workbench.delivery.exportNote")}</p>
        </section>
        <section className="v2-card v2-side-card">
          <h2>{tr("workbench.delivery.interview")}</h2>
          <p className="v2-small v2-muted" style={{ marginTop: 6 }}>{docLang === "zh" ? memo.nextTest.cheapestTestZh : memo.nextTest.cheapestTestEn}</p>
          <ul className="v2-list" style={{ marginTop: 6 }}>
            {(docLang === "zh" ? memo.nextTest.personasZh : memo.nextTest.personasEn).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <section className="v2-card v2-side-card">
          <h2>{lang === "zh" ? "研究摘要" : "Study summary"}</h2>
          <div className="v2-check-row"><span>{lang === "zh" ? "纳入样本" : "Included"}</span><b>{study.sample.filter((item) => item.included).length}</b></div>
          <div className="v2-check-row"><span>{lang === "zh" ? "查询 / 轮次" : "Queries / rounds"}</span><b>{study.runs.length} / {study.rounds}</b></div>
          <div className="v2-check-row"><span>{lang === "zh" ? "新关键词" : "New keywords"}</span><b>{study.vocabulary.length}</b></div>
          <div className="v2-check-row"><span>{lang === "zh" ? "计划版本" : "Plan versions"}</span><b>{study.plan.versions.length}</b></div>
        </section>
      </aside>
    </div>
  );
}

export function buildMarkdown(study: StudyV2, lang: "zh" | "en"): string {
  const memo = study.memo;
  const report = study.report;
  const lines: string[] = [];
  lines.push(`# ${lang === "zh" ? "知研台双语决策简报" : "Zhiyan bilingual decision brief"}`);
  lines.push("");
  lines.push(`## ${lang === "zh" ? "决策" : "Decision"}`);
  lines.push(lang === "zh" ? report.decisionZh : report.decisionEn);
  lines.push("");
  lines.push(`## ${lang === "zh" ? "建议" : "Recommendation"}`);
  lines.push(lang === "zh" ? memo.recommendationZh : memo.recommendationEn);
  lines.push(`${lang === "zh" ? "置信度" : "Confidence"}: ${memo.confidence}`);
  lines.push("");
  lines.push(`## ${lang === "zh" ? "关键发现" : "Key findings"}`);
  for (const finding of study.findings.filter((item) => !item.hidden)) {
    lines.push(`### ${lang === "zh" ? finding.titleZh : finding.titleEn}`);
    lines.push(lang === "zh" ? finding.bodyZh : finding.bodyEn);
    for (const evidence of finding.evidence) {
      lines.push(`> ${lang === "zh" ? evidence.quoteZh : evidence.quoteEn}  `);
      lines.push(`> — ${evidence.author}, ${evidence.url}`);
    }
    lines.push("");
  }
  lines.push(`## ${lang === "zh" ? "不能证明" : "Cannot prove"}`);
  for (const item of lang === "zh" ? report.cannotProveZh : report.cannotProveEn) lines.push(`- ${item}`);
  lines.push("");
  lines.push(`## ${lang === "zh" ? "下一步验证" : "Next validation"}`);
  lines.push(lang === "zh" ? memo.nextTest.cheapestTestZh : memo.nextTest.cheapestTestEn);
  for (const item of lang === "zh" ? memo.nextTest.questionsZh : memo.nextTest.questionsEn) lines.push(`- ${item}`);
  lines.push("");
  lines.push(`## ${lang === "zh" ? "证伪条件" : "Falsification"}`);
  lines.push(lang === "zh" ? memo.nextTest.falsificationZh : memo.nextTest.falsificationEn);
  lines.push("");
  lines.push(`## ${lang === "zh" ? "研究词表" : "Vocabulary"}`);
  for (const item of report.wordlist) lines.push(`- ${item.raw} (${item.type}, ${item.source})`);
  lines.push("");
  return lines.join("\n");
}
