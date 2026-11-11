"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  FileText,
  Layers,
  LibraryBig,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Kanshan } from "../components/Kanshan";
import { SCENARIOS } from "../../lib/scenarios";
import { saveDraft } from "../../lib/storage";
import type { ResearchDesign } from "../../lib/types";

interface DemoSummary {
  id: string;
  title: string;
  subtitle: string;
  tags: string[];
  audience: string;
  sampleCount: number;
  includedCount: number;
  findingCount: number;
  updatedAt?: string;
}

const DEMO_FLOW = [
  { icon: ClipboardList, title: "研究设计", text: "先看被确认的协议：决策、场景、编码本、停止规则和两条锁定的限度。" },
  { icon: Layers, title: "样本与样本理由", text: "每条来源都能看到为什么纳入、来自哪条查询、哪些编码被点亮。" },
  { icon: BarChart3, title: "分析与发现", text: "只有当编码达到两条纳入条目，才出现一条发现；计数只属于本样本。" },
  { icon: ShieldCheck, title: "质检与边界", text: "单一来源、未覆盖场景、过时内容、样本内冲突，都在同一页暴露。" },
  { icon: FileText, title: "交付简报", text: "报告、双语摘录、结论边界和下一步方法，可复制或导出 Markdown。" },
];

export default function ExamplesPage() {
  const router = useRouter();
  const [demos, setDemos] = useState<DemoSummary[]>([]);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/demos")
      .then((response) => response.json())
      .then((body: { demos?: DemoSummary[] }) => {
        if (alive && Array.isArray(body.demos)) setDemos(body.demos);
      })
      .catch(() => {
        // The gallery still works without cached counts.
      });
    return () => {
      alive = false;
    };
  }, []);

  const byId = new Map(demos.map((demo) => [demo.id, demo]));

  async function rebuild(brief: string, id: string) {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch("/api/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      const body = (await response.json()) as { design?: ResearchDesign; error?: string };
      if (!response.ok || !body.design) {
        setError(body.error || "研究设计没有编译成功。");
        return;
      }
      saveDraft({ design: body.design, study: null, demoId: null });
      router.push("/design");
    } catch {
      setError("请求没有送达，请检查网络。");
    } finally {
      setBusyId("");
    }
  }

  return (
    <main>
      <div className="page-head">
        <span className="eyebrow">
          <Sparkles size={14} /> 评委演示入口
        </span>
        <h1>示例库</h1>
        <p className="lede">
          四个已经跑完的真实案例，覆盖消费硬件、B2B SaaS、跨境出海和企业知识管理。点开就是完整工作台，
          不用现场等接口；也可以选一个案例，从研究设计开始重新跑一遍。
        </p>
      </div>

      {error ? (
        <p className="error-text" style={{ marginBottom: 12 }}>
          {error}
        </p>
      ) : null}

      <div className="examples-grid">
        {SCENARIOS.map((scenario, index) => {
          const design = scenario.build(new Date());
          const demo = byId.get(scenario.id);
          return (
            <article className="example-card" key={scenario.id}>
              <div className="example-top">
                {scenario.tags.map((tag) => (
                  <span className="tag tag-blue" key={tag}>
                    {tag}
                  </span>
                ))}
                <span className="tag">{scenario.audience}</span>
                {index === 0 ? <span className="tag tag-green">推荐演示</span> : null}
              </div>
              <h3 className="example-title">{scenario.title}</h3>
              <p className="example-sub">{scenario.subtitle}</p>
              <div className="example-meta">
                <span>
                  <Layers size={12} /> {design.scenes.length} 个场景
                </span>
                <span>
                  <ClipboardList size={12} /> {design.codebook.length} 个编码
                </span>
                <span>
                  <CheckCircle2 size={12} />{" "}
                  {demo ? `${demo.includedCount} 条纳入 / ${demo.findingCount} 条发现` : "已缓存完整研究"}
                </span>
              </div>
              <div className="example-foot">
                <button className="example-open" type="button" onClick={() => router.push(`/workbench?demo=${scenario.id}`)}>
                  <Play size={13} /> 查看完整示例
                </button>
                <button
                  className="btn btn-sm"
                  type="button"
                  disabled={busyId === scenario.id}
                  onClick={() => void rebuild(scenario.brief, scenario.id)}
                >
                  {busyId === scenario.id ? <span className="spinner" /> : <RefreshCw size={13} />}
                  重新研究
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="section-head">
        <div>
          <h2>演示动线</h2>
          <p>5 分钟 Demo 建议按这个顺序走，从方法讲到交付。</p>
        </div>
        <Link className="link-more" href="/">
          现场从零开始 <ArrowRight size={14} />
        </Link>
      </div>

      <div className="card" style={{ padding: 6 }}>
        {DEMO_FLOW.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={step.title}
              style={{
                display: "flex",
                gap: 13,
                padding: "14px 16px",
                borderBottom: index === DEMO_FLOW.length - 1 ? "none" : "1px solid var(--line)",
              }}
            >
              <span className="recent-icon">
                <Icon size={17} />
              </span>
              <div>
                <strong style={{ fontSize: 13.5 }}>{step.title}</strong>
                <p className="small muted" style={{ marginTop: 2 }}>
                  {step.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card tip-card" style={{ marginTop: 18, padding: 18, display: "flex", alignItems: "center", gap: 16 }}>
        <Kanshan variant="side" size={88} hidden />
        <div>
          <h3 style={{ fontSize: 14 }}>给评委的一句话</h3>
          <p className="small muted" style={{ marginTop: 4, maxWidth: "80ch" }}>
            这个作品的重点不是多接一个模型，而是把「一次商业决策」变成「一份可交接的研究」：
            先确认方法，再动数据；每条结论有样本；每个边界都写出来。
          </p>
        </div>
        <Link className="btn btn-sm" href="/plan" style={{ marginLeft: "auto", flex: "none" }}>
          <FileText size={13} /> 产品说明
        </Link>
      </div>
    </main>
  );
}
