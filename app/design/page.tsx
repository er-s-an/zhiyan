"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileSearch,
  Info,
  Layers,
  Lock,
  PencilLine,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { Kanshan } from "../components/Kanshan";
import { StepRail } from "../components/StepRail";
import { confirmAndRetrieve, type RetrieveProgress } from "../../lib/confirmRun";
import { loadDraft, saveDraft } from "../../lib/storage";
import { LOCKED_LIMITS, STAGE_LABEL, STAGES, SUBJECTS, type ResearchDesign, type Study } from "../../lib/types";

const SUBJECT_LABEL: Record<string, string> = {
  users: "使用者",
  buyers: "购买者",
  practitioners: "从业者",
};

function lines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function terms(value: string): string[] {
  return value
    .split(/[,，、]/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function readableError(message: string): string {
  if (message.includes("ZHIHU_NOT_CONFIGURED")) return "服务端还没有配置知乎 Access Secret，暂时不能检索。";
  if (message.includes("SEARCH_FAILED")) return "知乎搜索没有返回任何结果，检索已停止，未生成发现。";
  if (message.includes("HOT_LIST_FAILED")) return "知乎热榜没有返回，检索在保存样本前停止。";
  if (message.includes("CONFIRM_REQUIRED")) return "检索请求缺少确认，已被服务端拒绝。";
  if (message.includes("QUERY_NOT_IN_DESIGN")) return "有一条检索词不在已确认的设计里，已被拒绝。";
  return message || "检索没有完成，请稍后再试。";
}

export default function DesignPage() {
  const router = useRouter();
  const [design, setDesign] = useState<ResearchDesign | null>(null);
  const [study, setStudy] = useState<Study | null>(null);
  const [demoId, setDemoId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<RetrieveProgress | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setDesign(draft.design);
      setStudy(draft.study);
      setDemoId(draft.demoId ?? null);
    }
    setReady(true);
  }, []);

  function update(patch: Partial<ResearchDesign>) {
    setDesign((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      saveDraft({ design: next, study: null, demoId: null });
      return next;
    });
    setStudy(null);
    setDemoId(null);
  }

  async function confirm() {
    if (!design) return;
    setBusy(true);
    setError("");
    setProgress({ step: "准备检索", finished: [] });
    try {
      const nextStudy = await confirmAndRetrieve(design, setProgress);
      saveDraft({ design: nextStudy.design, study: nextStudy, demoId: null });
      router.push("/workbench?view=sample");
    } catch (caught) {
      setError(readableError(caught instanceof Error ? caught.message : ""));
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className="loading-screen">
        <span className="spinner" />
        正在读取研究设计
      </div>
    );
  }

  if (!design) {
    return (
      <main>
        <div className="card empty">
          <Kanshan variant="side" size={170} />
          <h2>还没有研究简报</h2>
          <p>先回工作台写一句想弄清楚的业务问题，知研台会把它编译成可以修改的研究设计，再等你确认。</p>
          <div className="empty-actions">
            <Link className="btn btn-primary" href="/">
              去写研究简报 <ArrowRight size={15} />
            </Link>
            <Link className="btn" href="/examples">
              先看一个完整示例
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const extraLimits = design.zhihuCannotAnswer.filter(
    (line) => !LOCKED_LIMITS.includes(line as (typeof LOCKED_LIMITS)[number]),
  );
  const currentStep = study ? 2 : 1;

  return (
    <main>
      <StepRail current={currentStep} />

      <div className="page-head">
        <span className="eyebrow">
          <PencilLine size={14} /> 第 2 步 · 先确认方法
        </span>
        <h1>研究设计</h1>
        <p className="lede">
          这份协议会决定接下来检索什么、怎么取样、什么算发现。确认之前，知乎搜索、热榜和直答都保持空闲。
        </p>
        <div className="head-meta">
          <span className="pill pill-blue">
            <Layers size={12} /> {STAGE_LABEL[design.stage]}
          </span>
          <span className="pill">
            <FileSearch size={12} /> {design.scenes.length} 个场景
          </span>
          <span className="pill">
            <Search size={12} /> {design.queries.length} 条检索词
          </span>
          <span className="pill">
            <Users size={12} /> {design.subjects.map((subject) => SUBJECT_LABEL[subject] || subject).join(" / ")}
          </span>
          <span className="pill pill-green" data-testid="zhihu-calls">
            知乎调用 {study ? study.retrieval.length : 0} 次
          </span>
        </div>
      </div>

      {demoId ? (
        <div className="demo-banner">
          <span className="tag tag-blue">示例设计</span>
          <p>你正在查看示例库里的研究设计。直接确认会重新调用知乎；编辑任意字段也会清空示例数据。</p>
        </div>
      ) : null}

      {study ? (
        <div className="notice notice-amber" style={{ marginBottom: 14 }}>
          <AlertTriangle size={15} />
          <span>
            当前已经有一份样本。编辑任何字段都会清空它，再次确认会重新检索。
            <Link href="/workbench" style={{ marginLeft: 8, fontWeight: 600 }}>
              打开当前研究 <ChevronRight size={12} />
            </Link>
          </span>
        </div>
      ) : null}

      <div className="design-layout">
        <div className="design-form">
          <section className="card form-card" data-testid="design-panel">
            <div className="form-card-head">
              <span className="form-index">01</span>
              <div>
                <h2>这次研究要支持什么决策</h2>
                <p>写成一句可以被反驳的话，而不是一个搜索词。</p>
              </div>
            </div>
            <div className="notice notice-blue" style={{ marginBottom: 12 }}>
              <Info size={14} />
              <span>研究简报：{design.brief}</span>
            </div>
            <div className="field">
              <label htmlFor="decision">决策</label>
              <textarea
                id="decision"
                className="textarea"
                data-testid="decision-input"
                value={design.decision}
                onChange={(event) => update({ decision: event.target.value })}
              />
            </div>
          </section>

          <section className="card form-card">
            <div className="form-card-head">
              <span className="form-index">02</span>
              <div>
                <h2>研究对象与阶段</h2>
                <p>谁的经验算证据？这次研究处在产品决策的哪一段？</p>
              </div>
            </div>
            <div className="grid-2">
              <div className="field">
                <span className="field-label">研究对象</span>
                <div className="checks">
                  {SUBJECTS.map((subject) => (
                    <label key={subject} className={`check${design.subjects.includes(subject) ? " is-on" : ""}`}>
                      <input
                        type="checkbox"
                        checked={design.subjects.includes(subject)}
                        onChange={(event) => {
                          const subjects = event.target.checked
                            ? [...design.subjects, subject]
                            : design.subjects.filter((item) => item !== subject);
                          update({ subjects });
                        }}
                      />
                      {SUBJECT_LABEL[subject] || subject}
                    </label>
                  ))}
                </div>
              </div>
              <div className="field">
                <label htmlFor="stage">研究阶段</label>
                <select id="stage" className="select" value={design.stage} onChange={(event) => update({ stage: event.target.value as ResearchDesign["stage"] })}>
                  {STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {STAGE_LABEL[stage]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="card form-card">
            <div className="form-card-head">
              <span className="form-index">03</span>
              <div>
                <h2>知乎能回答什么，不能回答什么</h2>
                <p>两条限度锁在设计里，删不掉。这是这份研究能被信任的原因。</p>
              </div>
            </div>
            <div className="field">
              <label htmlFor="can-answer">现有知乎讨论可以回答</label>
              <textarea
                id="can-answer"
                className="textarea"
                value={design.zhihuCanAnswer.join("\n")}
                onChange={(event) => update({ zhihuCanAnswer: lines(event.target.value) })}
              />
            </div>
            <div className="field">
              <span className="field-label">不能回答（锁定）</span>
              <div className="locked-box" data-testid="locked-limits">
                <div className="locked-head">
                  <Lock size={13} /> 方法边界
                </div>
                <ul>
                  {LOCKED_LIMITS.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="field">
              <label htmlFor="extra-limits">还要写进档案的额外限制</label>
              <textarea
                id="extra-limits"
                className="textarea"
                value={extraLimits.join("\n")}
                placeholder="每行一条，例如：不会推断最终采购决策。"
                onChange={(event) => update({ zhihuCannotAnswer: [...LOCKED_LIMITS, ...lines(event.target.value)] })}
              />
            </div>
          </section>

          <section className="card form-card">
            <div className="form-card-head">
              <span className="form-index">04</span>
              <div>
                <h2>研究场景</h2>
                <p>场景决定样本怎么被找到，也决定哪些场景会被质检标成「未覆盖」。</p>
              </div>
            </div>
            <div className="scenes">
              {design.scenes.map((scene) => (
                <div className="scene-row" key={scene.id}>
                  <input
                    className="input"
                    aria-label={`场景 ${scene.label}`}
                    value={scene.label}
                    onChange={(event) =>
                      update({
                        scenes: design.scenes.map((item) =>
                          item.id === scene.id ? { ...item, label: event.target.value } : item,
                        ),
                      })
                    }
                  />
                  <div className="scene-terms" aria-hidden="true">
                    {scene.keywords.slice(0, 4).map((keyword) => (
                      <span className="tag" key={keyword}>
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card form-card">
            <div className="form-card-head">
              <span className="form-index">05</span>
              <div>
                <h2>样本边界与停止规则</h2>
                <p>先写清楚什么算样本，再开始检索。停止规则跑完就停，不为了凑观点追加查询。</p>
              </div>
            </div>
            <div className="field">
              <label htmlFor="populations">人群</label>
              <textarea
                id="populations"
                className="textarea"
                value={design.populations.join("\n")}
                onChange={(event) => update({ populations: lines(event.target.value) })}
              />
            </div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="window-start">时间窗开始</label>
                <input
                  id="window-start"
                  className="input"
                  type="date"
                  value={design.timeWindow.start}
                  onChange={(event) => update({ timeWindow: { ...design.timeWindow, start: event.target.value } })}
                />
              </div>
              <div className="field">
                <label htmlFor="window-end">时间窗结束</label>
                <input
                  id="window-end"
                  className="input"
                  type="date"
                  value={design.timeWindow.end}
                  onChange={(event) => update({ timeWindow: { ...design.timeWindow, end: event.target.value } })}
                />
              </div>
            </div>
            <p className="field-hint" style={{ marginTop: 8 }}>
              <CalendarDays size={12} style={{ verticalAlign: "-1px", marginRight: 4 }} />
              {design.timeWindow.rationale}
            </p>
            <div className="grid-2" style={{ marginTop: 4 }}>
              <div className="field">
                <label htmlFor="inclusion">纳入规则</label>
                <textarea
                  id="inclusion"
                  className="textarea"
                  value={design.inclusion.join("\n")}
                  onChange={(event) => update({ inclusion: lines(event.target.value) })}
                />
              </div>
              <div className="field">
                <label htmlFor="exclusion">排除规则</label>
                <textarea
                  id="exclusion"
                  className="textarea"
                  value={design.exclusion.join("\n")}
                  onChange={(event) => update({ exclusion: lines(event.target.value) })}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="stopping">停止规则</label>
              <textarea
                id="stopping"
                className="textarea"
                value={design.stoppingRule}
                onChange={(event) => update({ stoppingRule: event.target.value })}
              />
            </div>
          </section>

          <section className="card form-card">
            <div className="form-card-head">
              <span className="form-index">06</span>
              <div>
                <h2>中文检索词</h2>
                <p>每条检索词会单独调用一次知乎搜索。只跑这里列出的查询。</p>
              </div>
            </div>
            <div className="query-list" data-testid="queries">
              {design.queries.map((query, index) => (
                <div className="query-row" key={`${index}-${query}`}>
                  <span className="query-index">{index + 1}</span>
                  <input
                    className="input"
                    aria-label={`检索词 ${index + 1}`}
                    value={query}
                    onChange={(event) =>
                      update({
                        queries: design.queries.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)),
                      })
                    }
                  />
                  <button
                    className="btn btn-icon btn-ghost"
                    type="button"
                    aria-label="删除这条检索词"
                    disabled={design.queries.length <= 1}
                    onClick={() => update({ queries: design.queries.filter((_, itemIndex) => itemIndex !== index) })}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              className="btn btn-sm"
              type="button"
              style={{ marginTop: 10 }}
              onClick={() => update({ queries: [...design.queries, ""] })}
            >
              <Plus size={14} /> 添加检索词
            </button>
          </section>
        </div>

        <aside className="run-panel card" aria-label="执行前检查">
          <div className="run-panel-head">
            <h2>
              <ClipboardCheck size={16} /> 执行前检查
            </h2>
            <p className="field-hint" style={{ marginTop: 4 }}>
              确认后才会发起下面这些调用
            </p>
          </div>
          <div className="run-panel-body">
            <div className="run-check">
              <span>已调用知乎</span>
              <strong className="blue">0 次</strong>
            </div>
            <div className="run-check">
              <span>计划检索词</span>
              <strong>{design.queries.filter((query) => query.trim()).length} 条</strong>
            </div>
            <div className="run-check">
              <span>研究场景</span>
              <strong>{design.scenes.length} 个</strong>
            </div>
            <div className="run-check">
              <span>编码规则</span>
              <strong>{design.codebook.length} 条</strong>
            </div>
            <div className="run-check">
              <span>时间窗</span>
              <strong>24 个月</strong>
            </div>
            <div className="run-callout">
              将调用：知乎搜索 {design.queries.filter((query) => query.trim()).length} 次 · 热榜 1 次 · 直答 1 次（仅补漏）
            </div>
            <div className="run-actions">
              <button className="btn btn-primary btn-block btn-lg" type="button" data-testid="confirm-button" disabled={busy} onClick={() => void confirm()}>
                {busy ? (
                  <>
                    <span className="spinner" /> 正在检索知乎
                  </>
                ) : (
                  <>
                    确认设计并开始检索 <ArrowRight size={16} />
                  </>
                )}
              </button>
              <p className="run-hint">检索通常需要 30–90 秒。中途失败会明确提示，不会用直答顶替结论。</p>
            </div>

            {progress ? (
              <div className="progress-box" data-testid="retrieve-progress">
                <div className="progress-head">
                  {busy ? <span className="spinner" /> : <CheckCircle2 size={14} />}
                  {progress.step}
                </div>
                {progress.finished.length > 0 ? (
                  <div className="progress-finished">
                    {progress.finished.map((query) => (
                      <span className="tag tag-green" key={query}>
                        {query}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {error ? (
              <p className="error-text" data-testid="form-error" style={{ marginTop: 10 }}>
                <AlertTriangle size={14} /> {error}
              </p>
            ) : null}

            <div className="divider" />
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="mini muted">设计由确定性规则编译</span>
              <Link className="mini" href="/examples">
                先看示例
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
