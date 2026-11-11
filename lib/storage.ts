import type { ResearchDesign, Study } from "./types";

const KEY = "zhiyan.v1";

export interface Draft {
  design: ResearchDesign;
  study: Study | null;
}

export function loadDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
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
  window.localStorage.setItem(KEY, JSON.stringify(draft));
}

export function clearDraft(): void {
  window.localStorage.removeItem(KEY);
}
