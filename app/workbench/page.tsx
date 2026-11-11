"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Download,
  FileText,
  Layers,
  ListChecks,
  PencilLine,
  PlayCircle,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { Kanshan } from "../components/Kanshan";
import { StepRail } from "../components/StepRail";
import { project } from "../../lib/project";
import { loadDraft, saveDraft } from "../../lib/storage";
import { STAGE_LABEL, type Study } from "../../lib/types";
import { AnalysisView, DeliveryView, ProtocolView, QualityView, SampleView } from "./views";

const VIEWS = ["protocol", "sample", "analysis", "quality", "delivery"] as const;
type View = (typeof VIEWS)[number];

function isView(value: string | null): value is View {
  if (value === "design") return true;
  return VIEWS.includes(value as View);
}

function Workbench() {
  const params = useSearchParams();
  const rawView = params.get("view");
  const view: View = rawView === "design" ? "protocol" : isView(rawView) ? (rawView as View) : "sample";
  const demoParam = params.get("demo");

  const [study, setStudy] = useState<Study | null>(null);
  const [demoId, setDemoId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setReady(false);
      setError("");
      if (demoParam) {
        const cached = loadDraft();
        if (cached?.demoId === demoParam && cached.study) {
          setStudy(cached.study);
          setDemoId(demoParam);
          setReady(true);
          return;
        }
        try {
          const response = await fetch(`/api/demos/${encodeURIComponent(demoParam)}`);
          if (!response.ok) throw new Error("DEMO_NOT_FOUND");
          const body = (await response.json()) as { study?: Study };
          if (cancelled) return;
          if (!body.study) throw new Error("DEMO_NOT_FOUND");
          saveDraft({ design: body.study.design, study: body.study, demoId: demoParam });
          setStudy(body.study);
          setDemoId(demoParam);
        } catch {
          if (!cancelled) setError("这个示例还没有生成，或缓存文件暂时不可用。可以先用「重新研究」现场跑一遍。");
        } finally {
          if (!cancelled) setReady(true);
        }
        return;
      }
      const draft = loadDraft();
      if (cancelled) return;
      setStudy(draft?.study ?? null);
      setDemoId(draft?.demoId ?? null);
      setReady(true);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [demoParam]);

  const viewModel = useMemo(() => (study ? project(study) : null), [study]);

  function commit(next: Study) {
    const draft = loadDraft();
    saveDraft({ design: next.design, study: next, demoId });
    setStudy(next);
    if (!draft) return;
  }

  if (!ready) {
    return (
      <div className="loading-screen">
        <span className="spinner" />
        正在打开研究
      </div>
    );
  }

  if (!study || !viewModel) {
    return (
      <main>
        <StepRail current={1} />
        <div className="card empty">
          <Kanshan variant="side" size={168} />
          <h2>{error ? "示例暂时打不开" : "还没有可查看的样本"}</h2>
          <p>
            {error ||
              "先提交一句研究简报，确认研究设计后才会检索知乎并生成样本。已经有示例库里的完整案例可以直接打开。"}
          </p>
          <div className="empty-actions">
            <Link className="btn btn-primary" href="/">
              去写研究简报 <ArrowRight size={15} />
            </Link>
            <Link className="btn" href="/examples">
              <PlayCircle size={15} /> 打开示例库
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const included = study.sample.filter((item) => item.included).length;
  const tabs: { id: View; label: string; count?: number }[] = [
    { id: "protocol", label: "协议" },
    { id: "sample", label: "样本", count: study.sample.length },
    { id: "analysis", label: "分析", count: viewModel.findings.length },
    { id: "quality", label: "质检", count: viewModel.quality.length },
    { id: "delivery", label: "交付" },
  ];

  return (
    <main>
      <StepRail current={view === "protocol" || view === "sample" ? 2 : 3} />

      {demoId ? (
        <div className="demo-banner">
          <span className="tag tag-blue">
            <Sparkles size={11} /> 示例快照
          </span>
          <p>
            这是一个已经跑完的真实研究，数据缓存在仓库里，演示时不会消耗知乎接口。想自己跑一遍，用右上角「重新研究」。
          </p>
          <Link className="btn btn-sm" href="/examples">
            换一个示例
          </Link>
        </div>
      ) : null}

      <div className="study-head">
        <div>
          <span className="eyebrow">
            <FileText size={14} /> 当前研究 · 已确认
          </span>
          <h1>{view === "delivery" ? "研究简报" : study.design.decision}</h1>
          <div className="study-meta">
            <span className="pill pill-blue">
              <Layers size={12} /> {STAGE_LABEL[study.design.stage]}
            </span>
            <span className="pill">
              <Users size={12} /> 纳入 {included} 条 / 共 {study.sample.length} 条
            </span>
            <span className="pill">
              <Search size={12} /> {study.retrieval.filter((entry) => entry.kind === "zhihu_search" && !entry.error).length} 次搜索
            </span>
            <span className="pill">
              <CalendarClock size={12} /> {new Date(study.confirmedAt).toLocaleDateString("zh-CN")}
            </span>
            <span className="pill pill-green">
              <ListChecks size={12} /> {viewModel.findings.length} 条发现
            </span>
          </div>
        </div>
        <div className="study-actions">
          <Link className="btn" href="/design">
            <PencilLine size={14} /> 重新研究
          </Link>
          <Link className={`btn ${view === "delivery" ? "" : "btn-primary"}`} href="/workbench?view=delivery">
            <Download size={14} /> 打开交付
          </Link>
        </div>
      </div>

      <nav className="tabbar" aria-label="工作台视图">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/workbench?view=${tab.id}`}
            className={`tab${view === tab.id ? " is-active" : ""}`}
            aria-current={view === tab.id ? "page" : undefined}
            data-testid={`tab-${tab.id}`}
          >
            {tab.label}
            {typeof tab.count === "number" ? <span className="tab-count">{tab.count}</span> : null}
          </Link>
        ))}
      </nav>

      {view === "protocol" ? <ProtocolView study={study} /> : null}
      {view === "sample" ? <SampleView study={study} onCommit={commit} /> : null}
      {view === "analysis" ? <AnalysisView study={study} viewModel={viewModel} /> : null}
      {view === "quality" ? <QualityView study={study} viewModel={viewModel} /> : null}
      {view === "delivery" ? <DeliveryView study={study} viewModel={viewModel} /> : null}

      {view !== "delivery" ? (
        <div className="row" style={{ marginTop: 18, justifyContent: "space-between" }}>
          <span className="mini muted">所有计数只属于本样本，不构成市场结论。</span>
          <Link className="btn btn-sm" href="/workbench?view=delivery">
            去交付页 <ArrowRight size={13} />
          </Link>
        </div>
      ) : null}
    </main>
  );
}

export default function WorkbenchPage() {
  return (
    <Suspense
      fallback={
        <div className="loading-screen">
          <span className="spinner" />
          正在打开研究
        </div>
      }
    >
      <Workbench />
    </Suspense>
  );
}
