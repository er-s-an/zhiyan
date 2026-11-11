"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleSlash,
  ClipboardCopy,
  Download,
  FileText,
  Filter,
  Info,
  Layers,
  ListChecks,
  Lock,
  MessageSquare,
  Printer,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Users,
  X,
} from "lucide-react";
import { ROLE_LABEL, STAGE_LABEL, type Role, type Study, type ThemeRow } from "../../lib/types";
import { project, relabel, setIncluded } from "../../lib/project";

type ViewModel = ReturnType<typeof project>;

const SOURCE_LABEL: Record<string, string> = {
  zhihu_search: "知乎搜索",
  hot_list: "知乎热榜",
};

const FLAG_LABEL: Record<string, string> = {
  marketing: "营销",
  duplicate: "重复",
  secondhand: "二手",
};

function percent(count: number, max: number): string {
  if (max <= 0) return "0%";
  return `${Math.max(4, Math.round((count / max) * 100))}%`;
}

function fmtDate(value: string): string {
  if (!value || value === "unknown") return "无日期";
  return value;
}

function clip(value: string, limit = 320): string {
  if (!value) return "";
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

/* ------------------------------ protocol ------------------------------ */

export function ProtocolView({ study }: { study: Study }) {
  const design = study.design;
  return (
    <div className="panel-stack" data-testid="locked-design">
      <div className="overview-grid">
        <section className="card section-card">
          <h2>
            <FileText size={16} /> 决策
          </h2>
          <p className="section-sub">研究简报</p>
          <p style={{ marginTop: 12, color: "var(--ink)", fontSize: 15, fontWeight: 600, lineHeight: 1.65 }}>{design.decision}</p>
          <p className="notice" style={{ marginTop: 14 }}>
            <Info size={14} />
            <span>{design.brief}</span>
          </p>
        </section>

        <section className="card section-card">
          <h2>
            <ClipboardCheckIcon /> 方法与样本
          </h2>
          <p className="section-sub">检索实际遵循的协议</p>
          <dl className="kv">
            <dt>确认时间</dt>
            <dd>{new Date(study.confirmedAt).toLocaleString("zh-CN", { hour12: false })}</dd>
            <dt>研究对象</dt>
            <dd>{design.subjects.map((subject) => ({ users: "使用者", buyers: "购买者", practitioners: "从业者" })[subject] || subject).join(" / ")}</dd>
            <dt>研究阶段</dt>
            <dd>{STAGE_LABEL[design.stage]}</dd>
            <dt>时间窗</dt>
            <dd>
              {design.timeWindow.start} 至 {design.timeWindow.end}
            </dd>
            <dt>停止规则</dt>
            <dd>{design.stoppingRule}</dd>
          </dl>
        </section>

        <section className="card section-card">
          <h2>
            <Search size={16} /> 现有知乎讨论可以回答
          </h2>
          <ul className="bullet-list">
            {design.zhihuCanAnswer.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section className="card section-card">
          <h2>
            <Lock size={16} /> 不能回答（锁定）
          </h2>
          <ul className="bullet-list">
            {design.zhihuCannotAnswer.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card section-card">
        <h2>
          <Layers size={16} /> 检索记录
        </h2>
        <p className="section-sub">每一次调用都记录在这里。失败也记，不用直答顶替结论。</p>
        <div style={{ overflowX: "auto" }}>
          <table className="retrieval-table">
            <thead>
              <tr>
                <th>类型</th>
                <th>查询</th>
                <th>结果数</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {study.retrieval.map((entry, index) => (
                <tr key={`${entry.kind}-${index}`}>
                  <td>{entry.kind === "zhida" ? "知乎直答" : SOURCE_LABEL[entry.kind] || entry.kind}</td>
                  <td>{entry.query}</td>
                  <td>{entry.resultCount}</td>
                  <td>
                    {entry.error ? (
                      <span className="tag tag-amber">{entry.error}</span>
                    ) : (
                      <span className="tag tag-green">成功</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mini muted" style={{ marginTop: 10 }}>
          热榜扫描 {study.hotScan.scanned} 条，纳入 {study.hotScan.included} 条，丢弃 {study.hotScan.droppedTitles.length} 条。
        </p>
      </section>

      <section className="card section-card">
        <h2>
          <Sparkles size={16} /> 直答补漏提示
        </h2>
        <p className="section-sub">直答只根据已经检索到的标题提示可能漏掉的场景，不进入发现，也不进入报告正文。</p>
        {study.auxiliary.text ? (
          <blockquote
            style={{
              margin: "12px 0 0",
              padding: "12px 15px",
              borderLeft: "3px solid var(--blue)",
              borderRadius: "0 8px 8px 0",
              background: "var(--blue-50)",
              color: "var(--blue-ink)",
              fontSize: 13,
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}
          >
            {study.auxiliary.text}
          </blockquote>
        ) : (
          <p className="small muted" style={{ marginTop: 10 }}>
            本次没有可用提示{study.auxiliary.error ? `（${study.auxiliary.error}）` : ""}。它没有被当作发现。
          </p>
        )}
      </section>
    </div>
  );
}

function ClipboardCheckIcon() {
  return <ListChecks size={16} />;
}

/* ------------------------------ sample ------------------------------ */

export function SampleView({ study, onCommit }: { study: Study; onCommit: (next: Study) => void }) {
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [scene, setScene] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(study.sample[0]?.id ?? null);

  const filtered = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return study.sample.filter((item) => {
      if (status === "included" && !item.included) return false;
      if (status === "held" && item.included) return false;
      if (source !== "all" && item.source !== source) return false;
      if (scene !== "all" && item.sceneId !== scene) return false;
      if (needle && !`${item.title} ${item.excerptZh} ${item.author}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [study.sample, status, source, scene, keyword]);

  const selected = study.sample.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const includedCount = study.sample.filter((item) => item.included).length;

  return (
    <section data-testid="sample-view">
      <div className="notice notice-blue" style={{ marginBottom: 12 }} data-testid="in-sample-banner">
        <Info size={14} />
        <span>
          下游所有计数都只属于这个样本：纳入 {includedCount} 条，搁置 {study.sample.length - includedCount} 条。排除、恢复或改标签后，
          分析与交付会立刻重算。
        </span>
      </div>

      <div className="sample-toolbar">
        <select className="select" aria-label="纳入状态" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">全部状态</option>
          <option value="included">只看已纳入</option>
          <option value="held">只看已搁置</option>
        </select>
        <select className="select" aria-label="来源" value={source} onChange={(event) => setSource(event.target.value)}>
          <option value="all">全部来源</option>
          <option value="zhihu_search">知乎搜索</option>
          <option value="hot_list">知乎热榜</option>
        </select>
        <select className="select" aria-label="场景" value={scene} onChange={(event) => setScene(event.target.value)}>
          <option value="all">全部场景</option>
          {study.design.scenes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <input className="input" placeholder="搜标题、作者或摘录" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
        <span className="toolbar-count">
          {filtered.length} / {study.sample.length} 条
        </span>
      </div>

      <div className="sample-layout">
        <div className="card sample-list">
          <div className="sample-list-scroll">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`sample-row${selected?.id === item.id ? " is-selected" : ""}`}
                data-testid="sample-item"
                onClick={() => setSelectedId(item.id)}
              >
                <span className={`row-dot${item.included ? "" : " is-held"}`} />
                <span className="sample-row-body">
                  <span className="sample-row-title">{item.title}</span>
                  <span className="sample-row-meta">
                    <span>{item.author || "匿名"}</span>
                    <span>{fmtDate(item.publishDate)}</span>
                    <span>{item.sceneLabel}</span>
                  </span>
                  <span className="sample-row-flags">
                    <span className={`tag ${item.included ? "tag-green" : ""}`}>{item.included ? "已纳入" : "已搁置"}</span>
                    <span className="tag">{SOURCE_LABEL[item.source] || item.source}</span>
                    {item.flags.marketing ? <span className="tag tag-amber">营销</span> : null}
                    {item.flags.duplicate ? <span className="tag tag-amber">重复</span> : null}
                    {item.flags.secondhand ? <span className="tag tag-amber">二手</span> : null}
                  </span>
                </span>
              </button>
            ))}
            {filtered.length === 0 ? (
              <div className="empty" style={{ padding: "34px 16px" }}>
                <Filter size={20} style={{ color: "var(--ink-4)" }} />
                <p>没有符合筛选条件的条目。</p>
              </div>
            ) : null}
          </div>
        </div>

        {selected ? (
          <article className="card sample-detail" key={selected.id}>
            <p className="mini muted">
              {SOURCE_LABEL[selected.source] || selected.source} · {selected.query}
            </p>
            <h2 className="detail-title" style={{ marginTop: 5 }}>
              <a href={selected.url} target="_blank" rel="noreferrer">
                {selected.title} <ArrowUpRight size={14} />
              </a>
            </h2>
            <div className="detail-meta">
              <span>{selected.author || "匿名"}</span>
              <span>{fmtDate(selected.publishDate)}</span>
              <span>
                <ThumbsUp size={12} /> {selected.votes}
              </span>
              <span>
                <MessageSquare size={12} /> {selected.comments}
              </span>
              <span className="tag">{selected.contentType || "内容"}</span>
              {selected.included ? <span className="tag tag-green">已纳入</span> : <span className="tag">已搁置</span>}
            </div>

            <div className="detail-section">
              <h3>
                <Quote size={14} /> 中文摘录（证据）
              </h3>
              <div className="excerpt-zh">{selected.excerptZh || "这条内容没有可用的中文摘录。"}</div>
              <div className="excerpt-en">{selected.excerptEn || "暂无英文翻译，请以中文原文为准。"}</div>
            </div>

            <div className="detail-section">
              <h3>
                <Info size={14} /> 为什么在样本里
              </h3>
              <p className="small" style={{ color: "var(--ink-2)" }}>
                {selected.whyIncluded}
              </p>
              <div className="row" style={{ marginTop: 8 }}>
                {Object.entries(selected.flags).map(([key, value]) =>
                  value ? (
                    <span className="tag tag-amber" key={key}>
                      {FLAG_LABEL[key] || key}
                    </span>
                  ) : null,
                )}
                <span className="tag tag-blue">{selected.sceneLabel}</span>
              </div>
            </div>

            <div className="detail-section">
              <h3>
                <ListChecks size={14} /> 编码（点击切换）
              </h3>
              <div className="code-chips">
                {study.design.codebook.map((code) => {
                  const on = selected.codeIds.includes(code.id);
                  return (
                    <button
                      key={code.id}
                      type="button"
                      className={`code-chip${on ? " is-on" : ""}`}
                      aria-pressed={on}
                      onClick={() => {
                        const codeIds = on ? selected.codeIds.filter((id) => id !== code.id) : [...selected.codeIds, code.id];
                        onCommit(relabel(study, selected.id, { codeIds }));
                      }}
                    >
                      {on ? <Check size={11} /> : null}
                      {code.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-actions">
                <div className="field">
                  <label htmlFor={`role-${selected.id}`}>角色</label>
                  <select
                    id={`role-${selected.id}`}
                    className="select"
                    value={selected.role}
                    onChange={(event) => onCommit(relabel(study, selected.id, { role: event.target.value as Role }))}
                  >
                    {(Object.keys(ROLE_LABEL) as Role[]).map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABEL[role]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`scene-${selected.id}`}>场景</label>
                  <select
                    id={`scene-${selected.id}`}
                    className="select"
                    value={selected.sceneId}
                    onChange={(event) => onCommit(relabel(study, selected.id, { sceneId: event.target.value }))}
                  >
                    <option value="unassigned">未归类</option>
                    {study.design.scenes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                {selected.included ? (
                  <button className="btn btn-danger" type="button" data-testid="exclude-button" onClick={() => onCommit(setIncluded(study, selected.id, false))}>
                    <X size={14} /> 搁置这条
                  </button>
                ) : (
                  <button className="btn" type="button" data-testid="restore-button" onClick={() => onCommit(setIncluded(study, selected.id, true))}>
                    <CheckCircle2 size={14} /> 恢复到样本
                  </button>
                )}
              </div>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}

/* ------------------------------ analysis ------------------------------ */

export function AnalysisView({ study, viewModel }: { study: Study; viewModel: ViewModel }) {
  const max = Math.max(1, ...viewModel.themes.map((theme) => theme.count));
  const coveredScenes = viewModel.honest.coveredScenes.length;

  return (
    <div className="panel-stack" data-testid="analysis-view">
      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-label">纳入条目</div>
          <div className="stat-value">
            {viewModel.includedCount}
            <small>条</small>
          </div>
          <div className="stat-note">仅统计本样本</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">搁置条目</div>
          <div className="stat-value">
            {viewModel.heldOutCount}
            <small>条</small>
          </div>
          <div className="stat-note">重复或人工排除</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">形成发现</div>
          <div className="stat-value">
            {viewModel.findings.length}
            <small>条</small>
          </div>
          <div className="stat-note">至少两条条目同一编码</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">场景覆盖</div>
          <div className="stat-value">
            {coveredScenes}
            <small>/ {study.design.scenes.length}</small>
          </div>
          <div className="stat-note">没覆盖的会在质检页列出</div>
        </div>
      </div>

      <section className="card section-card">
        <h2>
          <Sparkles size={16} /> 发现
        </h2>
        <p className="section-sub">只有两条及以上纳入条目带上同一个编码，才会写成发现。一条帖子永远不会单独成为发现。</p>
        {viewModel.findings.length > 0 ? (
          <div className="finding-list">
            {viewModel.findings.map((finding, index) => (
              <article className="finding-card" key={finding.id}>
                <span className="finding-index">{index + 1}</span>
                <div className="finding-body">
                  <p>{finding.text}</p>
                  <div className="finding-refs">
                    {finding.itemIds.map((id) => {
                      const item = study.sample.find((row) => row.id === id);
                      return item ? (
                        <a className="tag tag-blue" key={id} href={item.url} target="_blank" rel="noreferrer">
                          {item.title.slice(0, 30)}
                          {item.title.length > 30 ? "…" : ""}
                        </a>
                      ) : null;
                    })}
                  </div>
                  <p className="mini muted" style={{ marginTop: 7 }}>
                    过程：{finding.process}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty" style={{ padding: "30px 16px" }}>
            <CircleSlash size={22} style={{ color: "var(--ink-4)" }} />
            <p>还没有编码达到两条纳入条目。这不是失败，说明这个样本还不足以形成发现。</p>
          </div>
        )}
      </section>

      <section className="card section-card">
        <h2>
          <BarChart3 size={16} /> 主题分布
        </h2>
        <p className="section-sub">计数只属于本样本，不外推成市场规模或全国结论。</p>
        <div className="theme-list">
          {viewModel.themes.map((theme) => (
            <div className="theme-row" key={theme.codeId} data-testid="theme-row">
              <span className="theme-name" title={theme.definition}>
                {theme.label}
              </span>
              <span className="theme-bar">
                <span style={{ width: percent(theme.count, max) }} />
              </span>
              <span className="theme-count">{theme.count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card section-card">
        <h2>
          <BookOpen size={16} /> 编码本
        </h2>
        <p className="section-sub">编码是可见的关键词规则，不是模型临时发明的主题。</p>
        <div className="codebook-grid">
          {study.design.codebook.map((code) => (
            <div className="codebook-item" key={code.id}>
              <strong>{code.label}</strong>
              <p>{code.definition}</p>
              <p style={{ marginTop: 5, color: "var(--ink-4)" }}>关键词：{code.keywords.join("、")}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------ quality ------------------------------ */

const FLAG_ICON: Record<string, typeof AlertTriangle> = {
  single_source: CircleSlash,
  uncovered_scene: Filter,
  conflict: AlertTriangle,
  stale: Info,
  inference_beyond_evidence: ShieldCheck,
  purchase_intent: Lock,
};

export function QualityView({ study, viewModel }: { study: Study; viewModel: ViewModel }) {
  return (
    <div className="panel-stack" data-testid="quality-view">
      <section className="card honest-card" data-testid="honest-call">
        <div className="honest-half can">
          <div className="honest-label">
            <CheckCircle2 size={15} /> 这份研究可以支持
          </div>
          <p className="honest-text">{viewModel.honest.canSupport}</p>
          <p className="honest-sub">它能把场景、用法和怀疑性措辞整理成一个可交接的样本。</p>
        </div>
        <div className="honest-half cannot">
          <div className="honest-label">
            <AlertTriangle size={15} /> 这份研究不能证明
          </div>
          <p className="honest-text">{viewModel.honest.cannotProve}</p>
          <p className="honest-sub">它不能替代购买意愿验证、宣称验证或市场规模测算。</p>
        </div>
      </section>

      <div className="coverage-grid">
        <section className="card section-card">
          <h2>
            <Layers size={16} /> 场景覆盖
          </h2>
          <p className="section-sub">已覆盖的场景</p>
          <ul className="coverage-list">
            {viewModel.honest.coveredScenes.map((scene) => (
              <li className="ok" key={scene}>
                <CheckCircle2 size={14} /> {scene}
              </li>
            ))}
            {viewModel.honest.coveredScenes.length === 0 ? <li className="miss">没有场景被覆盖</li> : null}
          </ul>
          <p className="section-sub" style={{ marginTop: 14 }}>
            缺失的场景
          </p>
          <ul className="coverage-list">
            {viewModel.honest.missingScenes.map((scene) => (
              <li className="miss" key={scene}>
                <AlertTriangle size={14} /> {scene}
              </li>
            ))}
            {viewModel.honest.missingScenes.length === 0 ? <li className="ok">全部覆盖</li> : null}
          </ul>
        </section>

        <section className="card section-card">
          <h2>
            <Users size={16} /> 角色覆盖
          </h2>
          <p className="section-sub">样本里出现的角色</p>
          <ul className="coverage-list">
            {viewModel.honest.coveredRoles.map((role) => (
              <li className="ok" key={role}>
                <CheckCircle2 size={14} /> {role}
              </li>
            ))}
            {viewModel.honest.coveredRoles.length === 0 ? <li className="miss">没有识别出角色</li> : null}
          </ul>
          <p className="section-sub" style={{ marginTop: 14 }}>
            仍然缺失的角色
          </p>
          <ul className="coverage-list">
            {viewModel.honest.missingRoles.map((role) => (
              <li className="miss" key={role}>
                <AlertTriangle size={14} /> {role}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card section-card">
        <h2>
          <ShieldCheck size={16} /> 质检标记
        </h2>
        <p className="section-sub">这些不是要隐藏的问题，而是拿去做下一步的线索。</p>
        <div className="flag-list">
          {viewModel.quality.map((flag, index) => {
            const Icon = FLAG_ICON[flag.kind] || AlertTriangle;
            const severity = flag.kind === "purchase_intent" || flag.kind === "inference_beyond_evidence" ? "low" : flag.itemIds.length > 0 ? "high" : "neutral";
            return (
              <article className="flag-item" key={`${flag.kind}-${index}`} data-testid={`quality-${flag.kind}`}>
                <span className={`flag-icon ${severity}`}>
                  <Icon size={15} />
                </span>
                <div>
                  <strong>{flag.title}</strong>
                  <p>{flag.detail}</p>
                  {flag.itemIds.length > 0 ? (
                    <div className="flag-refs">
                      {flag.itemIds.slice(0, 6).map((id) => {
                        const item = study.sample.find((row) => row.id === id);
                        return item ? (
                          <a className="tag tag-blue" key={id} href={item.url} target="_blank" rel="noreferrer">
                            {item.title.slice(0, 24)}
                            {item.title.length > 24 ? "…" : ""}
                          </a>
                        ) : null;
                      })}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card section-card">
        <h2>
          <ChevronRight size={16} /> 下一步方法
        </h2>
        <p className="section-sub">现有帖子只能走到这里，下一步应该换方法。</p>
        <p style={{ marginTop: 10, color: "var(--ink-2)", fontSize: 13.5, lineHeight: 1.75 }}>{viewModel.honest.nextMethod}</p>
      </section>
    </div>
  );
}

/* ------------------------------ delivery ------------------------------ */

export function DeliveryView({ study, viewModel }: { study: Study; viewModel: ViewModel }) {
  const [copied, setCopied] = useState("");
  const max = Math.max(1, ...viewModel.themes.map((theme) => theme.count));

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(viewModel.report);
      setCopied("已复制");
      setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopied("复制失败，请展开原始报告手动复制");
    }
  }

  function downloadReport() {
    const blob = new Blob([viewModel.report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `zhiyan-${study.id}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="delivery-layout" data-testid="delivery-view">
      <div className="panel-stack">
        <section className="card report-card">
          <div className="report-cover">
            <div className="report-kicker">
              <FileText size={13} /> 研究简报 · ZHIYAN RESEARCH NOTE
            </div>
            <h2>{study.design.decision}</h2>
            <p>
              确认于 {new Date(study.confirmedAt).toLocaleString("zh-CN", { hour12: false })} · 纳入 {viewModel.includedCount} 条 · 搁置{" "}
              {viewModel.heldOutCount} 条 · 阶段：{STAGE_LABEL[study.design.stage]}
            </p>
          </div>
          <div className="report-body">
            <section className="report-section">
              <h3>
                <Sparkles size={14} /> 关键发现
              </h3>
              {viewModel.findings.length > 0 ? (
                <div className="finding-list">
                  {viewModel.findings.map((finding, index) => (
                    <article className="finding-card" key={finding.id}>
                      <span className="finding-index">{index + 1}</span>
                      <div className="finding-body">
                        <p>{finding.text}</p>
                        <div className="finding-refs">
                          {finding.itemIds.map((id) => {
                            const item = study.sample.find((row) => row.id === id);
                            return item ? (
                              <a className="tag tag-blue" key={id} href={item.url} target="_blank" rel="noreferrer">
                                {item.title.slice(0, 26)}
                                {item.title.length > 26 ? "…" : ""}
                              </a>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="small muted">本样本还没有形成发现。质检页会说明原因，研究依然可以交接。</p>
              )}
            </section>

            <section className="report-section">
              <h3>
                <BarChart3 size={14} /> 主题分布
              </h3>
              <div className="theme-list">
                {viewModel.themes.map((theme) => (
                  <div className="theme-row" key={theme.codeId}>
                    <span className="theme-name">{theme.label}</span>
                    <span className="theme-bar">
                      <span style={{ width: percent(theme.count, max) }} />
                    </span>
                    <span className="theme-count">{theme.count}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="report-section">
              <h3>
                <Quote size={14} /> 证据摘录（中英对照）
              </h3>
              <div className="report-excerpts">
                {viewModel.excerpts.slice(0, 4).map((excerpt) => (
                  <article className="report-excerpt" key={excerpt.itemId} data-testid="excerpt">
                    <div className="report-excerpt-head">
                      <strong>
                        <a href={excerpt.url} target="_blank" rel="noreferrer">
                          {excerpt.title}
                        </a>
                      </strong>
                      <span className="tag">{excerpt.date}</span>
                    </div>
                    <p className="zh">{clip(excerpt.zh)}</p>
                    <p className="en">{clip(excerpt.en)}</p>
                  </article>
                ))}
              </div>
              {viewModel.excerpts.length > 4 ? (
                <details className="raw-report" style={{ marginTop: 10 }}>
                  <summary>查看其余 {viewModel.excerpts.length - 4} 条证据摘录</summary>
                  <div className="report-excerpts" style={{ padding: "10px 14px 14px" }}>
                    {viewModel.excerpts.slice(4).map((excerpt) => (
                      <article className="report-excerpt" key={excerpt.itemId}>
                        <div className="report-excerpt-head">
                          <strong>
                            <a href={excerpt.url} target="_blank" rel="noreferrer">
                              {excerpt.title}
                            </a>
                          </strong>
                          <span className="tag">{excerpt.date}</span>
                        </div>
                        <p className="zh">{excerpt.zh}</p>
                        <p className="en">{excerpt.en}</p>
                      </article>
                    ))}
                  </div>
                </details>
              ) : null}
              <p className="mini muted" style={{ marginTop: 8 }}>
                这里展示前 4 条证据（摘录有截断）。完整 {viewModel.excerpts.length} 条可以在「样本」页逐条核对中文原文。
              </p>
            </section>

            <section className="report-section">
              <h3>
                <Lock size={14} /> 结论边界
              </h3>
              <div className="notice notice-amber">
                <AlertTriangle size={14} />
                <span>
                  <strong>{viewModel.honest.canSupport}</strong>
                  <br />
                  {viewModel.honest.cannotProve}
                </span>
              </div>
            </section>

            <section className="report-section">
              <h3>
                <ChevronRight size={14} /> 下一步方法
              </h3>
              <p style={{ color: "var(--ink-2)", fontSize: 13.5, lineHeight: 1.75 }}>{viewModel.honest.nextMethod}</p>
            </section>

            <section className="report-section">
              <h3>
                <Info size={14} /> 中国互联网语境
              </h3>
              <p style={{ color: "var(--ink-3)", fontSize: 12.5, lineHeight: 1.75 }}>{viewModel.chinaContext}</p>
            </section>

            <section className="report-section">
              <h3>
                <ListChecks size={14} /> 检索记录
              </h3>
              <div className="retrieval-mini">
                {study.retrieval.map((entry, index) => (
                  <div className="retrieval-mini-row" key={`${entry.kind}-${index}`}>
                    <span>
                      {entry.kind === "zhida" ? "直答" : SOURCE_LABEL[entry.kind] || entry.kind} · {entry.query}
                    </span>
                    <b>{entry.error ? entry.error : `${entry.resultCount} 条`}</b>
                  </div>
                ))}
              </div>
            </section>

            <details className="raw-report">
              <summary>查看原始 Markdown 报告</summary>
              <pre data-testid="report">{viewModel.report}</pre>
            </details>
          </div>
        </section>
      </div>

      <aside className="delivery-aside">
        <section className="card aside-card">
          <h3>
            <Download size={14} /> 导出与分享
          </h3>
          <div className="aside-actions">
            <button className="btn btn-primary" type="button" onClick={() => void copyReport()}>
              <ClipboardCopy size={14} /> {copied || "复制 Markdown 报告"}
            </button>
            <button className="btn" type="button" onClick={downloadReport}>
              <Download size={14} /> 下载 .md 文件
            </button>
            <button className="btn" type="button" onClick={() => window.print()}>
              <Printer size={14} /> 打印 / 存为 PDF
            </button>
          </div>
          <p className="export-note" style={{ marginTop: 9 }}>
            报告由样本投影生成，不是另存一份会漂移的结论。改样本后重新复制即可。
          </p>
        </section>

        <section className="card aside-card">
          <h3>
            <ShieldCheck size={14} /> 这份简报怎么用
          </h3>
          <ul className="bullet-list" style={{ marginTop: 6 }}>
            <li>先读「关键发现」，再回到证据摘录核对原帖。</li>
            <li>带去评审会时，把「结论边界」和「下一步方法」一起讲。</li>
            <li>不要把它当成购买意愿或市场规模证明。</li>
          </ul>
        </section>

        <section className="card aside-card">
          <h3>
            <Users size={14} /> 覆盖摘要
          </h3>
          <p className="small muted">场景覆盖 {viewModel.honest.coveredScenes.length} / {study.design.scenes.length}</p>
          <p className="small muted">角色覆盖 {viewModel.honest.coveredRoles.length} 种</p>
          <p className="small muted">发现 {viewModel.findings.length} 条 · 质检标记 {viewModel.quality.length} 条</p>
        </section>
      </aside>
    </div>
  );
}
