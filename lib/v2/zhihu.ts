import { hotList, searchZhihu, zhidaHint } from "../server/zhihu";
import type { ZhihuContent } from "../types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(run: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown = new Error("ZHIHU_FAILED");
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) await sleep(900 * (attempt + 1));
    }
  }
  throw lastError;
}

export function searchZhihuV2(query: string, count = 5): Promise<ZhihuContent[]> {
  return withRetry(() => searchZhihu(query, count));
}

export function hotListV2(limit = 30): Promise<ZhihuContent[]> {
  return withRetry(() => hotList(limit));
}

export function zhidaV2(prompt: string, timeoutMs = 12000): Promise<string> {
  return withRetry(() => zhidaHint(prompt, timeoutMs), 2);
}

export function normalizeUrl(url: string): string {
  return url.split("#")[0].replace(/[?&]utm_[^&]+/g, "").replace(/[?&]$/, "");
}

export function normalizeTitle(title: string): string {
  return title
    .replace(/<[^>]+>/g, "")
    .replace(/[「」“”"'《》【】[\]()（）\s,，。.!！?？:：;；-]/g, "")
    .toLowerCase()
    .slice(0, 80);
}

export function dedupeKey(url: string, title: string): string {
  const normalized = normalizeUrl(url);
  return normalized || normalizeTitle(title);
}

export function clipText(text: string, limit = 700): string {
  const clean = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit - 1)}…`;
}

export function toIsoDate(unix: number | null): string {
  if (!unix || !Number.isFinite(unix)) return "unknown";
  const ms = unix > 10_000_000_000 ? unix : unix * 1000;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? "unknown" : date.toISOString().slice(0, 10);
}

export function stableId(prefix: string, value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}_${(hash >>> 0).toString(16)}`;
}
