import { readFile } from "node:fs/promises";
import path from "node:path";
import type { DecisionBriefV21 } from "../brief";

const DIR = path.join(process.cwd(), "lib", "v2", "briefs");

export async function readBrief(id: string): Promise<DecisionBriefV21 | null> {
  if (!/^[a-z0-9-]{2,64}$/.test(id)) return null;
  try {
    const raw = await readFile(path.join(DIR, `${id}.json`), "utf8");
    const parsed = JSON.parse(raw) as { brief?: DecisionBriefV21 };
    return parsed.brief ?? null;
  } catch {
    return null;
  }
}
