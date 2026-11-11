import { readFile } from "node:fs/promises";
import path from "node:path";
import type { DemoSummaryV2, StudyV2 } from "../types";

const DIR = path.join(process.cwd(), "lib", "v2", "demos");

function safeId(id: string): boolean {
  return /^[a-z0-9-]{2,64}$/.test(id);
}

export async function listV2Demos(): Promise<DemoSummaryV2[]> {
  try {
    const raw = await readFile(path.join(DIR, "index.json"), "utf8");
    const parsed = JSON.parse(raw) as { demos?: DemoSummaryV2[] };
    return Array.isArray(parsed.demos) ? parsed.demos.filter((demo) => demo && safeId(demo.id)) : [];
  } catch {
    return [];
  }
}

export async function readV2Demo(id: string): Promise<{ study: StudyV2 } | null> {
  if (!safeId(id)) return null;
  try {
    const raw = await readFile(path.join(DIR, `${id}.json`), "utf8");
    const parsed = JSON.parse(raw) as { study?: StudyV2 };
    if (!parsed.study?.plan || !Array.isArray(parsed.study.sample)) return null;
    return { study: parsed.study };
  } catch {
    return null;
  }
}
