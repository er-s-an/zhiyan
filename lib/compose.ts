import { normalizeDesign } from "./compile";
import { applyTranslations, assembleSample } from "./sample";
import type { Auxiliary, ResearchDesign, RetrievalEntry, Study, ZhihuContent } from "./types";

const FALLBACK_EN = "Translation unavailable. Use the Chinese excerpt as the evidence.";

export function composeStudy(args: {
  design: ResearchDesign;
  now?: Date;
  id?: string;
  searches: { query: string; items: ZhihuContent[]; error?: string }[];
  hot: { items: ZhihuContent[]; error?: string };
  zhida: { text: string; error?: string };
  translations: Record<string, string>;
}): Study {
  const design = normalizeDesign(args.design);
  const now = args.now ?? new Date();
  const retrieval: RetrievalEntry[] = [];
  const searchHits: ZhihuContent[] = [];
  const searchQueries: string[] = [];

  for (const result of args.searches) {
    retrieval.push({
      kind: "zhihu_search",
      query: result.query,
      resultCount: result.items.length,
      error: result.error,
    });
    for (const item of result.items) {
      searchHits.push(item);
      searchQueries.push(result.query);
    }
  }

  retrieval.push({
    kind: "hot_list",
    query: "热榜",
    resultCount: args.hot.items.length,
    error: args.hot.error,
  });

  if (!retrieval.some((entry) => entry.kind === "zhihu_search" && !entry.error)) {
    throw new Error("SEARCH_FAILED");
  }
  if (!retrieval.some((entry) => entry.kind === "hot_list" && !entry.error)) {
    throw new Error("HOT_LIST_FAILED");
  }

  const auxiliary: Auxiliary = {
    text: args.zhida.text,
    error: args.zhida.error,
    usedAsFinding: false,
  };
  if (searchHits.length > 0) {
    retrieval.push({
      kind: "zhida",
      query: "gap hint",
      resultCount: args.zhida.text ? 1 : 0,
      error: args.zhida.error,
    });
  }

  const hits = [
    ...searchHits.map((item, index) => ({
      ...item,
      source: "zhihu_search" as const,
      query: searchQueries[index] || "",
    })),
    ...args.hot.items.map((item) => ({
      ...item,
      source: "hot_list" as const,
      query: "热榜",
    })),
  ];

  const draft = assembleSample(design, hits, {});
  const items = applyTranslations(draft.items, args.translations).map((item) => ({
    ...item,
    excerptEn: item.excerptEn || FALLBACK_EN,
  }));

  return {
    id: args.id || `study_${now.getTime()}`,
    design,
    confirmedAt: now.toISOString(),
    retrieval,
    hotScan: draft.hotScan,
    sample: items,
    auxiliary,
  };
}
