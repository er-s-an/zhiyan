export type PolicyCategory = "tax" | "startup" | "foreign";

export interface PolicyText {
  zh: string;
  en: string;
}

export interface Policy {
  id: string;
  category: PolicyCategory;
  title: PolicyText;
  benefit: PolicyText;
  audience: PolicyText;
  caveat: PolicyText;
  validity: PolicyText;
  documentNo: string;
  sourceName: string;
  sourceUrl: string;
  verifiedAt: string;
  tags: string[];
}

export const POLICIES: Policy[] = [
  {
    id: "vat-small-scale",
    category: "tax",
    title: { zh: "小规模纳税人增值税起征点与 3% 减按 1%", en: "VAT threshold and reduced 1% rate for small-scale taxpayers" },
    benefit: {
      zh: "月销售额 10 万元、季度销售额 30 万元为起征点；多数适用 3% 征收率的应税交易减按 1% 征收。",
      en: "The threshold is RMB 100,000 per month or RMB 300,000 per quarter; most transactions otherwise taxed at 3% are reduced to 1%.",
    },
    audience: { zh: "符合条件的增值税小规模纳税人，包括部分个体工商户和企业。", en: "Eligible small-scale VAT taxpayers, including qualifying individual businesses and companies." },
    caveat: {
      zh: "3% 减按 1% 不包括销售、出租不动产或转让土地使用权；按 2026 年衔接公告判断具体交易。",
      en: "The 1% rate excludes sales or leases of real estate and transfers of land-use rights. Check each transaction against the 2026 transition rules.",
    },
    validity: { zh: "2026-01-01 至 2027-12-31", en: "1 Jan 2026 – 31 Dec 2027" },
    documentNo: "财政部、税务总局，2026-01-30",
    sourceName: "关于增值税法施行后增值税优惠政策衔接事项的公告",
    sourceUrl: "https://fgk.chinatax.gov.cn/zcfgk/c102416/c5247434/content.html",
    verifiedAt: "2026-11-20",
    tags: ["增值税", "VAT", "小规模", "起征点", "1%", "个体户"],
  },
  {
    id: "individual-income-tax-half",
    category: "tax",
    title: { zh: "个体工商户个人所得税减半", en: "50% individual income tax reduction for individual businesses" },
    benefit: {
      zh: "年应纳税所得额不超过 200 万元的部分减半征收个人所得税，可与其他优惠叠加。",
      en: "Individual income tax is halved on annual taxable income up to RMB 2 million and can be combined with other relief.",
    },
    audience: { zh: "个体工商户，不区分征收方式。", en: "Individual businesses, regardless of the tax collection method." },
    caveat: {
      zh: "仅适用于个体工商户经营所得；公司制 OPC 和海外人士不自动适用。",
      en: "Only applies to income from individual businesses. Incorporated OPCs and overseas founders are not automatically eligible.",
    },
    validity: { zh: "2023-01-01 至 2027-12-31", en: "1 Jan 2023 – 31 Dec 2027" },
    documentNo: "财政部 税务总局公告2023年第12号",
    sourceName: "关于进一步支持小微企业和个体工商户发展有关税费政策的公告",
    sourceUrl: "https://fgk.chinatax.gov.cn/zcfgk/c102416/c5210453/content.html",
    verifiedAt: "2026-11-20",
    tags: ["个体工商户", "个人所得税", "200万", "减半", "individual income tax"],
  },
  {
    id: "small-profit-enterprise-tax",
    category: "tax",
    title: { zh: "小型微利企业所得税优惠", en: "Corporate income tax relief for small low-profit enterprises" },
    benefit: {
      zh: "减按 25% 计算应纳税所得额，再按 20% 税率缴纳企业所得税。",
      en: "Taxable income is calculated at 25%, then taxed at a 20% corporate income tax rate.",
    },
    audience: {
      zh: "从事非限制和禁止行业，且年应纳税所得额不超过 300 万元、从业人数不超过 300 人、资产总额不超过 5000 万元的企业。",
      en: "Enterprises outside restricted or prohibited sectors with annual taxable income up to RMB 3 million, no more than 300 employees and assets up to RMB 50 million.",
    },
    caveat: {
      zh: "三个条件必须同时符合，以年度汇算清缴结果为准；不是按“一人公司”名称直接认定。",
      en: "All three conditions must be met and are assessed through annual tax settlement. An OPC label alone does not establish eligibility.",
    },
    validity: { zh: "延续执行至 2027-12-31", en: "Extended through 31 Dec 2027" },
    documentNo: "财政部 税务总局公告2023年第12号",
    sourceName: "关于进一步支持小微企业和个体工商户发展有关税费政策的公告",
    sourceUrl: "https://fgk.chinatax.gov.cn/zcfgk/c102416/c5210453/content.html",
    verifiedAt: "2026-11-20",
    tags: ["小型微利企业", "企业所得税", "300万", "small low-profit", "corporate income tax"],
  },
  {
    id: "six-taxes-two-fees",
    category: "tax",
    title: { zh: "“六税两费”减半征收", en: "50% reduction across six local taxes and two surcharges" },
    benefit: {
      zh: "资源税、城市维护建设税、房产税、城镇土地使用税、印花税、耕地占用税，以及教育费附加、地方教育附加减半。",
      en: "A 50% reduction applies to resource, urban maintenance, property, urban land-use, stamp and farmland occupation taxes, plus education surcharges.",
    },
    audience: { zh: "增值税小规模纳税人、小型微利企业和个体工商户。", en: "Small-scale VAT taxpayers, small low-profit enterprises and individual businesses." },
    caveat: {
      zh: "资源税不含水资源税，印花税不含证券交易印花税；可与其他符合条件的优惠叠加。",
      en: "Water resource tax and securities transaction stamp duty are excluded. Relief can be stacked with other qualifying incentives.",
    },
    validity: { zh: "2023-01-01 至 2027-12-31", en: "1 Jan 2023 – 31 Dec 2027" },
    documentNo: "财政部 税务总局公告2023年第12号",
    sourceName: "关于进一步支持小微企业和个体工商户发展有关税费政策的公告",
    sourceUrl: "https://fgk.chinatax.gov.cn/zcfgk/c102416/c5210453/content.html",
    verifiedAt: "2026-11-20",
    tags: ["六税两费", "附加", "印花税", "six taxes", "surcharges"],
  },
  {
    id: "startup-guaranteed-loan",
    category: "startup",
    title: { zh: "个人创业担保贷款与财政贴息", en: "Government-guaranteed startup loans with interest subsidies" },
    benefit: {
      zh: "个人最高可申请 30 万元、期限不超过 3 年，财政部门给予实际贷款利率 50% 的贴息。",
      en: "Eligible individuals can apply for up to RMB 300,000 for up to three years, with a fiscal subsidy covering 50% of the actual interest rate.",
    },
    audience: {
      zh: "城镇登记失业人员、就业困难人员、高校毕业生、网络商户等重点就业群体。",
      en: "Key employment groups including registered unemployed people, people facing employment difficulties, graduates and online merchants.",
    },
    caveat: {
      zh: "需通过人社部门资格审核，并满足申请人及配偶贷款、担保和经办银行要求；不是无条件现金补贴。",
      en: "Eligibility review, spousal loan conditions, guarantee and lender requirements apply. This is not an unconditional cash grant.",
    },
    validity: { zh: "2023-10-01 起施行，实施期限五年", en: "Effective from 1 Oct 2023 for five years" },
    documentNo: "财金〔2023〕75号",
    sourceName: "普惠金融发展专项资金管理办法",
    sourceUrl: "https://jrs.mof.gov.cn/zhengcefabu/phjr/202309/t20230912_3906595.htm",
    verifiedAt: "2026-11-20",
    tags: ["创业担保贷款", "贴息", "30万", "startup loan", "interest subsidy"],
  },
  {
    id: "graduate-startup-subsidy",
    category: "startup",
    title: { zh: "高校毕业生一次性创业补贴", en: "One-off startup subsidy for college graduates" },
    benefit: {
      zh: "首次创办小微企业或从事个体经营，并正常运营 1 年以上，可按规定获得一次性创业补贴。",
      en: "Eligible graduates can receive a one-off subsidy after first establishing a small business or individual operation and running it for over one year.",
    },
    audience: { zh: "离校 2 年内的高校毕业生。", en: "College graduates within two years of leaving school." },
    caveat: {
      zh: "补贴金额、材料和办理流程由地方确定；并非所有自由职业者或 OPC 都能领取。",
      en: "Amounts, documents and application steps are set locally. It is not available to every freelancer or OPC.",
    },
    validity: { zh: "2026 年政策清单；具体办理以当地为准", en: "2026 policy list; local implementation applies" },
    documentNo: "人社部发〔2026〕19号",
    sourceName: "全国高校毕业生就业创业支持政策清单",
    sourceUrl: "https://www.gov.cn/zhengce/zhengceku/202603/content_7063305.htm",
    verifiedAt: "2026-11-20",
    tags: ["毕业生", "一次性创业补贴", "创业", "graduate", "startup subsidy"],
  },
  {
    id: "graduate-flexible-social-security",
    category: "startup",
    title: { zh: "毕业生灵活就业社会保险补贴", en: "Social insurance subsidy for graduates in flexible employment" },
    benefit: {
      zh: "灵活就业后缴纳社会保险费，补贴不超过实际缴费的 2/3，最长不超过 2 年。",
      en: "The subsidy covers up to two-thirds of social insurance contributions for up to two years.",
    },
    audience: { zh: "离校 2 年内未就业的高校毕业生。", en: "Unemployed college graduates within two years of leaving school." },
    caveat: {
      zh: "需符合灵活就业和参保认定，具体标准与申领渠道以当地人社部门为准。",
      en: "Flexible-employment and insurance status must be recognized. Standards and application channels follow local HR and social security authorities.",
    },
    validity: { zh: "2026 年政策清单；补贴期限最长 2 年", en: "2026 policy list; subsidy lasts up to two years" },
    documentNo: "人社部发〔2026〕19号",
    sourceName: "全国高校毕业生就业创业支持政策清单",
    sourceUrl: "https://www.gov.cn/zhengce/zhengceku/202603/content_7063305.htm",
    verifiedAt: "2026-11-20",
    tags: ["社保", "灵活就业", "毕业生", "social insurance", "flexible employment"],
  },
  {
    id: "foreign-investment-negative-list",
    category: "foreign",
    title: { zh: "外资准入负面清单：清单外内外资一致", en: "Foreign investment negative list: national treatment outside listed sectors" },
    benefit: {
      zh: "全国限制措施为 29 条，制造业外资准入限制清零；清单之外按照内外资一致原则管理。",
      en: "The national list has 29 restrictions and removes manufacturing restrictions. Sectors outside the list are managed on an equal domestic and foreign investment basis.",
    },
    audience: { zh: "拟在内地设立外商投资企业或开展经营的海外投资者。", en: "Overseas investors planning to establish or operate a foreign-invested business in mainland China." },
    caveat: {
      zh: "清单内限制，以及文化、金融等领域的行政审批、资质和国家安全要求仍需遵守；不等于自动取得经营许可。",
      en: "Listed restrictions and administrative approvals, qualifications and national security rules still apply. This does not automatically grant an operating licence.",
    },
    validity: { zh: "2024-11-01 起施行；2026-11-20 核验", en: "Effective 1 Nov 2024; verified 20 Nov 2026" },
    documentNo: "国家发展改革委、商务部令第23号",
    sourceName: "外商投资准入特别管理措施（负面清单）（2024年版）",
    sourceUrl: "https://www.ndrc.gov.cn/xxgk/zcfb/fzggwl/202409/t20240907_1392875.html",
    verifiedAt: "2026-11-20",
    tags: ["外资", "负面清单", "海外OPC", "foreign investment", "negative list"],
  },
  {
    id: "foreign-work-permit",
    category: "foreign",
    title: { zh: "外国人工作许可与电子社保卡融合", en: "Foreign work permits integrated with electronic social security cards" },
    benefit: {
      zh: "工作许可申请、延期、变更和注销全程网办；入境后无需再办理实体工作许可证，电子社保卡可用于核验。",
      en: "Work permit applications, renewals, changes and cancellations are fully online. No new physical permit is required after entry; the electronic social security card supports verification.",
    },
    audience: { zh: "需要在内地实际工作的外籍人士及聘雇单位。", en: "Foreign nationals intending to work in mainland China and their employers." },
    caveat: {
      zh: "工作许可、Z 字签证和居留证件是不同环节；注册企业或免签入境不等于取得在华工作资格。",
      en: "Work permits, Z visas and residence documents are separate steps. Registering a company or visa-free entry does not grant permission to work in China.",
    },
    validity: { zh: "2024-12-01 起实施", en: "Effective from 1 Dec 2024" },
    documentNo: "人社部发〔2024〕75号",
    sourceName: "关于做好外国人工作许可证与社会保障卡融合集成工作的通知",
    sourceUrl: "https://www.gov.cn/zhengce/zhengceku/202412/content_6991296.htm",
    verifiedAt: "2026-11-20",
    tags: ["工作许可", "工作签证", "电子社保卡", "外国人", "work permit", "Z visa"],
  },
  {
    id: "foreign-investment-reporting",
    category: "foreign",
    title: { zh: "外商投资信息报告：初始、变更与年度报告", en: "Foreign investment reporting: initial, change and annual filings" },
    benefit: {
      zh: "初始、变更报告通过企业登记系统在线提交，年度报告通过国家企业信用信息公示系统提交；注销信息由部门共享。",
      en: "Initial and change reports are filed online through the enterprise registration system and annual reports through the national credit information system. Deregistration data is shared between authorities.",
    },
    audience: { zh: "外国投资者及外商投资企业。", en: "Foreign investors and foreign-invested enterprises." },
    caveat: {
      zh: "三类报告的渠道和时限不同，错报、漏报需补正；部分境内投资试点地区有新增报告要求。",
      en: "Channels and deadlines differ by report type. Errors and omissions require correction, and some domestic reinvestment pilot regions have additional requirements.",
    },
    validity: { zh: "2020-01-01 起实施；2026-11-20 核验", en: "Effective 1 Jan 2020; verified 20 Nov 2026" },
    documentNo: "商务部公告2019年第62号",
    sourceName: "关于外商投资信息报告有关事项的公告",
    sourceUrl: "https://www.mofcom.gov.cn/zcfb/zgdwjjmywg/art/2020/art_59bb65ca876a44ee9b26ecb7895205c7.html",
    verifiedAt: "2026-11-20",
    tags: ["外商投资", "信息报告", "年报", "登记", "foreign investment reporting"],
  },
];

export function filterPolicies(records: Policy[], query: string, category: PolicyCategory | "all"): Policy[] {
  const needle = query.trim().toLocaleLowerCase();
  return records.filter((policy) => {
    if (category !== "all" && policy.category !== category) return false;
    if (!needle) return true;
    const haystack = [
      policy.title.zh,
      policy.title.en,
      policy.benefit.zh,
      policy.benefit.en,
      policy.audience.zh,
      policy.audience.en,
      policy.caveat.zh,
      policy.caveat.en,
      policy.documentNo,
      policy.sourceName,
      ...policy.tags,
    ].join(" ").toLocaleLowerCase();
    return haystack.includes(needle);
  });
}
