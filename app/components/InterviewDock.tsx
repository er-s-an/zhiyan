"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, Compass, Lightbulb, MessageSquare, RefreshCw, Send, X } from "lucide-react";
import { useLang } from "./LanguageProvider";
import { pickLang } from "../../lib/v2/lang";
import {
  buildDockContext,
  buildFallbackAnswer,
  buildFallbackClarify,
  clarifyQuestions,
  type DockClarifyResult,
  type DockContext,
  type DockInterviewSummary,
} from "../../lib/v2/dock";
import { assessFeasibility, buildInterviewProfile, pickList, pickText } from "../../lib/v2/interview";
import type { DecisionBriefV21 } from "../../lib/v2/brief";
import type { Lang, ResearchPlanV2, StudyV2 } from "../../lib/v2/types";

type Mode = "home" | "clarify" | "chat" | "result";

interface DockMessage {
  role: "assistant" | "user";
  text: string;
}

interface StoredInterview {
  answers?: Record<string, string>;
  done?: boolean;
}

interface StoredDock {
  mode: Mode;
  messages: DockMessage[];
  clarifyStep: number;
  clarifyAnswers: string[];
  clarifyResult: DockClarifyResult | null;
  updatedAt?: string;
}

interface SavedNote {
  text: string;
  at: string;
}

const DOCK_STORAGE_KEY = "zhiyan.v2.dock";
const PREFILL_KEY = "zhiyan.v2.interview.prefill";
const NOTES_KEY = "zhiyan.v2.actionPlanNotes";

function readInterviewSummary(lang: Lang): DockInterviewSummary | null {
  const stored = readJson<StoredInterview>("zhiyan.v2.interview");
  if (!stored?.done || !stored.answers) return null;
  const profile = buildInterviewProfile(stored.answers, lang);
  const assessment = assessFeasibility(profile);
  return {
    idea: profile.idea,
    audience: profile.audience,
    problem: profile.problem,
    score: assessment.score,
    level: pickText(assessment.levelLabel, lang),
    risks: pickList(assessment.risks, lang).slice(0, 3),
    mustValidate: pickList(assessment.mustValidate, lang).slice(0, 3),
  };
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

export function InterviewDock() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("home");
  const [messages, setMessages] = useState<DockMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [planBusy, setPlanBusy] = useState(false);
  const [error, setError] = useState("");
  const [clarifyStep, setClarifyStep] = useState(0);
  const [clarifyAnswers, setClarifyAnswers] = useState<string[]>([]);
  const [clarifyResult, setClarifyResult] = useState<DockClarifyResult | null>(null);
  const [context, setContext] = useState<DockContext | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  function refreshContext(): void {
    const brief = readJson<DecisionBriefV21>("zhiyan.v21.brief");
    const study = readJson<StudyV2>("zhiyan.v2.study");
    setContext(buildDockContext(brief, study, lang, readInterviewSummary(lang)));
  }

  useEffect(() => {
    const stored = readJson<StoredDock>(DOCK_STORAGE_KEY);
    if (stored) {
      if (stored.mode === "clarify" || stored.mode === "chat" || stored.mode === "result" || stored.mode === "home") setMode(stored.mode);
      if (Array.isArray(stored.messages)) {
        setMessages(stored.messages.filter((item): item is DockMessage => Boolean(item && (item.role === "assistant" || item.role === "user") && typeof item.text === "string")));
      }
      if (typeof stored.clarifyStep === "number") setClarifyStep(stored.clarifyStep);
      if (Array.isArray(stored.clarifyAnswers)) setClarifyAnswers(stored.clarifyAnswers.filter((item): item is string => typeof item === "string"));
      if (stored.clarifyResult) setClarifyResult(stored.clarifyResult);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      if (mode === "home" && messages.length === 0 && !clarifyResult && clarifyAnswers.length === 0) {
        window.localStorage.removeItem(DOCK_STORAGE_KEY);
      } else {
        window.localStorage.setItem(
          DOCK_STORAGE_KEY,
          JSON.stringify({ mode, messages, clarifyStep, clarifyAnswers, clarifyResult, updatedAt: new Date().toISOString() } satisfies StoredDock),
        );
      }
    } catch {
      // ignore storage errors
    }
  }, [loaded, mode, messages, clarifyStep, clarifyAnswers, clarifyResult]);

  useEffect(() => {
    if (open) refreshContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lang, pathname]);

  useEffect(() => {
    const node = bodyRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, busy, mode, clarifyResult]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (pathname.startsWith("/interview")) return null;

  const questions = clarifyQuestions(lang);
  const contextLabel = context
    ? context.kind === "research"
      ? tr(lang, "当前研究", "Current research", "Recherche actuelle", "現在のリサーチ")
      : tr(lang, "访谈初判", "Interview read", "Lecture de l'entretien", "インタビュー初判断")
    : tr(lang, "还没有研究上下文", "No research context yet", "Pas encore de contexte", "リサーチ文脈なし");
  const contextText = context?.decision || tr(lang, "先做一次完整访谈，或从首页生成研究计划。", "Start the full interview or create a research plan from the home page.", "Lance un entretien complet ou crée un plan de recherche depuis l'accueil.", "まず完全版インタビューを行うか、ホームでリサーチプランを作成してください。");

  function toggle(): void {
    setOpen((value) => !value);
  }

  function reset(): void {
    try {
      window.localStorage.removeItem(DOCK_STORAGE_KEY);
    } catch {
      // ignore
    }
    setMode("home");
    setMessages([]);
    setDraft("");
    setBusy(false);
    setPlanBusy(false);
    setError("");
    setCopied(false);
    setNoteSaved(false);
    setClarifyStep(0);
    setClarifyAnswers([]);
    setClarifyResult(null);
    refreshContext();
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }

  function startClarify(): void {
    setMode("clarify");
    setClarifyStep(0);
    setClarifyAnswers([]);
    setClarifyResult(null);
    setMessages([{ role: "assistant", text: questions[0] }]);
    setDraft("");
    setError("");
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }

  function startFullInterview(): void {
    if (clarifyAnswers.length >= 4) {
      const prefill = {
        answers: {
          idea: clarifyAnswers[0] ?? "",
          audience: clarifyAnswers[1] ?? "",
          problem: clarifyAnswers[2] ?? "",
          decision: clarifyAnswers[3] ?? "",
        },
        source: "dock",
        createdAt: new Date().toISOString(),
      };
      try {
        window.localStorage.setItem(PREFILL_KEY, JSON.stringify(prefill));
      } catch {
        // ignore
      }
    }
    setOpen(false);
    router.push("/interview");
  }

  function openContext(): void {
    if (!context) return;
    setOpen(false);
    router.push(context.kind === "research" ? "/workbench" : "/interview");
  }

  async function copyBrief(): Promise<void> {
    if (!clarifyResult) return;
    try {
      await navigator.clipboard.writeText(clarifyResult.brief);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard may be unavailable
    }
  }

  function saveNote(text: string): void {
    if (!text.trim()) return;
    const notes = readJson<SavedNote[]>(NOTES_KEY) ?? [];
    if (!notes.some((note) => note.text === text)) {
      notes.unshift({ text, at: new Date().toISOString() });
      try {
        window.localStorage.setItem(NOTES_KEY, JSON.stringify(notes.slice(0, 20)));
      } catch {
        // ignore
      }
    }
    setNoteSaved(true);
    window.setTimeout(() => setNoteSaved(false), 1600);
  }

  function submit(): void {
    const value = draft.trim();
    if (!value || busy) return;
    if (mode === "clarify") {
      const answers = [...clarifyAnswers, value];
      setClarifyAnswers(answers);
      setMessages((previous) => [...previous, { role: "user", text: value }]);
      setDraft("");
      if (clarifyStep < questions.length - 1) {
        const next = clarifyStep + 1;
        setClarifyStep(next);
        setMessages((previous) => [...previous, { role: "assistant", text: questions[next] }]);
      } else {
        void runClarify(answers);
      }
      return;
    }
    void ask(value);
  }

  async function runClarify(answers: string[]): Promise<void> {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v2/dock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "clarify", language: lang, answers }),
      });
      const body = (await response.json().catch(() => null)) as { result?: DockClarifyResult; source?: string } | null;
      const result = body?.result ?? buildFallbackClarify(answers, lang);
      setClarifyResult(result);
      setMessages((previous) => [...previous, { role: "assistant", text: result.reply }]);
      setMode("result");
    } catch {
      const result = buildFallbackClarify(answers, lang);
      setClarifyResult(result);
      setMessages((previous) => [...previous, { role: "assistant", text: result.reply }]);
      setMode("result");
      setError(tr(lang, "这次没连上本地模型，先给你规则版 brief。", "Couldn't reach the local model; here is a rules-based brief.", "Le modèle local n'a pas répondu ; voici un brief basé sur des règles.", "ローカルモデルに接続できなかったため、ルール版ブリーフを表示します。"));
    } finally {
      setBusy(false);
    }
  }

  async function ask(question: string, intent: "answer" | "outline" = "answer", display?: string): Promise<void> {
    const value = question.trim();
    if (!value || busy) return;
    const freshBrief = readJson<DecisionBriefV21>("zhiyan.v21.brief");
    const freshStudy = readJson<StudyV2>("zhiyan.v2.study");
    const freshContext = buildDockContext(freshBrief, freshStudy, lang, readInterviewSummary(lang));
    setContext(freshContext);
    setMode("chat");
    setMessages((previous) => [...previous, { role: "user", text: (display?.trim() || value) }]);
    setDraft("");
    setBusy(true);
    setError("");
    setNoteSaved(false);
    try {
      const response = await fetch("/api/v2/dock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "ask", language: lang, question: value, context: freshContext, intent }),
      });
      const body = (await response.json().catch(() => null)) as { reply?: string; source?: string } | null;
      const reply = body?.reply?.trim() || buildFallbackAnswer(value, freshContext, lang);
      setMessages((previous) => [...previous, { role: "assistant", text: reply }]);
    } catch {
      setMessages((previous) => [...previous, { role: "assistant", text: buildFallbackAnswer(value, freshContext, lang) }]);
      setError(tr(lang, "这次没连上本地模型，先给你规则版建议。", "Couldn't reach the local model; here are rules-based suggestions.", "Le modèle local n'a pas répondu ; voici des suggestions basées sur des règles.", "ローカルモデルに接続できなかったため、ルール版の提案を表示します。"));
    } finally {
      setBusy(false);
    }
  }

  async function createPlan(): Promise<void> {
    if (!clarifyResult || planBusy) return;
    setPlanBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v2/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: clarifyResult.brief, language: lang }),
      });
      const body = (await response.json().catch(() => null)) as { plan?: ResearchPlanV2; error?: string } | null;
      if (!response.ok || !body?.plan) throw new Error(body?.error || "PLAN_FAILED");
      window.localStorage.setItem("zhiyan.v2.plan", JSON.stringify(body.plan));
      window.localStorage.removeItem("zhiyan.v2.study");
      setOpen(false);
      router.push("/design");
    } catch {
      setError(tr(lang, "研究计划没生成成功，可以再试一次。", "The research plan didn't generate. Try again.", "Le plan de recherche n'a pas été généré. Réessaie.", "リサーチプランの生成に失敗しました。もう一度お試しください。"));
    } finally {
      setPlanBusy(false);
    }
  }

  const label = tr(lang, "研究搭子", "Research partner", "Partenaire de recherche", "リサーチ相棒");
  const subtitle = tr(lang, "随时聊，基于你的访谈和研究", "Chat anytime, grounded in your interview and research", "Discute à tout moment, à partir de ton entretien et de ta recherche", "インタビューとリサーチにもとづいて、いつでも話せます");
  const placeholder =
    mode === "clarify"
      ? tr(lang, "输入你的回答…", "Type your answer…", "Écris ta réponse…", "回答を入力…")
      : mode === "result"
        ? tr(lang, "继续问这个 brief 的问题…", "Ask about this brief…", "Pose une question sur ce brief…", "このブリーフについて聞く…")
        : mode === "chat"
          ? tr(lang, "继续问：下一步该验证什么？", "Ask: what should I validate next?", "Demande : que valider ensuite ?", "次に何を検証すべき？")
          : tr(lang, "也可以直接问：这条证据说明什么？", "Ask anything: what does this evidence mean?", "Pose une question : que signifie cette preuve ?", "何でも聞いてください：この証拠は何を意味しますか？");
  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const clarifyProgress =
    lang === "zh"
      ? `第 ${clarifyStep + 1} / 4 问`
      : lang === "fr"
        ? `Question ${clarifyStep + 1} sur 4`
        : lang === "ja"
          ? `質問 ${clarifyStep + 1} / 4`
          : lang === "ru"
            ? `Вопрос ${clarifyStep + 1} из 4`
            : lang === "ko"
              ? `질문 ${clarifyStep + 1} / 4`
              : `Question ${clarifyStep + 1} of 4`;
  const nextActionLabel = context?.kind === "research"
    ? tr(lang, "基于当前研究，下一步做什么", "What should I do next?", "Que faire ensuite ?", "次に何をすべき？")
    : context?.kind === "interview"
      ? tr(lang, "基于访谈初判，下一步做什么", "Based on the interview read, what next?", "D'après la lecture de l'entretien, que faire ?", "インタビュー初判断から次に何を？")
      : tr(lang, "先做访谈或研究，再问下一步", "Start with an interview or research", "Commence par un entretien ou une recherche", "まずインタビューかリサーチを");
  const nextActionDesc = context?.kind === "research"
    ? tr(lang, "引用当前研究的机会假设和证据", "Use the current opportunity and evidence", "Utiliser l'opportunité et les preuves actuelles", "現在の機会仮説と証拠を使う")
    : context?.kind === "interview"
      ? tr(lang, "基于访谈初判，不编研究证据", "Grounded in the interview read, no invented research", "À partir de l'entretien, sans inventer de recherche", "インタビュー初判断にもとづき、証拠を捏造しない")
      : tr(lang, "先建立上下文，再给建议", "Build context first, then advise", "D'abord le contexte, ensuite les conseils", "まず文脈を作ってから提案");
  const nextActionQuestion = context?.kind === "research"
    ? tr(lang, "基于当前研究，我下一步该做什么？", "Based on the current research, what should I do next?", "D'après la recherche actuelle, que faire ensuite ?", "現在のリサーチから、次に何をすべきですか？")
    : context?.kind === "interview"
      ? tr(lang, "基于访谈初判，我下一步该做什么？", "Based on the interview read, what should I do next?", "D'après la lecture de l'entretien, que faire ensuite ?", "インタビュー初判断から、次に何をすべきですか？")
      : tr(lang, "我还没有研究上下文，下一步该做什么？", "I have no research context yet — what should I do next?", "Je n'ai pas encore de contexte — que faire ensuite ?", "まだリサーチ文脈がありません。次に何をすべきですか？");

  return (
    <>
      {!open ? (
        <button className="v2-dock-launcher" type="button" onClick={toggle} aria-expanded={open} aria-controls="zhiyan-interview-dock">
          <MessageSquare size={15} />
          <span>{label}</span>
        </button>
      ) : null}
      {open ? (
        <aside id="zhiyan-interview-dock" className="v2-dock" aria-label={label}>
          <header className="v2-dock-head">
            <div className="v2-dock-title">
              <MessageSquare size={15} />
              <b>{label}</b>
              <span>{subtitle}</span>
            </div>
            <div className="v2-dock-head-actions">
              {mode !== "home" ? (
                <button className="v2-dock-close" type="button" onClick={reset} aria-label={tr(lang, "新对话", "New chat", "Nouvelle conversation", "新しい会話")}>
                  <RefreshCw size={15} />
                </button>
              ) : null}
              <button className="v2-dock-close" type="button" onClick={() => setOpen(false)} aria-label={tr(lang, "关闭", "Close", "Fermer", "閉じる")}>
                <X size={16} />
              </button>
            </div>
          </header>

          <button className={`v2-dock-context${context ? " is-link" : ""}`} type="button" onClick={openContext} disabled={!context}>
            <span className="v2-dock-context-label">{contextLabel}</span>
            <span className="v2-dock-context-text">{contextText}</span>
            {context ? <ArrowUpRight size={13} /> : null}
          </button>

          <div className="v2-dock-body" ref={bodyRef}>
            {mode === "home" ? (
              <div className="v2-dock-home">
                <p className="v2-dock-lead">
                  {tr(
                    lang,
                    "我不替你写报告，只帮你想清楚下一步。",
                    "I won't write the report for you — I'll help you decide the next step.",
                    "Je n'écris pas le rapport à ta place : je t'aide à décider la prochaine étape.",
                    "レポートを代わりに書くのではなく、次の一歩を整理します。",
                  )}
                </p>
                <div className="v2-dock-actions">
                  <button className="v2-dock-action" type="button" onClick={startClarify}>
                    <Lightbulb size={17} />
                    <span>
                      <b>{tr(lang, "帮我理清一个想法", "Clarify an idea", "Clarifier une idée", "アイデアを整理する")}</b>
                      <small>{tr(lang, "4 个问题，收成一句 brief", "4 questions, one usable brief", "4 questions, un brief utilisable", "4つの質問でブリーフに")}</small>
                    </span>
                  </button>
                  <button className="v2-dock-action" type="button" onClick={() => void ask(nextActionQuestion)}>
                    <Compass size={17} />
                    <span>
                      <b>{nextActionLabel}</b>
                      <small>{nextActionDesc}</small>
                    </span>
                  </button>
                  <button className="v2-dock-action" type="button" onClick={startFullInterview}>
                    <MessageSquare size={17} />
                    <span>
                      <b>{tr(lang, "做一次完整访谈", "Start the full interview", "Lancer l'entretien complet", "完全版インタビューを始める")}</b>
                      <small>{tr(lang, "11 个问题，生成初判和方案", "11 questions, feasibility read and plan", "11 questions, lecture de faisabilité et plan", "11の質問で初判断とプラン")}</small>
                    </span>
                  </button>
                </div>
              </div>
            ) : null}

            {mode === "clarify" ? (
              <div className="v2-dock-progress">{clarifyProgress}</div>
            ) : null}

            {messages.map((message, index) => (
              <div className={`v2-dock-msg is-${message.role}`} key={`${message.role}-${index}`}>
                <div>{message.text}</div>
              </div>
            ))}

            {busy ? (
              <div className="v2-dock-msg is-assistant is-typing">
                <span className="v2-spinner" /> {tr(lang, "正在想…", "Thinking…", "Je réfléchis…", "考え中…")}
              </div>
            ) : null}

            {mode === "chat" && !busy && lastAssistant ? (
              <div className="v2-dock-answer-actions">
                <button
                  type="button"
                  onClick={() => void ask(
                    tr(
                      lang,
                      "基于当前研究，帮我写 5 个访谈问题，每个问题后说明想验证什么；不要问“你会不会用”。",
                      "Based on the current research, write 5 interview questions. For each, say what it validates; do not ask “would you use this?”.",
                      "À partir de la recherche actuelle, écris 5 questions d'entretien. Pour chacune, indique ce qu'elle valide ; ne demande pas « l'utiliserais-tu ? ».",
                      "現在のリサーチから、インタビュー質問を5つ作ってください。各質問が何を検証するかも書いてください。「使いますか？」とは聞かないでください。",
                    ),
                    "outline",
                    tr(lang, "帮我写 5 个访谈问题", "Write 5 interview questions", "Écris 5 questions d'entretien", "インタビュー質問を5つ作る"),
                  )}
                >
                  {tr(lang, "生成访谈提纲", "Interview outline", "Guide d'entretien", "インタビュー質問")}
                </button>
                {context?.kind === "research" ? (
                  <button type="button" onClick={() => { setOpen(false); router.push("/workbench?view=evidence"); }}>
                    {tr(lang, "查看证据", "View evidence", "Voir les preuves", "証拠を見る")}
                  </button>
                ) : null}
                <button type="button" onClick={() => saveNote(lastAssistant.text)}>
                  {noteSaved ? tr(lang, "已加入方案", "Added to plan", "Ajouté au plan", "プランに追加済み") : tr(lang, "加入方案", "Add to plan", "Ajouter au plan", "プランに追加")}
                </button>
              </div>
            ) : null}

            {mode === "result" && clarifyResult ? (
              <div className="v2-dock-result">
                <span className="v2-tag v2-tag-blue">{tr(lang, "一句话 brief（可编辑）", "One-line brief (editable)", "Brief en une phrase (modifiable)", "一文ブリーフ（編集可）")}</span>
                <textarea
                  className="v2-dock-brief-input"
                  value={clarifyResult.brief}
                  rows={2}
                  onChange={(event) => setClarifyResult({ ...clarifyResult, brief: event.target.value })}
                />
                <h4>{tr(lang, "下一步", "Next actions", "Prochaines étapes", "次のステップ")}</h4>
                <ol>
                  {clarifyResult.actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ol>
                <div className="v2-dock-result-actions">
                  <button className="v2-btn v2-btn-primary v2-btn-sm" type="button" onClick={() => void createPlan()} disabled={planBusy}>
                    {planBusy ? <span className="v2-spinner" /> : null}
                    {tr(lang, "生成研究计划", "Create research plan", "Créer le plan de recherche", "リサーチプランを作成")}
                  </button>
                  <button className="v2-btn v2-btn-sm" type="button" onClick={startFullInterview}>{tr(lang, "做完整访谈", "Start full interview", "Lancer l'entretien complet", "完全版インタビュー")}</button>
                  <button className="v2-btn v2-btn-ghost v2-btn-sm" type="button" onClick={() => void copyBrief()}>{copied ? tr(lang, "已复制", "Copied", "Copié", "コピー済み") : tr(lang, "复制 brief", "Copy brief", "Copier le brief", "ブリーフをコピー")}</button>
                  <button className="v2-btn v2-btn-ghost v2-btn-sm" type="button" onClick={() => inputRef.current?.focus()}>{tr(lang, "继续聊", "Keep chatting", "Continuer", "続ける")}</button>
                </div>
              </div>
            ) : null}

            {mode === "chat" && !context && !busy ? (
              <div className="v2-dock-inline-cta">
                <button className="v2-btn v2-btn-sm" type="button" onClick={startFullInterview}>
                  <MessageSquare size={13} /> {tr(lang, "还没有研究上下文，先做一次完整访谈", "No research context yet — start the full interview", "Pas encore de contexte — lance l'entretien complet", "リサーチ文脈がないため、まず完全版インタビュー")}
                </button>
              </div>
            ) : null}

            {error ? <p className="v2-dock-error">{error}</p> : null}
          </div>

          <div className="v2-dock-composer">
            <textarea
              ref={inputRef}
              className="v2-dock-input"
              value={draft}
              placeholder={placeholder}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  submit();
                }
              }}
              disabled={busy}
            />
            <button className="v2-dock-send" type="button" onClick={submit} disabled={busy || !draft.trim()} aria-label={tr(lang, "发送", "Send", "Envoyer", "送信")}>
              <Send size={15} />
            </button>
          </div>
          <p className="v2-dock-foot">
            {tr(lang, "只基于你的访谈和研究证据，不编数据。", "Grounded only in your interview and research evidence. No invented data.", "Uniquement à partir de ton entretien et des preuves de recherche. Aucune donnée inventée.", "インタビューとリサーチの証拠のみ。データの捏造はしません。")}
          </p>
        </aside>
      ) : null}
    </>
  );
}
