import type { HotScan, RetrievalEntry } from "../types";

export type Lang = "zh" | "en";

export type FitLevel = "fit" | "partial" | "mismatch";

export type OutputLevel = "strong" | "directional" | "hypotheses_only";

export type QueryDimension =
  | "population"
  | "scene"
  | "task"
  | "symptom"
  | "alternative"
  | "stance"
  | "counter";

export type VocabType = "population" | "scene" | "task" | "symptom" | "alternative" | "stance";

export type VocabSource = "user" | "model_prior" | "sample";

export type Stance = "support" | "oppose" | "conditional" | "neutral" | "unclear";

export type FindingCategory =
  | "population_scene"
  | "task_pain"
  | "alternative"
  | "choice_reason"
  | "disagreement"
  | "unknown_gap";

export type FindingType = "direct" | "multi_sample" | "ai_inference";

export type Confidence = "low" | "medium" | "high";

export type Recommendation = "build" | "reshape" | "validate_first" | "park" | "kill";

export interface BriefV2 {
  raw: string;
  language: Lang;
  product: string;
  targetUser: string;
  market: string;
  hypotheses: string[];
  biggestRisk: string;
}

export interface ResearchQuestionV2 {
  id: string;
  questionZh: string;
  questionEn: string;
  hypothesisZh: string;
  hypothesisEn: string;
  disconfirmingSignalZh: string;
  disconfirmingSignalEn: string;
  dimension: QueryDimension | "mixed";
}

export interface QuerySeedV2 {
  id: string;
  query: string;
  dimension: QueryDimension;
  purposeZh: string;
  purposeEn: string;
  source: "user" | "model_prior" | "sample_evidence";
  isCounterExample: boolean;
  triggerSampleId?: string;
  triggerVocabularyId?: string;
  broughtNewEvidence?: boolean;
}

export interface QueryRunV2 {
  id: string;
  round: number;
  query: string;
  dimension: QueryDimension;
  purposeZh: string;
  purposeEn: string;
  triggerSampleId?: string;
  triggerVocabularyId?: string;
  planVersion: number;
  resultCount: number;
  dedupedCount: number;
  includedCount: number;
  excludedCount: number;
  error?: string;
  executedAt: string;
}

export interface VocabularyItemV2 {
  id: string;
  raw: string;
  normalizedZh: string;
  normalizedEn: string;
  type: VocabType;
  source: VocabSource;
  sourceSampleId?: string;
  sourceQuoteZh?: string;
  sourceQuoteEn?: string;
  proposedQuery?: string;
  gapZh: string;
  gapEn: string;
  broughtNewTheme: boolean;
}

export interface CoverageRowV2 {
  dimension: "population" | "scene" | "stance" | "alternative" | "time";
  value: string;
  valueEn: string;
  status: "covered" | "partial" | "missing";
  itemIds: string[];
  noteZh?: string;
  noteEn?: string;
}

export interface MethodGateV2 {
  fit: FitLevel;
  canExploreZh: string[];
  canExploreEn: string[];
  needsOtherDataZh: string[];
  needsOtherDataEn: string[];
  cannotProveZh: string[];
  cannotProveEn: string[];
  allowedOutput: OutputLevel;
  reasonsZh: string[];
  reasonsEn: string[];
  recommendedTier: "L0_public_ugc" | "L1_light_validation" | "L2_structured" | "L3_decision_grade";
}

export interface BudgetV2 {
  seedQueries: number;
  maxRounds: number;
  perRound: number;
  maxQueries: number;
  maxCandidates: number;
  timeWindowMonths: number;
}

export interface PlanVersionV2 {
  version: number;
  parentVersion: number | null;
  createdAt: string;
  reasonZh: string;
  reasonEn: string;
  querySeeds: QuerySeedV2[];
}

export interface InitialBelief {
  decisionQuestionZh: string;
  decisionQuestionEn: string;
  productIdeaZh: string;
  productIdeaEn: string;
  targetUsersZh: string[];
  targetUsersEn: string[];
  assumptionsZh: string[];
  assumptionsEn: string[];
  concernsZh: string[];
  concernsEn: string[];
  capturedAt: string;
  planVersion: number;
}

export interface ResearchPlanV2 {
  id: string;
  version: number;
  parentVersion: number | null;
  createdAt: string;
  confirmed: boolean;
  confirmedAt?: string;
  initialBelief?: InitialBelief;
  brief: BriefV2;
  decisionZh: string;
  decisionEn: string;
  targetMarketZh: string;
  targetMarketEn: string;
  targetUsersZh: string[];
  targetUsersEn: string[];
  productHypothesesZh: string[];
  productHypothesesEn: string[];
  researchQuestions: ResearchQuestionV2[];
  methodGate: MethodGateV2;
  queryMatrix: QuerySeedV2[];
  counterExampleDirectionsZh: string[];
  counterExampleDirectionsEn: string[];
  budget: BudgetV2;
  inclusionZh: string[];
  inclusionEn: string[];
  exclusionZh: string[];
  exclusionEn: string[];
  deliverablesZh: string[];
  deliverablesEn: string[];
  versions: PlanVersionV2[];
  changeReasonZh?: string;
  changeReasonEn?: string;
}

export interface CodeDefV2 {
  id: string;
  labelZh: string;
  labelEn: string;
  definitionZh: string;
  definitionEn: string;
  category: "population" | "scene" | "task" | "alternative" | "stance" | "gap";
  keywords: string[];
}

export interface CodingTraceV2 {
  codeId: string;
  quoteZh: string;
  quoteEn?: string;
  confidence: Confidence;
}

export interface SampleFlagsV2 {
  marketing: boolean;
  duplicate: boolean;
  secondhand: boolean;
  stale: boolean;
}

export interface SampleItemV2 {
  id: string;
  source: "zhihu_search" | "hot_list";
  title: string;
  url: string;
  author: string;
  contentType: string;
  textZh: string;
  textEn: string;
  excerptZh: string;
  excerptEn: string;
  publishDate: string;
  queryRunId: string;
  round: number;
  query: string;
  purposeZh: string;
  purposeEn: string;
  sceneIds: string[];
  sceneLabelsZh: string[];
  sceneLabelsEn: string[];
  populationZh: string;
  populationEn: string;
  stance: Stance;
  flags: SampleFlagsV2;
  included: boolean;
  whyIncludedZh: string;
  whyIncludedEn: string;
  codes: string[];
  traces: CodingTraceV2[];
  supportFindingIds: string[];
  refuteFindingIds: string[];
  votes: number;
  comments: number;
}

export interface CodebookV2 {
  version: string;
  method: "llm" | "keyword_fallback";
  createdAt: string;
  codes: CodeDefV2[];
}

export interface EvidenceRefV2 {
  itemId: string;
  quoteZh: string;
  quoteEn: string;
  url: string;
  author: string;
}

export interface FindingV2 {
  id: string;
  category: FindingCategory;
  type: FindingType;
  titleZh: string;
  titleEn: string;
  bodyZh: string;
  bodyEn: string;
  codeIds: string[];
  evidence: EvidenceRefV2[];
  counterEvidence: EvidenceRefV2[];
  populationsZh: string[];
  populationsEn: string[];
  scenesZh: string[];
  scenesEn: string[];
  boundaryZh: string;
  boundaryEn: string;
  productImpactZh: string;
  productImpactEn: string;
  aiInferenceZh: string;
  aiInferenceEn: string;
  nextValidationZh: string;
  nextValidationEn: string;
  confidence: Confidence;
  manualEdited: boolean;
  hidden?: boolean;
}

export interface InterviewPlanV2 {
  personasZh: string[];
  personasEn: string[];
  questionsZh: string[];
  questionsEn: string[];
  cheapestTestZh: string;
  cheapestTestEn: string;
  falsificationZh: string;
  falsificationEn: string;
}

export interface DecisionMemoV2 {
  recommendation: Recommendation;
  recommendationZh: string;
  recommendationEn: string;
  confidence: Confidence;
  confidenceReasonZh: string;
  confidenceReasonEn: string;
  evidenceIds: string[];
  counterIds: string[];
  assumptionsZh: string[];
  assumptionsEn: string[];
  killCriteriaZh: string[];
  killCriteriaEn: string[];
  nextTest: InterviewPlanV2;
  doNotDoZh: string[];
  doNotDoEn: string[];
  disclosureZh: string;
  disclosureEn: string;
}

export interface ReportSectionV2 {
  titleZh: string;
  titleEn: string;
  bodyZh: string;
  bodyEn: string;
}

export interface BilingualReportV2 {
  generatedAt: string;
  decisionZh: string;
  decisionEn: string;
  summaryZh: string;
  summaryEn: string;
  sections: ReportSectionV2[];
  findings: FindingV2[];
  quotes: {
    itemId: string;
    title: string;
    author: string;
    url: string;
    quoteZh: string;
    quoteEn: string;
    findingIds: string[];
  }[];
  cannotProveZh: string[];
  cannotProveEn: string[];
  nextValidation: InterviewPlanV2;
  wordlist: {
    raw: string;
    source: VocabSource;
    sourceSampleId?: string;
    broughtNewTheme: boolean;
    type: VocabType;
  }[];
}

export interface StudyV2 {
  id: string;
  plan: ResearchPlanV2;
  confirmedAt: string;
  generatedAt: string;
  rounds: number;
  runs: QueryRunV2[];
  retrieval: RetrievalEntry[];
  candidatesScanned: number;
  sample: SampleItemV2[];
  vocabulary: VocabularyItemV2[];
  coverage: CoverageRowV2[];
  stopReasonZh: string;
  stopReasonEn: string;
  coding: CodebookV2;
  findings: FindingV2[];
  memo: DecisionMemoV2;
  report: BilingualReportV2;
  auxiliary: { text: string; error?: string; usedAsFinding: false };
  hotScan: HotScan;
  demo: boolean;
}

export interface DemoSummaryV2 {
  id: string;
  opportunityCount?: number;
  beliefUpdateCount?: number;
  titleZh: string;
  titleEn: string;
  subtitleZh: string;
  subtitleEn: string;
  includedCount: number;
  findingCount: number;
  vocabularyCount: number;
  generatedAt: string;
  demo: boolean;
}
