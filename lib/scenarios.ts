import { LOCKED_LIMITS, type CodeDef, type ResearchDesign, type SceneDef, type Subject } from "./types";
import { windowFor } from "./window";

export interface Scenario {
  id: string;
  title: string;
  subtitle: string;
  tags: string[];
  audience: string;
  brief: string;
  match: RegExp;
  build: (now: Date) => ResearchDesign;
}

function code(id: string, label: string, definition: string, keywords: string[]): CodeDef {
  return { id, label, definition, keywords };
}

function scene(id: string, label: string, keywords: string[]): SceneDef {
  return { id, label, keywords };
}

function base(now: Date, partial: Omit<ResearchDesign, "timeWindow" | "zhihuCannotAnswer" | "briefLanguage"> & {
  extraLimits?: string[];
}): ResearchDesign {
  const { extraLimits, ...rest } = partial;
  return {
    ...rest,
    briefLanguage: "zh",
    zhihuCannotAnswer: [...LOCKED_LIMITS, ...(extraLimits ?? [])],
    timeWindow: windowFor(now),
  };
}

const FEEDER_BRIEF =
  "我们准备做一款面向多猫家庭的智能喂食器，想知道应该定义哪些核心功能，以及哪些宣称不足以支撑购买。";
const MEETING_BRIEF =
  "我们在做一款面向产研团队的 AI 会议纪要工具，想知道团队真实的使用场景、现有工具的痛点，以及哪些能力只是演示效果。";
const STORAGE_BRIEF =
  "我们准备做一个面向北美市场的户外储能独立站，想知道首批选品应该看哪些真实使用场景，以及哪些卖点只是参数堆砌。";
const KNOWLEDGE_BRIEF =
  "我们计划在 50 人产研团队里落地一套 AI 知识库，想知道大家在知识检索和沉淀上的真实痛点，以及哪些 RAG 能力被高估。";

const SUBJECTS_ALL: Subject[] = ["users", "buyers", "practitioners"];

function feederDesign(now: Date, brief: string): ResearchDesign {
  return base(now, {
    brief,
    decision:
      "面向多猫家庭的智能喂食器，应该优先定义哪些核心功能；哪些宣传点不足以成为购买理由。",
    subjects: ["users", "buyers"],
    stage: "needs_exploration",
    zhihuCanAnswer: [
      "多猫家庭的照料者在自己的话里描述了哪些失败和临时办法。",
      "哪些功能与具体场景绑定，例如抢食、离家、卡粮、断电或清洁。",
      "检索到的讨论里，哪些宣称频繁出现怀疑性措辞。",
    ],
    extraLimits: ["一个人最终会不会付费、换机或推荐。", "多猫喂食器的市场规模有多大。"],
    scenes: [
      scene("multi_cat", "多猫争食与分量", ["多猫", "抢食", "分食", "两只", "三只", "只数", "好几只"]),
      scene("schedule", "定时与离家", ["定时", "出差", "出门", "加班", "不在家", "旅行", "自动出粮"]),
      scene("jam", "卡粮与出粮错误", ["卡粮", "不出粮", "堵住", "定量", "份量", "一次出"]),
      scene("power", "断电与离线使用", ["断电", "断网", "离线", "停电", "电池", "没电"]),
      scene("hygiene", "清洁、受潮与发霉", ["清洁", "发霉", "受潮", "清洗", "残留", "霉"]),
      scene("refusal", "拒食与适口性", ["不吃", "拒食", "挑食", "不靠近", "适口"]),
      scene("claims", "摄像头、App 与识猫", ["摄像头", "识猫", "APP", "App", "远程", "语音", "监控"]),
    ],
    populations: [
      "多猫家庭的日常照料者",
      "买单的人（当帖子把照料者和付费者分开时）",
      "测评与品牌账号（只保留并标记为营销）",
    ],
    inclusion: [
      "帖子描述了真实上手、故障，或对猫喂食器的具体宣称。",
      "帖子命中计划中的场景或产品词，并且由计划查询或热榜检索到。",
    ],
    exclusion: ["与猫喂食无关的热榜条目。", "同一链接的重复出现。", "没有具体使用、故障或宣称的帖子。"],
    stoppingRule:
      "跑完计划内的全部查询就停。某个场景的纳入条目少于两条，就保持未覆盖。不追加查询来制造一致性。",
    queries: ["多猫 智能喂食器", "多猫 自动喂食器 抢食", "智能喂食器 卡粮 断电", "智能喂食器 摄像头 鸡肋"],
    productTerms: ["喂食", "喂食器", "猫粮", "自动喂", "粮桶", "feeder"],
    codebook: [
      code("multi_cat", "多猫争食", "帖子描述了不止一只猫、抢食或分食。", [
        "多猫",
        "两只",
        "三只",
        "抢食",
        "分食",
        "只数",
        "好几只",
        "multi-cat",
        "several cats",
      ]),
      code("schedule", "定时与离家", "帖子描述了定时、出差，或照料者不在家。", [
        "定时",
        "出差",
        "出门",
        "加班",
        "不在家",
        "旅行",
        "自动出粮",
        "timer",
      ]),
      code("jam", "卡粮与出粮错误", "帖子描述了卡粮、漏喂，或出粮分量不对。", [
        "卡粮",
        "不出粮",
        "卡食",
        "堵住",
        "定量",
        "份量",
        "吃太多",
        "一次出",
      ]),
      code("power", "断电与离线", "帖子描述了断电、断网，或电池问题。", [
        "断电",
        "断网",
        "离线",
        "停电",
        "电池",
        "没电",
      ]),
      code("hygiene", "清洁与受潮", "帖子描述了清洗、发霉、受潮，或粮仓残留。", [
        "清洁",
        "发霉",
        "受潮",
        "清洗",
        "残留",
        "霉",
      ]),
      code("refusal", "拒食", "帖子描述了猫不愿意从喂食器进食。", ["不吃", "拒食", "挑食", "不靠近", "适口"]),
      code("claim_weak", "怀疑性宣称", "发帖人把某个功能或口号看成用不上、噱头或没必要。", [
        "鸡肋",
        "智商税",
        "没用",
        "没必要",
        "噱头",
        "闲置",
        "宣传",
      ]),
      code("claim_strong", "强需求宣称", "发帖人把某个功能说成自己离不开。这不等于购买证明。", [
        "离不开",
        "必须有",
        "最有用",
        "真的需要",
        "省心",
      ]),
    ],
  });
}

function meetingDesign(now: Date, brief: string): ResearchDesign {
  return base(now, {
    brief,
    decision:
      "面向产研团队的 AI 会议纪要工具，应该优先定义哪些能力；哪些宣传点不足以成为团队采购与长期使用的理由。",
    subjects: SUBJECTS_ALL,
    stage: "needs_exploration",
    zhihuCanAnswer: [
      "产研团队在哪些会议类型里真正需要纪要，以及现在由谁记录。",
      "现有工具在转写、行动项和协作上具体卡在哪里。",
      "哪些能力只在演示里好看，实际开会时会被放弃。",
    ],
    extraLimits: ["团队最终会不会采购，以及愿意付多少钱。", "会议纪要工具的市场规模与竞争格局。"],
    scenes: [
      scene("accuracy", "记录准确与可追溯", ["准确", "错字", "漏记", "识别", "口音", "方言", "转录"]),
      scene("action", "行动项与跟进", ["行动项", "待办", "跟进", "负责人", "落地", "todo", "闭环"]),
      scene("meeting_type", "会议类型适配", ["周会", "评审", "复盘", "访谈", "客户会", "站会", "培训"]),
      scene("collaboration", "协作与共享", ["共享", "同步", "协作", "导出", "飞书", "钉钉", "企微", "文档"]),
      scene("privacy", "录音与数据顾虑", ["隐私", "录音", "合规", "权限", "数据安全", "本地部署", "泄露"]),
      scene("adoption", "使用门槛与习惯", ["上手", "学习成本", "习惯", "打断", "没人用", "流程"]),
      scene("integration", "集成与工作流", ["集成", "API", "日历", "插件", "接入", "工作流"]),
    ],
    populations: [
      "产研团队负责人与项目经理",
      "会议记录人（PM、运营、助理）",
      "一线工程师与设计师",
      "采购、IT 与信息安全",
    ],
    inclusion: [
      "帖子描述了真实使用会议纪要工具的经历、失败或具体评价。",
      "帖子命中计划场景或产品词，并且由计划查询或热榜检索到。",
    ],
    exclusion: ["与会议纪要无关的热榜条目。", "同一链接的重复出现。", "纯产品发布稿，且没有实际使用细节的帖子。"],
    stoppingRule:
      "跑完计划内的全部查询就停。某个场景的纳入条目少于两条，就保持未覆盖。不追加查询来制造一致性。",
    queries: [
      "AI 会议纪要 好用吗",
      "会议纪要 自动生成 准确 踩坑",
      "AI 会议 记录 隐私 录音",
      "会议纪要 工具 对比 飞书",
    ],
    productTerms: ["会议纪要", "会议记录", "AI会议", "转录", "语音转写", "纪要"],
    codebook: [
      code("accuracy", "转写准确度", "帖子描述听错、漏字、方言或专业词识别问题。", [
        "准确",
        "错字",
        "漏",
        "识别",
        "口音",
        "方言",
        "转录",
      ]),
      code("action", "行动项遗漏", "帖子描述待办没有被记下、没有负责人或没有跟进。", [
        "行动项",
        "待办",
        "跟进",
        "负责人",
        "落地",
        "忘了",
      ]),
      code("meeting_type", "会议场景错配", "帖子按会议类型评价工具是否适用。", [
        "周会",
        "评审",
        "复盘",
        "访谈",
        "客户",
        "站会",
        "培训",
      ]),
      code("collaboration", "协作与共享摩擦", "帖子描述共享、导出或跨工具同步的摩擦。", [
        "共享",
        "同步",
        "协作",
        "导出",
        "飞书",
        "钉钉",
        "企微",
      ]),
      code("privacy", "录音与数据顾虑", "帖子提到录音、权限、合规或数据安全顾虑。", [
        "隐私",
        "录音",
        "合规",
        "权限",
        "安全",
        "泄露",
      ]),
      code("adoption", "使用门槛", "帖子描述上手、习惯或流程上的阻力。", [
        "上手",
        "学习成本",
        "习惯",
        "打断",
        "没人用",
        "流程",
      ]),
      code("gimmick", "演示型功能", "发帖人把某个能力看成花哨、演示导向或用不上。", [
        "演示",
        "噱头",
        "鸡肋",
        "用不上",
        "花哨",
        "智商税",
      ]),
      code("trust", "信任与人工复核", "帖子描述人工核对、校对或不信任 AI 记录。", [
        "信任",
        "核对",
        "人工",
        "复核",
        "校对",
        "不放心",
      ]),
    ],
  });
}

function storageDesign(now: Date, brief: string): ResearchDesign {
  return base(now, {
    brief,
    decision:
      "面向北美市场的户外储能独立站，首批选品应该围绕哪些真实使用场景；哪些参数卖点不足以支撑溢价与购买。",
    subjects: SUBJECTS_ALL,
    stage: "needs_exploration",
    zhihuCanAnswer: [
      "露营、房车和备灾用户在实际使用中遇到了哪些电力问题。",
      "哪些参数（容量、功率、噪音、重量）被用户反复拿来比较。",
      "哪些卖点被用户当成虚标、冗余或只在参数表里好看。",
    ],
    extraLimits: ["北美各价格带的实际销量与市场份额。", "独立站最终的转化率和投放回收周期。"],
    scenes: [
      scene("outage", "停电与家庭应急", ["停电", "断电", "应急", "备灾", "台风", "地震", "抢修"]),
      scene("camping", "露营与户外", ["露营", "野餐", "自驾", "户外", "营地", "徒步"]),
      scene("rv", "房车与长途", ["房车", "床车", "自驾游", "长途", "驻车"]),
      scene("solar", "太阳能补电", ["太阳能", "光伏", "充电", "补电", "晒", "板"]),
      scene("capacity", "容量与功率", ["容量", "功率", "瓦", "度电", "带不动", "虚标", "输出"]),
      scene("noise_weight", "噪音与重量", ["噪音", "声音", "太重", "搬", "便携", "体积"]),
      scene("safety", "安全与认证", ["安全", "认证", "起火", "爆炸", "UL", "保险", "温控"]),
      scene("aftersale", "售后与退换", ["售后", "退货", "保修", "客服", "维修", "换新"]),
    ],
    populations: [
      "北美露营与房车用户",
      "家庭应急备灾用户",
      "户外内容创作者与测评者",
      "渠道、售后与跨境卖家",
    ],
    inclusion: [
      "帖子描述了真实使用、故障，或对户外电源的具体比较与抱怨。",
      "帖子命中计划场景或产品词，并且由计划查询或热榜检索到。",
    ],
    exclusion: ["与户外用电无关的热榜条目。", "同一链接的重复出现。", "纯开箱晒单，且没有使用细节的帖子。"],
    stoppingRule:
      "跑完计划内的全部查询就停。某个场景的纳入条目少于两条，就保持未覆盖。不追加查询来制造一致性。",
    queries: [
      "户外电源 露营 真实体验",
      "户外电源 停电 应急 备灾",
      "户外电源 虚标 容量",
      "户外电源 选购 避坑 售后",
    ],
    productTerms: ["户外电源", "储能电源", "便携电源", "户外储能", "移动电源", "电源"],
    codebook: [
      code("outage", "停电应急", "帖子把电源和停电、灾害或家庭备灾场景绑定。", [
        "停电",
        "断电",
        "应急",
        "备灾",
        "台风",
        "地震",
      ]),
      code("camping", "露营场景", "帖子描述露营、自驾或户外活动中的用电需求。", [
        "露营",
        "野餐",
        "自驾",
        "户外",
        "营地",
      ]),
      code("capacity", "容量功率焦虑", "帖子讨论容量、功率、带不动或参数虚标。", [
        "容量",
        "功率",
        "瓦",
        "度电",
        "带不动",
        "虚标",
      ]),
      code("solar", "补电方式", "帖子讨论太阳能、车充或补电效率。", ["太阳能", "光伏", "充电", "补电", "晒"]),
      code("noise_weight", "噪音与重量", "帖子抱怨噪音、重量或搬运不便。", [
        "噪音",
        "声音",
        "太重",
        "搬",
        "便携",
        "体积",
      ]),
      code("safety", "安全与认证", "帖子提到安全、认证、温控或事故风险。", [
        "安全",
        "认证",
        "起火",
        "爆炸",
        "UL",
        "保险",
        "温控",
      ]),
      code("gimmick", "参数堆砌与噱头", "发帖人认为某些卖点只是参数好看或用不上。", [
        "噱头",
        "鸡肋",
        "用不上",
        "智商税",
        "堆参数",
        "多余",
      ]),
      code("aftersale", "售后与退换", "帖子描述了售后、保修、退货或维修体验。", [
        "售后",
        "退货",
        "保修",
        "客服",
        "维修",
        "换新",
      ]),
    ],
  });
}

function knowledgeDesign(now: Date, brief: string): ResearchDesign {
  return base(now, {
    brief,
    decision:
      "在 50 人规模的产研团队里落地 AI 知识库，应该优先解决哪些知识检索与沉淀问题；哪些 RAG 能力被高估。",
    subjects: SUBJECTS_ALL,
    stage: "needs_exploration",
    zhihuCanAnswer: [
      "团队在找文档、找历史决策时具体卡在哪一步。",
      "文档过期、权限和没人维护这些问题如何出现。",
      "哪些 AI 知识库能力被实际使用者认为不可信或用不上。",
    ],
    extraLimits: ["具体供应商的采购决策。", "知识库项目的投资回报率与人力节省测算。"],
    scenes: [
      scene("search", "找不到文档", ["找不到", "搜不到", "检索", "搜索", "翻半天", "定位"]),
      scene("stale", "文档过期", ["过期", "旧版", "没更新", "维护", "废弃", "版本"]),
      scene("permission", "权限与安全", ["权限", "保密", "安全", "泄露", "隔离", "访问"]),
      scene("trust", "回答不可信", ["幻觉", "瞎编", "不准", "错误", "引用", "来源"]),
      scene("capture", "知识沉淀成本", ["沉淀", "整理", "录入", "没人写", "维护成本", "模板"]),
      scene("adoption", "推广与使用习惯", ["推广", "没人用", "习惯", "培训", "上手", "活跃"]),
      scene("integration", "工具与集成", ["飞书", "钉钉", "企微", "Notion", "Confluence", "集成"]),
      scene("evaluation", "效果评估", ["效果", "ROI", "指标", "评估", "测试", "验收"]),
    ],
    populations: [
      "50 人规模产研团队的技术负责人",
      "一线工程师、产品经理与设计师",
      "负责知识库落地的平台/效能团队",
      "IT 与信息安全",
    ],
    inclusion: [
      "帖子描述了真实搭建、使用或评估知识库的经历与失败。",
      "帖子命中计划场景或产品词，并且由计划查询或热榜检索到。",
    ],
    exclusion: ["与知识库、RAG 无关的热榜条目。", "同一链接的重复出现。", "纯厂商软文，且没有实际使用细节的帖子。"],
    stoppingRule:
      "跑完计划内的全部查询就停。某个场景的纳入条目少于两条，就保持未覆盖。不追加查询来制造一致性。",
    queries: [
      "企业知识库 落地 踩坑",
      "RAG 知识库 效果 差",
      "内部文档 搜索 找不到",
      "AI 知识库 员工 不用",
    ],
    productTerms: ["知识库", "RAG", "检索", "文档", "知识管理", "wiki", "语料", "大模型"],
    codebook: [
      code("search", "检索失败", "帖子描述找不到、搜不到或定位不到文档。", [
        "找不到",
        "搜不到",
        "检索",
        "搜索",
        "翻半天",
      ]),
      code("stale", "文档过期", "帖子描述文档过期、版本混乱或无人维护。", [
        "过期",
        "旧版",
        "没更新",
        "维护",
        "版本",
      ]),
      code("permission", "权限与安全", "帖子提到权限、保密、隔离或数据泄露顾虑。", [
        "权限",
        "保密",
        "安全",
        "泄露",
        "隔离",
      ]),
      code("hallucination", "幻觉与不可信", "帖子描述 AI 回答不准、瞎编或缺少来源。", [
        "幻觉",
        "瞎编",
        "不准",
        "错误",
        "引用",
        "来源",
      ]),
      code("maintenance", "沉淀成本", "帖子描述整理、录入和维护知识的人工成本。", [
        "沉淀",
        "整理",
        "录入",
        "没人写",
        "维护成本",
      ]),
      code("adoption", "推广阻力", "帖子描述没人用、习惯难改或培训成本。", [
        "推广",
        "没人用",
        "习惯",
        "培训",
        "活跃",
      ]),
      code("integration", "集成摩擦", "帖子描述与飞书、钉钉、Confluence 等工具的集成问题。", [
        "飞书",
        "钉钉",
        "企微",
        "Notion",
        "Confluence",
        "集成",
      ]),
      code("gimmick", "被高估的能力", "发帖人把某些 AI 知识库能力看成噱头或演示效果。", [
        "噱头",
        "鸡肋",
        "用不上",
        "智商税",
        "演示",
      ]),
    ],
  });
}

export const SCENARIOS: Scenario[] = [
  {
    id: "smart-feeder",
    title: "多猫智能喂食器",
    subtitle: "哪些功能是真需求，哪些宣称经不起推敲",
    tags: ["消费硬件", "需求探索"],
    audience: "硬件产品团队",
    brief: FEEDER_BRIEF,
    match: /喂食器|智能喂食|猫粮|multi-cat|feeder/i,
    build: (now) => feederDesign(now, FEEDER_BRIEF),
  },
  {
    id: "ai-meeting",
    title: "AI 会议纪要",
    subtitle: "产研团队真正愿意每天用的能力是什么",
    tags: ["B2B SaaS", "产品发现"],
    audience: "效率工具产品经理",
    brief: MEETING_BRIEF,
    match: /会议纪要|会议记录|meeting minutes|ai meeting/i,
    build: (now) => meetingDesign(now, MEETING_BRIEF),
  },
  {
    id: "outdoor-power",
    title: "户外储能出海",
    subtitle: "北美用户为哪些场景买单，哪些参数只是堆料",
    tags: ["跨境出海", "选品研究"],
    audience: "出海品牌与独立站",
    brief: STORAGE_BRIEF,
    match: /户外电源|户外储能|储能|独立站|跨境|出海|portable power/i,
    build: (now) => storageDesign(now, STORAGE_BRIEF),
  },
  {
    id: "ai-knowledge-base",
    title: "AI 知识库落地",
    subtitle: "50 人产研团队为什么用不起来",
    tags: ["企业 AI", "知识管理"],
    audience: "平台与效能团队",
    brief: KNOWLEDGE_BRIEF,
    match: /知识库|RAG|知识管理|wiki|知识沉淀/i,
    build: (now) => knowledgeDesign(now, KNOWLEDGE_BRIEF),
  },
];

export function scenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((scenario) => scenario.id === id);
}

export function scenarioForBrief(brief: string): Scenario | undefined {
  return SCENARIOS.find((scenario) => scenario.match.test(brief));
}
