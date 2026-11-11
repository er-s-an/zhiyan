"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Download, PencilLine, RefreshCw } from "lucide-react";
import { useLang } from "../components/LanguageProvider";
import { projectStudy } from "../../lib/v2/semantic";
import type { StudyV2 } from "../../lib/v2/types";
import { AnalysisView, DeliveryView, ExploreView, ProtocolView, QualityView, SampleView } from "./views-v2";

const TABS = ["explore", "protocol", "sample", "analysis", "quality", "delivery"] as const;
type Tab = (typeof TABS)[number];

function isTab(value: string | null): value is Tab {
  return TABS.includes(value as Tab);
}

function readStudy(): StudyV2 | null {
  try {
    const raw = window.localStorage.getItem("zhiyan.v2.study");
    return raw ? (JSON.parse(raw) as StudyV2) : null;
  } catch {
    return null;
  }
}

function Workbench() {
  const params = useSearchParams();
  const { lang, t } = useLang();
  const demoId = params.get("demo");
  const rawView = params.get("view");
  const view: Tab = isTab(rawView) ? rawView : "explore";
  const [study, setStudy] = useState<StudyV2 | null>(null);
  const [demo, setDemo] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setReady(false);
      setError("");
      if (demoId) {
        try {
          const response = await fetch(`/api/v2/demos/${encodeURIComponent(demoId)}`);
          if (!response.ok) throw new Error("DEMO_NOT_FOUND");
          const body = (await response.json()) as { study?: StudyV2 };
          if (!body.study) throw new Error("DEMO_NOT_FOUND");
          if (cancelled) return;
          window.localStorage.setItem("zhiyan.v2.study", JSON.stringify(body.study));
          window.localStorage.setItem("zhiyan.v2.plan", JSON.stringify(body.study.plan));
          setStudy(body.study);
          setDemo(true);
        } catch {
          if (!cancelled) setError(t("workbench.liveFailed"));
        } finally {
          if (!cancelled) setReady(true);
        }
        return;
      }
      const stored = readStudy();
      if (cancelled) return;
      setStudy(stored);
      setDemo(Boolean(stored?.demo));
      setReady(true);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [demoId, t]);

  const visibleFindings = useMemo(() => study?.findings.filter((finding) => !finding.hidden).length || 0, [study]);

  function commit(next: StudyV2) {
    const projected = projectStudy(next);
    window.localStorage.setItem("zhiyan.v2.study", JSON.stringify(projected));
    setStudy(projected);
  }

  if (!ready) {
    return <div className="v2-loading"><span className="v2-spinner" /> {t("workbench.loading")}</div>;
  }

  if (!study) {
    return (
      <main className="v2-page">
        <div className="v2-card v2-empty">
          <h2>{t("workbench.empty")}</h2>
          <p>{t("workbench.emptyDesc")}</p>
          <div className="v2-row">
            <Link className="v2-btn v2-btn-primary" href="/">{t("home.start")} <ArrowRight size={14} /></Link>
            <Link className="v2-btn" href="/workbench?demo=main-case">{t("home.openExample")}</Link>
          </div>
          {error ? <p className="v2-error">{error}</p> : null}
        </div>
      </main>
    );
  }

  const included = study.sample.filter((item) => item.included).length;
  const plan = study.plan;
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "explore", label: t("workbench.tabs.explore"), count: study.runs.length },
    { id: "protocol", label: t("workbench.tabs.protocol"), count: plan.versions.length },
    { id: "sample", label: t("workbench.tabs.sample"), count: study.sample.length },
    { id: "analysis", label: t("workbench.tabs.analysis"), count: visibleFindings },
    { id: "quality", label: t("workbench.tabs.quality") },
    { id: "delivery", label: t("workbench.tabs.delivery") },
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
            <p className="v2-kicker">{t("workbench.title")} · {lang === "zh" ? "已确认计划" : "confirmed plan"}</p>
            <h1>{lang === "zh" ? plan.decisionZh : plan.decisionEn}</h1>
          </div>
          <div className="v2-row">
            <Link className="v2-btn" href="/design"><PencilLine size={13} /> {t("workbench.reconfigure")}</Link>
            <Link className="v2-btn v2-btn-primary" href="/workbench?view=delivery"><Download size={13} /> {t("workbench.tabs.delivery")}</Link>
          </div>
        </div>
        <div className="v2-study-meta">
          <span className={`v2-badge ${plan.methodGate.fit === "fit" ? "v2-badge-fit" : plan.methodGate.fit === "partial" ? "v2-badge-partial" : "v2-badge-mismatch"}`}>{t(`workbench.gate.${plan.methodGate.fit}`)}</span>
          <span className="v2-tag">{lang === "zh" ? `纳入 ${included} / ${study.sample.length}` : `${included} / ${study.sample.length} included`}</span>
          <span className="v2-tag">{study.runs.length} {t("common.queries")}</span>
          <span className="v2-tag">{study.vocabulary.length} {t("common.vocabulary")}</span>
          <span className="v2-tag">{visibleFindings} {t("common.findings")}</span>
          <span className="v2-tag">{lang === "zh" ? `计划 v${plan.version}` : `plan v${plan.version}`}</span>
          <span className="v2-tag">{study.demo ? t("common.demo") : t("common.live")}</span>
        </div>
      </header>

      <nav className="v2-tabs" aria-label="Research views">
        {tabs.map((tab) => (
          <Link key={tab.id} href={`/workbench?view=${tab.id}`} className={`v2-tab${view === tab.id ? " is-active" : ""}`} data-testid={`v2-tab-${tab.id}`}>
            {tab.label}
            {typeof tab.count === "number" ? <span className="v2-tab-count">{tab.count}</span> : null}
          </Link>
        ))}
      </nav>

      {view === "explore" ? <ExploreView study={study} /> : null}
      {view === "protocol" ? <ProtocolView study={study} /> : null}
      {view === "sample" ? <SampleView study={study} onCommit={commit} /> : null}
      {view === "analysis" ? <AnalysisView study={study} onCommit={commit} /> : null}
      {view === "quality" ? <QualityView study={study} /> : null}
      {view === "delivery" ? <DeliveryView study={study} /> : null}

      {view !== "delivery" ? (
        <div className="v2-between" style={{ marginTop: 18 }}>
          <span className="v2-mini v2-muted">{lang === "zh" ? "所有计数只描述本样本，不构成市场结论。" : "All counts describe this sample only, not the market."}</span>
          <Link className="v2-btn v2-btn-sm" href="/workbench?view=delivery">{t("workbench.tabs.delivery")} <ArrowRight size={12} /></Link>
        </div>
      ) : null}
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
