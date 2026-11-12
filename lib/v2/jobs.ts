import type { ZhihuContent } from "../types";
import { buildHeuristicBrief } from "./brief";
import type { DecisionBriefV21, HighImpactTermV21, RoundSnapshotV21, StopReasonV21 } from "./brief";
import type { RoundExplorationState } from "./explore";
import { runStudy } from "./pipeline";
import type { InitialBelief, ResearchPlanV2, StudyV2 } from "./types";
import { hotListV2, searchZhihuV2, zhidaV2 } from "./zhihu";

export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface JobStage {
  key: string;
  messageZh: string;
  messageEn: string;
  query?: string;
}

export interface JobRound {
  round: number;
  snapshot: RoundSnapshotV21;
}

interface StoredJob {
  id: string;
  status: JobStatus;
  plan: ResearchPlanV2;
  mode: "lite" | "full";
  createdAt: string;
  updatedAt: string;
  stage: JobStage;
  rounds: JobRound[];
  nextQueries: { query: string; purposeZh: string; purposeEn: string }[];
  error?: string;
  study?: StudyV2;
  brief?: DecisionBriefV21;
  cache: Map<string, ZhihuContent[]>;
}

export interface PublicJob {
  id: string;
  status: JobStatus;
  mode: "lite" | "full";
  createdAt: string;
  updatedAt: string;
  stage: JobStage;
  rounds: JobRound[];
  nextQueries: { query: string; purposeZh: string; purposeEn: string }[];
  error?: string;
  study?: StudyV2;
  brief?: DecisionBriefV21;
  plan: ResearchPlanV2;
}

const globalStore = globalThis as typeof globalThis & { __zhiyanV21Jobs?: Map<string, StoredJob> };
const store: Map<string, StoredJob> = globalStore.__zhiyanV21Jobs ?? new Map<string, StoredJob>();
globalStore.__zhiyanV21Jobs = store;

function nowIso(): string {
  return new Date().toISOString();
}

function initialBeliefFor(plan: ResearchPlanV2): InitialBelief {
  return plan.initialBelief ?? {
    decisionQuestionZh: plan.decisionZh,
    decisionQuestionEn: plan.decisionEn,
    productIdeaZh: plan.brief.product,
    productIdeaEn: plan.brief.product,
    targetUsersZh: plan.targetUsersZh,
    targetUsersEn: plan.targetUsersEn,
    assumptionsZh: plan.productHypothesesZh,
    assumptionsEn: plan.productHypothesesEn,
    concernsZh: [plan.brief.biggestRisk],
    concernsEn: [plan.brief.biggestRisk],
    capturedAt: plan.createdAt,
    planVersion: 1,
  };
}

function termFromState(item: RoundExplorationState["vocabulary"][number], state: RoundExplorationState): HighImpactTermV21 | null {
  const source = state.sample.find((sample) => sample.id === item.sourceSampleId);
  if (!source || source.round !== state.round) return null;
  return {
    raw: item.raw,
    type: item.type,
    sourceSampleId: item.sourceSampleId,
    sourceQuoteZh: item.sourceQuoteZh,
    proposedQuery: item.proposedQuery,
    whyZh: item.gapZh,
    whyEn: item.gapEn,
  };
}

function snapshotFromState(state: RoundExplorationState): RoundSnapshotV21 {
  const terms = state.vocabulary.map((item) => termFromState(item, state)).filter((item): item is HighImpactTermV21 => Boolean(item)).slice(0, 4);
  const nextQueries = state.nextQueries;
  const nextReasonZh = nextQueries.length > 0
    ? "因为发现了 " + (terms.map((term) => "「" + term.raw + "」").join("、") || "新的讨论角度") + "，所以下一轮搜索 " + nextQueries.map((item) => "「" + item.query + "」").join("、") + "。"
    : "";
  const nextReasonEn = nextQueries.length > 0
    ? "Because the study found " + (terms.map((term) => '"' + term.raw + '"').join(", ") || "new angles") + ", the next round searches " + nextQueries.map((item) => '"' + item.query + '"').join(", ") + "."
    : "";
  const stop: StopReasonV21 | undefined = state.stopReasonZh
    ? {
        type: state.runs.length >= state.plan.budget.maxQueries || state.sample.length >= state.plan.budget.maxCandidates ? "budget_exhausted" : "saturation",
        detailZh: state.stopReasonZh,
        detailEn: state.stopReasonEn || "",
      }
    : undefined;
  return {
    round: state.round,
    objectiveZh: state.round === 0 ? "从原始产品问题出发，验证用户是否在讨论这个问题。" : state.round === 1 ? "跟随新词，补齐场景、替代方案和交付环节。" : "寻找反例、条件性观点和仍未回答的问题。",
    objectiveEn: state.round === 0 ? "Start from the original product question and check whether users discuss it." : state.round === 1 ? "Follow new vocabulary into scenes, alternatives and delivery." : "Look for counter-examples, conditional views and unanswered questions.",
    queryIds: state.runs.map((run) => run.id),
    newTerms: terms,
    newUnderstandingZh: terms.length > 0 ? "这一轮出现了「" + terms.map((term) => term.raw).join("、") + "」等表达，说明问题不止停留在产品词本身。" : "这一轮没有出现足以改变研究方向的表达。",
    newUnderstandingEn: terms.length > 0 ? "This round surfaced expressions such as " + terms.map((term) => '"' + term.raw + '"').join(", ") + ", suggesting the problem is not limited to the product category." : "This round did not surface expressions that changed the research direction.",
    coverageChangeZh: "本轮执行 " + state.runs.length + " 条查询。",
    coverageChangeEn: state.runs.length + " queries ran in this round.",
    nextRoundReasonZh: nextReasonZh,
    nextRoundReasonEn: nextReasonEn,
    preliminaryOnly: !stop,
    stopReason: stop,
  };
}

function publicJob(job: StoredJob): PublicJob {
  return {
    id: job.id,
    status: job.status,
    mode: job.mode,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    stage: job.stage,
    rounds: job.rounds,
    nextQueries: job.nextQueries,
    error: job.error,
    study: job.status === "completed" ? job.study : undefined,
    brief: job.status === "completed" ? job.brief : undefined,
    plan: job.plan,
  };
}

async function execute(job: StoredJob): Promise<void> {
  job.status = "running";
  job.error = undefined;
  job.stage = { key: "start", messageZh: "开始研究任务", messageEn: "Starting the study" };
  job.updatedAt = nowIso();
  const cache = job.cache;
  const port = {
    async search(query: string, count: number): Promise<ZhihuContent[]> {
      if (cache.has(query)) return cache.get(query) as ZhihuContent[];
      const items = await searchZhihuV2(query, count);
      cache.set(query, items);
      return items;
    },
    hot: (limit: number) => hotListV2(limit),
    zhida: (prompt: string) => zhidaV2(prompt),
  };
  try {
    const study = await runStudy(job.plan, true, {
      port,
      lite: job.mode === "lite",
      onProgress: (progress) => {
        job.stage = { key: progress.step, messageZh: progress.messageZh, messageEn: progress.messageEn, query: progress.query };
        job.updatedAt = nowIso();
      },
      onRound: (state) => {
        const snapshot = snapshotFromState(state);
        const index = job.rounds.findIndex((item) => item.round === snapshot.round);
        if (index >= 0) job.rounds[index] = { round: snapshot.round, snapshot };
        else job.rounds.push({ round: snapshot.round, snapshot });
        job.rounds.sort((a, b) => a.round - b.round);
        job.nextQueries = state.nextQueries.map((seed) => ({ query: seed.query, purposeZh: seed.purposeZh, purposeEn: seed.purposeEn }));
        job.updatedAt = nowIso();
      },
    });
    job.study = study;
    job.brief = buildHeuristicBrief(study);
    job.status = "completed";
    job.stage = { key: "done", messageZh: "研究完成，已生成决策简报", messageEn: "Study complete; decision brief generated" };
    job.updatedAt = nowIso();
  } catch (error) {
    job.status = "failed";
    job.error = error instanceof Error ? error.message : "STUDY_FAILED";
    job.updatedAt = nowIso();
  }
}

export function startJob(plan: ResearchPlanV2, mode: "lite" | "full"): PublicJob {
  const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const job: StoredJob = {
    id,
    status: "queued",
    plan,
    mode,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    stage: { key: "queued", messageZh: "任务已创建，等待执行", messageEn: "Job created; waiting to run" },
    rounds: [],
    nextQueries: [],
    cache: new Map<string, ZhihuContent[]>(),
  };
  store.set(id, job);
  void execute(job);
  return publicJob(job);
}

export function getJob(id: string): PublicJob | null {
  const job = store.get(id);
  return job ? publicJob(job) : null;
}

export function retryJob(id: string): PublicJob | null {
  const job = store.get(id);
  if (!job || job.status === "running") return job ? publicJob(job) : null;
  job.status = "queued";
  job.error = undefined;
  job.updatedAt = nowIso();
  void execute(job);
  return publicJob(job);
}

export function initialBeliefForPlan(plan: ResearchPlanV2): InitialBelief {
  return initialBeliefFor(plan);
}
