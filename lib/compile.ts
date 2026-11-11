import {
  LOCKED_LIMITS,
  STAGES,
  SUBJECTS,
  type CodeDef,
  type ResearchDesign,
  type SceneDef,
  type Stage,
  type Subject,
} from "./types";

const STOP = new Set(
  "我们 准备 面向 想知道 应该 哪些 以及 这个 一个 进行 如何 什么 还是 可以 不是 没有 自己 他们 因为 所以 如果 已经 需要 希望 了解 研究 产品 知道 定义 宣称 支撑 购买 家庭 一款 做一 不足".split(
    " ",
  ),
);

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function windowFor(now: Date): ResearchDesign["timeWindow"] {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCMonth(start.getUTCMonth() - 24);
  return {
    start: isoDay(start),
    end: isoDay(end),
    rationale:
      "Twenty-four months. Older posts can remain in the sample, and the quality view flags them as stale.",
  };
}

function languageOf(brief: string): "en" | "zh" {
  const cjk = brief.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  return cjk >= 4 ? "zh" : "en";
}

function isFeeder(brief: string): boolean {
  return /喂食器|智能喂食|feeder/i.test(brief);
}

function segments(brief: string): string[] {
  const parts = brief
    .split(/[，。！？、\s,.!?;；：:“”"'（）()【】\[\]的了和与或以及应该哪些想要知道准备面向一款我们不足以支撑]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2 && part.length <= 12 && !STOP.has(part));
  const out: string[] = [];
  for (const part of parts) {
    if (!out.includes(part)) out.push(part);
  }
  return out;
}

function stageFor(brief: string): Stage {
  if (/概念测试|concept test|原型测试/i.test(brief)) return "concept_test";
  if (/竞品|对比|哪个更|versus|competitor/i.test(brief)) return "competitive_analysis";
  if (/购买|入手|值不值|purchase|pricing/i.test(brief)) return "purchase_friction";
  return "needs_exploration";
}

function subjectsFor(brief: string): Subject[] {
  const subjects = new Set<Subject>();
  if (/医生|工程师|老师|运营|兽医|从业|practitioner/i.test(brief)) subjects.add("practitioners");
  if (/购买|买家|入手|buyer|purchase/i.test(brief)) subjects.add("buyers");
  if (/用户|家庭|使用|user|household/i.test(brief) || subjects.size === 0) subjects.add("users");
  return SUBJECTS.filter((subject) => subjects.has(subject));
}

function code(
  id: string,
  label: string,
  definition: string,
  keywords: string[],
): CodeDef {
  return { id, label, definition, keywords };
}

function scene(id: string, label: string, keywords: string[]): SceneDef {
  return { id, label, keywords };
}

const FEEDER_CODES: CodeDef[] = [
  code(
    "multi_cat",
    "Multi-cat competition",
    "The post describes more than one cat, grabbing food, or splitting portions.",
    ["多猫", "两只", "三只", "抢食", "分食", "只数", "好几只", "multi-cat", "several cats"],
  ),
  code(
    "schedule",
    "Scheduling and time away",
    "The post describes timers, travel, or the caretaker being out.",
    ["定时", "出差", "出门", "加班", "不在家", "旅行", "自动出粮", "timer"],
  ),
  code(
    "jam",
    "Jams and wrong portions",
    "The post describes a jam, a missed meal, or the wrong amount of food.",
    ["卡粮", "不出粮", "卡食", "堵住", "定量", "份量", "吃太多", "一次出"],
  ),
  code(
    "power",
    "Power and offline use",
    "The post describes power loss, a dead network, or a battery.",
    ["断电", "断网", "离线", "停电", "电池", "没电"],
  ),
  code(
    "hygiene",
    "Cleaning and moisture",
    "The post describes cleaning, mold, moisture, or food left in the machine.",
    ["清洁", "发霉", "受潮", "清洗", "残留", "霉"],
  ),
  code(
    "refusal",
    "Refusal",
    "The post describes a cat that will not eat from the feeder.",
    ["不吃", "拒食", "挑食", "不靠近", "适口"],
  ),
  code(
    "claim_weak",
    "Skeptical claim language",
    "The speaker treats a feature or slogan as unused, gimmicky, or unnecessary.",
    ["鸡肋", "智商税", "没用", "没必要", "噱头", "闲置", "宣传"],
  ),
  code(
    "claim_strong",
    "Strong claim language",
    "The speaker treats a feature as necessary in their own use. This is not purchase proof.",
    ["离不开", "必须有", "最有用", "真的需要", "省心"],
  ),
];

const FEEDER_SCENES: SceneDef[] = [
  scene("multi_cat", "Multi-cat competition and portioning", ["多猫", "抢食", "分食", "两只", "三只"]),
  scene("schedule", "Scheduling and time away", ["定时", "出差", "出门", "加班", "不在家", "旅行"]),
  scene("jam", "Jams and wrong portions", ["卡粮", "不出粮", "定量", "堵住", "份量"]),
  scene("power", "Power loss and offline use", ["断电", "断网", "离线", "停电", "电池"]),
  scene("hygiene", "Cleaning, mold, and moisture", ["清洁", "发霉", "受潮", "清洗", "霉"]),
  scene("refusal", "Refusal and palatability", ["不吃", "拒食", "挑食", "适口"]),
  scene("claims", "Cameras, apps, and cat recognition", ["摄像头", "识猫", "APP", "App", "远程", "语音", "监控"]),
];

function feederDesign(brief: string, now: Date): ResearchDesign {
  return {
    brief,
    briefLanguage: languageOf(brief),
    decision:
      "Which core functions to define for a smart feeder built for multi-cat households, and which advertised claims are too weak to treat as reasons to buy.",
    subjects: ["users", "buyers"],
    stage: "needs_exploration",
    zhihuCanAnswer: [
      "Which failures and workarounds multi-cat caretakers describe in their own words.",
      "Which functions are tied to a scene, such as competition, travel, jams, power loss, or cleaning.",
      "Which claims attract skeptical language in the retrieved discussion.",
    ],
    zhihuCannotAnswer: [
      ...LOCKED_LIMITS,
      "Whether a person will pay, switch, or recommend.",
      "How large the multi-cat feeder market is.",
    ],
    scenes: FEEDER_SCENES,
    populations: [
      "Multi-cat household caretakers",
      "The person who pays, when a post separates that person from the caretaker",
      "Reviewers and brand accounts, kept only with a marketing flag",
    ],
    timeWindow: windowFor(now),
    inclusion: [
      "The post describes hands-on use, a failure, or a specific claim about a cat feeder.",
      "The post matches a planned scene or a product term, and a planned query or the hot list retrieved it.",
    ],
    exclusion: [
      "Hot-list items that are not about cat feeding.",
      "A second copy of the same link.",
      "Posts with no concrete use, failure, or claim.",
    ],
    stoppingRule:
      "Run every planned query, then stop. A scene with fewer than two included items stays uncovered. Do not add queries to manufacture agreement.",
    queries: [
      "多猫 智能喂食器",
      "多猫 自动喂食器 抢食",
      "智能喂食器 卡粮 断电",
      "智能喂食器 摄像头 鸡肋",
    ],
    productTerms: ["喂食", "喂食器", "猫粮", "自动喂", "粮桶", "feeder"],
    codebook: FEEDER_CODES,
  };
}

function genericDesign(brief: string, now: Date): ResearchDesign {
  const bits = segments(brief).slice(0, 6);
  const labels = bits.length > 0 ? bits : [brief.slice(0, 24) || "Topic"];
  const scenes = labels.slice(0, 4).map((label, index) => scene(`scene_${index + 1}`, label, [label]));
  const queries = (bits.length > 0 ? bits : [brief.slice(0, 32)]).slice(0, 6);
  return {
    brief,
    briefLanguage: languageOf(brief),
    decision: brief.trim(),
    subjects: subjectsFor(brief),
    stage: stageFor(brief),
    zhihuCanAnswer: [
      "How people who post on Zhihu describe the situation, the failures, and the words they use.",
      "Which of the named scenes show up in the retrieval, and which do not.",
    ],
    zhihuCannotAnswer: [
      ...LOCKED_LIMITS,
      "Market size, willingness to pay, and a ranked roadmap.",
    ],
    scenes,
    populations: [
      "People speaking from direct experience",
      "Buyers, when a post separates the person who pays",
      "Practitioners, when the author writes from a job",
    ],
    timeWindow: windowFor(now),
    inclusion: [
      "The post describes a concrete experience, failure, or claim about the brief.",
      "A planned query or the hot list retrieved the post, and the post matches a product term or a scene.",
    ],
    exclusion: [
      "Hot-list items that do not match the brief.",
      "A second copy of the same link.",
      "Posts with no concrete experience, failure, or claim.",
    ],
    stoppingRule:
      "Run every planned query, then stop. A scene with fewer than two included items stays uncovered. Do not add queries to manufacture agreement.",
    queries,
    productTerms: labels.slice(0, 6),
    codebook: labels.slice(0, 6).map((label, index) =>
      code(`topic_${index + 1}`, label, `The post uses the term ${label}.`, [label]),
    ),
  };
}

export function compileDesign(brief: string, now = new Date()): ResearchDesign {
  const text = brief.trim();
  if (!text) {
    throw new Error("BRIEF_REQUIRED");
  }
  return isFeeder(text) ? feederDesign(text, now) : genericDesign(text, now);
}

export function normalizeDesign(design: ResearchDesign): ResearchDesign {
  if (!design.decision.trim()) throw new Error("DECISION_REQUIRED");
  if (!STAGES.includes(design.stage)) throw new Error("STAGE_INVALID");
  if (design.subjects.length === 0) throw new Error("SUBJECTS_REQUIRED");
  if (design.scenes.length === 0) throw new Error("SCENES_REQUIRED");
  if (design.populations.length === 0) throw new Error("POPULATIONS_REQUIRED");
  if (design.queries.length === 0) throw new Error("QUERIES_REQUIRED");
  if (design.inclusion.length === 0 || design.exclusion.length === 0) {
    throw new Error("RULES_REQUIRED");
  }
  if (!design.stoppingRule.trim()) throw new Error("STOPPING_RULE_REQUIRED");
  if (!design.timeWindow.start || !design.timeWindow.end) throw new Error("WINDOW_REQUIRED");
  const extra = design.zhihuCannotAnswer.filter(
    (line) => !LOCKED_LIMITS.includes(line as (typeof LOCKED_LIMITS)[number]),
  );
  return {
    ...design,
    zhihuCanAnswer: design.zhihuCanAnswer.map((line) => line.trim()).filter(Boolean),
    zhihuCannotAnswer: [...LOCKED_LIMITS, ...extra],
    queries: design.queries.map((query) => query.trim()).filter(Boolean),
  };
}

export function designHasChineseQueries(design: ResearchDesign): boolean {
  return design.queries.some((query) => /[\u4e00-\u9fff]/.test(query));
}
