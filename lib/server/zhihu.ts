import type { ZhihuContent } from "../types";

const SEARCH_URL = "https://developer.zhihu.com/api/v1/content/zhihu_search";
const HOT_URL = "https://developer.zhihu.com/api/v1/content/hot_list";
const ZHIDA_URL = "https://developer.zhihu.com/v1/chat/completions";

function secret(): string {
  const value = process.env.ZHIHU_ACCESS_SECRET;
  if (!value) throw new Error("ZHIHU_NOT_CONFIGURED");
  return value;
}

async function zhihuGet(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${secret()}`,
      "X-Request-Timestamp": String(Math.floor(Date.now() / 1000)),
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`ZHIHU_HTTP_${response.status}`);
  }
  const record = asRecord(body);
  if (!record) throw new Error("ZHIHU_BAD_JSON");
  if (record.Code !== 0) {
    throw new Error(`ZHIHU_${String(record.Code || "ERROR")}`);
  }
  return record.Data;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function time(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function toContent(item: Record<string, unknown>, summaryKey: "ContentText" | "Summary"): ZhihuContent {
  return {
    title: text(item.Title),
    url: text(item.Url),
    author: text(item.AuthorName),
    contentType: text(item.ContentType),
    text: text(item[summaryKey]),
    publishTime: time(item.CreateTime) ?? time(item.EditTime),
    votes: num(item.VoteUpCount),
    comments: num(item.CommentCount),
    badge: text(item.AuthorBadgeText),
  };
}

export async function searchZhihu(query: string, count: number): Promise<ZhihuContent[]> {
  const params = new URLSearchParams({ Query: query, Count: String(count) });
  const data = asRecord(await zhihuGet(`${SEARCH_URL}?${params.toString()}`));
  const items = Array.isArray(data?.Items) ? data.Items : [];
  return items.map((item) => toContent(asRecord(item) || {}, "ContentText")).filter((item) => item.url && item.title);
}

export async function hotList(limit: number): Promise<ZhihuContent[]> {
  const data = asRecord(await zhihuGet(`${HOT_URL}?Limit=${limit}`));
  const items = Array.isArray(data?.Items) ? data.Items : [];
  return items.map((item) => toContent(asRecord(item) || {}, "Summary")).filter((item) => item.url && item.title);
}

export async function zhidaHint(prompt: string, timeoutMs = 8000): Promise<string> {
  const response = await fetch(ZHIDA_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret()}`,
      "X-Request-Timestamp": String(Math.floor(Date.now() / 1000)),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "zhida-fast-1p5",
      stream: false,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`ZHIDA_HTTP_${response.status}`);
  const record = asRecord(body);
  const choices = Array.isArray(record?.choices) ? record.choices : [];
  const first = asRecord(choices[0]);
  const message = asRecord(first?.message);
  const content = text(message?.content);
  if (!content) throw new Error("ZHIDA_EMPTY");
  return content;
}

export const zhihuPort = {
  search: searchZhihu,
  hot: hotList,
  zhida: zhidaHint,
};
