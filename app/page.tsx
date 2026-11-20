"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpen, ExternalLink, Search, Shuffle, Sparkles } from "lucide-react";
import { Kanshan } from "./components/Kanshan";
import { useLang } from "./components/LanguageProvider";
import { pickLang } from "../lib/v2/lang";
import { PLAY_BRIEFS, playBriefById, randomPlayBrief } from "../lib/v2/play-briefs";
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
  const [briefId, setBriefId] = useState("freelancer-contract");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [demos, setDemos] = useState<DemoSummaryV2[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);

  const selectedBrief = playBriefById(briefId) ?? PLAY_BRIEFS[0];
  const briefIndex = PLAY_BRIEFS.findIndex((item) => item.id === selectedBrief.id);

  useEffect(() => {
    const selected = playBriefById(briefId) ?? PLAY_BRIEFS[0];
    setBrief(lang === "zh" ? selected.textZh : selected.textEn);
  }, [lang, briefId]);

  function randomizeBrief() {
    const next = randomPlayBrief(briefId);
    setBriefId(next.id);
    setError("");
  }

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
      setError(tr("先写一句你要做的产品决定。", "Write the product decision first.", "Écris d'abord la décision produit.", "まずプロダクト判断を一文で書いてください。"));
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
  const tr = (zh: string, en: string, fr: string, ja: string) => pickLang(lang, zh, en, fr, ja);

  return (
    <main className="v2-page">
      <section className="v2-home-hero">
        <p className="v2-kicker">{t("home.eyebrow")}</p>
        <h1>{tr("让一个人，也有一支懂中国用户的研究团队。", "A research team for global builders, built on real Zhihu conversations.", "Une équipe de recherche pour les bâtisseurs du monde, ancrée dans de vraies discussions Zhihu.", "世界のビルダーのための、実際のZhihu議論にもとづくリサーチチーム。")}</h1>
        <p className="v2-lede">
          {tr(
            "把一个英文产品决策，变成中文研究计划、适应性知乎检索和一份可复核的双语决策简报。不是通用 AI 搜索，而是在知乎里执行一次可检查的用户研究。",
            "Turn an English product decision into a Chinese research plan, adaptive Zhihu retrieval, and a reviewable bilingual decision brief. Not generic AI search — a checkable user study executed inside Zhihu.",
            "Transforme une décision produit en plan de recherche chinois, en exploration Zhihu adaptative et en note de décision bilingue vérifiable. Pas une recherche IA générique : une étude utilisateur exécutée dans Zhihu.",
            "プロダクト判断を、中国語のリサーチプラン、適応的なZhihu検索、検証可能なバイリンガルの意思決定ブリーフに変えます。汎用AI検索ではなく、Zhihuの中で実行する検査可能なユーザーリサーチです。",
          )}
        </p>
      </section>

      <section className="v2-card v2-home-brief">
        <div className="v2-between v2-home-brief-head" style={{ marginBottom: 9 }}>
          <span className="v2-label">{t("home.briefLabel")}</span>
          <div className="v2-row" style={{ gap: 8 }}>
            <span className="v2-mini v2-muted">{tr("生成计划前不调用知乎", "No Zhihu calls before the plan", "Aucun appel à Zhihu avant le plan", "プラン作成前にZhihuは呼びません")}</span>
            <span className="v2-tag" data-testid="v21-brief-index">{tr(`示例 ${briefIndex + 1}/${PLAY_BRIEFS.length}`, `Example ${briefIndex + 1}/${PLAY_BRIEFS.length}`, `Exemple ${briefIndex + 1}/${PLAY_BRIEFS.length}`, `例 ${briefIndex + 1}/${PLAY_BRIEFS.length}`)}</span>
            <button className="v2-btn v2-btn-sm" type="button" data-testid="v21-random-brief" onClick={randomizeBrief} disabled={busy} title={tr("随机换一个产品问题", "Try another product decision", "Essayer une autre décision produit", "別のプロダクト課題を試す")}>
              <Shuffle size={12} /> {tr("随机换一个", "Try another", "Essayer un autre", "別の例を試す")}
            </button>
          </div>
        </div>
        <div className="v2-mini v2-muted" style={{ marginBottom: 6 }}>
          {lang === "zh" ? selectedBrief.labelZh : selectedBrief.labelEn}
        </div>
        {/* Brief play data is currently bilingual; French and Japanese use the English prompt. */}
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
            {tr("中文 / English 输入均可 · 系统会拆出中文研究计划", "Chinese or English input · the system drafts a Chinese research plan", "Saisie en chinois ou en anglais · le système rédige un plan de recherche chinois", "中国語・英語入力OK · 中国語のリサーチプランを生成します")}
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
            <span className="v2-tag">{tr("AI × 出海", "AI × Going Global", "IA × International", "AI × 海外展開")}</span>
            <span className="v2-tag">{tr("真实知乎检索缓存", "Real Zhihu cache", "Cache de recherche Zhihu réel", "実際のZhihu検索キャッシュ")}</span>
          </div>
          <h2 style={{ marginTop: 9 }}>{t("home.mainExample")}</h2>
          <p>{t("home.mainExampleDesc")}</p>
          {mainDemo ? (
            <div className="v2-home-stats">
              <span>{mainDemo.opportunityCount ?? 2} {tr("个机会假设", "opportunity hypotheses", "hypothèses d'opportunité", "機会仮説")}</span>
              <span>{mainDemo.beliefUpdateCount ?? 3} {tr("条认知更新", "belief updates", "mises à jour de croyance", "認識の更新")}</span>
              <span>{mainDemo.includedCount} {tr("条可回查证据", "traceable evidence items", "éléments de preuve vérifiables", "追跡可能な根拠")}</span>
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
            <h2>{tr("它怎么工作", "How it works", "Comment ça marche", "仕組み")}</h2>
            <p>{tr("研究先于搜索，证据先于结论。", "Research before search, evidence before conclusions.", "D'abord la recherche, ensuite la collecte ; d'abord les preuves, ensuite les conclusions.", "検索より先に研究、結論より先に証拠。")}</p>
          </div>
        </div>
        <div className="v2-card" style={{ padding: "4px 20px" }}>
          {[
            {
              title: tr("先看讨论改变了什么", "See what the discussion changed", "Voir ce que la discussion a changé", "議論で何が変わったかを見る"),
              desc: tr(
                "原来的想法 vs 讨论后的新理解；每条认知更新都能回到真实讨论。",
                "Original belief vs revised understanding; every update traces back to real discussion.",
                "Croyance initiale vs compréhension révisée ; chaque mise à jour renvoie à une discussion réelle.",
                "最初の考えと議論後の理解。各更新は実際の議論に戻れます。",
              ),
            },
            {
              title: tr("形成最多三张机会假设", "Form up to three opportunity hypotheses", "Former jusqu'à trois hypothèses d'opportunité", "最大3つの機会仮説を立てる"),
              desc: tr(
                "谁在什么场景遇到什么问题、现有替代方案为什么不够、下一步如何证伪。证据不足不凑数。",
                "Who has what problem in which scene, why current alternatives fall short, and how to falsify it next. No padding when evidence is insufficient.",
                "Qui rencontre quel problème dans quel contexte, pourquoi les alternatives actuelles ne suffisent pas, et comment falsifier ensuite. Pas de remplissage sans preuves.",
                "誰がどんな場面でどんな問題を抱え、既存の代替案がなぜ不十分で、次にどう反証するか。証拠が足りなければ水増ししません。",
              ),
            },
            {
              title: tr("最后看证据和验证", "Then see evidence and validation", "Puis voir les preuves et la validation", "最後に証拠と検証を見る"),
              desc: tr(
                "每条判断可回到中文原话和知乎原文；简报直接给出下一步该验证什么、什么情况下停。",
                "Every judgment traces back to the Chinese quote and Zhihu source; the brief states what to validate next and when to stop.",
                "Chaque jugement renvoie à la citation chinoise et à la source Zhihu ; la note indique quoi valider ensuite et quand arrêter.",
                "各判断は中国語の原文とZhihuの出典に戻れます。ブリーフは次に何を検証し、いつ止めるかを示します。",
              ),
            },
          ].map((item, index) => (
            <article className="v2-feed-item" key={item.title}>
              <span className="v2-feed-dot">{index + 1}</span>
              <div>
                <div className="v2-feed-title">{item.title}</div>
                <div className="v2-feed-desc">{item.desc}</div>
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
              <p>{tr("只保存在这台浏览器本地。", "Stored only in this browser.", "Stocké uniquement dans ce navigateur.", "このブラウザにのみ保存されます。")}</p>
            </div>
          </div>
          <div className="v2-card" style={{ padding: "2px 20px" }}>
            {recent.slice(0, 4).map((entry) => (
              <article className="v2-feed-item" key={`${entry.decision}-${entry.at}`}>
                <span className="v2-feed-dot"><BookOpen size={13} /></span>
                <div>
                  <div className="v2-feed-title">{entry.decision}</div>
                  <div className="v2-feed-meta">
                    {entry.demo ? t("common.demo") : t("common.live")} · {new Date(entry.at).toLocaleString(lang === "zh" ? "zh-CN" : lang === "fr" ? "fr-FR" : lang === "ja" ? "ja-JP" : "en-US", { hour12: false })}
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
