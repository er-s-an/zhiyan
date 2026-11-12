"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Download, PencilLine } from "lucide-react";
import { useLang } from "../components/LanguageProvider";
import { buildHeuristicBrief, recomputeBrief } from "../../lib/v2/brief";
import type { DecisionBriefV21 } from "../../lib/v2/brief";
import type { PublicJob } from "../../lib/v2/jobs";
import { downloadMarkdown, briefMarkdown } from "../../lib/v2/export";
import { projectStudy } from "../../lib/v2/semantic";
import type { StudyV2 } from "../../lib/v2/types";
import { DecisionBriefView, EvidenceQualityView, JobProgressView, ResearchProcessView } from "./views-v21";

const TABS = ["brief", "process", "evidence"] as const;
type Tab = (typeof TABS)[number];

const VIEW_MAP: Record<string, Tab> = {
  brief: "brief",
  process: "process",
  evidence: "evidence",
  explore: "process",
  protocol: "process",
  sample: "evidence",
  analysis: "evidence",
  quality: "evidence",
  delivery: "brief",
};

function readStudy(): StudyV2 | null {
  try {
    const raw = window.localStorage.getItem("zhiyan.v2.study");
    return raw ? (JSON.parse(raw) as StudyV2) : null;
  } catch {
    return null;
  }
}

function readBrief(): DecisionBriefV21 | null {
  try {
    const raw = window.localStorage.getItem("zhiyan.v21.brief");
    return raw ? (JSON.parse(raw) as DecisionBriefV21) : null;
  } catch {
    return null;
  }
}

function Workbench() {
  const params = useSearchParams();
  const { lang, t } = useLang();
  const demoId = params.get("demo");
  const jobId = params.get("job");
  const rawView = params.get("view");
  const view: Tab = rawView ? VIEW_MAP[rawView] || "brief" : "brief";
  const [study, setStudy] = useState<StudyV2 | null>(null);
  const [brief, setBrief] = useState<DecisionBriefV21 | null>(null);
  const [job, setJob] = useState<PublicJob | null>(null);
  const [demo, setDemo] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function fetchJob() {
      if (!jobId) return;
      try {
        const response = await fetch(`/api/v2/jobs/${encodeURIComponent(jobId)}`);
        if (!response.ok) throw new Error("JOB_NOT_FOUND");
        const body = (await response.json()) as { job?: PublicJob };
        if (!body.job) throw new Error("JOB_NOT_FOUND");
        if (cancelled) return;
        setJob(body.job);
        if (body.job.status === "running" || body.job.status === "queued") setReady(true);
        if (body.job.status === "completed" && body.job.study) {
          const nextBrief = body.job.brief || buildHeuristicBrief(body.job.study);
          window.localStorage.setItem("zhiyan.v2.study", JSON.stringify(body.job.study));
          window.localStorage.setItem("zhiyan.v2.plan", JSON.stringify(body.job.plan));
          window.localStorage.setItem("zhiyan.v21.brief", JSON.stringify(nextBrief));
          setStudy(body.job.study);
          setBrief(nextBrief);
          setDemo(false);
          setReady(true);
          return;
        }
        if (body.job.status === "failed") {
          setReady(true);
          return;
        }
        timer = setTimeout(fetchJob, 2000);
      } catch {
        if (!cancelled) {
          setError(t("workbench.liveFailed"));
          setReady(true);
        }
      }
    }

    async function load() {
      setReady(false);
      setError("");
      if (jobId) {
        await fetchJob();
        return;
      }
      if (demoId) {
        try {
          const response = await fetch(`/api/v2/demos/${encodeURIComponent(demoId)}`);
          if (!response.ok) throw new Error("DEMO_NOT_FOUND");
          const body = (await response.json()) as { study?: StudyV2 };
          if (!body.study) throw new Error("DEMO_NOT_FOUND");
          if (cancelled) return;
          window.localStorage.setItem("zhiyan.v2.study", JSON.stringify(body.study));
          window.localStorage.setItem("zhiyan.v2.plan", JSON.stringify(body.study.plan));
          let nextBrief: DecisionBriefV21 | null = null;
          if (demoId === "main-case") {
            const briefResponse = await fetch("/api/v2/briefs/main-case");
            if (briefResponse.ok) {
              const briefBody = (await briefResponse.json()) as { brief?: DecisionBriefV21 };
              nextBrief = briefBody.brief ?? null;
            }
          }
          if (!nextBrief) nextBrief = buildHeuristicBrief(body.study);
          if (cancelled) return;
          window.localStorage.setItem("zhiyan.v21.brief", JSON.stringify(nextBrief));
          setStudy(body.study);
          setBrief(nextBrief);
          setDemo(true);
        } catch {
          if (!cancelled) setError(t("workbench.liveFailed"));
        } finally {
          if (!cancelled) setReady(true);
        }
        return;
      }
      const stored = readStudy();
      if (!stored) {
        setReady(true);
        return;
      }
      const storedBrief = readBrief() || buildHeuristicBrief(stored);
      if (cancelled) return;
      setStudy(stored);
      setBrief(storedBrief);
      setDemo(stored.demo);
      setReady(true);
    }
    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [demoId, jobId, t]);

  function commit(nextStudy: StudyV2) {
    const projected = projectStudy(nextStudy);
    const nextBrief = brief ? recomputeBrief(brief, projected) : buildHeuristicBrief(projected);
    window.localStorage.setItem("zhiyan.v2.study", JSON.stringify(projected));
    window.localStorage.setItem("zhiyan.v21.brief", JSON.stringify(nextBrief));
    setStudy(projected);
    setBrief(nextBrief);
  }

  function exportBrief() {
    if (!brief || !study) return;
    downloadMarkdown(briefMarkdown(brief, study, lang), `zhiyan-v21-brief-${lang}.md`);
  }

  async function retry() {
    if (!jobId) return;
    try {
      await fetch(`/api/v2/jobs/${encodeURIComponent(jobId)}/retry`, { method: "POST" });
      window.location.reload();
    } catch {
      window.location.reload();
    }
  }

  if (!ready) return <div className="v2-loading"><span className="v2-spinner" /> {t("workbench.loading")}</div>;

  if (jobId && job && job.status !== "completed") {
    return (
      <main className="v2-page">
        <header className="v2-study-head">
          <p className="v2-kicker">{lang === "zh" ? "V2.1 · 后台研究任务" : "V2.1 · Background study job"}</p>
          <h1>{lang === "zh" ? job.plan.decisionZh : job.plan.decisionEn}</h1>
          <div className="v2-study-meta">
            <span className="v2-tag v2-tag-blue">{job.mode === "lite" ? (lang === "zh" ? "轻量实时" : "Lightweight live") : (lang === "zh" ? "完整实时" : "Full live")}</span>
            <span className="v2-tag">{job.status}</span>
            <span className="v2-tag">{job.rounds.length} / 3 {lang === "zh" ? "轮完成" : "rounds done"}</span>
          </div>
        </header>
        <JobProgressView job={job} onRetry={() => void retry()} />
      </main>
    );
  }

  if (!study || !brief) {
    return (
      <main className="v2-page">
        <div className="v2-card v2-empty">
          <h2>{t("workbench.empty")}</h2>
          <p>{t("workbench.emptyDesc")}</p>
          <div className="v2-row">
            <Link className="v2-btn v2-btn-primary" href="/">{t("home.start")}</Link>
            <Link className="v2-btn" href="/workbench?demo=main-case">{t("home.openExample")}</Link>
          </div>
          {error ? <p className="v2-error">{error}</p> : null}
        </div>
      </main>
    );
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "brief", label: lang === "zh" ? "决策简报" : "Decision brief" },
    { id: "process", label: lang === "zh" ? "研究过程" : "Research process", count: brief.roundSnapshots.length },
    { id: "evidence", label: lang === "zh" ? "证据与质检" : "Evidence & QA", count: study.sample.length },
  ];

  return (
    <main className="v2-page">
      {demo ? (
        <div className="v2-demo-banner">
          <span className="v2-badge v2-badge-demo">{t("common.demo")}</span>
          <p>{t("workbench.demoNote")}</p>
          <Link className="v2-btn v2-btn-sm" href="/examples">{lang === "zh" ? "换一个案例" : "Other cases"}</Link>
        </div>
      ) : null}

      <header className="v2-study-head">
        <div className="v2-between">
          <div>
            <p className="v2-kicker">{lang === "zh" ? "V2.1 · 产品决策简报" : "V2.1 · Product decision brief"}</p>
            <h1>{view === "brief" ? (lang === "zh" ? "产品决策简报" : "Product decision brief") : (lang === "zh" ? brief.decisionQuestionZh : brief.decisionQuestionEn)}</h1>
          </div>
          <div className="v2-row">
            <Link className="v2-btn" href="/design"><PencilLine size={13} /> {lang === "zh" ? "调整计划" : "Adjust plan"}</Link>
            <button className="v2-btn v2-btn-primary" type="button" data-testid="v21-export" onClick={exportBrief}><Download size={13} /> {lang === "zh" ? "导出" : "Export"}</button>
          </div>
        </div>
        <div className="v2-study-meta">
          <span className={`v2-badge ${brief.recommendation === "conditional_proceed" ? "v2-badge-fit" : brief.recommendation === "hold" ? "v2-badge-partial" : "v2-badge-mismatch"}`}>
            {brief.recommendation === "conditional_proceed" ? (lang === "zh" ? "有条件下一步" : "Conditional next step") : brief.recommendation}
          </span>
          <span className="v2-tag">{brief.opportunities.filter((item) => !item.hidden).length} {lang === "zh" ? "个机会假设" : "opportunity hypotheses"}</span>
          <span className="v2-tag">{brief.beliefUpdates.length} {lang === "zh" ? "条认知更新" : "belief updates"}</span>
          <span className="v2-tag">{study.sample.filter((item) => item.included).length} {lang === "zh" ? "条可回查证据" : "traceable evidence items"}</span>
          <span className="v2-tag">{study.demo ? t("common.demo") : t("common.live")}</span>
        </div>
      </header>

      <nav className="v2-tabs" aria-label="Decision brief views">
        {tabs.map((tab) => (
          <Link key={tab.id} href={`/workbench?view=${tab.id}`} className={`v2-tab${view === tab.id ? " is-active" : ""}`} data-testid={`v21-tab-${tab.id}`}>
            {tab.label}
            {typeof tab.count === "number" ? <span className="v2-tab-count">{tab.count}</span> : null}
          </Link>
        ))}
      </nav>

      {view === "brief" ? <DecisionBriefView brief={brief} study={study} onOpenEvidence={() => { window.location.href = "/workbench?view=evidence"; }} /> : null}
      {view === "process" ? <ResearchProcessView brief={brief} study={study} /> : null}
      {view === "evidence" ? <EvidenceQualityView brief={brief} study={study} onCommit={commit} /> : null}

      <div className="v2-between" style={{ marginTop: 18 }}>
        <span className="v2-mini v2-muted">{lang === "zh" ? "知乎讨论支持定性探索和机会假设，不证明市场规模、购买率或付费意愿。" : "Zhihu discussion supports qualitative exploration and opportunity hypotheses; it does not prove market size, purchase rates or willingness to pay."}</span>
        <Link className="v2-small" href="/plan">{lang === "zh" ? "产品说明" : "About"} →</Link>
      </div>
    </main>
  );
}

export default function WorkbenchPage() {
  return (
    <Suspense fallback={<div className="v2-loading"><span className="v2-spinner" /> Loading</div>}>
      <Workbench />
    </Suspense>
  );
}
