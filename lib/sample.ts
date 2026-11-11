import type { CodeDef, RawHit, ResearchDesign, Role, SampleItem, SceneDef } from "./types";

const MARKETING = ["广告", "软广", "品牌方", "赞助", "优惠券", "购买链接", "旗舰店", "淘宝", "京东", "种草", "测评合作", "商务合作"];
const SECONDHAND = ["听说", "朋友说", "网传", "据说", "有人说", "好像是"];
const USER_MARKS = ["我家", "我用", "我买", "我们家", "我家猫", "我的猫", "自己用", "我才", "我把", "我自己", "我随手", "我设", "我后来"];
const BUYER_MARKS = ["入手", "下单", "购买了", "买了", "价格", "多少钱", "值不值"];
const PRACTITIONER_MARKS = ["兽医", "医生", "营养师", "从业", "品牌方", "官方"];

export function sourceId(url: string): string {
  const path = url.split("?")[0];
  let hash = 2166136261;
  for (let i = 0; i < path.length; i += 1) {
    hash ^= path.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `src_${(hash >>> 0).toString(16)}`;
}

export function publishDate(unix: number | null): string {
  if (!unix || !Number.isFinite(unix)) return "unknown";
  const ms = unix > 10_000_000_000 ? unix : unix * 1000;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toISOString().slice(0, 10);
}

function hay(hit: RawHit): string {
  return `${hit.title}\n${hit.text}\n${hit.badge}`;
}

function hitsOf(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((keyword) => keyword && lower.includes(keyword.toLowerCase()));
}

export function relevant(text: string, terms: string[]): boolean {
  if (terms.length === 0) return true;
  return hitsOf(text, terms).length > 0;
}

function scenesHit(text: string, scenes: SceneDef[]): { scene: SceneDef | null; matched: string[]; ids: string[] } {
  let best: SceneDef | null = null;
  let matched: string[] = [];
  const ids: string[] = [];
  for (const scene of scenes) {
    const found = hitsOf(text, scene.keywords);
    if (found.length === 0) continue;
    ids.push(scene.id);
    if (found.length > matched.length) {
      best = scene;
      matched = found;
    }
  }
  return { scene: best, matched, ids };
}

function codesFor(text: string, codebook: CodeDef[]): string[] {
  return codebook.filter((code) => hitsOf(text, code.keywords).length > 0).map((code) => code.id);
}

function roleFor(text: string): Role {
  const user = hitsOf(text, USER_MARKS).length > 0;
  const buyer = hitsOf(text, BUYER_MARKS).length > 0;
  const practitioner = hitsOf(text, PRACTITIONER_MARKS).length > 0;
  if (user && buyer) return "buyer";
  if (user) return "user";
  if (buyer) return "buyer";
  if (practitioner) return "practitioner";
  return "unclear";
}

function clip(text: string): string {
  const clean = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (clean.length <= 480) return clean;
  return `${clean.slice(0, 477)}...`;
}

export function assembleSample(
  design: ResearchDesign,
  hits: RawHit[],
  translations: Record<string, string>,
): { items: SampleItem[]; hotScan: { scanned: number; included: number; droppedTitles: string[] } } {
  const droppedTitles: string[] = [];
  let scanned = 0;
  const kept: RawHit[] = [];
  for (const hit of hits) {
    const text = hay(hit);
    if (hit.source === "hot_list") {
      scanned += 1;
      if (!relevant(text, design.productTerms)) {
        droppedTitles.push(hit.title);
        continue;
      }
    } else if (!relevant(text, design.productTerms) && scenesHit(text, design.scenes).scene === null) {
      continue;
    }
    if (!hit.url || !hit.title) continue;
    kept.push(hit);
  }

  const seen = new Set<string>();
  const items: SampleItem[] = [];
  for (const hit of kept) {
    const id = sourceId(hit.url);
    const text = hay(hit);
    const duplicate = seen.has(id);
    seen.add(id);
    const { scene, matched, ids } = scenesHit(text, design.scenes);
    const sceneId = scene?.id ?? "unassigned";
    const sceneLabel = scene?.label ?? "Unassigned";
    const marketing = hitsOf(text, MARKETING).length > 0 || /官方|机构/.test(hit.badge);
    const secondhand = hitsOf(text, SECONDHAND).length > 0;
    const productHits = hitsOf(text, design.productTerms);
    const why = duplicate
      ? `Same link as an earlier item. Held out so the sample does not count it twice. Restore puts it back into the counts. Query: ${hit.query}.`
      : scene
        ? `Matched the scene "${sceneLabel}" through ${matched.join(", ")}. Query: ${hit.query}.`
        : `Matched product terms ${productHits.join(", ") || "in the query"} and no scene term. Query: ${hit.query}.`;
    const excerptZh = clip(hit.text || hit.title);
    items.push({
      id: duplicate ? `${id}_${items.length}` : id,
      source: hit.source,
      title: hit.title,
      url: hit.url,
      author: hit.author,
      contentType: hit.contentType,
      excerptZh,
      excerptEn: translations[id] || translations[`${id}_pending`] || "",
      publishDate: publishDate(hit.publishTime),
      sceneId,
      sceneIds: ids,
      sceneLabel,
      query: hit.query,
      whyIncluded: why,
      flags: { marketing, duplicate, secondhand },
      role: roleFor(text),
      included: !duplicate,
      codeIds: codesFor(text, design.codebook),
      votes: hit.votes,
      comments: hit.comments,
    });
  }

  const hotIncluded = items.filter((item) => item.source === "hot_list").length;
  return {
    items,
    hotScan: { scanned, included: hotIncluded, droppedTitles },
  };
}

export function applyTranslations(items: SampleItem[], translations: Record<string, string>): SampleItem[] {
  return items.map((item) => {
    const base = item.id.replace(/_\d+$/, "");
    const en = translations[item.id] || translations[base];
    return en ? { ...item, excerptEn: en } : item;
  });
}
