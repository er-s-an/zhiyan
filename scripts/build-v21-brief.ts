import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildEvidence, validateBrief } from "../lib/v2/brief.ts";
import type { DecisionBriefV21, HighImpactTermV21, RoundSnapshotV21, StopReasonV21 } from "../lib/v2/brief.ts";
import type { InitialBelief, StudyV2 } from "../lib/v2/types.ts";

function loadStudy(): StudyV2 {
  const file = path.join(process.cwd(), "lib", "v2", "demos", "main-case.json");
  return (JSON.parse(readFileSync(file, "utf8")) as { study: StudyV2 }).study;
}

function main(): void {
  const study = loadStudy();
  const evidence = buildEvidence(study);
  const initialBelief: InitialBelief = {
    decisionQuestionZh: "海外 OPC 是否应该投入开发一款面向中国自由职业者的 AI 合同与回款工具，首版先做什么？",
    decisionQuestionEn: "Should a global OPC invest in an AI contract and payment-collection tool for Chinese freelancers, and what should the first version do?",
    productIdeaZh: "面向中国自由职业者的 AI 合同与回款工具",
    productIdeaEn: "An AI contract and payment-collection tool for Chinese freelancers",
    targetUsersZh: ["中国自由职业者：设计师、开发者、撰稿人、顾问"],
    targetUsersEn: ["Chinese freelancers: designers, developers, writers, consultants"],
    assumptionsZh: study.plan.productHypothesesZh,
    assumptionsEn: study.plan.productHypothesesEn,
    concernsZh: [
      "这个痛点可能真实，但频率和付费价值不足以支撑一个独立产品。",
      "合同模板、电子签或平台担保可能已经足够。",
      "付费意愿不能由知乎讨论证明。",
    ],
    concernsEn: [
      "The pain may be real but not frequent or valuable enough to support a standalone product.",
      "Contract templates, e-signature or platform guarantees may already be sufficient.",
      "Willingness to pay cannot be proven by Zhihu discussion.",
    ],
    capturedAt: study.plan.createdAt,
    planVersion: 1,
  };
  study.plan.initialBelief = initialBelief;

  const usedIds = [
    "src_134ad868",
    "src_4ee7e333",
    "src_b3611a84",
    "src_6f504bd4",
    "src_58ec026d",
    "src_9100dbe8",
    "src_6d932445",
    "src_9097ef71",
    "src_f9d8bbad",
    "src_e8c7b03f",
    "src_225214b5",
  ];

  const terms: HighImpactTermV21[] = [
    { raw: "款清交源文件", type: "alternative", sourceSampleId: "src_134ad868", sourceQuoteZh: "款清交源文件", proposedQuery: "款清交源文件 尾款 纠纷 自由职业", whyZh: "把「先交源文件还是先收尾款」变成可执行的交付规则，改变了产品应从合同文本转向交付物控制。", whyEn: "Turns 'deliver source files or collect payment first' into an executable delivery rule, shifting the product from contract text to deliverable control." },
    { raw: "带水印的低清预览版", type: "alternative", sourceSampleId: "src_134ad868", sourceQuoteZh: "带水印的低清预览版", proposedQuery: "带水印 低清 预览版 交源文件 尾款", whyZh: "说明用户已经在用土办法控制交付物，工具机会在权限、预览和解锁流程。", whyEn: "Users already use a workaround to control deliverables; the opportunity is permissioned previews and unlock flows." },
    { raw: "视为验收", type: "task", sourceSampleId: "src_37e0e3a6", sourceQuoteZh: "视为验收", proposedQuery: "视为验收 条款 甲方 不验收 尾款", whyZh: "把模糊的「满意为止」转成可测试的验收条款，直接指向验收工作流。", whyEn: "Turns a vague 'until satisfied' into a testable acceptance clause, pointing directly to an acceptance workflow." },
    { raw: "需求变更书面确认", type: "task", sourceSampleId: "src_4ee7e333", sourceQuoteZh: "需求变更书面确认", proposedQuery: "需求变更 书面确认 合同 外包", whyZh: "范围变更不是记忆问题，而是缺少可执行的变更单流程。", whyEn: "Scope changes are not a memory problem but a missing change-order workflow." },
    { raw: "正式书面催告", type: "alternative", sourceSampleId: "src_134ad868", sourceQuoteZh: "正式书面催告", proposedQuery: "尾款 拖欠 书面催告 模板 自由职业", whyZh: "尾款问题有明确的证据和催告动作，可以产品化为证据包与催款节点。", whyEn: "Final-payment problems have concrete evidence and escalation actions that can become an evidence pack and payment reminders." },
  ];

  const stopReason: StopReasonV21 = {
    type: "budget_exhausted",
    detailZh: "达到查询/候选预算上限（12 次查询、60 条搜索候选）。这是预算停止，不宣称主题饱和。",
    detailEn: "Reached the query/candidate budget (12 queries, 60 search candidates). This is a budget stop, not a claim of saturation.",
  };

  const runIds = (round: number) => study.runs.filter((run) => run.round === round).map((run) => run.id);
  const roundSnapshots: RoundSnapshotV21[] = [
    {
      round: 0,
      objectiveZh: "先确认中国自由职业者是否真的在公开讨论报价、合同、验收和尾款问题。",
      objectiveEn: "First check whether Chinese freelancers really discuss quoting, contracts, acceptance and final payment in public.",
      queryIds: runIds(0),
      newTerms: terms.slice(0, 4),
      newUnderstandingZh: "第一轮出现了「款清交源文件」「带水印的低清预览版」「视为验收」「需求变更书面确认」等表达，说明真正的风险在交付物控制、验收和范围变更加固，而不只是合同文本。",
      newUnderstandingEn: "Round one surfaced expressions such as 'payment-before-source-files', 'watermarked low-res preview', 'deemed acceptance' and 'written confirmation of scope changes'. The risk sits in deliverable control, acceptance and scope confirmation, not just contract text.",
      coverageChangeZh: "从产品词扩展到 4 个具体环节：报价、改需求、验收、尾款；共执行 6 条查询。",
      coverageChangeEn: "Expanded from product terms into four concrete steps: quoting, scope changes, acceptance and final payment; six queries ran.",
      nextRoundReasonZh: "因为发现了「款清交源文件」「带水印低清预览版」「视为验收」等原生做法，所以下一轮直接搜索这些表达，看它们在不同人群和场景中如何出现。",
      nextRoundReasonEn: "Because the first round surfaced native practices like 'payment-before-source-files', 'watermarked low-res preview' and 'deemed acceptance', the next round searched those expressions directly.",
      preliminaryOnly: true,
    },
    {
      round: 1,
      objectiveZh: "沿真实表达继续探索交付物控制、验收条款和催告凭证。",
      objectiveEn: "Follow the native expressions into deliverable control, acceptance clauses and payment evidence.",
      queryIds: runIds(1),
      newTerms: [
        { raw: "报价单", type: "task", sourceSampleId: "src_e6246f8d", sourceQuoteZh: "报价单", proposedQuery: "自由职业 报价单 模板 合同 尾款", whyZh: "报价单被当成范围与付款的前置文件，而不是一张价格表。", whyEn: "The quote is used as a scope-and-payment instrument, not just a price list." },
        { raw: "收款收据", type: "task", sourceSampleId: "src_e6246f8d", sourceQuoteZh: "收款收据", proposedQuery: "自由职业 收款收据 尾款 凭证 编号", whyZh: "说明用户在用编号、凭证和收据构建证据链。", whyEn: "Users use numbers, receipts and evidence records to build a paper trail." },
        { raw: "正式书面催告", type: "alternative", sourceSampleId: "src_134ad868", sourceQuoteZh: "正式书面催告", proposedQuery: "尾款 拖欠 正式书面催告 模板 自由职业", whyZh: "催款不是情绪动作，而是可模板化的证据动作。", whyEn: "Chasing payment is an evidence action that can be templated, not just an emotional one." },
      ],
      newUnderstandingZh: "替代方案不是没有，而是碎片化：模板/电子签管签署，平台托管管平台内交易，聊天记录管沟通，记账工具管回款；没有人把范围确认、验收、交付物控制和催款证据串成一条流程。",
      newUnderstandingEn: "Alternatives are not absent but fragmented: templates/e-signature cover signing, platform escrow covers platform orders, chat logs cover communication and bookkeeping covers payment records. None connects scope confirmation, acceptance, deliverable control and collection evidence.",
      coverageChangeZh: "补充了替代方案与交付环节；覆盖从「问题存在」转向「现有方案为什么不够」。",
      coverageChangeEn: "Added alternatives and delivery steps; coverage moved from 'the problem exists' to 'why current alternatives fall short'.",
      nextRoundReasonZh: "因为发现现有方案各管一段、平台外交易缺少证据闭环，所以下一轮专门找反例：合同是否真的必要、小额熟人单是否足以不用工具。",
      nextRoundReasonEn: "Because current alternatives are fragmented and off-platform deals lack an evidence loop, the next round looked for counter-examples: whether contracts are necessary and whether small trusted jobs make tools unnecessary.",
      preliminaryOnly: true,
    },
    {
      round: 2,
      objectiveZh: "寻找反例和边界：合同是否必要、小额熟人单、平台担保的适用条件。",
      objectiveEn: "Look for counter-examples and boundaries: whether contracts are necessary, small trusted jobs, and when platform guarantees apply.",
      queryIds: runIds(2),
      newTerms: [],
      newUnderstandingZh: "分歧是条件性的：金额、客户类型和是否平台单决定合同必要性；小额熟人单可以当场口头完成。反例存在，但没有足够证据证明「多数自由职业者不需要工具」。",
      newUnderstandingEn: "The disagreement is conditional: deal size, client type and whether the order is on-platform determine whether a contract is needed. Some small trusted jobs are completed verbally. Counter-examples exist, but there is not enough evidence that most freelancers do not need a tool.",
      coverageChangeZh: "反例与条件性证据已出现，但付费意愿、采纳行为和工具使用复盘仍是空白。",
      coverageChangeEn: "Counter-examples and conditional evidence appeared, but willingness to pay, adoption behaviour and tool-use retrospectives remain gaps.",
      nextRoundReasonZh: "达到预算上限；同时已经没有新的重要主题，因此停止，而不是继续堆查询。",
      nextRoundReasonEn: "Reached the budget cap; no important new theme emerged, so the study stopped instead of stacking more queries.",
      preliminaryOnly: false,
      stopReason,
    },
  ];

  const brief: DecisionBriefV21 = {
    id: "brief_main_case_v21",
    studyId: study.id,
    initialBelief,
    decisionQuestionZh: initialBelief.decisionQuestionZh,
    decisionQuestionEn: initialBelief.decisionQuestionEn,
    recommendation: "conditional_proceed",
    recommendationReasonZh: "证据足以支持一个值得验证的方向：先做「验收—尾款工作流」，而不是直接做完整合同生成器。进入开发前，需要用访谈验证用户是否愿意改变现有流程，以及是否会为此付费。",
    recommendationReasonEn: "The evidence supports a direction worth validating: start with an acceptance-to-final-payment workflow, not a full contract generator. Before building, validate whether users will change their workflow and pay for it.",
    validateFirstZh: [
      "找 5 位接私活/接外包的程序员或小团队负责人，复盘最近一单从报价到收尾款的全过程。",
      "用两版价值主张做落地页测试：A「验收与尾款工作流」，B「AI 合同生成器」。",
      "复盘 3 个真实尾款纠纷案例，检查验收标准、变更记录和交付物控制是否真的缺失。",
    ],
    validateFirstEn: [
      "Interview five freelance developers or small outsourcing teams and replay their most recent project from quote to final payment.",
      "Test two value propositions on a landing page: A) acceptance-to-payment workflow, B) AI contract generator.",
      "Review three real late-payment cases and check whether acceptance criteria, change records or deliverable control were actually missing.",
    ],
    doNotDoZh: [
      "不要先做完整合同生成、电子签或全流程 SaaS。",
      "不要同时服务所有自由职业者；先选一个细分场景。",
      "不要把知乎讨论的条目数当成付费意愿或市场规模。",
      "不要做 TAM、购买率或市场规模预测。",
    ],
    doNotDoEn: [
      "Do not build a full contract generator, e-signature or end-to-end SaaS first.",
      "Do not serve all freelancers at once; choose one segment first.",
      "Do not treat Zhihu item counts as willingness to pay or market size.",
      "Do not forecast TAM, purchase rates or market size.",
    ],
    beliefUpdates: [
      {
        id: "belief_1",
        initialAssumptionZh: "用户需要一款更好的 AI 合同工具。",
        initialAssumptionEn: "Users need a better AI contract tool.",
        newUnderstandingZh: "讨论更多集中在需求变更、验收、交付物控制和尾款回收，合同文本只是其中一环；条款写不清和交付后失去抓手，比「没有合同」更常被提到。",
        newUnderstandingEn: "Discussion concentrates on scope changes, acceptance, deliverable control and final payment; contract text is only one part. Unclear clauses and losing leverage after delivery are mentioned more often than 'no contract'.",
        changeType: "revise",
        evidenceIds: ["src_134ad868", "src_4ee7e333", "src_6f504bd4", "src_b3611a84"],
        counterIds: ["src_58ec026d", "src_d7edba36"],
        productImplicationZh: "产品应从「写合同」前移到「范围、验收和交付物控制」，并把尾款节点串起来。",
        productImplicationEn: "Move the product upstream from contract writing to scope, acceptance and deliverable control, and connect the final-payment milestone.",
        nextActionZh: "先验证验收—尾款工作流，而不是合同生成器。",
        nextActionEn: "Validate the acceptance-to-payment workflow first, not the contract generator.",
        status: "supported",
      },
      {
        id: "belief_2",
        initialAssumptionZh: "这个工具可以面向所有中国自由职业者。",
        initialAssumptionEn: "The tool can serve all Chinese freelancers.",
        newUnderstandingZh: "至少分成两类不同风险：程序员/软件外包承接方更关心验收标准、范围变更和尾款催收；插画/约稿创作者更关心定金比例、交付源文件和版权归属。",
        newUnderstandingEn: "At least two risk profiles emerge: freelance developers/software outsourcing teams care about acceptance criteria, scope changes and payment collection; illustrators/commission creators care about deposit ratio, source-file handoff and copyright.",
        changeType: "new_angle",
        evidenceIds: ["src_134ad868", "src_9100dbe8", "src_6d932445", "src_4ee7e333"],
        counterIds: ["src_58ec026d"],
        productImplicationZh: "先选一个细分场景做透，不要同时承诺「所有人都能用」。",
        productImplicationEn: "Choose one segment first; do not promise a tool for everyone.",
        nextActionZh: "在访谈中分别招募程序员外包和插画约稿两类用户，比较问题强度。",
        nextActionEn: "Recruit both developer/outsourcing and illustration/commission users in interviews and compare pain intensity.",
        status: "supported",
      },
      {
        id: "belief_3",
        initialAssumptionZh: "现有模板和电子签不够，所以需要更多合同功能。",
        initialAssumptionEn: "Templates and e-signature are insufficient, so users need more contract features.",
        newUnderstandingZh: "现有替代方案碎片化：模板/电子签覆盖签署，平台托管覆盖平台内交易，聊天记录和记账工具覆盖沟通与回款；真正的缺口是流程编排、证据链和交付物控制，而不是再造签署能力。",
        newUnderstandingEn: "Current alternatives are fragmented: templates/e-signature cover signing, platform escrow covers on-platform orders, chat logs and bookkeeping cover communication and payment. The real gap is workflow orchestration, evidence and deliverable control, not rebuilding signing.",
        changeType: "refute",
        evidenceIds: ["src_f9d8bbad", "src_134ad868", "src_9097ef71"],
        counterIds: ["src_e8c7b03f"],
        productImplicationZh: "不要重做电子签底层；把重点放在流程编排、证据包和交付物控制。",
        productImplicationEn: "Do not rebuild e-signature infrastructure; focus on workflow orchestration, evidence packs and deliverable control.",
        nextActionZh: "验证现有工具的使用断点，而不是问「要不要更多合同功能」。",
        nextActionEn: "Validate where current tools break, rather than asking for more contract features.",
        status: "supported",
      },
    ],
    opportunities: [
      {
        id: "opportunity_acceptance_payment",
        targetUserZh: "接私活/接外包的程序员与小型承接团队",
        targetUserEn: "Freelance developers and small outsourcing teams",
        scenarioZh: "报价后客户反复改需求，验收标准模糊，尾款拖到交付后",
        scenarioEn: "Clients repeatedly change scope after quoting, acceptance criteria are vague, and final payment is delayed after delivery",
        problemZh: "开工前没有把范围、验收标准和变更流程写成可执行记录；交付后又过早交出源文件或成品，失去回款抓手。",
        problemEn: "Scope, acceptance criteria and change process are not written down before work starts; source files or final deliverables are handed over too early, leaving no leverage for payment.",
        currentAlternativesZh: ["合同模板/电子签", "口头约定 + 聊天记录", "平台担保/资金托管", "律师起草"],
        currentAlternativesEn: ["Contract templates / e-signature", "Verbal agreement + chat logs", "Platform guarantees / escrow", "Lawyer-drafted contracts"],
        whyAlternativesInsufficientZh: "模板和电子签主要覆盖签署形式；平台担保只覆盖平台内订单；聊天记录不是结构化证据。用户需要的是范围确认、验收项、交付物控制和催款节点串成一条流程。",
        whyAlternativesInsufficientEn: "Templates and e-signature mainly cover signing; platform guarantees only cover on-platform orders; chat logs are not structured evidence. Users need scope confirmation, acceptance items, deliverable control and collection milestones in one workflow.",
        productDirectionZh: "先做「验收—尾款工作流」：报价前范围清单、可测试验收项、变更单、分阶段交付、证据包和催款节点；不是合同生成器。",
        productDirectionEn: "Build an acceptance-to-payment workflow: a scope checklist before quoting, testable acceptance items, change orders, staged delivery, an evidence pack and collection milestones—not a contract generator.",
        expectedOutcomeZh: "用户能在一单内完成验收确认、交付控制和尾款节点跟踪，减少扯皮和证据缺失。",
        expectedOutcomeEn: "Users can confirm acceptance, control deliverables and track final-payment milestones within one project, reducing disputes and missing evidence.",
        falsificationSignalZh: "如果 5 位目标用户中多数表示尾款很少拖延，或模板/熟人合作已经足够，或只需要合同文本，则收窄或停止这个方向。",
        falsificationSignalEn: "If most of five target users say late payment is rare, templates/trusted relationships are enough, or they only need contract text, narrow or stop this direction.",
        evidenceIds: ["src_134ad868", "src_4ee7e333", "src_b3611a84", "src_6f504bd4", "src_f0d61d86"],
        counterIds: ["src_58ec026d", "src_d7edba36"],
        evidenceStrength: "strong",
        strengthReasonZh: "5 条证据来自 5 位不同作者（程序员、外包承接方、律师、技术博主），并有 2 条反例/条件性证据；但其中部分作者可能带内容营销动机，仍需访谈确认。",
        strengthReasonEn: "Five evidence items come from five different authors (developers, an outsourcing provider, a lawyer and a technical blogger), with two counter/conditional items. Some authors may have content-marketing motives, so interviews are still needed.",
        unknownsZh: ["用户是否愿意为验收/回款工具付费", "验收工具与合同/项目管理的边界", "程序员外包与创作者谁更适合先做"],
        unknownsEn: ["Whether users will pay for an acceptance/payment tool", "The boundary between acceptance, contracts and project management", "Whether developers/outsourcers or creators should be first"],
        nextValidationZh: "5 位程序员/小外包团队访谈；用真实项目复盘验收、变更、交付和尾款节点。",
        nextValidationEn: "Interview five freelance developers or small outsourcing teams; replay acceptance, scope changes, delivery and payment milestones from real projects.",
      },
      {
        id: "opportunity_deliverable_control",
        targetUserZh: "插画师、约稿创作者、独立设计师",
        targetUserEn: "Illustrators, commission creators and independent designers",
        scenarioZh: "交完成稿或源文件后客户拖尾款，客户还主张已付定金、图已使用、版权归其所有",
        scenarioEn: "Clients delay final payment after receiving final artwork or source files, then argue they already paid a deposit, used the work, or own the copyright",
        problemZh: "交付物一旦给出高清成品或源文件，就失去付款谈判力；低定金进一步放大风险。",
        problemEn: "Once high-resolution deliverables or source files are handed over, the creator loses payment leverage; a low deposit amplifies the risk.",
        currentAlternativesZh: ["带水印低清预览", "款清交源文件", "平台担保", "合同/口头约定"],
        currentAlternativesEn: ["Watermarked low-res preview", "Source files only after payment", "Platform guarantees", "Contracts / verbal agreements"],
        whyAlternativesInsufficientZh: "这些是个人经验规则，缺少工具化的分阶段交付、访问权限、水印/解锁和验收记录；平台外交易没有平台担保。",
        whyAlternativesInsufficientEn: "These are personal rules of thumb, not a tool for staged delivery, access permissions, watermark/unlock and acceptance records; off-platform deals have no platform guarantee.",
        productDirectionZh: "做「交付物控制 + 尾款节点」轻工具，服务插画/约稿创作者的第一单到回头客；可与程序员工作流共用证据链能力，但先单独验证。",
        productDirectionEn: "Build a lightweight deliverable-control and final-payment tool for illustrators/commission creators, from first job to repeat clients. It can share evidence-chain capabilities with the developer workflow, but should be validated separately first.",
        expectedOutcomeZh: "创作者在交付过程中保留谈判抓手，尾款节点可追踪，版权交接可记录。",
        expectedOutcomeEn: "Creators keep leverage during delivery, track final-payment milestones and record copyright handoff.",
        falsificationSignalZh: "如果创作者主要走平台担保，或客户接受高定金/熟人合作，工具价值不足。",
        falsificationSignalEn: "If creators mainly use platform guarantees, or clients accept high deposits/trusted relationships, the tool value is insufficient.",
        evidenceIds: ["src_9100dbe8", "src_6d932445", "src_134ad868"],
        counterIds: ["src_58ec026d"],
        evidenceStrength: "medium",
        strengthReasonZh: "3 条证据来自 3 位作者，且有 1 条反例；但其中一条来自机构型账号，缺少创作者真实使用工具的复盘，因此降为中等。",
        strengthReasonEn: "Three evidence items from three authors with one counter-example; one source is an institutional account and there is no real tool-use retrospective from a creator, so strength is medium.",
        unknownsZh: ["创作者是否愿意改变交付流程", "水印/权限是否影响客户体验", "版权条款是否在需求内"],
        unknownsEn: ["Whether creators will change their delivery workflow", "Whether watermarks/permissions hurt client experience", "Whether copyright terms are in scope"],
        nextValidationZh: "找 3 位插画/约稿创作者做流程走查，验证水印预览、分阶段交付和尾款节点是否真的改变行为。",
        nextValidationEn: "Walk three illustrators/commission creators through the flow and test whether watermarked previews, staged delivery and payment milestones actually change behaviour.",
      },
    ],
    productOptions: [
      {
        id: "option_acceptance_payment",
        titleZh: "验收—尾款工作流",
        titleEn: "Acceptance-to-payment workflow",
        scopeZh: "范围清单、验收项、变更单、分阶段交付、证据包、催款节点。",
        scopeEn: "Scope checklist, acceptance items, change orders, staged delivery, evidence pack and payment milestones.",
        evidenceIds: ["src_134ad868", "src_4ee7e333", "src_b3611a84", "src_6f504bd4", "src_f0d61d86"],
        counterIds: ["src_58ec026d", "src_d7edba36"],
        riskZh: "用户可能只需要合同文本；验收流程可能被认为太重；付费意愿未知。",
        riskEn: "Users may only want contract text; the acceptance flow may feel heavy; willingness to pay is unknown.",
        recommendation: "validate_first",
        nextValidationZh: "5 个访谈 + 两版落地页测试；通过后再做原型。",
        nextValidationEn: "Five interviews plus a two-version landing page test; prototype only after that.",
      },
      {
        id: "option_contract_generator",
        titleZh: "AI 合同生成器",
        titleEn: "AI contract generator",
        scopeZh: "按场景生成合同文本、条款解释和模板。",
        scopeEn: "Generate contract text, clause explanations and templates by scenario.",
        evidenceIds: ["src_6f504bd4", "src_134ad868"],
        counterIds: ["src_f9d8bbad", "src_e8c7b03f"],
        riskZh: "现有模板/电子签已覆盖签署；合同文本不是主要卡点；容易被通用 AI 替代。",
        riskEn: "Templates/e-signature already cover signing; contract text is not the main bottleneck; easily replaced by general AI.",
        recommendation: "hold",
        nextValidationZh: "暂不开发；只有当访谈明确显示合同文本是阻塞点时才重新评估。",
        nextValidationEn: "Do not build yet; revisit only if interviews show contract text is the blocker.",
      },
      {
        id: "option_creator_delivery",
        titleZh: "创作者交付物控制",
        titleEn: "Creator deliverable control",
        scopeZh: "水印预览、访问权限、款清解锁源文件、版权交接记录。",
        scopeEn: "Watermarked previews, access permissions, source-file unlock after payment and copyright handoff records.",
        evidenceIds: ["src_9100dbe8", "src_6d932445"],
        counterIds: ["src_58ec026d"],
        riskZh: "与程序员工作流共用能力，但用户和交付物形态不同；同时开两条线会失焦。",
        riskEn: "Shares capabilities with the developer workflow but has different users and deliverables; running two lines at once would dilute focus.",
        recommendation: "not_now",
        nextValidationZh: "先作为第二细分验证，不进入首版开发。",
        nextValidationEn: "Validate as a second segment; do not include in the first build.",
      },
    ],
    nextValidation: {
      personasZh: ["接私活的程序员", "小型软件外包团队负责人", "插画/约稿创作者（作为对照）"],
      personasEn: ["Freelance developers", "Small software outsourcing team leads", "Illustrators/commission creators (as comparison)"],
      questionsZh: [
        "你最近一单从报价到收到尾款，实际经过了哪些步骤？",
        "有没有遇到过改需求或验收标准不清？当时怎么处理？",
        "尾款被拖过吗？你当时做了什么？最后收回了吗？",
        "你用过合同模板、电子签、平台担保或收款工具吗？为什么用/不用？",
        "什么情况下你会觉得合同或工具是必要的？什么情况下完全不需要？",
      ],
      questionsEn: [
        "Walk me through your most recent project from quote to final payment.",
        "Have you had scope changes or unclear acceptance criteria? How did you handle them?",
        "Have you had late final payment? What did you do, and did you get paid?",
        "Have you used contract templates, e-signature, platform guarantees or payment tools? Why or why not?",
        "When do you feel a contract or tool is necessary, and when is it completely unnecessary?",
      ],
      cheapestTestZh: "先做 5 个 30 分钟访谈（3 位程序员、2 位小外包团队负责人），不先做原型；再用两版价值主张做落地页测试。",
      cheapestTestEn: "Run five 30-minute interviews first (3 developers, 2 small outsourcing team leads) before building a prototype; then test two value propositions on a landing page.",
      falsificationZh: "如果多数用户表示尾款很少拖延、现有模板/熟人合作足够，或只需要合同文本，则收窄或停止这个方向。",
      falsificationEn: "If most users say late payment is rare, templates/trusted relationships are enough, or they only need contract text, narrow or stop this direction.",
    },
    unansweredZh: [
      "用户是否愿意为验收/回款工具付费，愿意付多少。",
      "应该先服务程序员/外包承接方，还是插画/约稿创作者。",
      "平台外交易的用户是否愿意把流程迁移到一个新工具。",
      "验收工具与合同、项目管理、记账工具之间的边界。",
      "反例是否足够：小额、熟人、平台内订单可能不需要工具。",
      "第三个机会方向（平台担保/电子签替代）当前证据不足，不构成机会卡。",
    ],
    unansweredEn: [
      "Whether users will pay for an acceptance/payment tool, and how much.",
      "Whether to serve developers/outsourcers or illustrators/commission creators first.",
      "Whether off-platform users will move their workflow to a new tool.",
      "The boundary between acceptance, contracts, project management and bookkeeping.",
      "Whether counter-examples are sufficient: small, trusted or platform orders may not need a tool.",
      "A third opportunity (platform guarantees / e-signature replacement) lacks enough evidence and is not shown as a card.",
    ],
    boundariesZh: [
      "知乎公开讨论是定性探索样本，不是概率样本，不能代表整体自由职业者。",
      "不能证明市场规模、购买率、付费意愿或因果关系。",
      "不能把知乎讨论当成对尚不存在产品的评价；这里研究的是问题、场景、替代方案和采用障碍。",
      "关键证据仍需回查原文；反例不足是当前研究边界。",
    ],
    boundariesEn: [
      "Public Zhihu discussion is a qualitative exploration sample, not a probability sample; it does not represent all freelancers.",
      "It cannot prove market size, purchase rates, willingness to pay or causality.",
      "It is not a review of a product that does not exist; it studies problems, scenes, alternatives and adoption barriers.",
      "Key evidence must be checked against the original posts; insufficient counter-evidence is a study boundary.",
    ],
    highImpactTerms: terms,
    roundSnapshots,
    stopReason,
    evidenceIndex: Object.fromEntries(usedIds.map((id) => [id, evidence[id]])),
    aiDisclosureZh: "LLM 仅辅助语义编码、归纳和双语表达；研究执行、计数和报告重算由确定性代码完成。用户可以修改证据、编码和主题；人工可回查原文。",
    aiDisclosureEn: "LLM only assists semantic coding, synthesis and bilingual phrasing; execution, counts and report recomputation are deterministic. Users can edit evidence, codes and themes; every claim can be traced to the original post.",
    generatedAt: new Date().toISOString(),
    demo: true,
  };

  // Add only referable evidence IDs from findings/products to keep the index inspectable.
  const allIds = new Set<string>(usedIds);
  for (const opportunity of brief.opportunities) {
    for (const id of opportunity.evidenceIds) allIds.add(id);
    for (const id of opportunity.counterIds) allIds.add(id);
  }
  for (const update of brief.beliefUpdates) {
    for (const id of update.evidenceIds) allIds.add(id);
    for (const id of update.counterIds) allIds.add(id);
  }
  for (const term of brief.highImpactTerms) if (term.sourceSampleId) allIds.add(term.sourceSampleId);
  brief.evidenceIndex = Object.fromEntries([...allIds].map((id) => [id, evidence[id]]).filter(([, value]) => Boolean(value)));

  const errors = validateBrief(brief, study);
  if (errors.length > 0) {
    console.error(errors);
    process.exitCode = 1;
    return;
  }
  const dir = path.join(process.cwd(), "lib", "v2", "briefs");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "main-case.json"), JSON.stringify({ brief, studyId: study.id }, null, 2), "utf8");
  writeFileSync(path.join(dir, "initial-beliefs.json"), JSON.stringify({ [study.id]: initialBelief }, null, 2), "utf8");
  // Persist the pre-retrieval belief onto the cached study.
  writeFileSync(path.join(process.cwd(), "lib", "v2", "demos", "main-case.json"), JSON.stringify({ study }, null, 2), "utf8");
  console.log(JSON.stringify({ opportunities: brief.opportunities.length, beliefUpdates: brief.beliefUpdates.length, evidence: Object.keys(brief.evidenceIndex).length, errors }, null, 1));
}

main();
