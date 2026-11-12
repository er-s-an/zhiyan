export interface PlayBrief {
  id: string;
  labelZh: string;
  labelEn: string;
  textZh: string;
  textEn: string;
}

export const PLAY_BRIEFS: PlayBrief[] = [
  {
    id: "freelancer-contract",
    labelZh: "自由职业 × 合同回款",
    labelEn: "Freelancers × contracts",
    textZh: "我是一个海外独立开发者，想为中国自由职业者（设计师、开发者、撰稿人、顾问）做一款 AI 合同与回款工具。他们在报价、改需求、验收和尾款上经常出问题。我想先确认这是不是值得做的真实痛点、哪些场景最重要，以及下一步最该验证什么。",
    textEn: "I'm a solo founder outside China. I want to build an AI contract and payment-collection tool for Chinese freelancers (designers, developers, writers, consultants). They struggle with quoting, scope changes, acceptance and late payment. I need to know whether this is a real pain worth building, what scenarios matter, and what I should validate first.",
  },
  {
    id: "baby-food",
    labelZh: "新手父母 × 辅食",
    labelEn: "New parents × baby food",
    textZh: "我想为中国一二线城市的新手父母做一款 AI 辅食计划工具，帮他们按宝宝月龄安排每周食谱、生成采购清单，并减少「不知道做什么、做了不吃」的焦虑。我想先确认父母现在到底怎么解决辅食问题，哪些环节最费时间，以及是否值得做成独立产品。",
    textEn: "I want to build an AI baby-food planning tool for new parents in China's major cities: weekly meal plans by age, shopping lists, and less anxiety around 'what to make and what the baby refuses.' I want to understand how parents currently solve this, which step is most time-consuming, and whether it deserves a standalone product.",
  },
  {
    id: "coffee-shop",
    labelZh: "独立咖啡店 × 排班库存",
    labelEn: "Cafés × scheduling & stock",
    textZh: "我想为中国的独立咖啡店做一款 AI 排班和库存工具，根据天气、节假日和附近活动预测客流，减少高峰期人手不足和原料浪费。我想先确认店主现在怎么做决定，最痛的是排班还是库存，以及他们会不会为这种工具付费。",
    textEn: "I want to build an AI scheduling and inventory tool for independent coffee shops in China, forecasting footfall from weather, holidays and local events to reduce understaffing and waste. I want to learn how owners make these decisions today, whether scheduling or inventory hurts more, and whether they would pay.",
  },
  {
    id: "student-job",
    labelZh: "留学生 × 求职",
    labelEn: "International students × jobs",
    textZh: "我想为准备回国求职的中国留学生做一款 AI 简历和面试准备工具，帮他们把海外经历翻译成国内 HR 能理解的项目语言，并针对目标岗位模拟面试。我想先确认他们现在最卡在哪一步，是简历、投递、笔试还是面试，以及通用 AI 为什么不够。",
    textEn: "I want to build an AI resume and interview-prep tool for Chinese students returning from overseas. It would translate international experience into language Chinese HR understands and run role-specific mock interviews. I want to know where they get stuck today—resume, applications, tests or interviews—and why general AI is not enough.",
  },
  {
    id: "pet-health",
    labelZh: "宠物主 × 健康记录",
    labelEn: "Pet owners × health records",
    textZh: "我想为中国城市里的宠物主做一款 AI 宠物健康记录工具，帮他们整理疫苗、驱虫、体重、就诊和用药记录，并在异常时提醒何时该去医院，而不是在线诊断。我想先确认宠物主现在怎么记录、最担心什么，以及这个需求是否足够高频。",
    textEn: "I want to build an AI pet-health record tool for urban pet owners in China: vaccines, deworming, weight, vet visits and medication, with prompts on when to see a vet rather than online diagnosis. I want to understand how owners track this now, what worries them most, and whether the need is frequent enough.",
  },
  {
    id: "cross-border-support",
    labelZh: "跨境卖家 × 多语言客服",
    labelEn: "Cross-border sellers × support",
    textZh: "我想为中国跨境电商卖家做一款 AI 多语言客服工具，处理售前咨询、物流查询、退换货和差评回复，并保留平台规则和品牌语气。我想先确认卖家现在怎么处理多语言客服，最耗时的是哪类问题，以及他们更愿意买工具还是外包。",
    textEn: "I want to build an AI multilingual customer-support tool for Chinese cross-border sellers, covering pre-sales questions, logistics, returns and negative reviews while respecting platform rules and brand voice. I want to learn how sellers handle multilingual support today, which questions take the most time, and whether they prefer software or outsourcing.",
  },
  {
    id: "illustrator-rights",
    labelZh: "插画师 × 版权接单",
    labelEn: "Illustrators × rights & clients",
    textZh: "我想为中国自由插画师做一款 AI 接单和版权管理工具，帮他们管理报价、修改次数、交付文件、授权范围和客户沟通记录。我想先确认插画师现在最常遇到的纠纷是什么，哪些环节最需要工具，以及他们是否愿意把接单流程搬到一个新工具里。",
    textEn: "I want to build an AI client and rights-management tool for freelance illustrators in China: quotes, revision limits, deliverable files, licensing scope and client communication records. I want to understand the most common disputes, which steps need software most, and whether illustrators would move their workflow into a new tool.",
  },
  {
    id: "gym-retention",
    labelZh: "健身房 × 私教续费",
    labelEn: "Gyms × trainer retention",
    textZh: "我想为中国二线城市的健身房做一款 AI 私教销售和续费工具，帮教练根据会员训练记录、到店频率和沟通记录判断谁有流失风险，并生成合适的跟进话术。我想先确认健身房现在怎么管理续费，教练真正缺的是数据、话术还是时间。",
    textEn: "I want to build an AI sales and retention tool for personal trainers at gyms in China's tier-2 cities. It would use training records, visit frequency and communication logs to flag churn risk and suggest follow-up scripts. I want to learn how gyms manage renewals today and whether trainers lack data, scripts or time.",
  },
  {
    id: "teacher-prep",
    labelZh: "中学教师 × 备课沟通",
    labelEn: "Teachers × lesson prep",
    textZh: "我想为中国中学教师做一款 AI 备课和家校沟通工具，帮他们根据教材和学情生成分层练习、课堂活动，并把学生情况整理成家长能理解的反馈。我想先确认教师现在最花时间的工作是什么，学校采购和教师自用的差别在哪里，以及合规边界是什么。",
    textEn: "I want to build an AI lesson-prep and parent-communication tool for Chinese secondary-school teachers: differentiated exercises, classroom activities and parent-friendly student feedback. I want to understand where teachers spend the most time, how school procurement differs from teacher self-serve, and what the compliance boundaries are.",
  },
  {
    id: "elder-medication",
    labelZh: "适老化 × 用药提醒",
    labelEn: "Aging × medication",
    textZh: "我想为中国城市里的独居老人和他们的子女做一款适老化用药提醒工具，支持语音提醒、子女远程查看和异常联系，但不做在线诊断。我想先确认老人和子女现在怎么协作，最担心的是忘吃药、吃错药还是无人响应，以及这个产品该由谁付钱。",
    textEn: "I want to build an age-friendly medication-reminder tool for older adults living alone in Chinese cities and their adult children: voice reminders, remote visibility and escalation, but no online diagnosis. I want to understand how families coordinate today, whether the biggest fear is missed doses, wrong doses or no response, and who would pay.",
  },
];

export function randomPlayBrief(currentId?: string): PlayBrief {
  const pool = currentId ? PLAY_BRIEFS.filter((item) => item.id !== currentId) : PLAY_BRIEFS;
  return pool[Math.floor(Math.random() * pool.length)] ?? PLAY_BRIEFS[0];
}

export function playBriefById(id: string): PlayBrief | undefined {
  return PLAY_BRIEFS.find((item) => item.id === id);
}
