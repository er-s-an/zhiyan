import { composeStudy } from "./compose";
import { normalizeDesign } from "./compile";
import { LOCKED_LIMITS, type ResearchDesign, type Study, type ZhihuContent } from "./types";

export type RetrieveProgress = { step: string; finished: string[] };

type Payload = {
  error?: string;
  code?: string;
  items?: ZhihuContent[];
  text?: string;
  translations?: Record<string, string>;
};

async function post(path: string, body: unknown): Promise<{ status: number; payload: Payload }> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as Payload;
  return { status: response.status, payload };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function confirmAndRetrieve(
  design: ResearchDesign,
  onProgress: (progress: RetrieveProgress) => void,
): Promise<Study> {
  const extra = design.zhihuCannotAnswer.filter(
    (line) => !LOCKED_LIMITS.includes(line as (typeof LOCKED_LIMITS)[number]),
  );
  const next = normalizeDesign({ ...design, zhihuCannotAnswer: [...LOCKED_LIMITS, ...extra] });
  const now = new Date();
  const finished: string[] = [];
  const mark = (step: string) => onProgress({ step, finished: [...finished] });

  mark("Hot list");
  const hotPromise = post("/api/hot", { confirmed: true, design: next });

  const searches: { query: string; items: ZhihuContent[]; error?: string }[] = [];
  for (const query of next.queries) {
    mark(`Zhihu search: ${query}`);
    let result = await post("/api/search", { confirmed: true, design: next, query });
    if (result.status === 400) {
      throw new Error(result.payload.error || "CONFIRM_REQUIRED");
    }
    if (result.status !== 200 && String(result.payload.error || "").includes("30001")) {
      await sleep(2500);
      result = await post("/api/search", { confirmed: true, design: next, query });
    }
    searches.push({
      query,
      items: result.status === 200 && Array.isArray(result.payload.items) ? result.payload.items : [],
      error: result.status === 200 ? undefined : result.payload.error || "SEARCH_FAILED",
    });
    finished.push(query);
    await sleep(400);
  }

  if (!searches.some((result) => !result.error)) {
    throw new Error("SEARCH_FAILED");
  }

  mark("Reading the hot list");
  const hotResult = await hotPromise;
  if (hotResult.status === 400) {
    throw new Error(hotResult.payload.error || "CONFIRM_REQUIRED");
  }
  const hot = {
    items: hotResult.status === 200 && Array.isArray(hotResult.payload.items) ? hotResult.payload.items : [],
    error: hotResult.status === 200 ? undefined : hotResult.payload.error || "HOT_LIST_FAILED",
  };

  const titles = searches.flatMap((result) => result.items.map((item) => item.title)).filter(Boolean).slice(0, 24);
  mark("Auxiliary gap hint");
  let zhida = { text: "", error: titles.length === 0 ? "ZHIDA_SKIPPED" : undefined };
  if (titles.length > 0) {
    const zhidaResult = await post("/api/zhida", { confirmed: true, design: next, titles });
    zhida = {
      text: typeof zhidaResult.payload.text === "string" ? zhidaResult.payload.text : "",
      error: zhidaResult.payload.error,
    };
  }

  const skeleton = composeStudy({
    design: next,
    now,
    searches,
    hot,
    zhida,
    translations: {},
  });
  const pairs = skeleton.sample.map((item) => ({ id: item.id, zh: item.excerptZh })).filter((pair) => pair.zh);
  const translations: Record<string, string> = {};
  for (let index = 0; index < pairs.length; index += 1) {
    const group = pairs.slice(index, index + 1);
    mark(`Translating excerpt ${index + 1} of ${pairs.length}`);
    const part = await post("/api/translate", { confirmed: true, design: next, pairs: group });
    if (part.payload.translations) Object.assign(translations, part.payload.translations);
  }

  mark("Assembling the sample");
  return composeStudy({
    design: next,
    now,
    id: skeleton.id,
    searches,
    hot,
    zhida,
    translations,
  });
}
