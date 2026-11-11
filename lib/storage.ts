import type { ResearchDesign, Study } from "./types";

const KEY = "zhiyan.v2";
const RECENT_KEY = "zhiyan.recent.v1";

export interface Draft {
  design: ResearchDesign;
  study: Study | null;
  demoId?: string | null;
  updatedAt?: string;
}

export interface RecentEntry {
  decision: string;
  brief: string;
  updatedAt: string;
  demoId?: string | null;
  includedCount: number;
  demo?: boolean;
}

export function loadDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY) || window.localStorage.getItem("zhiyan.v1");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Draft;
    if (!parsed?.design?.decision || !Array.isArray(parsed.design.queries)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDraft(draft: Draft): void {
  if (typeof window === "undefined") return;
  const next: Draft = { ...draft, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  recordRecent(next);
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function recordRecent(draft: Draft): void {
  if (typeof window === "undefined" || !draft.design?.decision) return;
  const entry: RecentEntry = {
    decision: draft.study?.design.decision || draft.design.decision,
    brief: draft.design.brief,
    updatedAt: new Date().toISOString(),
    demoId: draft.demoId ?? null,
    includedCount: draft.study?.sample.filter((item) => item.included).length ?? 0,
    demo: Boolean(draft.demoId),
  };
  const current = loadRecent();
  const deduped = current.filter((item) => item.decision !== entry.decision);
  window.localStorage.setItem(RECENT_KEY, JSON.stringify([entry, ...deduped].slice(0, 6)));
}

export function loadRecent(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(RECENT_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as RecentEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item.decision === "string").slice(0, 6);
  } catch {
    return [];
  }
}
