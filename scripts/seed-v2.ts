import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { MAIN_CASE_BRIEF, confirmPlan, createResearchPlan } from "../lib/v2/plan.ts";
import { runStudy, validateStudy } from "../lib/v2/pipeline.ts";
import { searchZhihuV2, hotListV2, zhidaV2 } from "../lib/v2/zhihu.ts";

function loadEnv(): void {
  try {
    const text = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, value] = match;
      if (process.env[key]) continue;
      process.env[key] = value.replace(/^["']|["']$/g, "");
    }
  } catch {
    // Environment may already be loaded.
  }
}

async function main(): Promise<void> {
  loadEnv();
  if (!process.env.ZHIHU_ACCESS_SECRET) throw new Error("ZHIHU_ACCESS_SECRET missing");
  const started = Date.now();
  const brief = process.argv.find((arg) => arg.startsWith("--brief="))?.slice("--brief=".length) || MAIN_CASE_BRIEF;
  console.log("creating plan...");
  let plan = await createResearchPlan(brief, "en");
  plan = confirmPlan(plan);
  console.log(JSON.stringify({ id: plan.id, version: plan.version, fit: plan.methodGate.fit, output: plan.methodGate.allowedOutput, queries: plan.queryMatrix.length, decision: plan.decisionZh }, null, 1));

  const study = await runStudy(plan, true, {
    port: { search: searchZhihuV2, hot: hotListV2, zhida: zhidaV2 },
    onProgress: (progress) => console.log(`[${progress.step}] ${progress.messageZh}${progress.query ? ` · ${progress.query}` : ""}`),
  });
  const errors = validateStudy(study);
  const dir = path.join(process.cwd(), "lib", "v2", "demos");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "main-case.json");
  writeFileSync(file, JSON.stringify({ study }, null, 2), "utf8");
  const index = {
    demos: [
      {
        id: "main-case",
        titleZh: "海外 OPC × 中国自由职业者：AI 合同与回款工具",
        titleEn: "Global OPC × Chinese freelancers: AI contract and payment tool",
        subtitleZh: "从知乎真实讨论中发现报价、改需求、验收和尾款的原生表达与反例",
        subtitleEn: "Discover native language and counter-evidence around quoting, scope changes, acceptance and late payment",
        includedCount: study.sample.filter((item) => item.included).length,
        findingCount: study.findings.filter((item) => !item.hidden).length,
        vocabularyCount: study.vocabulary.length,
        generatedAt: study.generatedAt,
        demo: true,
      },
    ],
  };
  writeFileSync(path.join(dir, "index.json"), JSON.stringify(index, null, 2), "utf8");
  console.log(
    JSON.stringify(
      {
        file,
        seconds: Math.round((Date.now() - started) / 1000),
        planVersion: study.plan.version,
        rounds: study.rounds,
        queries: study.retrieval.filter((entry) => entry.kind === "zhihu_search").length,
        candidates: study.candidatesScanned,
        samples: study.sample.length,
        included: study.sample.filter((item) => item.included).length,
        vocabulary: study.vocabulary.length,
        sourcedVocabulary: study.vocabulary.filter((item) => item.source === "sample" && item.sourceSampleId).length,
        findings: study.findings.filter((item) => !item.hidden).length,
        categories: [...new Set(study.findings.map((item) => item.category))],
        counterEvidence: study.findings.reduce((total, item) => total + item.counterEvidence.length, 0),
        planVersions: study.plan.versions.length,
        stop: study.stopReasonZh,
        validation: errors,
        sizeKb: Math.round(JSON.stringify(study).length / 1024),
      },
      null,
      1,
    ),
  );
  if (errors.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
