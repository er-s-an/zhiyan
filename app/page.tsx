"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  ClipboardList,
  Clock3,
  Layers,
  LibraryBig,
  Play,
  RefreshCw,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Kanshan } from "./components/Kanshan";
import { SCENARIOS } from "../lib/scenarios";
import { loadRecent, saveDraft, type RecentEntry } from "../lib/storage";
import type { ResearchDesign } from "../lib/types";

const PROCESS = [
  { title: "研究简报", note: "一句业务问题" },
  { title: "研究设计", note: "可编辑、可确认" },
  { title: "检索与样本", note: "确认后才调知乎", gate: true },
  { title: "分析与交付", note: "结论带边界" },
];

const TRUST = [
  {
    icon: ShieldCheck,
    title: "先确认，再检索",
    text: "设计没被确认之前，知乎搜索、热榜和直答都不会被调用。每一步都能解释为什么发生。",
  },
  {
    icon: ScanSearch,
    title: "每条结论能回到样本",
    text: "样本保留来源、日期、场景和纳入理由；排除、恢复或改标签后，计数与报告一起重算。",
  },
  {
    icon: ClipboardList,
    title: "把不能证明的写清楚",
    text: "购买意愿和宣称验证被锁在方法之外。交付页第一屏就告诉你这份研究能支持什么、不能证明什么。",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [brief, setBrief] = useState(SCENARIOS[0].brief);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<RecentEntry[]>([]);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  const cards = useMemo(
    () =>
      SCENARIOS.map((scenario) => {
        const design = scenario.build(new Date());
        return {
          scenario,
          scenes: design.scenes.length,
          queries: design.queries.length,
          codes: design.codebook.length,
        };
      }),
    [],
  );

  async function compile(text: string) {
    const value = text.trim();
    if (!value) {
      setError("先写一句你想弄清楚的业务问题。");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: value }),
      });
      const body = (await response.json()) as { design?: ResearchDesign; error?: string; zhihuCalls?: number };
      if (!response.ok || !body.design) {
        setError(body.error || "研究设计没有编译成功，请再试一次。");
        return;
      }
      if (body.zhihuCalls !== 0) {
        setError("检索在确认前启动了，已停止。");
        return;
      }
      saveDraft({ design: body.design, study: null, demoId: null });
      router.push("/design");
    } catch {
      setError("请求没有送达。检查网络后再试一次。");
    } finally {
      setBusy(false);
    }
  }

  function openDemo(id: string) {
    router.push(`/workbench?demo=${id}`);
  }

  return (
    <main>
      <section className="home-hero">
        <div>
          <span className="eyebrow">
            <Sparkles size={14} />
            知乎开放能力 × 研究执行
          </span>
          <h1>
            把一句业务问题，
            <br />
            跑成一份<em>可核对</em>的知乎研究。
          </h1>
          <p className="lede">
            知研台不是搜索框。它先把决策编译成研究设计，等你确认后再检索知乎、建立样本、编码分析，
            最后交付一份写明「能支持什么、不能证明什么」的团队简报。
          </p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="hero-chip one">
            <ShieldCheck size={12} /> 确认门
          </span>
          <Kanshan variant="front" size={196} hidden />
          <span className="hero-chip two">
            <BadgeCheck size={12} /> 每条有出处
          </span>
        </div>
      </section>

      <section className="card composer" aria-label="研究简报">
        <div className="composer-field">
          <div className="composer-label">
            <span>研究简报</span>
            <span>中文即可 · 生成设计前不调用知乎</span>
          </div>
          <textarea
            id="brief"
            data-testid="brief-input"
            value={brief}
            placeholder="例如：我们在做一款面向产研团队的 AI 会议纪要工具，想知道团队真实的使用场景，以及哪些能力只是演示效果。"
            onChange={(event) => setBrief(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void compile(brief);
            }}
          />
        </div>
        <div className="composer-foot">
          <div className="chip-row">
            <span className="chip-label">试试</span>
            {SCENARIOS.map((scenario) => (
              <button key={scenario.id} type="button" className="chip" onClick={() => setBrief(scenario.brief)}>
                <LibraryBig size={12} />
                {scenario.title}
              </button>
            ))}
          </div>
          <button className="btn btn-primary btn-lg" type="button" data-testid="compile-button" disabled={busy} onClick={() => void compile(brief)}>
            {busy ? (
              <>
                <span className="spinner" /> 正在编译设计
              </>
            ) : (
              <>
                生成研究设计 <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
        <div className="row" style={{ marginTop: 10, justifyContent: "space-between" }}>
          <span className="mini muted" data-testid="pre-retrieval">
            已调用知乎 0 次
          </span>
          <span className="mini muted">⌘ / Ctrl + Enter 快速生成</span>
        </div>
        {error ? (
          <p className="error-text" data-testid="form-error" style={{ marginTop: 8 }}>
            {error}
          </p>
        ) : null}
      </section>

      <div className="flow-strip" aria-label="研究流程">
        {PROCESS.map((step, index) => (
          <div key={step.title} className={`flow-step${step.gate ? " is-gate" : ""}`}>
            <span className="flow-num">{index + 1}</span>
            <div>
              <strong>{step.title}</strong>
              <span>{step.note}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="section-head">
        <div>
          <h2>示例工作台</h2>
          <p>已经跑完的真实研究，点开就能看完整样本、质检与交付。也可以基于示例重新跑一遍。</p>
        </div>
        <Link className="link-more" href="/examples">
          查看全部示例 <ChevronRight size={14} />
        </Link>
      </div>

      <div className="examples-grid">
        {cards.map(({ scenario, scenes, queries, codes }) => (
          <article className="example-card" key={scenario.id}>
            <div className="example-top">
              {scenario.tags.map((tag) => (
                <span className="tag tag-blue" key={tag}>
                  {tag}
                </span>
              ))}
              <span className="tag">{scenario.audience}</span>
            </div>
            <h3 className="example-title">{scenario.title}</h3>
            <p className="example-sub">{scenario.subtitle}</p>
            <div className="example-meta">
              <span>
                <Layers size={12} /> {scenes} 个场景
              </span>
              <span>
                <Search size={12} /> {queries} 条检索
              </span>
              <span>
                <ClipboardList size={12} /> {codes} 个编码
              </span>
            </div>
            <div className="example-foot">
              <button className="example-open" type="button" onClick={() => openDemo(scenario.id)}>
                <Play size={13} /> 查看完整示例
              </button>
              <button className="btn btn-sm" type="button" onClick={() => void compile(scenario.brief)}>
                <RefreshCw size={13} /> 重新研究
              </button>
            </div>
          </article>
        ))}
      </div>

      {recent.length > 0 ? (
        <>
          <div className="section-head">
            <div>
              <h2>最近的本地记录</h2>
              <p>只保存在这台浏览器的本地存储里，不会上传。</p>
            </div>
          </div>
          {recent.slice(0, 3).map((entry) => (
            <div className="recent-card" key={`${entry.decision}-${entry.updatedAt}`}>
              <span className="recent-icon">
                <Clock3 size={17} />
              </span>
              <div className="recent-body">
                <strong>{entry.decision}</strong>
                <span>
                  {entry.demo ? "示例快照" : `${entry.includedCount} 条纳入条目`} ·{" "}
                  {new Date(entry.updatedAt).toLocaleString("zh-CN", { hour12: false })}
                </span>
              </div>
              <Link className="btn btn-sm" href="/workbench?view=sample">
                打开
              </Link>
            </div>
          ))}
        </>
      ) : null}

      <div className="section-head">
        <div>
          <h2>为什么这份研究可以拿去开会</h2>
          <p>方法先于结论，边界先于好看。</p>
        </div>
      </div>
      <div className="trust-grid">
        {TRUST.map((item) => {
          const Icon = item.icon;
          return (
            <div className="trust-card" key={item.title}>
              <span className="trust-icon">
                <Icon size={17} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          );
        })}
      </div>

      <div className="card tip-card" style={{ marginTop: 22, padding: 18, display: "flex", alignItems: "center", gap: 16 }}>
        <Kanshan variant="side" size={74} hidden />
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: 14 }}>刘看山提示</h3>
          <p className="small muted" style={{ marginTop: 4 }}>
            演示时打开「示例库」，选择任意一个已完成的案例，从样本一路讲到交付页，比现场等检索更稳。
          </p>
        </div>
        <Link className="btn btn-sm" href="/examples" style={{ marginLeft: "auto", flex: "none" }}>
          <Users size={13} /> 打开示例库
        </Link>
      </div>
    </main>
  );
}
