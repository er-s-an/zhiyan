"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  Map,
  MessageSquare,
  RotateCcw,
  Send,
  SkipForward,
  Sparkles,
} from "lucide-react";
import { useLang } from "../components/LanguageProvider";
import { pickLang } from "../../lib/v2/lang";
import {
  INTERVIEW_STAGES,
  assessFeasibility,
  buildInterviewMarkdown,
  buildInterviewProfile,
  pickList,
  pickText,
  type FeasibilityAssessment,
  type InterviewAnswers,
  type InterviewProfile,
  type InterviewStage,
  type InterviewStageId,
} from "../../lib/v2/interview";
import type { Lang, ResearchPlanV2 } from "../../lib/v2/types";

const STORAGE_KEY = "zhiyan.v2.interview";
const QUESTION_STORAGE_KEY = "zhiyan.v2.interview.questions";
const PREFILL_KEY = "zhiyan.v2.interview.prefill";

interface StoredInterview {
  answers: InterviewAnswers;
  index: number;
  done: boolean;
}

function tr(lang: Lang, zh: string, en: string, fr: string, ja: string): string {
  return pickLang(lang, zh, en, fr, ja);
}

function readStored(): StoredInterview | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredInterview>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      answers: parsed.answers && typeof parsed.answers === "object" ? parsed.answers : {},
      index: typeof parsed.index === "number" && Number.isFinite(parsed.index) ? parsed.index : 0,
      done: parsed.done === true,
    };
  } catch {
    return null;
  }
}

function persist(answers: InterviewAnswers, index: number, done: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, index, done } satisfies StoredInterview));
  } catch {
    // Local storage is optional; the interview still works in memory.
  }
}

function statusLabel(status: "strong" | "partial" | "weak", lang: Lang): string {
  if (status === "strong") return tr(lang, "较强", "Strong", "Solide", "強い");
  if (status === "partial") return tr(lang, "一般", "Partial", "Moyen", "普通");
  return tr(lang, "偏弱", "Weak", "Faible", "弱い");
}

function fitLabel(fit: "fit" | "partial" | "mismatch", lang: Lang): string {
  if (fit === "fit") return tr(lang, "数据适配", "Data fit", "Données adaptées", "データ適合");
  if (fit === "partial") return tr(lang, "部分适配", "Partial fit", "Partiellement adapté", "部分的に適合");
  return tr(lang, "数据不适配", "Data mismatch", "Données inadaptées", "データ不適合");
}

function outputLabel(output: "strong" | "directional" | "hypotheses_only", lang: Lang): string {
  if (output === "strong") return tr(lang, "可给强建议", "Strong advice", "Recommandation forte", "強い提案が可能");
  if (output === "directional") return tr(lang, "可给方向性建议", "Directional advice", "Recommandation directionnelle", "方向性のある提案が可能");
  return tr(lang, "只给假设与下一步", "Hypotheses only", "Hypothèses seulement", "仮説と次の一歩のみ");
}

export default function InterviewPage() {
  const router = useRouter();
  const { lang } = useLang();
  const [ready, setReady] = useState(false);
  const [answers, setAnswers] = useState<InterviewAnswers>({});
  const [questionOverrides, setQuestionOverrides] = useState<Partial<Record<InterviewStageId, string>>>({});
  const [questionPending, setQuestionPending] = useState<InterviewStageId | null>(null);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<"chat" | "result">("chat");
  const [profile, setProfile] = useState<InterviewProfile | null>(null);
  const [assessment, setAssessment] = useState<FeasibilityAssessment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const runIDRef = useRef(0);
  const prefilledRef = useRef<Set<InterviewStageId>>(new Set());
  const [prefill, setPrefill] = useState<InterviewAnswers | null>(null);

  useEffect(() => {
    const stored = readStored();
    if (stored) {
      setAnswers(stored.answers);
      if (stored.done) {
        const nextProfile = buildInterviewProfile(stored.answers, lang);
        setProfile(nextProfile);
        setAssessment(assessFeasibility(nextProfile));
        setPhase("result");
      } else {
        setIndex(Math.min(Math.max(stored.index, 0), INTERVIEW_STAGES.length - 1));
      }
    }
    try {
      const raw = window.localStorage.getItem(QUESTION_STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object") setQuestionOverrides(parsed as Partial<Record<InterviewStageId, string>>);
      }
    } catch {
      // ignore malformed question history
    }
    try {
      const raw = window.localStorage.getItem(PREFILL_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          const answers = (parsed as { answers?: unknown }).answers;
          if (answers && typeof answers === "object") setPrefill(answers as InterviewAnswers);
        }
      }
    } catch {
      // ignore malformed prefill
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(QUESTION_STORAGE_KEY, JSON.stringify(questionOverrides));
    } catch {
      // ignore
    }
  }, [questionOverrides, ready]);

  useEffect(() => {
    if (!ready) return;
    if (phase === "chat" && index === 0 && !questionPending) return;
    const node = logRef.current;
    if (node && typeof node.scrollIntoView === "function") {
      node.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [index, phase, ready, questionPending]);

  useEffect(() => {
    return () => {
      runIDRef.current += 1;
      requestRef.current?.abort();
    };
  }, []);

  const prevLangRef = useRef(lang);
  useEffect(() => {
    if (prevLangRef.current === lang) return;
    prevLangRef.current = lang;
    if (phase !== "chat") return;
    setQuestionOverrides((previous) => {
      const next = { ...previous };
      for (const stage of INTERVIEW_STAGES.slice(index)) delete next[stage.id];
      return next;
    });
  }, [lang, phase, index]);

  useEffect(() => {
    if (!ready || phase !== "chat" || !prefill) return;
    const stage = INTERVIEW_STAGES[Math.min(index, INTERVIEW_STAGES.length - 1)];
    const value = prefill[stage.id];
    if (value && !answers[stage.id] && !prefilledRef.current.has(stage.id) && !draft) {
      prefilledRef.current.add(stage.id);
      setDraft(value);
    }
  }, [ready, phase, index, prefill, answers, draft]);

  const total = INTERVIEW_STAGES.length;
  const currentStage = INTERVIEW_STAGES[Math.min(index, total - 1)];
  const progress = phase === "result" ? 100 : Math.round((index / total) * 100);
  const hasPrefillRemaining = prefill ? INTERVIEW_STAGES.some((stage) => Boolean(prefill[stage.id]) && !answers[stage.id]) : false;
  const progressLabel =
    lang === "zh"
      ? `第 ${Math.min(index + 1, total)} / ${total} 题`
      : lang === "fr"
        ? `Question ${Math.min(index + 1, total)} sur ${total}`
        : lang === "ja"
          ? `質問 ${Math.min(index + 1, total)} / ${total}`
          : lang === "ru"
            ? `Вопрос ${Math.min(index + 1, total)} из ${total}`
            : lang === "ko"
              ? `질문 ${Math.min(index + 1, total)} / ${total}`
              : `Question ${Math.min(index + 1, total)} of ${total}`;

  function finish(nextAnswers: InterviewAnswers): void {
    try {
      window.localStorage.removeItem(PREFILL_KEY);
    } catch {
      // ignore
    }
    const nextProfile = buildInterviewProfile(nextAnswers, lang);
    const nextAssessment = assessFeasibility(nextProfile);
    setProfile(nextProfile);
    setAssessment(nextAssessment);
    setPhase("result");
    persist(nextAnswers, total - 1, true);
    window.dispatchEvent(new Event("zhiyan:interview-state"));
  }

  function advance(nextAnswers: InterviewAnswers, nextIndex: number): void {
    setQuestionPending(null);
    setIndex(nextIndex);
    persist(nextAnswers, nextIndex, false);
    window.setTimeout(() => textareaRef.current?.focus(), 60);
  }

  async function loadNextQuestion(
    stage: InterviewStage,
    value: string,
    nextAnswers: InterviewAnswers,
    nextIndex: number,
  ): Promise<void> {
    const nextStage = INTERVIEW_STAGES[nextIndex];
    if (!nextStage) {
      finish(nextAnswers);
      return;
    }
    const run = runIDRef.current;
    setQuestionPending(nextStage.id);
    let reply = "";
    const controller = new AbortController();
    requestRef.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch("/api/v2/interview/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageId: stage.id,
          answer: value,
          nextStageId: nextStage.id,
          nextQuestion: nextStage.question,
          profile: buildInterviewProfile(nextAnswers, lang),
          language: lang,
        }),
        signal: controller.signal,
      });
      const body: unknown = await response.json().catch(() => null);
      const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
      reply = typeof record?.reply === "string" ? record.reply.trim() : "";
    } catch {
      // The fixed next question is a safe fallback if the local model is slow or unavailable.
    } finally {
      window.clearTimeout(timer);
      if (requestRef.current === controller) requestRef.current = null;
    }
    if (run !== runIDRef.current) return;
    if (reply) setQuestionOverrides((previous) => ({ ...previous, [nextStage.id]: reply }));
    advance(nextAnswers, nextIndex);
  }

  function submit(): void {
    if (questionPending) return;
    const value = draft.trim();
    if (!value && !currentStage.optional) {
      setError(tr(
        lang,
        "先写一句你的回答，或点上面的选项快速填入。",
        "Write an answer first, or pick one of the options above.",
        "Écris d'abord une réponse, ou choisis une option ci-dessus.",
        "まず回答を書くか、上の選択肢を選んでください。",
      ));
      return;
    }
    const nextAnswers: InterviewAnswers = { ...answers, [currentStage.id]: value };
    setAnswers(nextAnswers);
    setDraft("");
    setError("");
    if (index < total - 1) {
      if (value) void loadNextQuestion(currentStage, value, nextAnswers, index + 1);
      else advance(nextAnswers, index + 1);
    } else {
      finish(nextAnswers);
    }
  }

  function skip(): void {
    if (questionPending) return;
    const nextAnswers: InterviewAnswers = { ...answers, [currentStage.id]: "" };
    setAnswers(nextAnswers);
    setDraft("");
    setError("");
    if (index < total - 1) advance(nextAnswers, index + 1);
    else finish(nextAnswers);
  }

  function pickChip(chip: string): void {
    if (questionPending) return;
    setDraft(chip);
    setError("");
    textareaRef.current?.focus();
  }

  function restart(): void {
    runIDRef.current += 1;
    requestRef.current?.abort();
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(QUESTION_STORAGE_KEY);
      window.localStorage.removeItem(PREFILL_KEY);
    } catch {
      // ignore
    }
    setAnswers({});
    setQuestionOverrides({});
    setQuestionPending(null);
    setPrefill(null);
    prefilledRef.current.clear();
    setIndex(0);
    setDraft("");
    setPhase("chat");
    setProfile(null);
    setAssessment(null);
    setError("");
    window.dispatchEvent(new Event("zhiyan:interview-state"));
  }

  async function generatePlan(): Promise<void> {
    if (!profile) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v2/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      const body = (await response.json()) as { plan?: ResearchPlanV2; error?: string };
      if (!response.ok || !body.plan) throw new Error(body.error || "PLAN_FAILED");
      window.localStorage.setItem("zhiyan.v2.plan", JSON.stringify(body.plan));
      window.localStorage.removeItem("zhiyan.v2.study");
      router.push("/design");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : tr(
        lang,
        "生成研究计划失败，请重试。",
        "Failed to create the research plan. Please retry.",
        "La création du plan de recherche a échoué. Réessaie.",
        "リサーチプランの作成に失敗しました。もう一度お試しください。",
      ));
    } finally {
      setBusy(false);
    }
  }

  function downloadMemo(): void {
    if (!profile || !assessment) return;
    const markdown = buildInterviewMarkdown(profile, assessment, lang);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `zhiyan-interview-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  if (!ready) {
    return (
      <div className="v2-loading">
        <span className="v2-spinner" /> {tr(lang, "准备访谈…", "Preparing the interview…", "Préparation de l'entretien…", "インタビューを準備中…")}
      </div>
    );
  }

  if (phase === "result" && profile && assessment) {
    const levelBadge = assessment.level === "promising" ? "v2-badge-fit" : assessment.level === "needs_validation" ? "v2-badge-partial" : "v2-badge-mismatch";
    return (
      <main className="v2-page v2-chat-page v2-interview-result">
        <div className="v2-page-head">
          <p className="v2-kicker">{tr(lang, "访谈完成 · 可行性初判", "Interview complete · first read", "Entretien terminé · première lecture", "インタビュー完了 · 初判断")}</p>
          <h1>{tr(lang, "先别急着做，看看证据站在哪一边。", "Before you build, see where the evidence stands.", "Avant de construire, regarde où se trouvent les preuves.", "作る前に、証拠がどちら側にあるか見てみましょう。")}</h1>
          <p className="v2-lede">
            {tr(
              lang,
              "这是基于你刚才回答的研究初判，不是可行性结论。它只说明现在最该验证什么、下一步怎么花最少的钱。",
              "This is an initial research read from your answers, not a feasibility verdict. It shows what to validate next and the cheapest way to do it.",
              "Ceci est une première lecture issue de tes réponses, pas un verdict de faisabilité. Elle indique quoi valider ensuite et comment le faire au moindre coût.",
              "これは回答にもとづく研究上の初判断であり、実現可能性の結論ではありません。次に何を検証すべきか、最も安価な方法を示します。",
            )}
          </p>
          {profile.age || profile.occupation ? (
            <div className="v2-page-meta">
              <span className="v2-tag">
                {tr(lang, "访谈对象", "Interviewee", "Personne interrogée", "インタビュー対象")}{lang === "zh" ? "：" : ": "}{[profile.age, profile.occupation].filter(Boolean).join(" · ")}
              </span>
            </div>
          ) : null}
        </div>

        <section className="v2-card v2-assess-hero">
          <div className="v2-assess-main">
            <div className="v2-row" style={{ gap: 6 }}>
              <span className={`v2-badge ${levelBadge}`}>{pickText(assessment.levelLabel, lang)}</span>
              <span className="v2-tag">{tr(lang, "研究初判", "Research read", "Première lecture", "初判断")}</span>
            </div>
            <p>{pickText(assessment.summary, lang)}</p>
            <div className="v2-row" style={{ gap: 6 }}>
              <span className="v2-tag v2-tag-line">{fitLabel(assessment.methodFit, lang)}</span>
              <span className="v2-tag v2-tag-line">{outputLabel(assessment.allowedOutput, lang)}</span>
            </div>
          </div>
          <div className="v2-assess-score" aria-label={tr(lang, `初判参考分 ${assessment.score}/100`, `Reference score ${assessment.score}/100`, `Score indicatif ${assessment.score}/100`, `参考スコア ${assessment.score}/100`)}>
            <b>{assessment.score}</b>
            <span>{tr(lang, "初判参考 / 100", "Reference / 100", "Indicatif / 100", "参考 / 100")}</span>
          </div>
        </section>

        <section className="v2-card v2-card-pad v2-assess-key" style={{ marginTop: 14 }}>
          <h2 style={{ fontSize: 16 }}><Sparkles size={15} /> {tr(lang, "必须验证的关键假设", "Key assumptions to validate", "Hypothèses clés à valider", "検証すべき重要な仮説")}</h2>
          <div className="v2-row" style={{ marginTop: 8 }}>
            {pickList(assessment.mustValidate, lang).map((item) => (
              <span className="v2-tag v2-tag-blue" key={item}>{item}</span>
            ))}
          </div>
        </section>

        <section className="v2-card v2-card-pad v2-assess-next" style={{ marginTop: 14 }}>
          <div>
            <h2 style={{ fontSize: 17 }}>{tr(lang, "把这次访谈变成一份可执行的研究计划", "Turn this interview into an actionable research plan", "Transforme cet entretien en plan de recherche actionnable", "このインタビューを実行可能なリサーチプランに変える")}</h2>
            <p className="v2-small v2-muted" style={{ marginTop: 4 }}>
              {tr(
                lang,
                "下一步会带着你的目标市场与用户，生成中文研究计划和方法闸门；确认后再决定是否调用知乎。",
                "The next step turns your market and users into a Chinese research plan and method gate; Zhihu is only called after you confirm.",
                "L'étape suivante transforme ton marché et tes utilisateurs en plan de recherche chinois et en filtre méthodologique ; Zhihu n'est appelé qu'après confirmation.",
                "次のステップでは、ターゲット市場とユーザーをもとに中国語のリサーチプランと方法ゲートを生成します。Zhihuの呼び出しは確認後です。",
              )}
            </p>
          </div>
          <div className="v2-row" style={{ marginTop: 12 }}>
            <button className="v2-btn v2-btn-primary v2-btn-lg" type="button" onClick={() => void generatePlan()} disabled={busy}>
              {busy ? <span className="v2-spinner" /> : <ArrowRight size={15} />}
              {busy ? tr(lang, "正在生成…", "Creating…", "Création…", "作成中…") : tr(lang, "生成研究计划", "Create research plan", "Créer le plan de recherche", "リサーチプランを作成")}
            </button>
            <Link className="v2-btn" href="/action-plan">
              <Map size={14} /> {tr(lang, "先看方案（仅访谈）", "Preview plan (interview only)", "Aperçu du plan (entretien seul)", "プランを見る（インタビューのみ）")}
            </Link>
            <button className="v2-btn" type="button" onClick={downloadMemo}><Download size={14} /> {tr(lang, "导出访谈纪要", "Export memo", "Exporter le compte rendu", "記録をエクスポート")}</button>
            <Link className="v2-btn" href="/workbench?demo=main-case">
              <MessageSquare size={14} /> {tr(lang, "看缓存主案例", "Open the main case", "Voir le cas principal", "メインケースを見る")}
            </Link>
            <button className="v2-btn v2-btn-ghost" type="button" onClick={restart}><RotateCcw size={14} /> {tr(lang, "重新访谈", "Start over", "Recommencer", "やり直す")}</button>
          </div>
          {error ? <p className="v2-error">{error}</p> : null}
        </section>

        <div className="v2-assess-cols">
          <section className="v2-card v2-card-pad">
            <h2 style={{ fontSize: 16 }}><AlertTriangle size={15} /> {tr(lang, "主要风险", "Main risks", "Risques principaux", "主なリスク")}</h2>
            <ul className="v2-list">{pickList(assessment.risks, lang).map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          <section className="v2-card v2-card-pad">
            <h2 style={{ fontSize: 16 }}><CheckCircle2 size={15} /> {tr(lang, "下一步", "Next steps", "Prochaines étapes", "次のステップ")}</h2>
            <ol className="v2-list">{pickList(assessment.nextSteps, lang).map((item) => <li key={item}>{item}</li>)}</ol>
          </section>
        </div>

        <details className="v2-card v2-card-pad v2-assess-dimensions" style={{ marginTop: 14 }}>
          <summary>{tr(lang, "查看八个维度：哪里强、哪里虚", "View the eight dimensions: what is solid, what is thin", "Voir les huit dimensions : forces et faiblesses", "8つの軸を見る：強みと弱み")}</summary>
          <div className="v2-dim-list">
            {assessment.dimensions.map((item) => (
              <div className="v2-dim-row" key={item.id}>
                <div className="v2-dim-head">
                  <span className="v2-dim-label">{pickText(item.label, lang)}</span>
                  <span className={`v2-badge ${item.status === "strong" ? "v2-badge-fit" : item.status === "partial" ? "v2-badge-partial" : "v2-badge-mismatch"}`}>
                    {statusLabel(item.status, lang)}
                  </span>
                </div>
                <p className="v2-small v2-muted">{pickText(item.reason, lang)}</p>
              </div>
            ))}
          </div>
          <div className="v2-method-note">
            <b>{tr(lang, "知乎方法适配：", "Zhihu method fit: ", "Adéquation avec Zhihu : ", "Zhihuとの適合：")}</b>
            {pickList(assessment.methodReasons, lang).map((item) => (
              <p className="v2-small v2-muted" key={item}>{item}</p>
            ))}
          </div>
        </details>

        <details className="v2-card v2-card-pad v2-transcript">
          <summary>{tr(lang, "查看完整访谈记录", "View the full interview", "Voir l'entretien complet", "インタビュー全文を見る")}</summary>
          <div className="v2-chat-log" style={{ marginTop: 12 }}>
            {INTERVIEW_STAGES.map((stage, stageIndex) => {
              const answer = answers[stage.id];
              return (
                <div className="v2-chat-turn" key={stage.id}>
                  <div className="v2-chat-bubble v2-chat-ai">
                    <span className="v2-chat-meta">{stageIndex + 1}/{total}</span>
                    {questionOverrides[stage.id] || pickText(stage.question, lang)}
                  </div>
                  {answer ? <div className="v2-chat-bubble v2-chat-me">{answer}</div> : stage.optional ? <div className="v2-chat-skip">{tr(lang, "已跳过", "Skipped", "Ignoré", "スキップ")}</div> : null}
                </div>
              );
            })}
          </div>
        </details>

        <p className="v2-mini v2-muted" style={{ marginTop: 18 }}>
          {tr(
            lang,
            "访谈回答只保存在这台浏览器；知乎公开讨论适合定性探索，不能证明市场规模或购买率。",
            "Answers stay in this browser. Public Zhihu discussion supports qualitative exploration, not market-size or purchase-rate proof.",
            "Les réponses restent dans ce navigateur. Les discussions publiques Zhihu servent à l'exploration qualitative, pas à prouver la taille du marché ou les taux d'achat.",
            "回答はこのブラウザにのみ保存されます。Zhihuの公開議論は定性的な探索に適しており、市場規模や購入率を証明するものではありません。",
          )}
        </p>
      </main>
    );
  }

  return (
    <main className="v2-page v2-chat-page">
      <div className="v2-page-head">
        <p className="v2-kicker">{tr(lang, "用户访谈 · 约 10 分钟", "User interview · about 10 minutes", "Entretien utilisateur · environ 10 minutes", "ユーザーインタビュー · 約10分")}</p>
        <h1>{tr(lang, "先聊清楚，再决定做不做。", "Talk it through before you decide to build.", "Discutons d'abord, avant de décider de construire.", "まず話を整理してから、作るか決めましょう。")}</h1>
        <p className="v2-lede">
          {tr(
            lang,
            "先从你是谁聊起，再聊你想做的生意：想法、用户、市场、优势和验证情况。最后会给一份可行性初判和下一步建议，并可以接着生成知乎研究计划。",
            "We start with who you are, then your business: idea, users, market, edge and validation. You get a first feasibility read, next steps, and an optional Zhihu research plan.",
            "On commence par qui tu es, puis ton business : idée, utilisateurs, marché, avantage et validation. Tu obtiens une première lecture de faisabilité, des prochaines étapes et un plan de recherche Zhihu optionnel.",
            "まずあなた自身のことから始め、次に事業について話します。アイデア、ユーザー、市場、強み、検証状況を整理し、最後に実現可能性の初判断と次のステップ、任意のZhihuリサーチプランを提示します。",
          )}
        </p>
      </div>

      {hasPrefillRemaining ? (
        <div className="v2-prefill-note">
          {tr(
            lang,
            "已从研究搭子带入 4 个答案；到对应问题会自动填入，可修改后再发送。",
            "Four answers were carried over from the research partner. They will prefill when you reach those questions; edit before sending if needed.",
            "Quatre réponses ont été reprises du partenaire de recherche. Elles seront préremplies aux questions correspondantes ; modifie-les avant d'envoyer.",
            "リサーチ相棒から4つの回答を引き継ぎました。該当の質問で自動入力されるので、必要なら編集して送信してください。",
          )}
        </div>
      ) : null}

      <div className="v2-chat-progress">
        <div className="v2-chat-bar"><span style={{ width: `${progress}%` }} /></div>
        <span>{progressLabel}</span>
      </div>

      <div className="v2-chat-log" ref={logRef}>
        {INTERVIEW_STAGES.slice(0, index + 1).map((stage, stageIndex) => {
          const answer = answers[stage.id];
          const isCurrent = stageIndex === index;
          return (
            <div className="v2-chat-turn" key={stage.id}>
              <div className={`v2-chat-bubble v2-chat-ai${isCurrent ? " is-current" : ""}`}>
                <span className="v2-chat-meta">{stageIndex + 1}/{total}</span>
                <div>{questionOverrides[stage.id] || pickText(stage.question, lang)}</div>
                {isCurrent ? <div className="v2-chat-hint">{pickText(stage.hint, lang)}</div> : null}
              </div>
              {answer ? <div className="v2-chat-bubble v2-chat-me">{answer}</div> : null}
            </div>
          );
        })}
        {questionPending ? (
          <div className="v2-chat-typing">
            <span className="v2-spinner" /> {tr(lang, "访谈员正在组织下一句…", "Interviewer is preparing the next question…", "L'intervieweur prépare la question suivante…", "インタビュアーが次の質問を準備中…")}
          </div>
        ) : null}
      </div>

      <div className="v2-card v2-chat-composer">
        <div className="v2-chat-chips">
          {pickList(currentStage.chips, lang).map((chip) => (
            <button className="v2-chip" type="button" key={chip} onClick={() => pickChip(chip)} disabled={questionPending !== null}>
              {chip}
            </button>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          className="v2-textarea v2-chat-input"
          value={draft}
          disabled={questionPending !== null}
          placeholder={pickText(currentStage.placeholder, lang)}
          onChange={(event) => {
            setDraft(event.target.value);
            if (error) setError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <div className="v2-between v2-chat-actions">
          <span className="v2-hint">
            {questionPending
              ? tr(lang, "访谈员正在根据你的回答组织下一句。", "The interviewer is shaping the next question from your answer.", "L'intervieweur formule la question suivante à partir de ta réponse.", "インタビュアーが回答をもとに次の質問を組み立てています。")
              : currentStage.optional
                ? tr(lang, "这题可以跳过，之后也能补。", "You can skip this one and add it later.", "Tu peux passer cette question et y revenir plus tard.", "この質問はスキップできます。後で補うこともできます。")
                : tr(lang, "Enter 发送，Shift + Enter 换行。", "Enter to send, Shift + Enter for a new line.", "Entrée pour envoyer, Maj + Entrée pour un saut de ligne.", "Enterで送信、Shift + Enterで改行。")}
          </span>
          <div className="v2-row">
            {currentStage.optional ? (
              <button className="v2-btn v2-btn-sm" type="button" onClick={skip} disabled={questionPending !== null}><SkipForward size={13} /> {tr(lang, "跳过", "Skip", "Passer", "スキップ")}</button>
            ) : null}
            <button className="v2-btn v2-btn-primary" type="button" onClick={submit} disabled={questionPending !== null || (!draft.trim() && !currentStage.optional)}>
              <Send size={14} /> {tr(lang, "发送", "Send", "Envoyer", "送信")}
            </button>
          </div>
        </div>
        {error ? <p className="v2-error">{error}</p> : null}
      </div>

      <div className="v2-between" style={{ marginTop: 12 }}>
        <span className="v2-mini v2-muted">
          {tr(lang, "回答只保存在这台浏览器，随时可以重新开始。", "Answers stay in this browser; you can restart anytime.", "Les réponses restent dans ce navigateur ; tu peux recommencer à tout moment.", "回答はこのブラウザにのみ保存され、いつでもやり直せます。")}
        </span>
        <button className="v2-btn v2-btn-ghost v2-btn-sm" type="button" onClick={restart}><RotateCcw size={12} /> {tr(lang, "重新开始", "Restart", "Recommencer", "最初から")}</button>
      </div>

      <p className="v2-mini v2-muted" style={{ marginTop: 18 }}>
        {tr(
          lang,
          "知研台不评价你这个人，只检查证据：用户是否真实存在、问题是否值得解决、下一步是否便宜可逆。",
          "Zhiyan does not judge you — it checks the evidence: are the users real, is the problem worth solving, and is the next step cheap and reversible?",
          "Zhiyan ne te juge pas : elle vérifie les preuves. Les utilisateurs existent-ils vraiment, le problème vaut-il la peine d'être résolu, et la prochaine étape est-elle peu coûteuse et réversible ?",
          "Zhiyanはあなた自身を評価しません。ユーザーが実在するか、問題を解決する価値があるか、次の一歩が安価で可逆かを確認します。",
        )}
      </p>
    </main>
  );
}
