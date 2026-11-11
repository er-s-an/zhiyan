import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildDecisionMemo, buildReport, projectStudy, synthesizeFindings } from "../lib/v2/semantic.ts";
import { validateStudy } from "../lib/v2/pipeline.ts";
import type { QueryRunV2, StudyV2 } from "../lib/v2/types.ts";

function loadEnv(): void {
  const text = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of text.split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    if (!process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

async function main(): Promise<void> {
  loadEnv();
  const file = path.join(process.cwd(), "lib", "v2", "demos", "main-case.json");
  const study = (JSON.parse(readFileSync(file, "utf8")) as { study: StudyV2 }).study;
  const searches = study.retrieval.filter((entry) => entry.kind === "zhihu_search");
  const runs: QueryRunV2[] = searches.map((entry, index) => {
    const seed = study.plan.queryMatrix.find((item) => item.query === entry.query);
    const round = index < 6 ? 0 : index < 9 ? 1 : 2;
    const matching = study.sample.filter((item) => item.query === entry.query);
    return {
      id: `run_${index + 1}`,
      round,
      query: entry.query,
      dimension: seed?.dimension || (entry.query.includes("没必要") ? "counter" : "task"),
      purposeZh: seed?.purposeZh || "反例检索",
      purposeEn: seed?.purposeEn || "Counter-example retrieval",
      planVersion: round === 0 ? 1 : round === 1 ? 2 : 3,
      resultCount: entry.resultCount,
      dedupedCount: 0,
      includedCount: matching.filter((item) => item.included).length,
      excludedCount: matching.filter((item) => !item.included).length,
      executedAt: study.generatedAt,
    };
  });
  console.log("new findings synthesis...");
  const findings = await synthesizeFindings(study.sample, study.coding, study.plan, study.coverage);
  const memo = buildDecisionMemo(study.plan, findings, study.coverage);
  const skeleton = { ...study, runs, findings, memo, demo: true };
  const withReport = { ...skeleton, report: buildReport(skeleton) };
  const refined = projectStudy(withReport);
  const errors = validateStudy(refined);
  writeFileSync(file, JSON.stringify({ study: refined }, null, 2), "utf8");
  const indexPath = path.join(process.cwd(), "lib", "v2", "demos", "index.json");
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as { demos: Array<Record<string, unknown>> };
  if (index.demos[0]) {
    index.demos[0].includedCount = refined.sample.filter((item) => item.included).length;
    index.demos[0].findingCount = refined.findings.filter((item) => !item.hidden).length;
    index.demos[0].vocabularyCount = refined.vocabulary.length;
    index.demos[0].generatedAt = refined.generatedAt;
    writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf8");
  }
  console.log(JSON.stringify({
    findings: refined.findings.filter((item) => !item.hidden).length,
    categories: [...new Set(refined.findings.map((item) => item.category))],
    counterEvidence: refined.findings.reduce((n, f) => n + f.counterEvidence.length, 0),
    llmFindings: refined.findings.filter((f) => f.bodyZh.length > 0 && !f.bodyZh.startsWith("在本样本中")).length,
    recommendation: refined.memo.recommendation,
    confidence: refined.memo.confidence,
    errors,
  }, null, 1));
  if (errors.length > 0) process.exitCode = 1;
}
main().catch((error) => { console.error(error); process.exit(1); });
