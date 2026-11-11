import {
  FINDING_PROCESS,
  HONEST_CAN,
  HONEST_CANNOT,
  ROLE_LABEL,
  STAGE_LABEL,
  type Finding,
  type HonestCall,
  type Projection,
  type QualityFlag,
  type ResearchDesign,
  type Role,
  type SampleItem,
  type Study,
  type ThemeRow,
} from "./types";

const CHINA_CONTEXT =
  "知乎帖子写给中文读者看。高赞表示其他读者觉得有用或表示同意，但它不是购买者的概率样本。营销账号和品牌帖会和使用者的回答出现在同一批搜索结果里。回答常常把亲历和听说混在一起。中文摘录是证据，英文行是给全球团队的翻译。";

function eligible(item: SampleItem): boolean {
  return item.included;
}

function nextMethod(design: ResearchDesign): string {
  const who = design.populations[0] || "设计里点名的人群";
  return `围绕「${who}」做一次概念测试或定向访谈。用本样本里的功能和怀疑性措辞做刺激材料，问对方会怎么做，以及哪一条宣称会改变选择。现有知乎帖子不能替代这一步。`;
}

function roleName(role: Role): string {
  return ROLE_LABEL[role];
}

function shortIds(study: Study, ids: string[]): string {
  return ids
    .map((id) => study.sample.find((item) => item.id === id)?.title || id)
    .join("；");
}

export function project(study: Study): Projection {
  const { design, sample } = study;
  const included = sample.filter(eligible);
  const heldOut = sample.filter((item) => !eligible(item));
  const themes: ThemeRow[] = [];
  const findings: Finding[] = [];

  for (const code of design.codebook) {
    const rows = included.filter((item) => item.codeIds.includes(code.id));
    const marketingOnly = rows.length > 0 && rows.every((item) => item.flags.marketing);
    themes.push({
      codeId: code.id,
      label: code.label,
      definition: code.definition,
      count: rows.length,
      itemIds: rows.map((item) => item.id),
      basis: "仅限本样本",
    });
    if (rows.length >= 2 && !marketingOnly) {
      const dates = rows.map((item) => item.publishDate).sort();
      findings.push({
        id: `finding_${code.id}`,
        codeId: code.id,
        itemIds: rows.map((item) => item.id),
        process: FINDING_PROCESS,
        text: `在本样本中，${rows.length} 条纳入条目带有「${code.label}」。这组条目的日期从 ${dates[0]} 到 ${dates[dates.length - 1]}。${code.definition}`,
      });
    }
  }

  const coveredSceneIds = new Set(included.flatMap((item) => (item.sceneIds?.length ? item.sceneIds : [item.sceneId])));
  const coveredScenes = design.scenes.filter((scene) => coveredSceneIds.has(scene.id)).map((scene) => scene.label);
  const missingScenes = design.scenes.filter((scene) => !coveredSceneIds.has(scene.id)).map((scene) => scene.label);

  const presentRoles = new Set(included.map((item) => item.role).filter((role) => role !== "unclear"));
  const coveredRoles = [...presentRoles].map(roleName);
  const missingRoles = ["使用者", "购买者", "从业者"].filter((label) => !coveredRoles.includes(label));
  if (!included.some((item) => item.role === "buyer")) {
    if (!missingRoles.includes("购买者")) missingRoles.push("购买者");
  }
  missingRoles.push("购买发生时的买家");

  const quality: QualityFlag[] = [];
  for (const theme of themes) {
    if (theme.count === 1) {
      quality.push({
        kind: "single_source",
        title: `「${theme.label}」只有单一来源`,
        detail: `只有一条纳入条目带有「${theme.label}」。它留在样本里，但不会成为一条发现。`,
        itemIds: theme.itemIds,
      });
    }
  }

  for (const label of missingScenes) {
    quality.push({
      kind: "uncovered_scene",
      title: `未覆盖场景：${label}`,
      detail: `没有任何纳入条目被编码到「${label}」。停止规则执行完时，这个场景仍未被覆盖。`,
      itemIds: [],
    });
  }

  const weak = included.filter((item) => item.codeIds.includes("claim_weak"));
  const strong = included.filter((item) => item.codeIds.includes("claim_strong"));
  if (weak.length > 0 && strong.length > 0) {
    quality.push({
      kind: "conflict",
      title: "样本内部的宣称措辞相互冲突",
      detail: "一些纳入条目把某个功能看成没必要，另一些则说离不开它。这份研究不会把两者平均成一个结论。",
      itemIds: [...weak, ...strong].map((item) => item.id),
    });
  }

  const stale = included.filter(
    (item) => item.publishDate === "unknown" || item.publishDate < design.timeWindow.start,
  );
  if (stale.length > 0) {
    quality.push({
      kind: "stale",
      title: "样本中包含过时或无日期的内容",
      detail: `时间窗从 ${design.timeWindow.start} 开始。有 ${stale.length} 条纳入条目早于这个时间窗，或没有日期。它们不是当前的产品事实。`,
      itemIds: stale.map((item) => item.id),
    });
  }

  quality.push({
    kind: "inference_beyond_evidence",
    title: "计数和措辞不能越过样本",
    detail:
      "帖子的数量不是买家的数量。怀疑性措辞不能证明一条宣称在消费者那里失效；强需求措辞也不能证明一条宣称带来购买。",
    itemIds: [],
  });

  const honest: HonestCall = {
    canSupport: HONEST_CAN,
    cannotProve: HONEST_CANNOT,
    coveredScenes,
    missingScenes,
    coveredRoles,
    missingRoles,
    nextMethod: nextMethod(design),
  };

  quality.push({
    kind: "purchase_intent",
    title: "购买意愿与宣称验证仍不在方法范围内",
    detail: `${HONEST_CAN} ${HONEST_CANNOT} 设计里写明的阶段是「${STAGE_LABEL[design.stage]}」。这次执行的方法是检索并编码已有帖子。`,
    itemIds: [],
  });

  const report = renderReport(study, {
    includedCount: included.length,
    themes,
    findings,
    honest,
    heldOutCount: heldOut.length,
  });

  const excerpts = included.map((item) => ({
    itemId: item.id,
    title: item.title,
    url: item.url,
    scene: item.sceneLabel,
    date: item.publishDate,
    zh: item.excerptZh,
    en: item.excerptEn,
  }));

  return {
    includedCount: included.length,
    heldOutCount: heldOut.length,
    themes,
    findings,
    quality,
    honest,
    report,
    excerpts,
    chinaContext: CHINA_CONTEXT,
  };
}

function renderReport(
  study: Study,
  parts: {
    includedCount: number;
    heldOutCount: number;
    themes: ThemeRow[];
    findings: Finding[];
    honest: HonestCall;
  },
): string {
  const { design } = study;
  const findingBlocks =
    parts.findings.length === 0
      ? ["没有任何编码达到两条纳入条目，因此没有可以提升为发现的结论。单一来源的条目留在质检视图里。"]
      : parts.findings.map((finding, index) => {
          return `${index + 1}. ${finding.text} 条目：${shortIds(study, finding.itemIds)}。过程：${finding.process}`;
        });

  const searchCalls = study.retrieval.filter((entry) => entry.kind === "zhihu_search" && !entry.error).length;
  const hotCalls = study.retrieval.filter((entry) => entry.kind === "hot_list" && !entry.error).length;
  const lines = [
    "研究简报",
    "",
    "决策",
    design.decision,
    "",
    "实际执行的方法",
    `研究员在 ${study.confirmedAt} 确认设计后，才开始检索知乎。执行的方法是检索并编码已有的知乎帖子。设计里写明的阶段是「${STAGE_LABEL[design.stage]}」。`,
    "",
    "样本",
    `纳入 ${parts.includedCount} 条，搁置 ${parts.heldOutCount} 条。时间窗从 ${design.timeWindow.start} 到 ${design.timeWindow.end}。所有计数只属于本样本。`,
    "",
    "发现",
    ...findingBlocks,
    "",
    "场景与角色",
    `覆盖场景：${parts.honest.coveredScenes.join("、") || "无"}。`,
    `缺失场景：${parts.honest.missingScenes.join("、") || "无"}。`,
    `覆盖角色：${parts.honest.coveredRoles.join("、") || "无"}。`,
    `缺失角色：${parts.honest.missingRoles.join("、")}。`,
    "",
    "结论边界",
    parts.honest.canSupport,
    parts.honest.cannotProve,
    "",
    "下一步方法",
    parts.honest.nextMethod,
    "",
    "中国互联网语境",
    CHINA_CONTEXT,
    "",
    "检索记录",
    `知乎搜索成功 ${searchCalls} 次；热榜成功 ${hotCalls} 次。热榜扫描 ${study.hotScan.scanned} 条，纳入 ${study.hotScan.included} 条。直答只作补漏提示，不进入发现。usedAsFinding 为 false。`,
    "",
    "本样本中的主题",
    ...parts.themes.map((theme) => `${theme.label}：${theme.count} 条纳入条目。`),
  ];
  return lines.join("\n");
}

export function setIncluded(study: Study, id: string, included: boolean): Study {
  return {
    ...study,
    sample: study.sample.map((item) => (item.id === id ? { ...item, included } : item)),
  };
}

export function relabel(
  study: Study,
  id: string,
  patch: { codeIds?: string[]; sceneId?: string; role?: Role },
): Study {
  return {
    ...study,
    sample: study.sample.map((item) => {
      if (item.id !== id) return item;
      const scene = patch.sceneId
        ? study.design.scenes.find((entry) => entry.id === patch.sceneId)
        : undefined;
      return {
        ...item,
        codeIds: patch.codeIds ?? item.codeIds,
        role: patch.role ?? item.role,
        sceneId: patch.sceneId ?? item.sceneId,
        sceneIds: patch.sceneId ? [patch.sceneId] : item.sceneIds,
        sceneLabel: scene ? scene.label : patch.sceneId === "unassigned" ? "未归类" : item.sceneLabel,
      };
    }),
  };
}
