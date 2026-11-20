import type { DecisionBriefV21 } from "./brief";
import type { Lang, StudyV2 } from "./types";

export interface DockOpportunity {
  targetUser: string;
  scenario: string;
  problem: string;
  productDirection: string;
  evidenceStrength: string;
  nextValidation: string;
  evidenceCount: number;
  counterCount: number;
}

export interface DockInterviewSummary {
  idea: string;
  audience: string;
  problem: string;
  score: number;
  level: string;
  risks: string[];
  mustValidate: string[];
}

export interface DockContext {
  kind: "research" | "interview";
  decision: string;
  recommendation: string;
  topOpportunity: DockOpportunity | null;
  validateFirst: string[];
  doNotDo: string[];
  unanswered: string[];
  includedCount: number;
  interview: DockInterviewSummary | null;
}

export interface DockClarifyResult {
  reply: string;
  brief: string;
  actions: string[];
}

const STRENGTH_RANK: Record<string, number> = { strong: 4, medium: 3, weak: 2, insufficient: 1 };

function pick(lang: Lang, zh: string, en: string): string {
  return lang === "zh" ? zh : en;
}

function pickList(lang: Lang, zh: string[], en: string[]): string[] {
  return lang === "zh" ? zh : en;
}

export function buildDockContext(
  brief: DecisionBriefV21 | null,
  study: StudyV2 | null,
  lang: Lang,
  interview?: DockInterviewSummary | null,
): DockContext | null {
  if (!brief && !interview) return null;
  if (!brief && interview) {
    return {
      kind: "interview",
      decision: interview.idea || interview.problem,
      recommendation: "interview_only",
      topOpportunity: null,
      validateFirst: interview.mustValidate,
      doNotDo: [],
      unanswered: interview.risks,
      includedCount: 0,
      interview,
    };
  }
  const visible = brief!.opportunities.filter((item) => !item.hidden);
  const top = visible.slice().sort((left, right) => (STRENGTH_RANK[right.evidenceStrength] ?? 0) - (STRENGTH_RANK[left.evidenceStrength] ?? 0))[0] ?? null;
  return {
    kind: "research",
    decision: pick(lang, brief!.decisionQuestionZh, brief!.decisionQuestionEn),
    recommendation: brief!.recommendation,
    topOpportunity: top
      ? {
          targetUser: pick(lang, top.targetUserZh, top.targetUserEn),
          scenario: pick(lang, top.scenarioZh, top.scenarioEn),
          problem: pick(lang, top.problemZh, top.problemEn),
          productDirection: pick(lang, top.productDirectionZh, top.productDirectionEn),
          evidenceStrength: top.evidenceStrength,
          nextValidation: pick(lang, top.nextValidationZh, top.nextValidationEn),
          evidenceCount: top.evidenceIds.length,
          counterCount: top.counterIds.length,
        }
      : null,
    validateFirst: pickList(lang, brief!.validateFirstZh, brief!.validateFirstEn),
    doNotDo: pickList(lang, brief!.doNotDoZh, brief!.doNotDoEn),
    unanswered: pickList(lang, brief!.unansweredZh, brief!.unansweredEn),
    includedCount: study ? study.sample.filter((item) => item.included).length : 0,
    interview: interview ?? null,
  };
}

export function clarifyQuestions(lang: Lang): string[] {
  if (lang === "ru") {
    return [
      "Что хочешь создать? В одном предложении: кому это помогает и какую проблему решает?",
      "Кому это нужнее всего? Опиши конкретного человека.",
      "Как он справляется сейчас и почему этого недостаточно?",
      "Что тебе сейчас важнее всего проверить и какой результат заставит остановиться?",
    ];
  }
  if (lang === "ko") {
    return [
      "무엇을 만들고 싶나요? 한 문장으로: 누구를 돕고 어떤 문제를 해결하나요?",
      "누가 가장 필요로 하나요? 구체적인 한 사람을 설명해 주세요.",
      "그 사람은 지금 어떻게 대처하고, 왜 그것으로 충분하지 않나요?",
      "지금 가장 확인하고 싶은 것은 무엇이며, 어떤 결과가 나오면 그만둘 건가요?",
    ];
  }
  if (lang === "fr") {
    return [
      "Que veux-tu construire ? En une phrase : à qui cela aide-t-il et quel problème cela résout-il ?",
      "Qui en a le plus besoin ? Décris une personne précise.",
      "Comment fait-il face aujourd'hui, et pourquoi cela ne suffit-il pas ?",
      "Qu'est-ce que tu dois le plus vérifier maintenant, et quel résultat te ferait arrêter ?",
    ];
  }
  if (lang === "ja") {
    return [
      "何を作りたいですか？誰のどんな問題を解決するのか、一文で教えてください。",
      "誰が最も必要としていますか？具体的な一人を思い浮かべてください。",
      "その人は今どうやってしのいでいますか？なぜそれでは足りないのですか？",
      "今いちばん確認したいことは何ですか？どんな結果ならやめますか？",
    ];
  }
  if (lang === "en") {
    return [
      "What do you want to build? In one sentence: who does it help, and what problem does it solve?",
      "Who needs it most? Describe a specific person.",
      "How do they cope today, and why is that not enough?",
      "What do you most need to confirm now, and what result would make you stop?",
    ];
  }
  return [
    "你想做什么？用一句话说清：帮谁、解决什么问题。",
    "谁最需要它？描述一个具体的人。",
    "他们现在怎么凑合解决？为什么不够？",
    "你现在最想确认什么？什么结果会让你停？",
  ];
}

export function buildFallbackClarify(answers: string[], lang: Lang): DockClarifyResult {
  const idea = answers[0]?.trim() || (lang === "zh" ? "一个还没说清的产品想法" : "An idea that is not clear yet");
  const audience = answers[1]?.trim() || (lang === "zh" ? "一小组具体用户" : "A small group of specific users");
  const problem = answers[2]?.trim() || (lang === "zh" ? "一个反复发生的问题" : "A recurring problem");
  const reply = lang === "zh"
    ? `我先帮你收成一个可用的 brief：${idea}。下一步别急着做完整产品，先用访谈和落地页验证。`
    : lang === "fr"
      ? `Je te propose un brief utilisable : ${idea}. Ne construis pas encore le produit complet ; valide d'abord par des entretiens et une page d'atterrissage.`
      : lang === "ja"
        ? `まず使えるブリーフに整理します：${idea}。まだ完全な製品を作らず、インタビューとランディングページで検証してください。`
        : lang === "ru"
          ? `Соберу это в рабочий бриф: ${idea}. Не делай сразу полный продукт — сначала проверь через интервью и лендинг.`
          : lang === "ko"
            ? `쓸 수 있는 브리프로 정리합니다: ${idea}. 아직 완전한 제품을 만들지 말고 인터뷰와 랜딩페이지로 검증하세요.`
            : `Let me turn this into a usable brief: ${idea}. Do not build the full product yet; validate with interviews and a landing page first.`;
  const brief = lang === "zh"
    ? `为「${audience}」解决「${problem}」：${idea}。`
    : lang === "fr"
      ? `Pour « ${audience} », qui rencontrent « ${problem} » : ${idea}.`
      : lang === "ja"
        ? `「${audience}」が「${problem}」に直面している。提案：${idea}。`
        : lang === "ru"
          ? `Для «${audience}», у которых «${problem}»: ${idea}.`
          : lang === "ko"
            ? `「${audience}」가 「${problem}」를 겪고 있습니다. 제안: ${idea}.`
            : `For ${audience} who face "${problem}": ${idea}.`;
  const actions = lang === "zh"
    ? ["找 5 个目标用户访谈，问最近一次发生问题的经过", "做一句话落地页，测点击和留资", "做 3 次价格试探，先收一笔小额定金"]
    : lang === "fr"
      ? ["Interroge cinq utilisateurs cibles sur la dernière fois où le problème est arrivé", "Mets en ligne une page d'atterrissage d'une phrase pour tester les clics et les inscriptions", "Fais trois tests de prix et demande un petit acompte"]
      : lang === "ja"
        ? ["ターゲットユーザー5人に、最近問題が起きたときの経緯を聞く", "一文のランディングページでクリックと登録を測る", "価格テストを3回行い、少額の前払いを求める"]
        : lang === "ru"
          ? ["Проведи 5 интервью с целевыми пользователями о последнем случае проблемы", "Сделай одностраничный лендинг и проверь клики и заявки", "Проведи 3 проверки цены и попроси небольшой аванс"]
          : lang === "ko"
            ? ["타깃 사용자 5명에게 최근 문제가 발생한 경위를 인터뷰하기", "한 줄 랜딩페이지로 클릭과 가입을 측정하기", "가격 테스트를 3번 하고 소액 선금을 받아보기"]
            : ["Interview five target users about the last time the problem happened", "Ship a one-line landing page to test clicks and sign-ups", "Run three price probes and ask for a small deposit"];
  return { reply, brief, actions };
}

export function buildFallbackAnswer(question: string, context: DockContext | null, lang: Lang): string {
  if (!question.trim()) {
    return lang === "zh" ? "你可以直接问：这条证据说明什么？下一步该验证什么？" : "Ask me: what does this evidence mean, or what should I validate next?";
  }
  if (!context) {
    return lang === "zh"
      ? "现在还没有研究上下文。先点「做一次完整访谈」，或在首页生成研究计划；有了研究后，我才能基于证据回答，而不是凭空猜。"
      : lang === "fr"
        ? "Il n'y a pas encore de contexte de recherche. Lance d'abord un entretien complet ou génère un plan de recherche ; ensuite je pourrai répondre à partir des preuves."
        : lang === "ja"
          ? "まだリサーチの文脈がありません。まず完全版インタビューを行うか、リサーチプランを生成してください。それから証拠にもとづいて回答できます。"
          : "There is no research context yet. Start the full interview or generate a research plan first; then I can answer from evidence instead of guessing.";
  }
  if (context.kind === "interview") {
    const first = context.validateFirst[0] || context.interview?.mustValidate[0] || "";
    const second = context.validateFirst[1] || context.interview?.mustValidate[1] || "";
    const score = context.interview?.score ?? 0;
    const level = context.interview?.level || "";
    return lang === "zh"
      ? `现在还没有研究证据，只有访谈初判（${score}/100，${level}）。先做这三件事：\n1. ${first}\n2. ${second}\n3. 先完成一次研究，再谈“值得做/不值得做”的强结论。\n\n研究完成后，我可以基于证据继续回答。`
      : lang === "fr"
        ? `Il n'y a pas encore de preuves de recherche, seulement la lecture de l'entretien (${score}/100, ${level}). Fais d'abord trois choses :\n1. ${first}\n2. ${second}\n3. Termine une recherche avant de conclure fermement « à faire / à ne pas faire ».\n\nUne fois la recherche terminée, je pourrai répondre à partir des preuves.`
        : lang === "ja"
          ? `まだリサーチ証拠はなく、インタビュー初判断（${score}/100、${level}）だけがあります。まず次の3つを：\n1. ${first}\n2. ${second}\n3. 強い「やる／やらない」の結論を出す前に、リサーチを完了してください。\n\nリサーチ後は証拠にもとづいて回答できます。`
          : `There is no research evidence yet, only the interview read (${score}/100, ${level}). Do three things first:\n1. ${first}\n2. ${second}\n3. Complete a research pass before making a strong "build / do not build" call.\n\nOnce the research is done, I can answer from evidence.`;
  }
  const next = context.topOpportunity?.nextValidation || context.validateFirst[0] || (lang === "zh" ? "先做 5 次目标用户访谈" : "Run five target-user interviews first");
  const evidence = context.topOpportunity
    ? `${context.topOpportunity.evidenceStrength} (${context.topOpportunity.evidenceCount} evidence / ${context.topOpportunity.counterCount} counter)`
    : (lang === "zh" ? "暂无机会假设" : "no opportunity hypothesis yet");
  return lang === "zh"
    ? `基于当前研究，我建议先做这三件事：\n1. ${next}\n2. 把结论收窄到「${context.topOpportunity?.targetUser || context.decision}」这一小群。\n3. 不要现在做：${context.doNotDo[0] || "完整产品"}。\n\n当前证据强度：${evidence}。`
    : lang === "fr"
      ? `D'après la recherche actuelle, fais d'abord trois choses :\n1. ${next}\n2. Restreins la conclusion à « ${context.topOpportunity?.targetUser || context.decision} ».\n3. Ne fais pas encore : ${context.doNotDo[0] || "le produit complet"}.\n\nForce des preuves : ${evidence}.`
      : lang === "ja"
        ? `現在のリサーチから、まず次の3つをおすすめします：\n1. ${next}\n2. 結論は「${context.topOpportunity?.targetUser || context.decision}」に絞る。\n3. 今はやらない：${context.doNotDo[0] || "完全な製品"}。\n\n証拠の強さ：${evidence}。`
        : `Based on the current research, do three things first:\n1. ${next}\n2. Narrow the conclusion to "${context.topOpportunity?.targetUser || context.decision}".\n3. Do not build yet: ${context.doNotDo[0] || "the full product"}.\n\nEvidence strength: ${evidence}.`;
}

const LANGUAGE_NAME: Record<Lang, string> = {
  zh: "Simplified Chinese",
  en: "English",
  fr: "French",
  ja: "Japanese",
  ru: "Russian",
  ko: "Korean",
};

export function buildClarifyPrompt(answers: string[], lang: Lang): string {
  return [
    "You are a pragmatic product research partner. Turn four short answers into a usable project brief.",
    `Write every string in ${LANGUAGE_NAME[lang]}.`,
    lang === "ru"
      ? "Output only Russian; do not copy Chinese characters except proper names."
      : lang === "ko"
        ? "Output only Korean; do not copy Chinese characters except proper names."
        : lang === "ja"
          ? "Output only Japanese; do not copy Chinese characters except proper names. Translate every Chinese phrase into natural Japanese."
          : "Translate any Chinese source into the output language.",
    "Do not invent market size, purchase rates or user quotes. Treat unclear points as hypotheses.",
    "Return ONLY a JSON object with keys: reply (2 sentences, natural, in the user's language), brief (one sentence: for whom / what problem / what solution), actions (exactly 3 concrete next actions, each one line).",
    "",
    "Answers:",
    `1. ${answers[0] || ""}`,
    `2. ${answers[1] || ""}`,
    `3. ${answers[2] || ""}`,
    `4. ${answers[3] || ""}`,
  ].join("\n");
}

export function buildAskPrompt(question: string, context: DockContext | null, lang: Lang, intent: "answer" | "outline" = "answer"): string {
  const contextText = context
    ? [
        `Context type: ${context.kind} (${context.kind === "research" ? "research evidence" : "interview-only, no research yet"})`,
        `Decision: ${context.decision}`,
        `Recommendation: ${context.recommendation}`,
        context.topOpportunity ? `Top opportunity: ${context.topOpportunity.targetUser} / ${context.topOpportunity.scenario}` : "Top opportunity: none",
        context.topOpportunity ? `Product direction: ${context.topOpportunity.productDirection}` : "",
        context.topOpportunity ? `Evidence strength: ${context.topOpportunity.evidenceStrength} (${context.topOpportunity.evidenceCount} evidence / ${context.topOpportunity.counterCount} counter)` : "",
        context.topOpportunity ? `Next validation: ${context.topOpportunity.nextValidation}` : "",
        context.interview ? `Interview read: ${context.interview.score}/100, ${context.interview.level}` : "",
        context.interview ? `Interview idea: ${context.interview.idea}` : "",
        context.interview ? `Interview target: ${context.interview.audience}` : "",
        context.interview ? `Interview risks: ${context.interview.risks.join("; ")}` : "",
        context.interview ? `Interview must-validate: ${context.interview.mustValidate.join("; ")}` : "",
        `Validate first: ${context.validateFirst.join("; ")}`,
        `Do not do: ${context.doNotDo.join("; ")}`,
        `Unanswered: ${context.unanswered.join("; ")}`,
        `Included samples: ${context.includedCount}`,
      ].filter(Boolean).join("\n")
    : "(No research context yet.)";
  const instruction = intent === "outline"
    ? "Write exactly 5 interview questions. For each question, add one short line explaining what it validates. Do not add other advice. Keep the whole answer under 350 words."
    : "Answer in at most 3 short bullets. Be concrete and actionable. If the context is interview-only, say clearly that there is no research evidence yet.";
  return [
    "You are a pragmatic product research partner sitting beside the user's research desk.",
    `Answer in ${LANGUAGE_NAME[lang]}.`,
    lang === "ru"
      ? "Write only in Russian; do not output Chinese characters except proper names."
      : lang === "ko"
        ? "Write only in Korean; do not output Chinese characters except proper names."
        : lang === "ja"
          ? "Write only in Japanese; do not output Chinese characters except proper names. Translate every Chinese phrase into natural Japanese."
          : "Translate any Chinese context into the output language.",
    "Use only the research context below. If it does not cover the question, say what is missing and what to validate next. Do not invent evidence, quotes, market size or purchase rates.",
    instruction,
    "",
    "Research context:",
    contextText,
    "",
    `User question: ${question}`,
  ].join("\n");
}
