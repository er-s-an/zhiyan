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
  "Zhihu posts are written for a Chinese-language audience. A high vote count means other readers agreed or found the post useful. It is not a probability sample of buyers. Marketing accounts and brand posts sit in the same search results as caretakers. Answers often mix first-hand use with hearsay. The Chinese excerpt is the evidence. The English line is a translation for a global team.";

function eligible(item: SampleItem): boolean {
  return item.included;
}

function nextMethod(design: ResearchDesign): string {
  const who = design.populations[0] || "the people named in the design";
  return `Run a concept test or directed interviews with ${who}. Use the functions and the skeptical claims in this sample as the stimulus. Ask what the person would do, and which claim would change a choice. Existing Zhihu posts do not replace that step.`;
}

function roleName(role: Role): string {
  return ROLE_LABEL[role];
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
      basis: "in this sample only",
    });
    if (rows.length >= 2 && !marketingOnly) {
      const dates = rows.map((item) => item.publishDate).sort();
      findings.push({
        id: `finding_${code.id}`,
        codeId: code.id,
        itemIds: rows.map((item) => item.id),
        process: FINDING_PROCESS,
        text: `In this sample, ${rows.length} included items carry "${code.label}". Dates in that set run from ${dates[0]} to ${dates[dates.length - 1]}. ${code.definition}`,
      });
    }
  }

  const coveredSceneIds = new Set(included.flatMap((item) => (item.sceneIds?.length ? item.sceneIds : [item.sceneId])));
  const coveredScenes = design.scenes.filter((scene) => coveredSceneIds.has(scene.id)).map((scene) => scene.label);
  const missingScenes = design.scenes.filter((scene) => !coveredSceneIds.has(scene.id)).map((scene) => scene.label);

  const presentRoles = new Set(included.map((item) => item.role).filter((role) => role !== "unclear"));
  const coveredRoles = [...presentRoles].map(roleName);
  const missingRoles = ["User", "Buyer", "Practitioner"].filter((label) => !coveredRoles.includes(label));
  if (!included.some((item) => item.role === "buyer")) {
    if (!missingRoles.includes("Buyer")) missingRoles.push("Buyer");
  }
  missingRoles.push("A buyer at the moment of purchase");

  const quality: QualityFlag[] = [];
  for (const theme of themes) {
    if (theme.count === 1) {
      quality.push({
        kind: "single_source",
        title: `Single source for ${theme.label}`,
        detail: `Only one included item carries "${theme.label}". It stays in the sample and does not become a finding.`,
        itemIds: theme.itemIds,
      });
    }
  }

  for (const label of missingScenes) {
    quality.push({
      kind: "uncovered_scene",
      title: `Uncovered scene: ${label}`,
      detail: `No included item is coded to "${label}". The stopping rule ended without coverage here.`,
      itemIds: [],
    });
  }

  const weak = included.filter((item) => item.codeIds.includes("claim_weak"));
  const strong = included.filter((item) => item.codeIds.includes("claim_strong"));
  if (weak.length > 0 && strong.length > 0) {
    quality.push({
      kind: "conflict",
      title: "Claim language conflicts inside the sample",
      detail:
        "Some included items treat a feature as unnecessary, and others treat a feature as necessary. The study does not average those into one verdict.",
      itemIds: [...weak, ...strong].map((item) => item.id),
    });
  }

  const stale = included.filter(
    (item) => item.publishDate === "unknown" || item.publishDate < design.timeWindow.start,
  );
  if (stale.length > 0) {
    quality.push({
      kind: "stale",
      title: "Stale or undated items are in the sample",
      detail: `The window starts ${design.timeWindow.start}. ${stale.length} included items are older than that window, or have no date. They are not current product truth.`,
      itemIds: stale.map((item) => item.id),
    });
  }

  quality.push({
    kind: "inference_beyond_evidence",
    title: "Counts and skeptical wording do not travel past the sample",
    detail:
      "A count of posts is not a count of buyers. Skeptical wording does not show that a claim fails with shoppers. Strong wording does not show that a claim causes a purchase.",
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
    title: "Purchase intent and claim validation stay out of reach",
    detail: `${HONEST_CAN} ${HONEST_CANNOT} The stage named in the design is ${STAGE_LABEL[design.stage]}. The method that ran is retrieval and coding of existing posts.`,
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
      ? ["No code reached two included items. There is no finding to promote. Single-source items stay in the quality view."]
      : parts.findings.map((finding, index) => {
          const titles = finding.itemIds
            .map((id) => study.sample.find((item) => item.id === id)?.title || id)
            .join("; ");
          return `${index + 1}. ${finding.text} Items: ${titles}. Process: ${finding.process}`;
        });

  const searchCalls = study.retrieval.filter((entry) => entry.kind === "zhihu_search" && !entry.error).length;
  const hotCalls = study.retrieval.filter((entry) => entry.kind === "hot_list" && !entry.error).length;
  const lines = [
    "Research note",
    "",
    "Decision",
    design.decision,
    "",
    "Method that ran",
    `The researcher confirmed the design at ${study.confirmedAt} before any Zhihu retrieval. The method that ran is retrieval and coding of existing Zhihu posts. The stage named in the design is ${STAGE_LABEL[design.stage]}.`,
    "",
    "Sample",
    `${parts.includedCount} included items. ${parts.heldOutCount} items are held out. The window is ${design.timeWindow.start} to ${design.timeWindow.end}. Counts are in this sample only.`,
    "",
    "Findings",
    ...findingBlocks,
    "",
    "Scenes and roles",
    `Covered scenes: ${parts.honest.coveredScenes.join(", ") || "none"}.`,
    `Missing scenes: ${parts.honest.missingScenes.join(", ") || "none"}.`,
    `Covered roles: ${parts.honest.coveredRoles.join(", ") || "none"}.`,
    `Missing roles: ${parts.honest.missingRoles.join(", ")}.`,
    "",
    "Limit",
    parts.honest.canSupport,
    parts.honest.cannotProve,
    "",
    "Next method",
    parts.honest.nextMethod,
    "",
    "China-internet context",
    CHINA_CONTEXT,
    "",
    "Retrieval record",
    `Zhihu search calls that returned: ${searchCalls}. Hot list calls that returned: ${hotCalls}. Hot list scanned ${study.hotScan.scanned} titles and included ${study.hotScan.included}. Zhida is auxiliary and is not a finding. usedAsFinding is false.`,
    "",
    "Themes in this sample only",
    ...parts.themes.map((theme) => `${theme.label}: ${theme.count} included items.`),
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
        sceneLabel: scene ? scene.label : patch.sceneId === "unassigned" ? "Unassigned" : item.sceneLabel,
      };
    }),
  };
}
