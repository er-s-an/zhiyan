import { composeStudy } from "./compose";
import { normalizeDesign } from "./compile";
import type { ResearchDesign, Study, ZhihuContent } from "./types";

export interface ZhihuPort {
  search(query: string, count: number): Promise<ZhihuContent[]>;
  hot(limit: number): Promise<ZhihuContent[]>;
  zhida(prompt: string): Promise<string>;
}

export class ConfirmRequired extends Error {
  constructor() {
    super("CONFIRM_REQUIRED");
  }
}

async function firstSettled<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function executeConfirmed(args: {
  design: ResearchDesign;
  confirmed: boolean;
  port: ZhihuPort;
  translate: (pairs: { id: string; zh: string }[]) => Promise<Record<string, string>>;
  now?: Date;
  id?: string;
}): Promise<Study> {
  if (!args.confirmed) {
    throw new ConfirmRequired();
  }
  const design = normalizeDesign(args.design);
  const now = args.now ?? new Date();

  const hotPromise = args.port
    .hot(30)
    .then((items) => ({ items, error: undefined as string | undefined }))
    .catch((error: unknown) => ({
      items: [] as ZhihuContent[],
      error: error instanceof Error ? error.message : "HOT_FAILED",
    }));

  const searches: { query: string; items: ZhihuContent[]; error?: string }[] = [];
  for (const query of design.queries) {
    let lastError = "SEARCH_FAILED";
    let items: ZhihuContent[] | null = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        items = await args.port.search(query, 4);
        break;
      } catch (error) {
        lastError = error instanceof Error ? error.message : "SEARCH_FAILED";
        if (!lastError.includes("30001") || attempt === 1) break;
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
    }
    searches.push(items ? { query, items } : { query, items: [], error: lastError });
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const hot = await hotPromise;
  const titles = searches.flatMap((result) => result.items.map((item) => item.title)).filter(Boolean).slice(0, 24);
  let zhida = { text: "", error: undefined as string | undefined };
  if (titles.length > 0 && searches.some((result) => !result.error)) {
    const prompt = `下面是已经检索到的知乎标题。请只列出搜索词可能漏掉的使用场景，用简短中文。不要判断会不会购买，不要做产品结论。标题：${titles.join(" / ")}`;
    zhida = await firstSettled(
      args.port.zhida(prompt).then(
        (text) => ({ text, error: undefined as string | undefined }),
        (error: unknown) => ({ text: "", error: error instanceof Error ? error.message : "ZHIDA_FAILED" }),
      ),
      12000,
      { text: "", error: "ZHIDA_TIMEOUT" },
    );
  }

  const skeleton = composeStudy({
    design,
    now,
    id: args.id,
    searches,
    hot,
    zhida,
    translations: {},
  });
  const pairs = skeleton.sample.map((item) => ({ id: item.id, zh: item.excerptZh })).filter((pair) => pair.zh);
  const translations = pairs.length > 0 ? await args.translate(pairs) : {};
  return composeStudy({
    design,
    now,
    id: skeleton.id,
    searches,
    hot,
    zhida,
    translations,
  });
}
