import { evaluateMethodGate } from "./plan";
import { pickLang } from "./lang";
import type { FitLevel, Lang, OutputLevel } from "./types";

export type InterviewStageId =
  | "age"
  | "occupation"
  | "idea"
  | "audience"
  | "problem"
  | "market"
  | "edge"
  | "model"
  | "evidence"
  | "decision"
  | "constraints";

export type InterviewAnswers = Partial<Record<InterviewStageId, string>>;

export type LocalizedText = Record<Lang, string>;
export type LocalizedList = Record<Lang, string[]>;

export interface InterviewStage {
  id: InterviewStageId;
  question: LocalizedText;
  hint: LocalizedText;
  placeholder: LocalizedText;
  chips: LocalizedList;
  optional?: boolean;
}

export interface InterviewProfile {
  age: string;
  occupation: string;
  idea: string;
  audience: string;
  problem: string;
  market: string;
  edge: string;
  model: string;
  evidence: string;
  decision: string;
  constraints: string;
  language: Lang;
  capturedAt: string;
}

export type FeasibilityLevel = "promising" | "needs_validation" | "risky" | "unclear";

export type FeasibilityDimId =
  | "idea"
  | "audience"
  | "problem"
  | "market"
  | "edge"
  | "model"
  | "evidence"
  | "decision";

export interface FeasibilityDimension {
  id: FeasibilityDimId;
  label: LocalizedText;
  status: "strong" | "partial" | "weak";
  score: 0 | 1 | 2;
  reason: LocalizedText;
}

export interface FeasibilityAssessment {
  level: FeasibilityLevel;
  levelLabel: LocalizedText;
  score: number;
  summary: LocalizedText;
  dimensions: FeasibilityDimension[];
  risks: LocalizedList;
  nextSteps: LocalizedList;
  mustValidate: LocalizedList;
  methodFit: FitLevel;
  allowedOutput: OutputLevel;
  methodReasons: LocalizedList;
  gate: ReturnType<typeof evaluateMethodGate>;
}

const L = (zh: string, en: string, fr: string, ja: string): LocalizedText => ({
  zh,
  en,
  fr,
  ja,
  ru: pickLang("ru", zh, en, fr, ja),
  ko: pickLang("ko", zh, en, fr, ja),
});
const Ll = (zh: string[], en: string[], fr: string[], ja: string[]): LocalizedList => ({
  zh,
  en,
  fr,
  ja,
  ru: en.map((item, index) => pickLang("ru", zh[index] ?? item, item, fr[index] ?? item, ja[index] ?? item)),
  ko: en.map((item, index) => pickLang("ko", zh[index] ?? item, item, fr[index] ?? item, ja[index] ?? item)),
});

export function pickText(value: LocalizedText, lang: Lang): string {
  return value[lang] || value.en || value.zh || "";
}

export function pickList(value: LocalizedList, lang: Lang): string[] {
  const list = value[lang];
  if (Array.isArray(list) && list.length > 0) return list;
  if (Array.isArray(value.en) && value.en.length > 0) return value.en;
  return Array.isArray(value.zh) ? value.zh : [];
}

export const INTERVIEW_STAGES: InterviewStage[] = [
  {
    id: "age",
    question: L(
      "先认识一下你：你今年多大？",
      "First, a bit about you: how old are you?",
      "D'abord, faisons connaissance : quel âge as-tu ?",
      "まずは自己紹介から。何歳ですか？",
    ),
    hint: L(
      "年龄只用来理解你所处的阶段，不会单独决定生意是否可行。",
      "Age helps me understand your stage; it never decides feasibility on its own.",
      "L'âge m'aide à situer ton parcours ; il ne décide jamais de la faisabilité à lui seul.",
      "年齢は現在の状況を理解するためだけに使い、事業の実現可能性を単独で決めることはありません。",
    ),
    placeholder: L("例如：28 岁", "e.g. 28", "ex. : 28 ans", "例：28歳"),
    chips: Ll(
      ["18–24", "25–30", "31–35", "36–45", "45 岁以上"],
      ["18–24", "25–30", "31–35", "36–45", "45+"],
      ["18–24", "25–30", "31–35", "36–45", "45 et +"],
      ["18–24", "25–30", "31–35", "36–45", "45歳以上"],
    ),
    optional: true,
  },
  {
    id: "occupation",
    question: L(
      "你现在主要在做什么？上班、上学，还是已经在做自己的项目？",
      "What are you mainly doing now — working, studying, or building your own project?",
      "Que fais-tu principalement en ce moment : tu travailles, tu étudies, ou tu développes déjà ton propre projet ?",
      "今は主に何をしていますか？仕事、学生、それとも自分のプロジェクトを進めていますか？",
    ),
    hint: L(
      "这会影响下一步建议有多重，比如是否适合先业余验证。",
      "This shapes how heavy the next step should be, such as validating in your spare time.",
      "Cela détermine l'ampleur de la prochaine étape, par exemple si tu peux valider sur ton temps libre.",
      "次のステップの重さを決めるためです。たとえば、まず余暇で検証するのが適切かどうか。",
    ),
    placeholder: L(
      "例如：在一家公司做产品经理，业余时间做副业。",
      "e.g. A product manager at a company, building a side project in my spare time.",
      "ex. : Product manager en entreprise, avec un projet annexe sur mon temps libre.",
      "例：会社でプロダクトマネージャーをしながら、余暇で副業をしています。",
    ),
    chips: Ll(
      ["上班", "学生", "自由职业", "全职创业", "边上班边做"],
      ["Employed", "Student", "Freelancer", "Full-time founder", "Side project while employed"],
      ["Salarié", "Étudiant", "Indépendant", "Fondateur à plein temps", "Projet annexe en parallèle"],
      ["会社員", "学生", "フリーランス", "起業家（専業）", "会社員しながら副業"],
    ),
    optional: true,
  },
  {
    id: "idea",
    question: L(
      "你想做的生意或产品是什么？用一句话说清楚：它帮谁、解决什么问题。",
      "What business or product do you want to build? In one sentence: who does it help, and what problem does it solve?",
      "Quel business ou produit veux-tu lancer ? En une phrase : à qui cela aide-t-il, et quel problème cela résout-il ?",
      "作りたい事業や製品は何ですか？誰の、どんな問題を解決するのかを一文で教えてください。",
    ),
    hint: L(
      "不用写成商业计划书，一句话就够。",
      "No business plan needed — one sentence is enough.",
      "Pas besoin d'un business plan, une phrase suffit.",
      "事業計画書は不要です。一文で十分です。",
    ),
    placeholder: L(
      "例如：帮中国自由职业者用 AI 管合同和回款。",
      "e.g. An AI contract and payment tool for Chinese freelancers.",
      "ex. : Un outil IA de contrats et d'encaissement pour les freelances chinois.",
      "例：中国のフリーランス向けに、AIで契約と入金を管理するサービス。",
    ),
    chips: Ll(
      ["AI 工具", "内容与社区", "电商与品牌", "服务与咨询", "还没完全想好"],
      ["AI tool", "Content / community", "E-commerce / brand", "Service / consulting", "Not fully sure"],
      ["Outil IA", "Contenu / communauté", "E-commerce / marque", "Service / conseil", "Pas encore sûr"],
      ["AIツール", "コンテンツ・コミュニティ", "EC・ブランド", "サービス・コンサル", "まだ固まっていない"],
    ),
  },
  {
    id: "audience",
    question: L(
      "谁最需要它？请描述一个具体的人，而不是“所有人”。",
      "Who needs it most? Describe a specific person, not “everyone”.",
      "Qui en a le plus besoin ? Décris une personne précise, pas « tout le monde ».",
      "誰が最も必要としていますか？「全員」ではなく、具体的な一人を思い浮かべてください。",
    ),
    hint: L(
      "越具体越好：职业、阶段、所在平台或城市。",
      "The more specific the better: role, stage, platform or city.",
      "Plus c'est précis, mieux c'est : métier, stade, plateforme ou ville.",
      "具体的であればあるほど良いです。職業、段階、利用プラットフォームや都市など。",
    ),
    placeholder: L(
      "例如：刚接私活 1–2 年、在社交平台接单的独立设计师。",
      "e.g. Independent designers 1–2 years into freelance work who find clients on social platforms.",
      "ex. : Des designers indépendants qui font du freelance depuis 1–2 ans et trouvent des clients sur les réseaux sociaux.",
      "例：フリーランス1〜2年目で、SNSで案件を取っている独立系デザイナー。",
    ),
    chips: Ll(
      ["独立开发者", "自由职业者", "小团队老板", "学生 / 职场新人", "企业采购"],
      ["Indie developers", "Freelancers", "Small-team owners", "Students / newcomers", "Enterprise buyers"],
      ["Développeurs indés", "Freelances", "Petites équipes", "Étudiants / débutants", "Acheteurs en entreprise"],
      ["個人開発者", "フリーランス", "小規模チームの経営者", "学生・若手社会人", "企業の購買担当"],
    ),
  },
  {
    id: "problem",
    question: L(
      "他在什么场景下遇到什么问题？现在怎么凑合解决？",
      "In what situation does this person hit the problem, and how do they cope today?",
      "Dans quelle situation rencontre-t-il le problème, et comment fait-il face aujourd'hui ?",
      "その人はどんな場面で問題に直面していますか？今はどうやってしのいでいますか？",
    ),
    hint: L(
      "最好带上最近一次发生的具体经过。",
      "A recent concrete story works best.",
      "Un exemple concret récent est idéal.",
      "最近あった具体的な出来事を交えて話すと理想的です。",
    ),
    placeholder: L(
      "例如：改需求后不好意思加钱，尾款拖两个月，只能反复催。",
      "e.g. They feel awkward charging for scope changes, then chase final payment for two months.",
      "ex. : Après un changement de périmètre, il n'ose pas facturer plus, puis relance le solde pendant deux mois.",
      "例：仕様変更の追加料金を言い出せず、最後の支払いを2か月も催促し続けている。",
    ),
    chips: Ll(
      ["太贵 / 太慢", "流程太麻烦", "信息不透明", "不会做 / 缺能力", "找不到合适的人"],
      ["Too expensive / slow", "Too much friction", "Information is opaque", "Lacks the skill", "Can't find the right person"],
      ["Trop cher / lent", "Trop de friction", "Informations opaques", "Manque de compétence", "Ne trouve pas la bonne personne"],
      ["高すぎる・遅い", "手間がかかりすぎる", "情報が不透明", "スキルがない", "適切な人が見つからない"],
    ),
  },
  {
    id: "market",
    question: L(
      "这些用户主要在哪里？这决定我们用哪种数据来验证。",
      "Where are these users mainly located? This decides which data can validate them.",
      "Où se trouvent principalement ces utilisateurs ? Cela détermine les données que nous pouvons utiliser.",
      "そのユーザーは主にどこにいますか？どのデータで検証できるかが変わります。",
    ),
    hint: L(
      "中国大陆的用户可以直接用知乎讨论做定性研究。",
      "Mainland China users can be studied qualitatively through Zhihu discussions.",
      "Pour les utilisateurs en Chine continentale, les discussions Zhihu permettent une étude qualitative.",
      "中国本土のユーザーなら、Zhihuの議論で定性的に調べられます。",
    ),
    placeholder: L(
      "例如：主要是中国大陆，一线和新一线城市。",
      "e.g. Mainly mainland China, tier-1 and new tier-1 cities.",
      "ex. : Principalement la Chine continentale, les grandes villes de premier rang.",
      "例：主に中国本土の一線・新一線都市。",
    ),
    chips: Ll(
      ["中国大陆", "北美", "欧洲", "东南亚", "全球 / 两边都有"],
      ["Mainland China", "North America", "Europe", "Southeast Asia", "Global / both"],
      ["Chine continentale", "Amérique du Nord", "Europe", "Asie du Sud-Est", "Mondial / les deux"],
      ["中国本土", "北米", "ヨーロッパ", "東南アジア", "グローバル・両方"],
    ),
  },
  {
    id: "edge",
    question: L(
      "为什么是你来做？你有什么别人没有的经验、渠道或洞察？",
      "Why you? What experience, access or insight do you have that others don't?",
      "Pourquoi toi ? Quelle expérience, quel accès ou quel insight as-tu que les autres n'ont pas ?",
      "なぜあなたがやるのですか？他の人にない経験、チャネル、洞察は何ですか？",
    ),
    hint: L(
      "如果暂时没有，也可以直接说“还不确定”。",
      "If you are not sure yet, just say so.",
      "Si tu n'es pas encore sûr, dis-le simplement.",
      "まだ分からなければ、「まだ分からない」とそのまま答えて大丈夫です。",
    ),
    placeholder: L(
      "例如：我在这个行业做过 5 年，认识 200 个目标用户。",
      "e.g. Five years in the industry and a network of 200 target users.",
      "ex. : Cinq ans dans le secteur et un réseau de 200 utilisateurs cibles.",
      "例：業界で5年の経験があり、ターゲットユーザーを200人知っている。",
    ),
    chips: Ll(
      ["行业经验", "技术能力", "现成用户 / 社群", "独特渠道", "还不确定"],
      ["Industry experience", "Technical skill", "Existing users / community", "Unique distribution", "Not sure yet"],
      ["Expérience sectorielle", "Compétence technique", "Utilisateurs / communauté existants", "Canal unique", "Pas encore sûr"],
      ["業界経験", "技術力", "既存ユーザー・コミュニティ", "独自のチャネル", "まだ分からない"],
    ),
    optional: true,
  },
  {
    id: "model",
    question: L(
      "你打算怎么赚钱？用户为什么会付钱？",
      "How will you make money, and why will users pay?",
      "Comment vas-tu gagner de l'argent, et pourquoi les utilisateurs paieraient-ils ?",
      "どうやって収益化しますか？ユーザーはなぜお金を払うのですか？",
    ),
    hint: L(
      "可以先说一个假设，不需要已经验证。",
      "A hypothesis is fine; it does not need to be validated.",
      "Une hypothèse suffit ; elle n'a pas besoin d'être validée.",
      "仮説で構いません。まだ検証済みである必要はありません。",
    ),
    placeholder: L(
      "例如：按年订阅，省下的时间比订阅费更值钱。",
      "e.g. Annual subscription; the time saved is worth more than the fee.",
      "ex. : Un abonnement annuel ; le temps gagné vaut plus que l'abonnement.",
      "例：年額サブスク。節約できる時間が料金以上の価値になる。",
    ),
    chips: Ll(
      ["订阅", "按次付费", "佣金 / 抽成", "广告", "还没想好"],
      ["Subscription", "Pay per use", "Commission", "Advertising", "Not sure yet"],
      ["Abonnement", "Paiement à l'usage", "Commission", "Publicité", "Pas encore décidé"],
      ["サブスク", "都度課金", "手数料・コミッション", "広告", "まだ決めていない"],
    ),
  },
  {
    id: "evidence",
    question: L(
      "到目前为止你做过什么验证？有人愿意用或付钱吗？",
      "What validation have you done so far? Has anyone been willing to use or pay?",
      "Qu'as-tu déjà validé jusqu'ici ? Quelqu'un a-t-il accepté d'utiliser ou de payer ?",
      "これまでにどんな検証をしましたか？使いたい、またはお金を払いたいと言う人はいましたか？",
    ),
    hint: L(
      "没有也没关系，直接说“还没验证”。",
      "No problem if not — just say “nothing yet”.",
      "Ce n'est pas grave : dis simplement « rien pour l'instant ».",
      "なくても大丈夫です。「まだ検証していない」と答えてください。",
    ),
    placeholder: L(
      "例如：聊过 8 个用户，3 个愿意试用，还没人付钱。",
      "e.g. Talked to 8 users, 3 want to try it, nobody has paid yet.",
      "ex. : J'ai parlé à 8 utilisateurs, 3 veulent essayer, personne n'a encore payé.",
      "例：8人に話を聞き、3人が試したいと言ったが、まだ支払った人はいない。",
    ),
    chips: Ll(
      ["还没验证", "聊过几个用户", "有 waitlist / 内测", "已有付费用户"],
      ["Nothing yet", "Talked to a few users", "Waitlist / beta", "Paying users"],
      ["Rien pour l'instant", "Quelques utilisateurs interrogés", "Liste d'attente / bêta", "Utilisateurs payants"],
      ["まだ検証していない", "数人に話を聞いた", "ウェイトリスト・β版", "有料ユーザーがいる"],
    ),
    optional: true,
  },
  {
    id: "decision",
    question: L(
      "你现在最想搞清楚的决定是什么？什么结果会让你停止？",
      "What decision do you most need to make now, and what result would make you stop?",
      "Quelle décision dois-tu clarifier maintenant, et quel résultat te ferait arrêter ?",
      "今いちばんはっきりさせたい決断は何ですか？どんな結果ならやめますか？",
    ),
    hint: L(
      "一条“继续/停止”的条件，比“再看看”更有用。",
      "A concrete continue/stop condition beats “let's see”.",
      "Une condition claire « continuer / arrêter » vaut mieux que « on verra ».",
      "「続ける／やめる」の条件を決めると、「様子を見る」より役に立ちます。",
    ),
    placeholder: L(
      "例如：要不要先做 MVP；如果 10 个访谈里不到 3 个遇到这问题就停。",
      "e.g. Whether to build an MVP; stop if fewer than 3 of 10 interviews hit this problem.",
      "ex. : Faut-il d'abord faire un MVP ; j'arrête si moins de 3 personnes sur 10 rencontrent ce problème.",
      "例：まずMVPを作るべきか。10人中3人未満しかこの問題に直面していなければやめる。",
    ),
    chips: Ll(
      ["要不要开始做", "先做哪个功能", "怎么定价", "要不要换方向", "还没想清楚"],
      ["Whether to start", "Which feature first", "How to price", "Whether to pivot", "Not sure yet"],
      ["Faut-il se lancer", "Quelle fonctionnalité d'abord", "Comment fixer le prix", "Faut-il pivoter", "Pas encore clair"],
      ["始めるべきか", "どの機能から作るか", "価格をどうするか", "方向転換すべきか", "まだ整理できていない"],
    ),
  },
  {
    id: "constraints",
    question: L(
      "你准备投入多少时间和预算？",
      "How much time and budget are you ready to invest?",
      "Combien de temps et de budget es-tu prêt à investir ?",
      "どのくらいの時間と予算を投じる予定ですか？",
    ),
    hint: L(
      "这决定我们建议多重的下一步。",
      "This decides how heavy the next step should be.",
      "Cela détermine l'ampleur de la prochaine étape.",
      "次のステップをどのくらいの重さで提案するかが変わります。",
    ),
    placeholder: L(
      "例如：业余时间，每周 10 小时，先花 1000 元以内。",
      "e.g. 10 hours a week in my spare time, under $200 to start.",
      "ex. : Sur mon temps libre, 10 heures par semaine, moins de 200 € pour commencer.",
      "例：余暇で週10時間、最初は2万円以内。",
    ),
    chips: Ll(
      ["1 周内", "1 个月", "3 个月", "业余时间", "有预算"],
      ["Within a week", "One month", "Three months", "Spare time", "Have budget"],
      ["En une semaine", "Un mois", "Trois mois", "Temps libre", "Avec budget"],
      ["1週間以内", "1か月", "3か月", "余暇時間", "予算あり"],
    ),
    optional: true,
  },
];

const CHINA_PATTERN = /中国|中文|大陆|国内|内地|china|chinese|mainland|chine|chinois|chinoise|中国本土/i;
const OVERSEAS_PATTERN = /海外|北美|美国|加拿大|欧洲|英国|德国|法国|日本|韩国|东南亚|全球|overseas|north america|united states|europe|japan|global|étranger|international|amérique du nord|états-unis|asie du sud-est|mondial|北米|アメリカ|ヨーロッパ|東南アジア|グローバル/i;
const ENTERPRISE_PATTERN = /企业|公司|采购|大客户|b2b|enterprise|procurement|buyer committee|entreprise|achat|comité d'achat|企業|購買|法人/i;
const GENERIC_AUDIENCE_PATTERN = /^(所有人|大家|每个人|任何人|用户|客户|everyone|anyone|all people|users|customers|tout le monde|tous|personne|utilisateurs|clients|全員|みんな|誰でも|ユーザー|顧客)$/i;
const SPECIFIC_ROLE_PATTERN = /独立|自由职业|设计师|开发者|程序员|工程师|创始人|老板|创业者|学生|宝妈|卖家|商家|运营|顾问|护士|教师|摄影师|写作者|创作者|作者|主播|团队|企业|公司|采购|freelanc|designer|developer|founder|owner|student|seller|operator|consultant|writer|creator|team|enterprise|buyer|développeur|développeuse|fondateur|fondatrice|étudiant|étudiante|vendeur|consultant|écrivain|créateur|équipe|entreprise|acheteur|デザイナー|開発者|フリーランス|起業家|経営者|学生|個人|チーム|企業|ライター|クリエイター|コンサル|バイヤー/i;
const PROBLEM_PATTERN = /痛|麻烦|难|贵|慢|拖|反复|低效|浪费|焦虑|风险|成本|频率|每天|每周|经常|总是|不透明|扯皮|纠纷|delay|expensive|slow|pain|friction|waste|risk|often|every day|every week|hard|difficult|cher|chers|chère|lent|lente|retard|retards|coûteux|difficile|pénible|fréquent|souvent|chaque semaine|chaque jour|perte|perdre|problème|relance|relancer|impayé|impayés|facture|facturer|périmètre|solde|高すぎる|遅い|手間|面倒|頻繁|毎日|毎週|リスク|損失|コスト|問題|困る|トラブル|仕様変更|追加料金|支払い|未払い|催促|請求|遅延/i;
const EDGE_STRONG_PATTERN = /经验|做过|从业|行业|资源|渠道|用户|客户|技术|专利|团队|多年|实习|前公司|社群|人脉|experience|worked|industry|network|channel|technical|patent|team|community|years|expérience|réseau|canal|secteur|industrie|technique|compétence|équipe|communauté|ans|経験|業界|ネットワーク|チャネル|技術|スキル|チーム|コミュニティ|年/i;
const EDGE_NONE_PATTERN = /没有|还没|不确定|无|none|not sure|no idea|nothing|aucun|aucune|pas sûr|pas encore|rien|なし|ない|まだ|分からない/i;
const MODEL_PATTERN = /订阅|按次|佣金|抽成|广告|收费|付费|会员|服务费|license|subscription|commission|ads|advertising|pay per|price|fee|paid|abonnement|publicité|payer|paiement|tarif|prix|frais|mensuel|annuel|サブスク|都度|手数料|広告|有料|価格|料金|課金|収益/i;
const MODEL_NONE_PATTERN = /没想好|还没想|不知道|not sure|no idea|none|pas encore|aucune idée|je ne sais pas|まだ|決めていない|分からない|未定/i;
const EVIDENCE_STRONG_PATTERN = /访谈|聊过|问卷|waitlist|候补|付费|收入|订单|预售|测试|内测|用户|客户|调研|interview|waitlist|revenue|paid|order|pre-?sale|beta|user|customer|survey|entretien|entretiens|questionnaire|liste d'attente|bêta|utilisateur|client|revenu|vente|précommande|test|インタビュー|聞いた|話を聞|試したい|支払った|アンケート|ウェイトリスト|β|ユーザー|顧客|収益|注文|テスト|検証/i;
const EVIDENCE_NONE_PATTERN = /还没|没有|无|没做|零|nothing|none|not yet|no validation|rien|aucune|pas encore|jamais|なし|ない|まだ|未検証/i;
const DECISION_PATTERN = /要不要|是否|该不该|决定|验证|继续|开始做|换方向|定价|build|launch|whether|decide|validate|continue|pivot|price|faut-il|dois-je|décider|décision|valider|continuer|pivoter|始める|続ける|決める|検証|価格|方向転換|やめる|べきか|作るべき|直面/i;
const STOP_PATTERN = /停止|放弃|不做|就停|否则|kill|stop|abandon|give up|if .* then|arrête|arrêter|abandonne|abandonner|stopper|sinon|やめる|中止|撤退|止める|なら/i;

function clean(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function hasAny(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

export function buildInterviewProfile(answers: InterviewAnswers, language: Lang): InterviewProfile {
  return {
    age: clean(answers.age),
    occupation: clean(answers.occupation),
    idea: clean(answers.idea),
    audience: clean(answers.audience),
    problem: clean(answers.problem),
    market: clean(answers.market),
    edge: clean(answers.edge),
    model: clean(answers.model),
    evidence: clean(answers.evidence),
    decision: clean(answers.decision),
    constraints: clean(answers.constraints),
    language,
    capturedAt: new Date().toISOString(),
  };
}

const DIM_LABEL: Record<FeasibilityDimId, LocalizedText> = {
  idea: L("想法清晰度", "Idea clarity", "Clarté de l'idée", "アイデアの明確さ"),
  audience: L("目标用户", "Target users", "Utilisateurs cibles", "ターゲットユーザー"),
  problem: L("问题强度", "Problem intensity", "Intensité du problème", "問題の強さ"),
  market: L("市场与数据", "Market & data", "Marché et données", "市場とデータ"),
  edge: L("你的优势", "Founder edge", "Ton avantage", "あなたの強み"),
  model: L("商业模式", "Business model", "Modèle économique", "ビジネスモデル"),
  evidence: L("已有验证", "Existing evidence", "Validation existante", "既存の検証"),
  decision: L("决策与止损", "Decision & kill criteria", "Décision et critère d'arrêt", "意思決定と撤退条件"),
};

function dimension(
  id: FeasibilityDimId,
  score: 0 | 1 | 2,
  reason: LocalizedText,
): FeasibilityDimension {
  return {
    id,
    label: DIM_LABEL[id],
    score,
    status: score === 2 ? "strong" : score === 1 ? "partial" : "weak",
    reason,
  };
}

function scoreIdea(profile: InterviewProfile): FeasibilityDimension {
  const value = profile.idea;
  if (!value) {
    return dimension("idea", 0, L("还没有说清楚要做什么。", "The idea is not stated yet.", "L'idée n'est pas encore claire.", "まだ何を作るのか明確ではありません。"));
  }
  if (value.length < 10) {
    return dimension("idea", 1, L("想法有了轮廓，但还没说清帮谁解决什么问题。", "There is a rough idea, but who it helps and what it solves is still unclear.", "L'idée est esquissée, mais on ne sait pas encore à qui elle aide ni quel problème elle résout.", "アイデアの輪郭はありますが、誰のどんな問題を解決するのかがまだ不明確です。"));
  }
  return dimension("idea", 2, L("想法能用一句话说清它帮谁解决什么问题。", "The idea states who it helps and what problem it solves in one sentence.", "L'idée indique en une phrase à qui elle aide et quel problème elle résout.", "誰のどんな問題を解決するのかを一文で説明できています。"));
}

function scoreAudience(profile: InterviewProfile): FeasibilityDimension {
  const value = profile.audience;
  if (!value || GENERIC_AUDIENCE_PATTERN.test(value)) {
    return dimension("audience", 0, L("目标用户太宽，几乎是所有人。", "The target user is too broad — almost everyone.", "La cible est trop large : presque tout le monde.", "ターゲットが広すぎて、ほぼ全員が対象になっています。"));
  }
  if (SPECIFIC_ROLE_PATTERN.test(value) || value.length >= 12) {
    return dimension("audience", 2, L("目标用户相对具体，能对应到一类找得到的人。", "The target user is specific enough to be found and interviewed.", "La cible est assez précise pour être trouvée et interrogée.", "ターゲットが具体的で、実際に探して話を聞ける層になっています。"));
  }
  return dimension("audience", 1, L("目标用户有方向，但还不够具体。", "There is a direction, but the target user is still not specific enough.", "Il y a une direction, mais la cible reste trop vague.", "方向性はありますが、ターゲットがまだ具体的ではありません。"));
}

function scoreProblem(profile: InterviewProfile): FeasibilityDimension {
  const value = profile.problem;
  if (!value) {
    return dimension("problem", 0, L("还没有描述具体问题。", "No concrete problem is described yet.", "Aucun problème concret n'est encore décrit.", "具体的な問題がまだ説明されていません。"));
  }
  if (value.length >= 12 && (hasAny(value, PROBLEM_PATTERN) || value.length >= 24)) {
    return dimension("problem", 2, L("问题有具体场景，也能看出频率或损失。", "The problem has a concrete scene, with visible frequency or cost.", "Le problème a un contexte concret, avec une fréquence ou un coût visible.", "問題には具体的な場面があり、頻度や損失も見えます。"));
  }
  if (value.length >= 8 || (hasAny(value, PROBLEM_PATTERN) && value.length >= 6)) {
    return dimension("problem", 1, L("问题有描述，但还缺少具体场景或频率。", "The problem is described, but the scene or frequency is missing.", "Le problème est décrit, mais il manque le contexte ou la fréquence.", "問題の説明はありますが、具体的な場面や頻度が不足しています。"));
  }
  return dimension("problem", 0, L("问题描述太短，无法判断是否值得解决。", "The problem statement is too short to judge whether it is worth solving.", "La description est trop courte pour juger si le problème vaut la peine d'être résolu.", "問題の説明が短すぎて、解決する価値があるか判断できません。"));
}

function scoreMarket(profile: InterviewProfile): FeasibilityDimension {
  const value = profile.market;
  if (!value) {
    return dimension("market", 0, L("还没有说清用户在哪里。", "It is still unclear where the users are.", "On ne sait pas encore où se trouvent les utilisateurs.", "ユーザーがどこにいるのかまだ不明です。"));
  }
  const china = hasAny(value, CHINA_PATTERN);
  const overseas = hasAny(value, OVERSEAS_PATTERN);
  if (china && overseas) {
    return dimension("market", 1, L("用户横跨中国与海外；知乎只能覆盖其中一部分。", "Users span China and overseas; Zhihu can only cover part of them.", "Les utilisateurs sont en Chine et à l'étranger ; Zhihu n'en couvre qu'une partie.", "ユーザーが中国と海外にまたがっており、Zhihuでは一部しかカバーできません。"));
  }
  if (china) {
    return dimension("market", 2, L("主要用户在中国大陆，知乎讨论可以直接观察。", "Main users are in mainland China, so Zhihu discussions are directly observable.", "Les principaux utilisateurs sont en Chine continentale : les discussions Zhihu sont directement observables.", "主なユーザーが中国本土にいるため、Zhihuの議論を直接観察できます。"));
  }
  if (overseas) {
    return dimension("market", 1, L("主要用户在海外，知乎不能代表他们，需要当地数据。", "Main users are overseas; Zhihu does not represent them, so local data is needed.", "Les principaux utilisateurs sont à l'étranger ; Zhihu ne les représente pas, il faut des données locales.", "主なユーザーが海外にいるため、Zhihuでは代表できず、現地データが必要です。"));
  }
  return dimension("market", 1, L("市场还需要进一步确认。", "The market still needs to be pinned down.", "Le marché doit encore être précisé.", "市場をもう少し明確にする必要があります。"));
}

function scoreEdge(profile: InterviewProfile): FeasibilityDimension {
  const value = profile.edge;
  if (!value || EDGE_NONE_PATTERN.test(value)) {
    return dimension("edge", 0, L("还没有说明为什么是你来做。", "It is still unclear why you are the right person to build this.", "On ne sait pas encore pourquoi c'est toi qui devrais le faire.", "なぜあなたがやるのかがまだ説明されていません。"));
  }
  if (hasAny(value, EDGE_STRONG_PATTERN)) {
    return dimension("edge", 2, L("你有可以复用的经验、渠道或用户关系。", "You have reusable experience, distribution or user relationships.", "Tu as de l'expérience, des canaux ou des relations utilisateurs réutilisables.", "再利用できる経験、チャネル、ユーザーとの関係があります。"));
  }
  return dimension("edge", 1, L("有优势的线索，但还不够具体。", "There is a hint of an edge, but it is not concrete yet.", "Il y a une piste d'avantage, mais elle reste vague.", "強みの手がかりはありますが、まだ具体的ではありません。"));
}

function scoreModel(profile: InterviewProfile): FeasibilityDimension {
  const value = profile.model;
  if (!value || MODEL_NONE_PATTERN.test(value)) {
    return dimension("model", 0, L("商业模式还没想清楚。", "The business model is not clear yet.", "Le modèle économique n'est pas encore clair.", "ビジネスモデルがまだ明確ではありません。"));
  }
  if (hasAny(value, MODEL_PATTERN)) {
    return dimension("model", 2, L("已经有一个可以测试的收费方式。", "There is a charge model that can be tested.", "Il existe un mode de facturation testable.", "検証できる課金方法があります。"));
  }
  return dimension("model", 1, L("有收入方向，但付费理由还不够清楚。", "There is a revenue direction, but the reason to pay is still unclear.", "Il y a une piste de revenus, mais la raison de payer reste floue.", "収益の方向性はありますが、支払う理由がまだ不明確です。"));
}

function scoreEvidence(profile: InterviewProfile): FeasibilityDimension {
  const value = profile.evidence;
  if (!value || (EVIDENCE_NONE_PATTERN.test(value) && !hasAny(value, EVIDENCE_STRONG_PATTERN))) {
    return dimension("evidence", 0, L("几乎没有验证，判断只能建立在假设上。", "Almost no validation yet, so the judgment rests on assumptions.", "Presque aucune validation : le jugement repose sur des hypothèses.", "ほとんど検証がなく、判断は仮説に基づいています。"));
  }
  if (hasAny(value, EVIDENCE_STRONG_PATTERN)) {
    return dimension("evidence", 2, L("已经和真实用户接触过，有可复核的初步信号。", "You have talked to real users and have some reviewable early signal.", "Tu as parlé à de vrais utilisateurs et tu as des signaux préliminaires vérifiables.", "実際のユーザーと接触し、確認できる初期シグナルがあります。"));
  }
  return dimension("evidence", 1, L("做过一些动作，但还不足以说明需求成立。", "Some action has been taken, but it is not enough to show demand.", "Quelques actions ont été menées, mais pas assez pour prouver la demande.", "いくつかの行動はしていますが、需要があると示すには足りません。"));
}

function scoreDecision(profile: InterviewProfile): FeasibilityDimension {
  const value = profile.decision;
  if (!value) {
    return dimension("decision", 0, L("还没有说清要做什么决定。", "The decision to make is not stated yet.", "La décision à prendre n'est pas encore claire.", "どんな決断をするのかまだ明確ではありません。"));
  }
  if (hasAny(value, DECISION_PATTERN) && hasAny(value, STOP_PATTERN)) {
    return dimension("decision", 2, L("既有明确决定，也有可执行的停止条件。", "There is a clear decision plus an actionable stop condition.", "Il y a une décision claire et un critère d'arrêt actionnable.", "明確な決断と、実行可能な撤退条件の両方があります。"));
  }
  if (hasAny(value, DECISION_PATTERN) || value.length >= 15) {
    return dimension("decision", 1, L("决定比较清楚，但还缺少明确的停止条件。", "The decision is fairly clear, but an explicit stop condition is missing.", "La décision est assez claire, mais il manque un critère d'arrêt explicite.", "決断は比較的明確ですが、明示的な撤退条件がありません。"));
  }
  return dimension("decision", 0, L("决定还太模糊，无法据此安排下一步。", "The decision is too vague to drive a next step.", "La décision est trop floue pour en déduire une prochaine étape.", "決断が曖昧すぎて、次のステップを決められません。"));
}

const LEVEL_LABEL: Record<FeasibilityLevel, LocalizedText> = {
  promising: L("值得小步验证", "Worth a small test", "À tester à petite échelle", "小さく検証する価値あり"),
  needs_validation: L("方向中等，先补证据", "Some signal — validate first", "Signal moyen — valider d'abord", "方向性はあり、まず証拠を補う"),
  risky: L("风险偏高，先重定义", "High risk — reframe first", "Risque élevé — redéfinir d'abord", "リスク高め、まず再定義"),
  unclear: L("信息不足，先聊清楚", "Not enough information", "Informations insuffisantes", "情報不足、まず整理"),
};

function roleAdvice(profile: InterviewProfile): LocalizedText | null {
  const text = `${profile.occupation} ${profile.age}`;
  if (/学生|上学|大学|college|student|school|étudiant|université|学生|大学/i.test(text)) {
    return L(
      "先用学校和社群里的 5 个目标用户验证，不要急着投入开发。",
      "Validate with five target users at school or in your community before investing in development.",
      "Valide d'abord avec cinq utilisateurs cibles de ton école ou de ta communauté avant d'investir dans le développement.",
      "まず学校やコミュニティのターゲットユーザー5人で検証し、開発に急いで投資しないでください。",
    );
  }
  if (/上班|在职|兼职|边上班|employed|part-time|full-time job|salarié|employé|temps partiel|会社員|勤務|副業/i.test(text)) {
    return L(
      "先用业余时间验证，设一个 2–4 周的截止点，再决定是否加大投入。",
      "Validate in your spare time with a two-to-four-week deadline before increasing investment.",
      "Valide sur ton temps libre avec une échéance de deux à quatre semaines avant d'investir davantage.",
      "まず余暇で検証し、2〜4週間の期限を設けてから投資を増やすか決めてください。",
    );
  }
  if (/全职创业|创业|full-time founder|founder|fondateur|entrepreneur|起業|専業/i.test(text)) {
    return L(
      "给自己设一个明确的验证截止时间，避免在没有证据时无限期投入。",
      "Set a clear validation deadline so you do not keep investing without evidence.",
      "Fixe une échéance claire de validation pour éviter d'investir sans preuve.",
      "証拠がないまま投資を続けないよう、検証の期限を明確に決めてください。",
    );
  }
  return null;
}

function toList(items: LocalizedText[]): LocalizedList {
  return {
    zh: items.map((item) => item.zh),
    en: items.map((item) => item.en),
    fr: items.map((item) => item.fr),
    ja: items.map((item) => item.ja),
    ru: items.map((item) => item.ru),
    ko: items.map((item) => item.ko),
  };
}

function weakLabels(dimensions: FeasibilityDimension[], lang: Lang): string {
  const separator = lang === "zh" || lang === "ja" ? "、" : ", ";
  return dimensions
    .filter((item) => item.status !== "strong")
    .map((item) => pickText(item.label, lang))
    .join(separator);
}

export function assessFeasibility(profile: InterviewProfile): FeasibilityAssessment {
  const dimensions: FeasibilityDimension[] = [
    scoreIdea(profile),
    scoreAudience(profile),
    scoreProblem(profile),
    scoreMarket(profile),
    scoreEdge(profile),
    scoreModel(profile),
    scoreEvidence(profile),
    scoreDecision(profile),
  ];
  const total = dimensions.reduce((sum, item) => sum + item.score, 0);
  const score = Math.round((total / (dimensions.length * 2)) * 100);
  const byId = new Map(dimensions.map((item) => [item.id, item]));
  const coreWeak = (["idea", "audience", "problem"] as FeasibilityDimId[]).filter((id) => (byId.get(id)?.score ?? 0) === 0).length;

  let level: FeasibilityLevel;
  if (coreWeak >= 2) level = "unclear";
  else if (score >= 70 && (byId.get("audience")?.score ?? 0) >= 1 && (byId.get("problem")?.score ?? 0) >= 2) level = "promising";
  else if (score >= 45) level = "needs_validation";
  else level = "risky";

  const weakZh = weakLabels(dimensions, "zh");
  const weakEn = weakLabels(dimensions, "en");
  const weakFr = weakLabels(dimensions, "fr");
  const weakJa = weakLabels(dimensions, "ja");

  const summary = {
    promising: L(
      "你的方向已经具备可验证的基础：想法、用户和问题相对具体。但这只是研究初判，不是可行性结论；下一步应先用最便宜的方式验证核心假设。",
      "The direction has a testable foundation: the idea, target user and problem are relatively concrete. This is an initial research read, not a feasibility verdict — validate the core assumption cheaply next.",
      "La direction repose sur une base testable : l'idée, la cible et le problème sont relativement concrets. Ce n'est qu'une première lecture, pas un verdict de faisabilité ; valide d'abord l'hypothèse centrale à moindre coût.",
      "方向性には検証可能な土台があります。アイデア、ターゲット、問題が比較的具体できています。ただしこれは研究上の初判断であり、実現可能性の結論ではありません。次に最も安価な方法で核心仮説を検証してください。",
    ),
    needs_validation: L(
      `方向有潜力，但关键环节还缺证据：${weakZh}。先别急着开发，用访谈或落地页把最不确定的一条验证掉。`,
      `The direction has potential, but key links still lack evidence: ${weakEn}. Do not build yet; validate the weakest link with interviews or a landing page.`,
      `La direction a du potentiel, mais des maillons clés manquent encore de preuves : ${weakFr}. Ne développe pas encore ; valide le point le plus incertain par des entretiens ou une page d'atterrissage.`,
      `方向性には可能性がありますが、重要な部分にまだ証拠が足りません：${weakJa}。まだ開発せず、インタビューやランディングページで最も不確かな点を検証してください。`,
    ),
    risky: L(
      `当前信息显示风险偏高：${weakZh}。建议先重新定义目标用户和问题，再决定是否投入。`,
      `Current information suggests higher risk: ${weakEn}. Redefine the target user and problem before investing.`,
      `Les informations actuelles indiquent un risque élevé : ${weakFr}. Redéfinis la cible et le problème avant d'investir.`,
      `現時点の情報ではリスクが高めです：${weakJa}。まずターゲットと問題を再定義してから、投資するか決めてください。`,
    ),
    unclear: L(
      "信息还不足以下判断。先把想法、目标用户和具体问题聊清楚，再谈可行性。",
      "There is not enough information to judge. Clarify the idea, target user and concrete problem first.",
      "Les informations sont insuffisantes pour juger. Clarifie d'abord l'idée, la cible et le problème concret.",
      "判断するには情報が足りません。まずアイデア、ターゲット、具体的な問題を整理してください。",
    ),
  }[level];

  const riskItems: LocalizedText[] = [];
  if ((byId.get("audience")?.score ?? 0) === 0) {
    riskItems.push(L(
      "目标用户太宽，先收窄到一个能叫出名字、能找到的人群。",
      "The target user is too broad; narrow it to a named, reachable group.",
      "La cible est trop large ; réduis-la à un groupe nommé et joignable.",
      "ターゲットが広すぎます。名前で呼べて、実際に会える層まで絞ってください。",
    ));
  }
  if ((byId.get("problem")?.score ?? 0) <= 1) {
    riskItems.push(L(
      "问题描述偏抽象，补一个最近发生的具体场景、频率和损失。",
      "The problem is abstract; add a recent concrete scene, its frequency and cost.",
      "Le problème est abstrait ; ajoute une situation concrète récente, sa fréquence et son coût.",
      "問題の説明が抽象的です。最近の具体的な場面、頻度、損失を補ってください。",
    ));
  }
  if ((byId.get("market")?.score ?? 0) <= 1) {
    riskItems.push(L(
      "目标市场与中文知乎不完全匹配，需要用当地社区或访谈补充证据。",
      "The target market does not fully match Chinese Zhihu; add local communities or interviews.",
      "Le marché cible ne correspond pas totalement à Zhihu en chinois ; ajoute des communautés locales ou des entretiens.",
      "ターゲット市場と中国語Zhihuは完全には一致しません。現地コミュニティやインタビューで補ってください。",
    ));
  }
  if ((byId.get("edge")?.score ?? 0) === 0) {
    riskItems.push(L(
      "还没有说明为什么是你，先确认独特优势，否则容易被复制。",
      "There is no clear founder edge yet; without it the idea is easy to copy.",
      "Il n'y a pas encore d'avantage clair ; sans lui, l'idée est facile à copier.",
      "なぜあなたがやるのかが不明確です。独自の強みがないと模倣されやすくなります。",
    ));
  }
  if ((byId.get("model")?.score ?? 0) === 0) {
    riskItems.push(L(
      "商业模式没想清楚，先验证谁会为什么付钱。",
      "The business model is unclear; validate who pays and why.",
      "Le modèle économique est flou ; valide qui paie et pourquoi.",
      "ビジネスモデルが不明確です。誰が何に対して払うのかを検証してください。",
    ));
  }
  if ((byId.get("evidence")?.score ?? 0) === 0) {
    riskItems.push(L(
      "几乎没有验证，先做 5 次目标用户访谈或一个落地页。",
      "Almost no validation; run five target-user interviews or a landing page first.",
      "Presque aucune validation ; fais cinq entretiens avec des utilisateurs cibles ou une page d'atterrissage.",
      "ほとんど検証がありません。まずターゲットユーザー5人へのインタビューかランディングページを行ってください。",
    ));
  }
  if ((byId.get("decision")?.score ?? 0) <= 1) {
    riskItems.push(L(
      "缺少明确的停止条件，容易在错误方向上持续投入。",
      "There is no explicit stop condition, which makes over-investment likely.",
      "Il manque un critère d'arrêt explicite, ce qui favorise le surinvestissement.",
      "明確な撤退条件がなく、間違った方向に投資を続けやすくなります。",
    ));
  }
  if (riskItems.length === 0) {
    riskItems.push(L(
      "目前没有明显的结构性风险，但需求强度仍需真实用户验证。",
      "No obvious structural risk, but demand intensity still needs real-user validation.",
      "Pas de risque structurel évident, mais l'intensité de la demande doit encore être validée auprès de vrais utilisateurs.",
      "目立った構造的リスクはありませんが、需要の強さは実際のユーザーで検証する必要があります。",
    ));
  }

  const nextItems: LocalizedText[] = [];
  const role = roleAdvice(profile);
  if (role) nextItems.push(role);
  if ((byId.get("evidence")?.score ?? 0) <= 1) {
    nextItems.push(L(
      "先做 5 次目标用户访谈：问最近一次发生问题的经过，而不是问“你会不会用”。",
      "Run five target-user interviews about the last time the problem happened — do not ask “would you use this?”.",
      "Fais cinq entretiens sur la dernière fois où le problème est apparu — ne demande pas « l'utiliserais-tu ? ».",
      "まずターゲットユーザー5人に、最近問題が起きたときの経緯を聞いてください。「使いますか？」と聞くのではありません。",
    ));
  } else {
    nextItems.push(L(
      "把已有验证整理成 3 条可复核证据，再决定是否加大投入。",
      "Turn existing validation into three reviewable evidence items before increasing investment.",
      "Transforme la validation existante en trois preuves vérifiables avant d'investir davantage.",
      "既存の検証を確認可能な証拠3件に整理してから、投資を増やすか決めてください。",
    ));
  }
  if ((byId.get("problem")?.score ?? 0) <= 1) {
    nextItems.push(L(
      "补一个最近 7 天发生的具体场景，记录发生频率和实际损失。",
      "Add one concrete scene from the last seven days, with frequency and actual cost.",
      "Ajoute une situation concrète des sept derniers jours, avec sa fréquence et son coût réel.",
      "直近7日間に起きた具体的な場面を1つ補い、頻度と実際の損失を記録してください。",
    ));
  }
  const marketChina = hasAny(profile.market, CHINA_PATTERN);
  const marketOverseas = hasAny(profile.market, OVERSEAS_PATTERN);
  if (marketChina) {
    nextItems.push(L(
      "用知研台检索这类用户的中文原话、替代方案和反例，先确认问题在真实讨论里成立。",
      "Use Zhiyan to search this group's Chinese wording, alternatives and counter-examples.",
      "Utilise Zhiyan pour chercher les termes chinois, les alternatives et les contre-exemples de ce groupe.",
      "Zhiyanでこの層の中国語の生の表現、代替案、反例を検索し、問題が実際の議論で成立するか確認してください。",
    ));
  }
  if (marketOverseas) {
    nextItems.push(L(
      "去目标市场的社区（Reddit、Indie Hackers、本地论坛）做同样的检索和访谈。",
      "Do the same search and interviews in the target market's communities (Reddit, Indie Hackers, local forums).",
      "Fais les mêmes recherches et entretiens dans les communautés du marché cible (Reddit, Indie Hackers, forums locaux).",
      "ターゲット市場のコミュニティ（Reddit、Indie Hackers、現地フォーラム）で同じ検索とインタビューをしてください。",
    ));
  }
  if ((byId.get("model")?.score ?? 0) <= 1) {
    nextItems.push(L(
      "做 3 次价格试探：讲清方案，观察对方是否愿意付费或预付。",
      "Run three price probes: explain the offer and see whether people will pay or prepay.",
      "Fais trois tests de prix : explique l'offre et regarde si les gens acceptent de payer ou de prépayer.",
      "価格テストを3回行い、提案を説明して相手が支払うか前払いするか観察してください。",
    ));
  }
  if ((byId.get("decision")?.score ?? 0) <= 1) {
    nextItems.push(L(
      "写下停止条件：出现什么信号你就不做。",
      "Write a stop condition: what signal would make you walk away.",
      "Écris un critère d'arrêt : quel signal te ferait abandonner.",
      "撤退条件を書いてください。どんなシグナルが出たらやめるのか。",
    ));
  }
  if (nextItems.length < 4) {
    nextItems.push(L(
      "搭一个一句话落地页，测点击和留资，把成本控制在一天内。",
      "Ship a one-line landing page to test clicks and sign-ups within one day.",
      "Mets en ligne une page d'atterrissage en une phrase pour tester les clics et les inscriptions en une journée.",
      "一文のランディングページを1日以内に作り、クリックと登録を測ってください。",
    ));
  }

  const mustItems: LocalizedText[] = [
    L(
      "用户是否已经在为这个问题花时间或花钱",
      "Whether users already spend time or money on this problem",
      "Les utilisateurs consacrent-ils déjà du temps ou de l'argent à ce problème ?",
      "ユーザーがすでにこの問題に時間やお金を使っているか",
    ),
    L(
      "问题发生的频率是否足够支撑一门生意",
      "Whether the problem happens often enough to support a business",
      "Le problème est-il assez fréquent pour porter une activité ?",
      "問題の頻度がビジネスとして成り立つほど高いか",
    ),
    L(
      "现有替代方案为什么不够，用户为什么愿意换",
      "Why current alternatives fall short and why users would switch",
      "Pourquoi les alternatives actuelles ne suffisent pas et pourquoi les utilisateurs changeraient",
      "既存の代替案ではなぜ不十分で、ユーザーはなぜ乗り換えるのか",
    ),
  ];
  if (marketOverseas) {
    mustItems.push(L(
      "目标市场用户是否真的存在这个需求（需要当地访谈）",
      "Whether the need truly exists in the target market (requires local interviews)",
      "Le besoin existe-t-il vraiment sur le marché cible ? (entretiens locaux nécessaires)",
      "ターゲット市場に本当にこの需要があるか（現地インタビューが必要）",
    ));
  }

  const gate = evaluateMethodGate({
    targetMarketZh: profile.market,
    targetMarketEn: profile.market,
    decisionZh: `${profile.decision} ${profile.idea} ${profile.problem}`,
    decisionEn: `${profile.decision} ${profile.idea} ${profile.problem}`,
  });
  let methodFit: FitLevel = gate.fit;
  if (marketChina && marketOverseas) methodFit = "partial";
  const enterpriseSignal = ENTERPRISE_PATTERN.test(`${profile.idea} ${profile.audience} ${profile.problem} ${profile.model}`);
  if (enterpriseSignal && methodFit === "fit") methodFit = "partial";
  const quantitative = /市场规模|购买率|付费|定价|价格|market size|purchase|pricing|willingness|taille du marché|taux d'achat|prix|tarif|disposition à payer|市場規模|購入率|価格|支払い意欲/.test(`${profile.decision} ${profile.idea} ${profile.problem}`);
  const allowedOutput: OutputLevel = methodFit === "fit" ? "directional" : "hypotheses_only";
  const nextSteps = toList(nextItems);
  const mustValidate = toList(mustItems);
  const methodReasons: LocalizedList = {
    zh: gate.reasonsZh,
    en: gate.reasonsEn,
    fr: [
      marketChina
        ? "Le marché cible est la Chine continentale : Zhihu est un point d'entrée raisonnable pour les discussions publiques en chinois."
        : marketOverseas
          ? "Le marché cible est à l'étranger ; Zhihu en chinois ne représente pas les utilisateurs locaux et ne peut servir que d'hypothèse sur les Chinois de l'étranger ou le côté chinois."
          : "Le marché cible n'est pas entièrement observable sur Zhihu en chinois ; les discussions chinoises ne peuvent être qu'une source partielle d'hypothèses.",
      enterpriseSignal
        ? "La décision implique des achats en entreprise ; des publications individuelles publiques ne représentent pas un comité d'achat."
        : "La décision porte sur l'expérience utilisateur, les scènes et les alternatives, adaptée à une exploration qualitative.",
      quantitative
        ? "La décision implique la disposition à payer, le prix ou des proportions de marché ; les discussions Zhihu ne peuvent pas le prouver."
        : "Les discussions Zhihu peuvent aider à resserrer le problème, mais ne peuvent pas prouver des proportions globales.",
    ],
    ja: [
      marketChina
        ? "ターゲット市場は中国本土なので、Zhihuは中国語の公開議論の妥当な入口です。"
        : marketOverseas
          ? "ターゲット市場は海外です。中国語のZhihuは現地ユーザーを代表せず、海外在住中国人や中国側の仮説にしか使えません。"
          : "ターゲット市場は中国語Zhihuで完全には観察できず、中国語の議論は部分的な仮説源にしかなりません。",
      enterpriseSignal
        ? "企業購買が関わる意思決定であり、個人の公開投稿は購買委員会を代表しません。"
        : "ユーザー経験、場面、代替案に関する意思決定で、定性的な探索に適しています。",
      quantitative
        ? "支払い意欲、価格、市場比率が関わるため、Zhihuの議論では証明できません。"
        : "Zhihuの議論は問題の絞り込みには役立ちますが、全体の比率は証明できません。",
    ],
    ru: gate.reasonsEn.map((item) => pickLang("ru", item, item, item, item)),
    ko: gate.reasonsEn.map((item) => pickLang("ko", item, item, item, item)),
  };

  return {
    level,
    levelLabel: LEVEL_LABEL[level],
    score,
    summary,
    dimensions,
    risks: toList(riskItems),
    nextSteps: {
      zh: nextSteps.zh.slice(0, 5),
      en: nextSteps.en.slice(0, 5),
      fr: nextSteps.fr.slice(0, 5),
      ja: nextSteps.ja.slice(0, 5),
      ru: nextSteps.ru.slice(0, 5),
      ko: nextSteps.ko.slice(0, 5),
    },
    mustValidate: {
      zh: mustValidate.zh.slice(0, 4),
      en: mustValidate.en.slice(0, 4),
      fr: mustValidate.fr.slice(0, 4),
      ja: mustValidate.ja.slice(0, 4),
      ru: mustValidate.ru.slice(0, 4),
      ko: mustValidate.ko.slice(0, 4),
    },
    methodFit,
    allowedOutput,
    methodReasons,
    gate,
  };
}

export function profileToBrief(profile: InterviewProfile): string {
  const background = [profile.age, profile.occupation].filter(Boolean).join("，");
  const lines = [
    `访谈对象背景：${background || "待补充"}`,
    `用户想做的生意：${profile.idea || "待补充"}`,
    `目标用户：${profile.audience || "待补充"}`,
    `具体问题与现有替代：${profile.problem || "待补充"}`,
    `目标市场：${profile.market || "待确认"}`,
    `为什么是用户来做：${profile.edge || "待补充"}`,
    `商业模式假设：${profile.model || "待补充"}`,
    `已有验证：${profile.evidence || "还没验证"}`,
    `想弄清楚的决定与停止条件：${profile.decision || "待补充"}`,
    `可投入的时间与预算：${profile.constraints || "待补充"}`,
  ];
  return `这是一次用户访谈整理出的产品决策。请据此设计一次知乎定性研究，重点验证目标用户、具体问题、现有替代方案和反例。\n${lines.join("\n")}`;
}

export function buildInterviewMarkdown(profile: InterviewProfile, assessment: FeasibilityAssessment, lang: Lang): string {
  const T = {
    title: L("知研台 · 用户访谈纪要", "Zhiyan · User interview memo", "Zhiyan · Compte rendu d'entretien", "Zhiyan · ユーザーインタビュー記録"),
    assessment: L("初判", "Assessment", "Évaluation", "初判断"),
    methodFit: L("知乎方法适配", "Zhihu method fit", "Adéquation avec Zhihu", "Zhihuとの適合"),
    allowedOutput: L("允许输出", "Allowed output", "Niveau de sortie autorisé", "許容される出力"),
    captured: L("记录时间", "Captured", "Date", "記録日時"),
    summary: L("访谈摘要", "Summary", "Résumé", "インタビュー概要"),
    interview: L("访谈记录", "Interview", "Entretien", "インタビュー記録"),
    age: L("年龄", "Age", "Âge", "年齢"),
    currentWork: L("目前在做", "Current work", "Activité actuelle", "現在の活動"),
    business: L("生意/产品", "Business", "Business / produit", "事業・製品"),
    targetUsers: L("目标用户", "Target users", "Utilisateurs cibles", "ターゲットユーザー"),
    problem: L("问题与替代", "Problem & alternatives", "Problème et alternatives", "問題と代替案"),
    market: L("市场", "Market", "Marché", "市場"),
    edge: L("优势", "Founder edge", "Avantage", "強み"),
    model: L("商业模式", "Business model", "Modèle économique", "ビジネスモデル"),
    evidence: L("已有验证", "Existing evidence", "Validation existante", "既存の検証"),
    decision: L("决定与止损", "Decision & stop", "Décision et arrêt", "意思決定と撤退"),
    constraints: L("时间/预算", "Time / budget", "Temps / budget", "時間・予算"),
    dimensions: L("维度初判", "Dimensions", "Dimensions", "評価軸"),
    dimension: L("维度", "Dimension", "Dimension", "評価軸"),
    status: L("状态", "Status", "Statut", "状態"),
    reason: L("说明", "Reason", "Explication", "説明"),
    risks: L("主要风险", "Risks", "Risques principaux", "主なリスク"),
    next: L("下一步", "Next steps", "Prochaines étapes", "次のステップ"),
    notProvided: L("未填写", "Not provided", "Non renseigné", "未記入"),
  };
  const text = (value: LocalizedText) => pickText(value, lang);
  const list = (value: LocalizedList) => pickList(value, lang);
  const statusLabel = assessment.dimensions.map((item) => {
    const label = item.status === "strong"
      ? L("较强", "Strong", "Solide", "強い")
      : item.status === "partial"
        ? L("一般", "Partial", "Moyen", "普通")
        : L("偏弱", "Weak", "Faible", "弱い");
    return `| ${pickText(item.label, lang)} | ${pickText(label, lang)} | ${pickText(item.reason, lang)} |`;
  });
  return [
    `# ${text(T.title)}`,
    "",
    `- ${text(T.assessment)}: **${pickText(assessment.levelLabel, lang)}** (${assessment.score}/100)`,
    `- ${text(T.methodFit)}: ${assessment.methodFit}`,
    `- ${text(T.allowedOutput)}: ${assessment.allowedOutput}`,
    `- ${text(T.captured)}: ${profile.capturedAt}`,
    "",
    `## ${text(T.summary)}`,
    "",
    pickText(assessment.summary, lang),
    "",
    `## ${text(T.interview)}`,
    "",
    `- ${text(T.age)}: ${profile.age || text(T.notProvided)}`,
    `- ${text(T.currentWork)}: ${profile.occupation || text(T.notProvided)}`,
    `- ${text(T.business)}: ${profile.idea}`,
    `- ${text(T.targetUsers)}: ${profile.audience}`,
    `- ${text(T.problem)}: ${profile.problem}`,
    `- ${text(T.market)}: ${profile.market}`,
    `- ${text(T.edge)}: ${profile.edge}`,
    `- ${text(T.model)}: ${profile.model}`,
    `- ${text(T.evidence)}: ${profile.evidence}`,
    `- ${text(T.decision)}: ${profile.decision}`,
    `- ${text(T.constraints)}: ${profile.constraints}`,
    "",
    `## ${text(T.dimensions)}`,
    "",
    `| ${text(T.dimension)} | ${text(T.status)} | ${text(T.reason)} |`,
    "| --- | --- | --- |",
    ...statusLabel,
    "",
    `## ${text(T.risks)}`,
    "",
    ...list(assessment.risks).map((item) => `- ${item}`),
    "",
    `## ${text(T.next)}`,
    "",
    ...list(assessment.nextSteps).map((item, index) => `${index + 1}. ${item}`),
    "",
  ].join("\n");
}
