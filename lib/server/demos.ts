import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Study } from "../types";

export interface DemoSummary {
  id: string;
  title: string;
  subtitle: string;
  tags: string[];
  audience: string;
  sampleCount: number;
  includedCount: number;
  findingCount: number;
  generatedAt?: string;
}

const DEMO_DIR = path.join(process.cwd(), "lib", "demos");

function isSafeId(id: string): boolean {
  return /^[a-z0-9-]{2,64}$/.test(id);
}

export async function listDemos(): Promise<DemoSummary[]> {
  try {
    const raw = await readFile(path.join(DEMO_DIR, "index.json"), "utf8");
    const parsed: unknown = JSON.parse(raw);
    const demos = parsed && typeof parsed === "object" && Array.isArray((parsed as { demos?: unknown }).demos)
      ? (parsed as { demos: DemoSummary[] }).demos
      : [];
    return demos.filter((demo) => demo && typeof demo.id === "string" && isSafeId(demo.id));
  } catch {
    return [];
  }
}

export async function readDemo(id: string): Promise<{ study: Study } | null> {
  if (!isSafeId(id)) return null;
  try {
    const raw = await readFile(path.join(DEMO_DIR, `${id}.json`), "utf8");
    const parsed = JSON.parse(raw) as { study?: Study };
    if (!parsed?.study?.design || !Array.isArray(parsed.study.sample)) return null;
    return { study: parsed.study };
  } catch {
    return null;
  }
}
