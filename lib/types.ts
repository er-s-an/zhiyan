export const STAGES = [
  "needs_exploration",
  "competitive_analysis",
  "purchase_friction",
  "concept_test",
] as const;

export type Stage = (typeof STAGES)[number];

export const SUBJECTS = ["users", "buyers", "practitioners"] as const;

export type Subject = (typeof SUBJECTS)[number];

export type Role = "user" | "buyer" | "practitioner" | "unclear";

export type SourceKind = "zhihu_search" | "hot_list";

export interface SceneDef {
  id: string;
  label: string;
  keywords: string[];
}

export interface CodeDef {
  id: string;
  label: string;
  definition: string;
  keywords: string[];
}

export interface ResearchDesign {
  brief: string;
  briefLanguage: "en" | "zh";
  decision: string;
  subjects: Subject[];
  stage: Stage;
  zhihuCanAnswer: string[];
  zhihuCannotAnswer: string[];
  scenes: SceneDef[];
  populations: string[];
  timeWindow: { start: string; end: string; rationale: string };
  inclusion: string[];
  exclusion: string[];
  stoppingRule: string;
  queries: string[];
  productTerms: string[];
  codebook: CodeDef[];
}

export interface ZhihuContent {
  title: string;
  url: string;
  author: string;
  contentType: string;
  text: string;
  publishTime: number | null;
  votes: number;
  comments: number;
  badge: string;
}

export interface RawHit extends ZhihuContent {
  source: SourceKind;
  query: string;
}

export interface SampleFlags {
  marketing: boolean;
  duplicate: boolean;
  secondhand: boolean;
}

export interface SampleItem {
  id: string;
  source: SourceKind;
  title: string;
  url: string;
  author: string;
  contentType: string;
  excerptZh: string;
  excerptEn: string;
  publishDate: string;
  sceneId: string;
  sceneIds: string[];
  sceneLabel: string;
  query: string;
  whyIncluded: string;
  flags: SampleFlags;
  role: Role;
  included: boolean;
  codeIds: string[];
  votes: number;
  comments: number;
}

export interface RetrievalEntry {
  kind: "zhihu_search" | "hot_list" | "zhida";
  query: string;
  resultCount: number;
  error?: string;
}

export interface Auxiliary {
  text: string;
  error?: string;
  usedAsFinding: false;
}

export interface HotScan {
  scanned: number;
  included: number;
  droppedTitles: string[];
}

export interface Study {
  id: string;
  design: ResearchDesign;
  confirmedAt: string;
  retrieval: RetrievalEntry[];
  hotScan: HotScan;
  sample: SampleItem[];
  auxiliary: Auxiliary;
}

export interface ThemeRow {
  codeId: string;
  label: string;
  definition: string;
  count: number;
  itemIds: string[];
  basis: "in this sample only";
}

export interface QualityFlag {
  kind:
    | "single_source"
    | "uncovered_scene"
    | "conflict"
    | "stale"
    | "inference_beyond_evidence"
    | "purchase_intent";
  title: string;
  detail: string;
  itemIds: string[];
}

export interface Excerpt {
  itemId: string;
  title: string;
  url: string;
  scene: string;
  date: string;
  zh: string;
  en: string;
}

export interface HonestCall {
  canSupport: string;
  cannotProve: string;
  coveredScenes: string[];
  missingScenes: string[];
  coveredRoles: string[];
  missingRoles: string[];
  nextMethod: string;
}

export interface Projection {
  includedCount: number;
  heldOutCount: number;
  themes: ThemeRow[];
  findings: Finding[];
  quality: QualityFlag[];
  honest: HonestCall;
  report: string;
  excerpts: Excerpt[];
  chinaContext: string;
}

export interface Finding {
  id: string;
  text: string;
  codeId: string;
  itemIds: string[];
  process: string;
}

export const STAGE_LABEL: Record<Stage, string> = {
  needs_exploration: "Needs exploration",
  competitive_analysis: "Competitive analysis",
  purchase_friction: "Purchase friction",
  concept_test: "Concept test",
};

export const ROLE_LABEL: Record<Role, string> = {
  user: "User",
  buyer: "Buyer",
  practitioner: "Practitioner",
  unclear: "Unclear",
};

export const LOCKED_LIMITS = [
  "Existing Zhihu discussion cannot prove purchase intent.",
  "Existing Zhihu discussion cannot validate a claim as sufficient for purchase.",
] as const;

export const HONEST_CAN =
  "Existing Zhihu material can support needs exploration.";

export const HONEST_CANNOT =
  "It is not sufficient for purchase intent or claim validation.";

export const FINDING_PROCESS =
  "A finding exists only when two or more included items carry the same codebook code. The code is a visible keyword rule. Counts use included items in this sample only. One post is never a finding.";
