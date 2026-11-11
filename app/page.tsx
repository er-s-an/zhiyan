"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpen, ExternalLink, Search, Sparkles } from "lucide-react";
import { Kanshan } from "./components/Kanshan";
import { useLang } from "./components/LanguageProvider";
import { MAIN_CASE_BRIEF, MAIN_CASE_BRIEF_ZH } from "../lib/v2/copy";
import type { DemoSummaryV2, Lang, ResearchPlanV2 } from "../lib/v2/types";

interface Recent {
  decision: string;
  at: string;
  demo?: boolean;
}

export default function HomePage() {
  const router = useRouter();
  const { lang, t } = useLang();
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [demos, setDemos] = useState<DemoSummaryV2[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);

  useEffect(() => {
    setBrief(lang === "zh" ? MAIN_CASE_BRIEF_ZH : MAIN_CASE_BRIEF);
  }, [lang]);

  useEffect(() => {
    fetch("/api/v2/demos")
      .then((response) => response.json())
      .then((body: { demos?: DemoSummaryV2[] }) => setDemos(Array.isArray(body.demos) ? body.demos : []))
      .catch(() => setDemos([]));
    try {
      const raw = window.localStorage.getItem("zhiyan.v2.recent");
      if (raw) setRecent(JSON.parse(raw) as Recent[]);
    } catch {
      setRecent([]);
    }
  }, []);

  async function start() {
    const value = brief.trim();
    if (!value) {
      setError(lang === "zh" ? "先写一句你要做的产品决定。" : "Write the product decision first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v2/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: value, language: lang }),
      });
      const body = (await response.json()) as { plan?: ResearchPlanV2; error?: string };
      if (!response.ok || !body.plan) throw new Error(body.error || "PLAN_FAILED");
      window.localStorage.setItem("zhiyan.v2.plan", JSON.stringify(body.plan));
      window.localStorage.removeItem("zhiyan.v2.study");
      router.push("/design");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("error.generic"));
    } finally {
      setBusy(false);
    }
  }

  const mainDemo = demos.find((demo) => demo.id === "main-case");

  return (
    <main className="v2-page">
      <section className="v2-home-hero">
        <p className="v2-kicker">{t("home.eyebrow")}</p>
        <h1>{lang === "zh" ? "让一个人，也有一支懂中国用户的研究团队。" : "A research team for global builders, built on real Zhihu conversations."}</h1>
        <p className="v2-lede">
          {lang === "zh"
            ? "把一个英文产品决策，变成中文研究计划、适应性知乎检索和一份可复核的双语决策简报。不是通用 AI 搜索，而是在知乎里执行一次可检查的用户研究。"
            : "Turn an English product decision into a Chinese research plan, adaptive Zhihu retrieval, and a reviewable bilingual decision brief. Not generic AI search — a checkable user study executed inside Zhihu."}
        </p>
      </section>

      <section className="v2-card v2-home-brief">
        <div className="v2-between" style={{ marginBottom: 9 }}>
          <span className="v2-label">{t("home.briefLabel")}</span>
          <span className="v2-mini v2-muted">{lang === "zh" ? "生成计划前不调用知乎" : "No Zhihu calls before the plan"}</span>
        </div>
        <div className="v2-home-brief-box">
          <textarea
            className="v2-textarea"
            data-testid="v2-brief-input"
            value={brief}
            placeholder={t("home.briefPlaceholder")}
            onChange={(event) => setBrief(event.target.value)}
          />
        </div>
        <div className="v2-home-actions">
          <span className="v2-home-meta">
            {lang === "zh" ? "中文 / English 输入均可 · 系统会拆出中文研究计划" : "Chinese or English input · the system drafts a Chinese research plan"}
          </span>
          <button className="v2-btn v2-btn-primary v2-btn-lg" type="button" data-testid="v2-start" disabled={busy} onClick={() => void start()}>
            {busy ? <span className="v2-spinner" /> : <Search size={15} />}
            {busy ? t("home.starting") : t("home.start")}
            {!busy ? <ArrowRight size={15} /> : null}
          </button>
        </div>
        {error ? <p className="v2-error">{error}</p> : null}
      </section>

      <section className="v2-card v2-home-example">
        <div>
          <div className="v2-row" style={{ gap: 6 }}>
            <span className="v2-tag v2-tag-blue">{t("examples.main")}</span>
            <span className="v2-tag">{lang === "zh" ? "AI × 出海" : "AI × Going Global"}</span>
            <span className="v2-tag">{lang === "zh" ? "真实知乎检索缓存" : "Real Zhihu cache"}</span>
          </div>
          <h2 style={{ marginTop: 9 }}>{t("home.mainExample")}</h2>
          <p>{t("home.mainExampleDesc")}</p>
          {mainDemo ? (
            <div className="v2-home-stats">
              <span>{mainDemo.includedCount} {lang === "zh" ? "条纳入样本" : "included samples"}</span>
              <span>{mainDemo.findingCount} {lang === "zh" ? "条发现" : "findings"}</span>
              <span>{mainDemo.vocabularyCount} {lang === "zh" ? "个新关键词" : "new keywords"}</span>
            </div>
          ) : null}
          <div className="v2-row" style={{ marginTop: 14 }}>
            <Link className="v2-btn v2-btn-primary" href="/workbench?demo=main-case">
              {t("home.openExample")} <ArrowRight size={14} />
            </Link>
            <Link className="v2-btn" href="/examples">
              {t("home.auxExamples")} <ExternalLink size={13} />
            </Link>
          </div>
        </div>
        <div className="v2-home-example-art" aria-hidden="true">
          <Kanshan variant="front" size={130} hidden />
        </div>
      </section>

      <section className="v2-home-feed">
        <div className="v2-section-head">
          <div>
            <h2>{lang === "zh" ? "它怎么工作" : "How it works"}</h2>
            <p>{lang === "zh" ? "研究先于搜索，证据先于结论。" : "Research before search, evidence before conclusions."}</p>
          </div>
        </div>
        <div className="v2-card" style={{ padding: "4px 20px" }}>
          {[
            {
              titleZh: "先把决策拆成研究计划",
              titleEn: "Turn the decision into a research plan",
              descZh: "方法适用闸门先判断知乎能不能回答；不能回答的部分会在报告里被限制措辞。",
              descEn: "The method-fit gate checks what Zhihu can answer; unsupported claims are constrained in the report.",
            },
            {
              titleZh: "从真实讨论里长出关键词",
              titleEn: "Grow vocabulary from real discussion",
              descZh: "不预设同义词表。系统从样本中提取新表达、来源原句和下一轮查询，并写入计划新版本。",
              descEn: "No synonym list. The system extracts new expressions, source quotes and next queries from samples, then writes a new plan version.",
            },
            {
              titleZh: "交付可复核的双语简报",
              titleEn: "Deliver a reviewable bilingual brief",
              descZh: "每条发现可回到中文原话和知乎原文；中英文来自同一份结构化研究。",
              descEn: "Every finding traces back to the Chinese quote and Zhihu source; Chinese and English come from the same structured study.",
            },
          ].map((item, index) => (
            <article className="v2-feed-item" key={item.titleZh}>
              <span className="v2-feed-dot">{index + 1}</span>
              <div>
                <div className="v2-feed-title">{lang === "zh" ? item.titleZh : item.titleEn}</div>
                <div className="v2-feed-desc">{lang === "zh" ? item.descZh : item.descEn}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {recent.length > 0 ? (
        <section className="v2-home-feed">
          <div className="v2-section-head">
            <div>
              <h2>{t("home.recent")}</h2>
              <p>{lang === "zh" ? "只保存在这台浏览器本地。" : "Stored only in this browser."}</p>
            </div>
          </div>
          <div className="v2-card" style={{ padding: "2px 20px" }}>
            {recent.slice(0, 4).map((entry) => (
              <article className="v2-feed-item" key={`${entry.decision}-${entry.at}`}>
                <span className="v2-feed-dot"><BookOpen size={13} /></span>
                <div>
                  <div className="v2-feed-title">{entry.decision}</div>
                  <div className="v2-feed-meta">
                    {entry.demo ? t("common.demo") : t("common.live")} · {new Date(entry.at).toLocaleString(lang === "zh" ? "zh-CN" : "en-US", { hour12: false })}
                  </div>
                  <Link className="v2-small" href="/workbench?view=explore" style={{ display: "inline-block", marginTop: 4 }}>
                    {t("common.open")} →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <p className="v2-mini v2-muted" style={{ marginTop: 22 }}>
        {t("home.disclaimer")}
      </p>
    </main>
  );
}
