"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FlaskConical,
  Map,
  MessageSquare,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target,
} from "lucide-react";
import { useLang } from "../components/LanguageProvider";
import { pickLang } from "../../lib/v2/lang";
import {
  assessFeasibility,
  buildInterviewProfile,
  pickText,
  type FeasibilityAssessment,
  type InterviewAnswers,
  type InterviewProfile,
} from "../../lib/v2/interview";
import {
  buildActionPlanMarkdown,
  buildFallbackActionPlan,
  researchMatchesInterview,
  type ActionPlan,
} from "../../lib/v2/action-plan";
import type { DecisionBriefV21 } from "../../lib/v2/brief";
import type { Lang, ResearchPlanV2 } from "../../lib/v2/types";

const INTERVIEW_KEY = "zhiyan.v2.interview";
const BRIEF_KEY = "zhiyan.v21.brief";
const PLAN_KEY = "zhiyan.v2.plan";
const CACHE_KEY = "zhiyan.v2.actionPlan";
const NOTES_KEY = "zhiyan.v2.actionPlanNotes";

interface StoredInterview {
  answers: InterviewAnswers;
  done: boolean;
}

interface CachedPlan {
  signature: string;
  plan: ActionPlan;
}

function tr(lang: Lang, zh: string, en: string, fr: string, ja: string): string {
  return pickLang(lang, zh, en, fr, ja);
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function readInterview(): StoredInterview | null {
  const value = readJson<Partial<StoredInterview>>(INTERVIEW_KEY);
  if (!value || value.done !== true || !value.answers || typeof value.answers !== "object") return null;
  return { answers: value.answers, done: true };
}

function signatureOf(answers: InterviewAnswers, brief: DecisionBriefV21 | null, lang: Lang): string {
  const answerKey = Object.entries(answers).map(([key, value]) => `${key}:${value ?? ""}`).join("|");
  return `${answerKey}|${brief?.id ?? "none"}|${brief?.generatedAt ?? ""}|${lang}`;
}

function confidenceBadge(confidence: ActionPlan["confidence"]): string {
  return confidence === "high" ? "v2-badge-fit" : confidence === "medium" ? "v2-badge-partial" : "v2-badge-mismatch";
}

export default function ActionPlanPage() {
  const { lang } = useLang();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<InterviewProfile | null>(null);
  const [assessment, setAssessment] = useState<FeasibilityAssessment | null>(null);
  const [brief, setBrief] = useState<DecisionBriefV21 | null>(null);
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [fallbackPlan, setFallbackPlan] = useState<ActionPlan | null>(null);
  const [source, setSource] = useState<"fallback" | "opencode" | "cache">("fallback");
  const [polishing, setPolishing] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const runRef = useRef(0);
  const signatureRef = useRef("");

  useEffect(() => {
    const saved = readJson<{ text?: string }[]>(NOTES_KEY);
    setNotes(Array.isArray(saved) ? saved.map((item) => item.text).filter((text): text is string => Boolean(text)).slice(0, 10) : []);
  }, []);

  useEffect(() => {
    runRef.current += 1;
    setReady(false);
    setError("");
    setPolishing(false);

    const stored = readInterview();
    if (!stored) {
      setProfile(null);
      setAssessment(null);
      setBrief(null);
      setPlan(null);
      setFallbackPlan(null);
      setReady(true);
      return;
    }

    const nextProfile: InterviewProfile = { ...buildInterviewProfile(stored.answers, lang), language: lang };
    const nextAssessment = assessFeasibility(nextProfile);
    const nextBrief = readJson<DecisionBriefV21>(BRIEF_KEY);
    const nextPlan = readJson<ResearchPlanV2>(PLAN_KEY);
    const fallback = buildFallbackActionPlan({
      profile: nextProfile,
      assessment: nextAssessment,
      brief: nextBrief,
      plan: nextPlan,
      study: null,
    });
    const signature = signatureOf(stored.answers, nextBrief, lang);
    signatureRef.current = signature;

    setProfile(nextProfile);
    setAssessment(nextAssessment);
    setBrief(nextBrief);
    setFallbackPlan(fallback);
    setPlan(fallback);
    setSource("fallback");

    const cached = readJson<CachedPlan>(CACHE_KEY);
    if (cached && cached.signature === signature && cached.plan) {
      setPlan(cached.plan);
      setSource("cache");
    }
    setReady(true);
  }, [lang]);

  async function polish(): Promise<void> {
    if (!profile || !assessment || !fallbackPlan || polishing) return;
    const run = runRef.current;
    setPolishing(true);
    setError("");
    try {
      const response = await fetch("/api/v2/action-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: lang,
          profile,
          assessment,
          fallback: fallbackPlan,
          researchMatch: researchMatchesInterview(profile, brief, readJson<ResearchPlanV2>(PLAN_KEY)),
        }),
      });
      const body = (await response.json().catch(() => null)) as { plan?: ActionPlan; source?: string; error?: string } | null;
      if (!response.ok || !body?.plan) throw new Error(body?.error || "PLAN_FAILED");
      if (run !== runRef.current) return;
      setPlan(body.plan);
      setSource(body.source === "opencode" ? "opencode" : "fallback");
      if (body.source === "opencode") {
        try {
          window.localStorage.setItem(CACHE_KEY, JSON.stringify({ signature: signatureRef.current, plan: body.plan } satisfies CachedPlan));
        } catch {
          // cache is optional
        }
      }
    } catch (caught) {
      if (run !== runRef.current) return;
      setError(caught instanceof Error ? caught.message : "PLAN_FAILED");
    } finally {
      if (run === runRef.current) setPolishing(false);
    }
  }

  function downloadPlan(): void {
    if (!plan) return;
    const notesBlock = notes.length
      ? `\n## ${tr(lang, "研究搭子的补充观察", "Notes from the research partner", "Notes du partenaire de recherche", "リサーチ相棒の補足")}\n${notes.map((note) => `- ${note}`).join("\n")}\n`
      : "";
    const markdown = buildActionPlanMarkdown(plan) + notesBlock;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `zhiyan-action-plan-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  if (!ready) {
    return (
      <div className="v2-loading">
        <span className="v2-spinner" /> {tr(lang, "正在整理落地方案…", "Building the action plan…", "Préparation du plan d'action…", "実行プランを整理中…")}
      </div>
    );
  }

  if (!profile || !assessment || !plan) {
    return (
      <main className="v2-page">
        <div className="v2-card v2-empty">
          <h2>{tr(lang, "先完成一次访谈", "Start with an interview", "Commence par un entretien", "まずインタビューから")}</h2>
          <p>
            {tr(
              lang,
              "落地方案需要访谈里的目标用户、问题、优势和验证情况。先花 10 分钟聊清楚，再回来生成方案。",
              "The action plan needs your target user, problem, edge and validation from the interview. Spend ten minutes there first.",
              "Le plan d'action a besoin de la cible, du problème, de l'avantage et de la validation issus de l'entretien. Commence par dix minutes d'entretien.",
              "実行プランには、インタビューで得たターゲット、問題、強み、検証状況が必要です。まず10分のインタビューを行ってください。",
            )}
          </p>
          <Link className="v2-btn v2-btn-primary" href="/interview">
            {tr(lang, "开始访谈", "Start the interview", "Commencer l'entretien", "インタビューを始める")} <ArrowRight size={14} />
          </Link>
        </div>
      </main>
    );
  }

  const matched = researchMatchesInterview(profile, brief, readJson<ResearchPlanV2>(PLAN_KEY));
  const modeLabel = plan.mode === "research_merged"
    ? tr(lang, "已结合研究台证据", "Research merged", "Recherche intégrée", "リサーチ統合済み")
    : plan.mode === "research_mismatch"
      ? tr(lang, "访谈与当前研究案例不匹配", "Research case does not match", "Le cas de recherche ne correspond pas", "リサーチ事例が一致しません")
      : tr(lang, "仅基于访谈，待补研究", "Interview-only, research pending", "Basé sur l'entretien, recherche à compléter", "インタビューのみ、リサーチ待ち");
  const modeBadge = plan.mode === "research_merged" ? "v2-badge-fit" : plan.mode === "research_mismatch" ? "v2-badge-mismatch" : "v2-badge-partial";

  return (
    <main className="v2-page v2-action-page">
      <div className="v2-page-head">
        <p className="v2-kicker">{tr(lang, "落地方案 · 访谈 × 研究台", "Action plan · interview × research desk", "Plan d'action · entretien × recherche", "実行プラン · インタビュー × リサーチ")}</p>
        <h1>{plan.title}</h1>
        <p className="v2-lede">
          {tr(
            lang,
            "这不是又一份研究报告，而是把访谈里的判断和研究台里的证据合成一张可执行的路线图：先做什么、不做什么、7 天做什么、什么时候停。",
            "Not another research report: it turns the interview and research-desk evidence into an executable roadmap — what to build, what not to, what to do in seven days, and when to stop.",
            "Pas un rapport de plus : il transforme l'entretien et les preuves de la recherche en feuille de route exécutable — quoi construire, quoi éviter, quoi faire en sept jours et quand arrêter.",
            "もう一つの調査レポートではありません。インタビューとリサーチの証拠を、実行できるロードマップに変えます。何を作り、何を作らず、7日間で何をし、いつ止めるか。",
          )}
        </p>
        <div className="v2-page-meta">
          <span className={`v2-badge ${modeBadge}`}>{modeLabel}</span>
          <span className={`v2-badge ${confidenceBadge(plan.confidence)}`}>
            {tr(lang, "置信度", "Confidence", "Confiance", "確信度")}：{plan.confidence === "high" ? tr(lang, "高", "High", "Élevée", "高") : plan.confidence === "medium" ? tr(lang, "中", "Medium", "Moyenne", "中") : tr(lang, "低", "Low", "Faible", "低")}
          </span>
          <span className="v2-tag">{tr(lang, "访谈初判", "Interview read", "Lecture de l'entretien", "インタビュー初判断")} {assessment.score}/100 · {pickText(assessment.levelLabel, lang)}</span>
          {plan.researchUsed ? (
            <span className="v2-tag v2-tag-blue">
              {tr(lang, "研究证据", "Research evidence", "Preuves de recherche", "リサーチ証拠")}：{plan.researchUsed.evidenceStrength === "strong" ? tr(lang, "强", "Strong", "Fortes", "強") : plan.researchUsed.evidenceStrength === "medium" ? tr(lang, "中", "Medium", "Moyennes", "中") : tr(lang, "弱", "Weak", "Faibles", "弱")} · {plan.researchUsed.evidenceCount}/{plan.researchUsed.counterCount}
            </span>
          ) : null}
          <span className="v2-tag">{source === "opencode" ? tr(lang, "本地模型润色", "Local model rewrite", "Réécrit par le modèle local", "ローカルモデルで推敲") : source === "cache" ? tr(lang, "已缓存", "Cached", "En cache", "キャッシュ") : tr(lang, "规则版", "Rules draft", "Version règles", "ルール版")}</span>
        </div>
        <div className="v2-row" style={{ marginTop: 12 }}>
          <button className="v2-btn v2-btn-primary" type="button" onClick={downloadPlan}><Download size={14} /> {tr(lang, "导出方案", "Export plan", "Exporter le plan", "プランを書き出す")}</button>
          <Link className="v2-btn" href="/workbench"><MessageSquare size={14} /> {tr(lang, "打开研究台", "Open research desk", "Ouvrir la recherche", "リサーチを開く")}</Link>
          <details className="v2-plan-more">
            <summary>{tr(lang, "更多操作", "More actions", "Plus d’actions", "その他の操作")}</summary>
            <div className="v2-plan-more-body">
              <button className="v2-btn" type="button" onClick={() => void polish()} disabled={polishing || !fallbackPlan}>
                {polishing ? <span className="v2-spinner" /> : <Sparkles size={14} />}
                {polishing ? tr(lang, "本地模型润色中…", "Rewriting with local model…", "Réécriture par le modèle local…", "ローカルモデルで推敲中…") : tr(lang, "本地模型润色", "Rewrite with local model", "Réécrire avec le modèle local", "ローカルモデルで推敲")}
              </button>
              <Link className="v2-btn" href="/design"><Map size={14} /> {tr(lang, "调整研究计划", "Adjust research plan", "Ajuster le plan de recherche", "リサーチプランを調整")}</Link>
              <Link className="v2-btn v2-btn-ghost" href="/interview"><RotateCcw size={14} /> {tr(lang, "重新访谈", "New interview", "Nouvel entretien", "インタビューをやり直す")}</Link>
            </div>
          </details>
        </div>
        {polishing ? (
          <div className="v2-progress" style={{ marginTop: 10 }}>
            <span className="v2-spinner" /> {tr(lang, "本地模型正在把规则版方案写得更具体…", "The local model is rewriting the rules draft…", "Le modèle local reformule la version règles…", "ローカルモデルがルール版を具体化しています…")}
          </div>
        ) : null}
        {error ? (
          <p className="v2-hint" style={{ marginTop: 8 }}>
            {tr(lang, "本地模型润色没有完成，当前显示规则版方案，内容仍可使用。", "The local rewrite did not finish; the rules draft is still shown and usable.", "La réécriture locale n'a pas abouti ; la version règles reste affichée et utilisable.", "ローカル推敲が完了しなかったため、ルール版を表示しています。そのまま使えます。")}
          </p>
        ) : null}
        {source === "fallback" && (lang === "fr" || lang === "ja") ? (
          <p className="v2-hint" style={{ marginTop: 8 }}>
            {tr(
              lang,
              "",
              "The rules draft is in English; click “Rewrite with local model” for this language.",
              "La version règles est en anglais ; clique sur « Réécrire avec le modèle local » pour obtenir le français.",
              "ルール版は英語です。「ローカルモデルで推敲」で日本語版を生成できます。",
            )}
          </p>
        ) : null}
      </div>

      {plan.mode === "research_mismatch" ? (
        <div className="v2-card v2-plan-banner">
          <ShieldAlert size={16} />
          <div>
            <b>{tr(lang, "研究台当前案例与这次访谈不是同一个项目", "The current research case is not the same project as this interview", "Le cas de recherche actuel ne correspond pas à cet entretien", "現在のリサーチ事例はこのインタビューと同一プロジェクトではありません")}</b>
            <p className="v2-small v2-muted">
              {tr(
                lang,
                "方案不会把该案例的产品方向当成你的证据。先用访谈方案跑第 1 周验证；等你自己的研究完成后，这里会自动合并。",
                "The plan does not treat that case's product direction as your evidence. Run week-one validation from the interview first; once your own research is complete, it will merge here.",
                "Le plan ne considère pas la direction produit de ce cas comme ta preuve. Commence par la validation de la semaine 1 ; une fois ta recherche terminée, elle sera intégrée ici.",
                "この事例の製品方向をあなたの証拠としては扱いません。まずインタビュー案で第1週の検証を行い、自分のリサーチが完了するとここに統合されます。",
              )}
            </p>
          </div>
        </div>
      ) : null}

      <section className="v2-card v2-plan-hero">
        <div className="v2-plan-hero-main">
          <span className="v2-tag v2-tag-blue">{tr(lang, "一句话定位", "Positioning", "Positionnement", "ポジショニング")}</span>
          <p className="v2-plan-positioning">{plan.positioning}</p>
          <div className="v2-plan-kv">
            <div><span>{tr(lang, "首个切入人群", "Beachhead", "Première cible", "最初の対象")}</span><b>{plan.beachhead}</b></div>
            <div><span>{tr(lang, "要解决的问题", "Problem", "Problème", "解決する問題")}</span><b>{plan.problem}</b></div>
            <div><span>{tr(lang, "承诺的结果", "Promised outcome", "Résultat promis", "約束する成果")}</span><b>{plan.valueProp}</b></div>
          </div>
        </div>
      </section>

      <section className="v2-card v2-card-pad v2-plan-next" style={{ marginTop: 14 }}>
        <h2 style={{ fontSize: 17 }}>{tr(lang, "接下来 7 天", "Next 7 days", "Les 7 prochains jours", "次の7日間")}</h2>
        <ol className="v2-plan-next-list">
          {plan.nextSevenDays.map((item, index) => <li key={item}><span>{index + 1}</span>{item}</li>)}
        </ol>
      </section>

      <section className="v2-card v2-card-pad" style={{ marginTop: 14 }}>
        <h2 style={{ fontSize: 17 }}><Target size={16} /> {tr(lang, "MVP：只做什么", "MVP: what to build first", "MVP : quoi construire d'abord", "MVP：最初に作るもの")}</h2>
        <div className="v2-plan-mvp">
          <div className="v2-plan-mvp-col must">
            <h3>{tr(lang, "必须有", "Must have", "Indispensable", "必須")}</h3>
            <ul className="v2-list">{plan.mvp.must.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div className="v2-plan-mvp-col later">
            <h3>{tr(lang, "验证后再加", "Add after validation", "À ajouter après validation", "検証後に追加")}</h3>
            <ul className="v2-list">{plan.mvp.later.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div className="v2-plan-mvp-col not-now">
            <h3>{tr(lang, "现在不做", "Not now", "Pas maintenant", "今はやらない")}</h3>
            <ul className="v2-list">{plan.mvp.notNow.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </div>
      </section>

      <details className="v2-card v2-card-pad v2-plan-details" style={{ marginTop: 14 }}>
        <summary><Sparkles size={16} /> {tr(lang, "商业模式与第一批付费者", "Business model and first payers", "Modèle économique et premiers payeurs", "ビジネスモデルと最初の支払者")}</summary>
        <div className="v2-plan-business">
          <div><span>{tr(lang, "收费方式", "Model", "Modèle", "課金方法")}</span><p>{plan.businessModel.model}</p></div>
          <div><span>{tr(lang, "价格假设", "Price hypothesis", "Hypothèse de prix", "価格仮説")}</span><p>{plan.businessModel.price}</p></div>
          <div><span>{tr(lang, "谁先付钱", "Who pays first", "Qui paie d'abord", "最初に払う人")}</span><p>{plan.businessModel.firstPayers}</p></div>
        </div>
      </details>

      <details className="v2-card v2-card-pad v2-plan-details" style={{ marginTop: 14 }}>
        <summary><Map size={16} /> {tr(lang, "12 周路线图", "12-week roadmap", "Feuille de route sur 12 semaines", "12週間ロードマップ")}</summary>
        <div className="v2-roadmap">
          {plan.roadmap.map((phase, index) => (
            <article className="v2-plan-phase" key={`${phase.name}-${index}`}>
              <div className="v2-plan-phase-head">
                <span className="v2-plan-phase-num">{index + 1}</span>
                <div>
                  <b>{phase.name}</b>
                  <span>{phase.window}</span>
                </div>
              </div>
              <ul className="v2-list">{phase.actions.map((item) => <li key={item}>{item}</li>)}</ul>
              <p className="v2-plan-output"><CheckCircle2 size={13} /> {phase.output}</p>
            </article>
          ))}
        </div>
      </details>

      <details className="v2-card v2-card-pad v2-plan-details" style={{ marginTop: 14 }}>
        <summary><FlaskConical size={16} /> {tr(lang, "先做这几个实验", "Run these experiments first", "Lance ces expériences d'abord", "まずこの実験を行う")}</summary>
        <div className="v2-experiment-grid">
          {plan.experiments.map((experiment, index) => (
            <article className="v2-plan-experiment" key={`${experiment.title}-${index}`}>
              <h3>{experiment.title}</h3>
              <p><b>{tr(lang, "找谁", "Who", "Qui", "誰に")}：</b>{experiment.who}</p>
              <p><b>{tr(lang, "问什么", "Question", "Question", "何を聞く")}：</b>{experiment.question}</p>
              <p><b>{tr(lang, "成功标准", "Success", "Succès", "成功基準")}：</b>{experiment.success}</p>
              <p className="v2-mini v2-muted">{tr(lang, "成本/时间", "Cost / time", "Coût / temps", "コスト・時間")}：{experiment.cost}</p>
            </article>
          ))}
        </div>
      </details>

      <details className="v2-card v2-card-pad v2-plan-details" style={{ marginTop: 14 }}>
        <summary>{tr(lang, "证据、缺口与边界", "Evidence, gaps and boundaries", "Preuves, lacunes et limites", "証拠・不足・境界")}</summary>
        <div className="v2-plan-evidence">
          <div>
            <h3>{tr(lang, "访谈给出的", "From the interview", "Issu de l'entretien", "インタビューから")}</h3>
            <ul className="v2-list">{plan.evidence.fromInterview.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div>
            <h3>{tr(lang, "研究台给出的", "From the research desk", "Issu de la recherche", "リサーチから")}</h3>
            <ul className="v2-list">{plan.evidence.fromResearch.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div>
            <h3>{tr(lang, "还不能证明的", "Still unproven", "Encore non prouvé", "まだ証明できていないこと")}</h3>
            <ul className="v2-list">{plan.evidence.gaps.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </div>
        {plan.researchUsed ? (
          <div className="v2-plan-research-use">
            <b>{tr(lang, "本次采用的研究台机会", "Research opportunity used", "Opportunité de recherche utilisée", "採用したリサーチ機会")}</b>
            <p>{plan.researchUsed.productDirection}</p>
            <p className="v2-small v2-muted">{tr(lang, "下一步验证", "Next validation", "Prochaine validation", "次の検証")}：{plan.researchUsed.nextValidation}</p>
          </div>
        ) : null}
      </details>

      {notes.length > 0 ? (
        <section className="v2-card v2-card-pad" style={{ marginTop: 14 }}>
          <h2 style={{ fontSize: 16 }}>{tr(lang, "研究搭子的补充观察", "Notes from the research partner", "Notes du partenaire de recherche", "リサーチ相棒の補足")}</h2>
          <ul className="v2-list">{notes.map((note) => <li key={note}>{note}</li>)}</ul>
        </section>
      ) : null}

      <div className="v2-assess-cols" style={{ marginTop: 14 }}>
        <section className="v2-card v2-card-pad">
          <h2 style={{ fontSize: 16 }}><ShieldAlert size={15} /> {tr(lang, "主要风险", "Main risks", "Risques principaux", "主なリスク")}</h2>
          <ul className="v2-list">{plan.risks.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
        <section className="v2-card v2-card-pad">
          <h2 style={{ fontSize: 16 }}>{tr(lang, "停止条件", "Kill criteria", "Critères d'arrêt", "撤退条件")}</h2>
          <ul className="v2-list">{plan.killCriteria.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      </div>

      <p className="v2-mini v2-muted" style={{ marginTop: 18 }}>{plan.disclosure}</p>
      {brief && matched ? (
        <p className="v2-mini v2-muted">
          {tr(lang, "研究台来源：", "Research source: ", "Source de recherche : ", "リサーチ出典：")}
          {pickLang(lang, brief.decisionQuestionZh, brief.decisionQuestionEn, brief.decisionQuestionEn, brief.decisionQuestionEn)}
        </p>
      ) : null}
    </main>
  );
}
