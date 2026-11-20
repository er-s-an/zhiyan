import { createResearchPlan } from "../../../../lib/v2/plan";
import { profileToBrief, type InterviewProfile } from "../../../../lib/v2/interview";
import type { Lang } from "../../../../lib/v2/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const FIELD_LIMIT = 4000;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, FIELD_LIMIT) : "";
}

function isLang(value: unknown): value is Lang {
  return value === "zh" || value === "en" || value === "fr" || value === "ja" || value === "ru" || value === "ko";
}

function splitUsers(value: string): string[] {
  return value
    .split(/[、,，;；/|・]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function marketNames(market: string): { zh: string; en: string } {
  const china = /中国|中文|大陆|国内|中国本土|china|chinese|mainland|chine|chinois|chinoise/i.test(market);
  const overseas = /海外|北美|美国|加拿大|欧洲|英国|德国|法国|日本|韩国|东南亚|全球|overseas|north america|united states|europe|japan|global|amérique du nord|états-unis|asie du sud-est|mondial|étranger|international|北米|アメリカ|ヨーロッパ|東南アジア|グローバル/i.test(market);
  if (china && overseas) return { zh: "中国大陆及海外", en: "Mainland China and overseas" };
  if (china) return { zh: "中国大陆", en: "Mainland China" };
  if (/北美|north america|amérique du nord|北米/i.test(market)) return { zh: "北美", en: "North America" };
  if (/欧洲|europe|ヨーロッパ/i.test(market)) return { zh: "欧洲", en: "Europe" };
  if (/日本|japan|japon/i.test(market)) return { zh: "日本", en: "Japan" };
  if (/东南亚|southeast asia|asie du sud-est|東南アジア/i.test(market)) return { zh: "东南亚", en: "Southeast Asia" };
  if (overseas) return { zh: market || "海外", en: market || "Overseas" };
  return { zh: market || "待确认", en: market || "To be confirmed" };
}

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  const record = body && typeof body === "object" ? (body as { profile?: unknown }) : {};
  const raw = record.profile && typeof record.profile === "object" ? (record.profile as Record<string, unknown>) : {};

  const profile: InterviewProfile = {
    age: text(raw.age),
    occupation: text(raw.occupation),
    idea: text(raw.idea),
    audience: text(raw.audience),
    problem: text(raw.problem),
    market: text(raw.market),
    edge: text(raw.edge),
    model: text(raw.model),
    evidence: text(raw.evidence),
    decision: text(raw.decision),
    constraints: text(raw.constraints),
    language: isLang(raw.language) ? raw.language : "zh",
    capturedAt: typeof raw.capturedAt === "string" ? raw.capturedAt : new Date().toISOString(),
  };

  if (!profile.idea && !profile.audience) {
    return Response.json({ error: "PROFILE_REQUIRED" }, { status: 400 });
  }

  const market = marketNames(profile.market);
  const usersZh = splitUsers(profile.audience);
  const language = /[\u4e00-\u9fff]/.test(`${profile.idea} ${profile.audience} ${profile.problem}`) ? "zh" : "en";

  try {
    const plan = await createResearchPlan(profileToBrief(profile), language, {
      decisionZh: profile.decision || profile.idea,
      decisionEn: profile.decision || profile.idea,
      targetMarketZh: market.zh,
      targetMarketEn: market.en,
      targetUsersZh: usersZh.length > 0 ? usersZh : ["待确认的目标用户"],
      targetUsersEn: usersZh.length > 0 ? usersZh : ["Target users to be confirmed"],
    });
    return Response.json({ plan, zhihuCalls: 0 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "PLAN_FAILED" }, { status: 502 });
  }
}
