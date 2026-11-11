import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { project } from "../lib/project.ts";
import { SCENARIOS } from "../lib/scenarios.ts";
import { executeConfirmed } from "../lib/run.ts";
import { translateExcerpts } from "../lib/server/translate.ts";
import { zhihuPort } from "../lib/server/zhihu.ts";
import type { Study } from "../lib/types.ts";

function loadEnv(): void {
  const file = path.join(process.cwd(), ".env.local");
  try {
    const text = readFileSync(file, "utf8");
    for (const line of text.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, raw] = match;
      if (process.env[key]) continue;
      process.env[key] = raw.replace(/^["']|["']$/g, "");
    }
  } catch {
    // The shell may already provide the variables.
  }
}

async function main(): Promise<void> {
  loadEnv();
  if (!process.env.ZHIHU_ACCESS_SECRET) {
    console.error("ZHIHU_ACCESS_SECRET is missing. Add it to .env.local.");
    process.exit(1);
  }

  const onlyArg = process.argv.find((arg) => arg.startsWith("--only="));
  const only = onlyArg ? onlyArg.slice("--only=".length) : "";
  const list = only ? SCENARIOS.filter((scenario) => scenario.id === only) : SCENARIOS;
  if (list.length === 0) {
    console.error(`No scenario matched --only=${only}`);
    process.exit(1);
  }

  const dir = path.join(process.cwd(), "lib", "demos");
  mkdirSync(dir, { recursive: true });
  const now = new Date();
  const summaries: unknown[] = [];

  for (const scenario of list) {
    const design = scenario.build(now);
    console.log(`\n=== ${scenario.id} · ${scenario.title} ===`);
    console.log(`queries: ${design.queries.join(" | ")}`);
    try {
      const study: Study = await executeConfirmed({
        design,
        confirmed: true,
        port: zhihuPort,
        translate: async (pairs) => {
          const started = Date.now();
          console.log(`translating ${pairs.length} excerpts...`);
          const result = await translateExcerpts(pairs, { timeoutMs: 45000, retries: 0 });
          const missing = Object.values(result).filter((value) => value.startsWith("Translation unavailable")).length;
          console.log(`translated in ${Date.now() - started} ms (fallback ${missing})`);
          return result;
        },
        now,
        id: `demo_${scenario.id}`,
      });
      const view = project(study);
      const fallback = study.sample.filter((item) => item.excerptEn.startsWith("Translation unavailable")).length;
      console.log(
        `sample=${study.sample.length} included=${view.includedCount} held=${view.heldOutCount} findings=${view.findings.length} scenes=${view.honest.coveredScenes.length}/${design.scenes.length} zhida=${study.auxiliary.text ? "yes" : "no"} translations_fallback=${fallback}`,
      );
      const file = path.join(dir, `${scenario.id}.json`);
      writeFileSync(file, JSON.stringify({ study }, null, 2), "utf8");
      console.log(`wrote ${path.relative(process.cwd(), file)} (${(JSON.stringify(study).length / 1024).toFixed(1)} kB)`);
      summaries.push({
        id: scenario.id,
        title: scenario.title,
        subtitle: scenario.subtitle,
        tags: scenario.tags,
        audience: scenario.audience,
        sampleCount: study.sample.length,
        includedCount: view.includedCount,
        findingCount: view.findings.length,
        generatedAt: study.confirmedAt,
      });
    } catch (error) {
      console.error(`FAILED ${scenario.id}:`, error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  }

  const indexPath = path.join(dir, "index.json");
  let existing: { demos?: unknown[] } = { demos: [] };
  try {
    existing = JSON.parse(readFileSync(indexPath, "utf8")) as { demos?: unknown[] };
  } catch {
    // First run.
  }
  const merged = new Map<string, unknown>();
  for (const item of existing.demos ?? []) {
    const id = (item as { id?: string }).id;
    if (id) merged.set(id, item);
  }
  for (const item of summaries) {
    const id = (item as { id: string }).id;
    merged.set(id, item);
  }
  writeFileSync(indexPath, JSON.stringify({ demos: [...merged.values()] }, null, 2), "utf8");
  console.log(`\nwrote ${path.relative(process.cwd(), indexPath)} with ${merged.size} demo(s)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
