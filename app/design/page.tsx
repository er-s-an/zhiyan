"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Lock, Plus, Trash2 } from "lucide-react";
import { useLang } from "../components/LanguageProvider";
import type { QueryDimension, QuerySeedV2, ResearchPlanV2, StudyV2 } from "../../lib/v2/types";

function lines(value: string): string[] {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

function readPlan(): ResearchPlanV2 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("zhiyan.v2.plan");
    return raw ? (JSON.parse(raw) as ResearchPlanV2) : null;
  } catch {
    return null;
  }
}

export default function DesignPage() {
  const router = useRouter();
  const { lang, t } = useLang();
  const [plan, setPlan] = useState<ResearchPlanV2 | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"lite" | "full">("lite");

  useEffect(() => {
    setPlan(readPlan());
    setReady(true);
  }, []);

  const gate = plan?.methodGate;
  const outputLabel = gate?.allowedOutput === "strong" ? t("design.outputStrong") : gate?.allowedOutput === "directional" ? t("design.outputDirectional") : t("design.outputHypotheses");
  const fitLabel = gate?.fit === "fit" ? t("design.gateFit") : gate?.fit === "partial" ? t("design.gatePartial") : t("design.gateMismatch");

  const activeDecision = useMemo(() => (plan ? (lang === "zh" ? plan.decisionZh : plan.decisionEn) : ""), [plan, lang]);

  function update(patch: Partial<ResearchPlanV2>) {
    setPlan((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      window.localStorage.setItem("zhiyan.v2.plan", JSON.stringify(next));
      return next;
    });
  }

  function updateQuery(id: string, patch: Partial<QuerySeedV2>) {
    if (!plan) return;
    update({ queryMatrix: plan.queryMatrix.map((seed) => (seed.id === id ? { ...seed, ...patch } : seed)) });
  }

  function addQuery() {
    if (!plan) return;
    const seed: QuerySeedV2 = {
      id: `seed_user_${Date.now()}`,
      query: "",
      dimension: "task",
      purposeZh: "用户补充的查询",
      purposeEn: "User-added query",
      source: "user",
      isCounterExample: false,
    };
    update({ queryMatrix: [...plan.queryMatrix, seed] });
  }

  async function confirm() {
    if (!plan) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v2/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: { ...plan, confirmed: true }, confirmed: true, mode }),
      });
      const body = (await response.json()) as { study?: StudyV2; error?: string };
      if (!response.ok || !body.study) throw new Error(body.error || "STUDY_FAILED");
      window.localStorage.setItem("zhiyan.v2.study", JSON.stringify(body.study));
      try {
        const raw = window.localStorage.getItem("zhiyan.v2.recent");
        const recent = raw ? (JSON.parse(raw) as unknown[]) : [];
        window.localStorage.setItem(
          "zhiyan.v2.recent",
          JSON.stringify([{ decision: body.study.plan.decisionZh, at: new Date().toISOString(), demo: false }, ...recent].slice(0, 6)),
        );
      } catch {
        // Recent history is optional.
      }
      router.push("/workbench?view=explore");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("design.errorStudy"));
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return <div className="v2-loading"><span className="v2-spinner" /> {t("common.loading")}</div>;
  }

  if (!plan || !gate) {
    return (
      <main className="v2-page">
        <div className="v2-card v2-empty">
          <h2>{lang === "zh" ? "还没有研究计划" : "No research plan yet"}</h2>
          <p>{lang === "zh" ? "先回首页提交一个产品决策，系统会拆出研究计划。" : "Submit a product decision on the home page first."}</p>
          <Link className="v2-btn v2-btn-primary" href="/">{t("common.back")}</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="v2-page">
      <div className="v2-page-head">
        <p className="v2-kicker">{t("design.eyebrow")}</p>
        <h1>{t("design.title")}</h1>
        <p className="v2-lede">{t("design.lede")}</p>
        <div className="v2-page-meta">
          <span className={`v2-badge ${gate.fit === "fit" ? "v2-badge-fit" : gate.fit === "partial" ? "v2-badge-partial" : "v2-badge-mismatch"}`}>{fitLabel}</span>
          <span className="v2-tag v2-tag-blue">{outputLabel}</span>
          <span className="v2-tag">{t("design.planVersion").replace("{version}", String(plan.version))}</span>
          <span className="v2-tag">{lang === "zh" ? "知乎调用 0 次" : "Zhihu calls: 0"}</span>
        </div>
      </div>

      <div className="v2-plan-layout">
        <div className="v2-plan-main">
          <section className="v2-card v2-gate">
            <h2><CheckCircle2 size={16} /> {t("design.gate")}</h2>
            <p className="v2-small v2-muted" style={{ marginTop: 4 }}>
              {lang === "zh" ? "闸门决定报告能说到多强；不是提示后继续输出强结论。" : "The gate decides how strongly the report may speak; it is not a banner before a strong conclusion."}
            </p>
            <div className="v2-gate-grid">
              <div className="v2-gate-col">
                <h3>{t("design.gateFit")}</h3>
                <ul>{(lang === "zh" ? gate.canExploreZh : gate.canExploreEn).map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div className="v2-gate-col">
                <h3>{t("design.gatePartial")}</h3>
                <ul>{(lang === "zh" ? gate.needsOtherDataZh : gate.needsOtherDataEn).map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div className="v2-gate-col">
                <h3>{t("design.gateMismatch")}</h3>
                <ul>{(lang === "zh" ? gate.cannotProveZh : gate.cannotProveEn).map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            </div>
          </section>

          <section className="v2-card v2-form-card">
            <h2>{t("design.decision")}</h2>
            <div className="v2-form-body">
              <div className="v2-field">
                <label className="v2-label" htmlFor="v2-decision">{lang === "zh" ? "决策问题（中文）" : "Decision (Chinese)"}</label>
                <textarea id="v2-decision" className="v2-textarea" value={plan.decisionZh} onChange={(event) => update({ decisionZh: event.target.value })} />
              </div>
              <div className="v2-field">
                <label className="v2-label" htmlFor="v2-decision-en">{lang === "zh" ? "决策问题（英文）" : "Decision (English)"}</label>
                <textarea id="v2-decision-en" className="v2-textarea" value={plan.decisionEn} onChange={(event) => update({ decisionEn: event.target.value })} />
              </div>
              <div className="v2-grid-2">
                <div className="v2-field">
                  <label className="v2-label" htmlFor="v2-market-zh">{lang === "zh" ? "目标市场（中文）" : "Market (Chinese)"}</label>
                  <input id="v2-market-zh" className="v2-input" value={plan.targetMarketZh} onChange={(event) => update({ targetMarketZh: event.target.value })} />
                </div>
                <div className="v2-field">
                  <label className="v2-label" htmlFor="v2-market-en">{lang === "zh" ? "目标市场（英文）" : "Market (English)"}</label>
                  <input id="v2-market-en" className="v2-input" value={plan.targetMarketEn} onChange={(event) => update({ targetMarketEn: event.target.value })} />
                </div>
              </div>
              <div className="v2-field">
                <label className="v2-label" htmlFor="v2-users">{lang === "zh" ? "目标用户（每行一个）" : "Target users (one per line)"}</label>
                <textarea id="v2-users" className="v2-textarea" value={(lang === "zh" ? plan.targetUsersZh : plan.targetUsersEn).join("\n")} onChange={(event) => update(lang === "zh" ? { targetUsersZh: lines(event.target.value) } : { targetUsersEn: lines(event.target.value) })} />
              </div>
            </div>
          </section>

          <section className="v2-card v2-form-card">
            <h2>{t("design.hypotheses")}</h2>
            <div className="v2-form-body">
              <textarea className="v2-textarea" value={(lang === "zh" ? plan.productHypothesesZh : plan.productHypothesesEn).join("\n")} onChange={(event) => update(lang === "zh" ? { productHypothesesZh: lines(event.target.value) } : { productHypothesesEn: lines(event.target.value) })} />
            </div>
          </section>

          <section className="v2-card v2-form-card">
            <h2>{t("design.questions")}</h2>
            <div className="v2-form-body">
              {plan.researchQuestions.map((question) => (
                <div key={question.id} className="v2-field" style={{ paddingBottom: 10, borderBottom: "1px solid var(--z-line)" }}>
                  <label className="v2-label">{lang === "zh" ? question.questionZh : question.questionEn}</label>
                  <p className="v2-small v2-muted">{lang === "zh" ? question.hypothesisZh : question.hypothesisEn}</p>
                  <p className="v2-mini" style={{ color: "var(--z-amber)" }}>{lang === "zh" ? "证伪信号：" : "Falsification: "}{lang === "zh" ? question.disconfirmingSignalZh : question.disconfirmingSignalEn}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="v2-card v2-form-card">
            <div className="v2-between">
              <h2>{t("design.seedQueries")}</h2>
              <button className="v2-btn v2-btn-sm" type="button" onClick={addQuery}><Plus size={13} /> {t("design.addQuery")}</button>
            </div>
            <p className="v2-hint" style={{ marginTop: 4 }}>{lang === "zh" ? "扩展查询必须在执行后写入计划新版本，不接受设计外直接注入。" : "Expansions must enter a new plan version after execution; out-of-plan injection is rejected."}</p>
            <div style={{ overflowX: "auto", marginTop: 8 }}>
              <table className="v2-query-table">
                <thead>
                  <tr>
                    <th style={{ width: "38%" }}>{lang === "zh" ? "查询" : "Query"}</th>
                    <th style={{ width: "12%" }}>{t("design.queryDimension")}</th>
                    <th>{t("design.queryPurpose")}</th>
                    <th style={{ width: 34 }} />
                  </tr>
                </thead>
                <tbody>
                  {plan.queryMatrix.map((seed) => (
                    <tr key={seed.id}>
                      <td>
                        <input className="v2-input v2-query-input" value={seed.query} disabled={seed.source !== "user" && seed.source !== "model_prior"} onChange={(event) => updateQuery(seed.id, { query: event.target.value })} />
                      </td>
                      <td><span className="v2-tag">{seed.dimension}</span>{seed.isCounterExample ? <span className="v2-tag v2-tag-amber" style={{ marginLeft: 4 }}>counter</span> : null}</td>
                      <td className="v2-muted">{lang === "zh" ? seed.purposeZh : seed.purposeEn}</td>
                      <td>
                        {seed.source === "user" ? (
                          <button className="v2-btn v2-btn-ghost v2-btn-sm" type="button" aria-label="remove" onClick={() => update({ queryMatrix: plan.queryMatrix.filter((item) => item.id !== seed.id) })}>
                            <Trash2 size={13} />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="v2-card v2-form-card">
            <h2>{t("design.counter")}</h2>
            <textarea className="v2-textarea" value={(lang === "zh" ? plan.counterExampleDirectionsZh : plan.counterExampleDirectionsEn).join("\n")} onChange={(event) => update(lang === "zh" ? { counterExampleDirectionsZh: lines(event.target.value) } : { counterExampleDirectionsEn: lines(event.target.value) })} />
          </section>

          <section className="v2-card v2-form-card">
            <h2>{t("design.inclusion")} / {t("design.exclusion")}</h2>
            <div className="v2-grid-2" style={{ marginTop: 10 }}>
              <div className="v2-field">
                <textarea className="v2-textarea" value={(lang === "zh" ? plan.inclusionZh : plan.inclusionEn).join("\n")} onChange={(event) => update(lang === "zh" ? { inclusionZh: lines(event.target.value) } : { inclusionEn: lines(event.target.value) })} />
              </div>
              <div className="v2-field">
                <textarea className="v2-textarea" value={(lang === "zh" ? plan.exclusionZh : plan.exclusionEn).join("\n")} onChange={(event) => update(lang === "zh" ? { exclusionZh: lines(event.target.value) } : { exclusionEn: lines(event.target.value) })} />
              </div>
            </div>
          </section>
        </div>

        <aside className="v2-plan-side">
          <section className="v2-card v2-side-card">
            <h2>{t("design.budget")}</h2>
            <div style={{ marginTop: 8 }}>
              <div className="v2-check-row"><span>{lang === "zh" ? "种子查询" : "Seed queries"}</span><b>{plan.budget.seedQueries}</b></div>
              <div className="v2-check-row"><span>{lang === "zh" ? "最多轮次" : "Max rounds"}</span><b>{plan.budget.maxRounds}</b></div>
              <div className="v2-check-row"><span>{lang === "zh" ? "每轮扩展" : "Per round"}</span><b>{plan.budget.perRound}</b></div>
              <div className="v2-check-row"><span>{lang === "zh" ? "总查询上限" : "Max queries"}</span><b>{plan.budget.maxQueries}</b></div>
              <div className="v2-check-row"><span>{lang === "zh" ? "候选上限" : "Max candidates"}</span><b>{plan.budget.maxCandidates}</b></div>
              <div className="v2-check-row"><span>{lang === "zh" ? "时间窗" : "Time window"}</span><b>{plan.budget.timeWindowMonths} mo</b></div>
            </div>
            <div className="v2-row" style={{ marginTop: 12 }}>
              <span className={`v2-badge ${gate.fit === "fit" ? "v2-badge-fit" : gate.fit === "partial" ? "v2-badge-partial" : "v2-badge-mismatch"}`}>
                <Lock size={12} style={{ marginRight: 3 }} /> {outputLabel}
              </span>
            </div>
            <div className="v2-field" style={{ marginTop: 12 }}>
              <label className="v2-label" htmlFor="v2-mode">{lang === "zh" ? "现场检索模式" : "Live mode"}</label>
              <select id="v2-mode" className="v2-select" value={mode} onChange={(event) => setMode(event.target.value === "full" ? "full" : "lite")}>
                <option value="lite">{lang === "zh" ? "轻量实时检索（约 10–15 分钟）" : "Lightweight live study (~10–15 min)"}</option>
                <option value="full">{lang === "zh" ? "完整实时检索（约 20–30 分钟）" : "Full live study (~20–30 min)"}</option>
              </select>
              <span className="v2-hint">
                {lang === "zh"
                  ? "评委演示优先打开缓存主案例；实时路径用于验证真实接口。"
                  : "Use the cached main case for the demo; the live path verifies the real API."}
              </span>
            </div>
            <button className="v2-btn v2-btn-primary v2-btn-lg" type="button" data-testid="v2-confirm" disabled={busy} onClick={() => void confirm()} style={{ width: "100%", marginTop: 14 }}>
              {busy ? <span className="v2-spinner" /> : null}
              {busy ? t("design.confirming") : t("design.confirm")}
              {!busy ? <ArrowRight size={15} /> : null}
            </button>
            <p className="v2-hint" style={{ marginTop: 7 }}>{t("design.notConfirmed")}</p>
            {busy ? (
              <div className="v2-progress">
                <span className="v2-spinner" />
                <span>{lang === "zh" ? "种子检索 → 关键词扩展 → 反例检索 → 语义编码 → 双语简报" : "Seed → vocabulary expansion → counter-example → coding → bilingual brief"}</span>
              </div>
            ) : null}
            {error ? (
              <div className="v2-error">
                <AlertTriangle size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                {error}
                <div style={{ marginTop: 6 }}>
                  <Link className="v2-small" href="/workbench?demo=main-case">{lang === "zh" ? "打开缓存主案例" : "Open cached main case"} →</Link>
                </div>
              </div>
            ) : null}
          </section>

          <section className="v2-card v2-side-card">
            <h2>{t("design.versions")}</h2>
            <div style={{ marginTop: 6 }}>
              {plan.versions.slice().reverse().map((version) => (
                <div className="v2-version" key={version.version}>
                  <b>v{version.version}</b>
                  <span>{lang === "zh" ? version.reasonZh : version.reasonEn}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="v2-card v2-side-card">
            <h2>{t("design.deliverables")}</h2>
            <ul className="v2-list" style={{ marginTop: 6 }}>
              {(lang === "zh" ? plan.deliverablesZh : plan.deliverablesEn).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>

          <Link className="v2-small" href="/">{t("common.back")} →</Link>
        </aside>
      </div>
      <p className="v2-mini v2-muted" style={{ marginTop: 18 }}>{activeDecision}</p>
    </main>
  );
}
