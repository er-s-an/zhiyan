import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { projectStudy } from "../lib/v2/semantic.ts";
import { validateStudy } from "../lib/v2/pipeline.ts";
import type { ResearchPlanV2, StudyV2 } from "../lib/v2/types.ts";

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const base = arg("--base", "http://127.0.0.1:3210").replace(/\/$/, "");
const skipPlan = process.argv.includes("--skip-plan");
const failures: string[] = [];

function check(name: string, run: () => void): void {
  try {
    run();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error instanceof Error ? error.message : error}`);
    console.log(`FAIL ${name}: ${error instanceof Error ? error.message : error}`);
  }
}

async function main(): Promise<void> {
  const index = (await fetch(`${base}/api/v2/demos`).then((response) => response.json())) as { demos?: Array<{ id: string }> };
  check("V2 demo index returns the main case", () => {
    assert.ok(Array.isArray(index.demos) && index.demos.some((demo) => demo.id === "main-case"));
  });

  const demo = (await fetch(`${base}/api/v2/demos/main-case`).then((response) => response.json())) as { study?: StudyV2 };
  check("main case opens from the cached API", () => assert.ok(demo.study));
  const study = demo.study as StudyV2;

  check("cached study passes the V2 integrity checks", () => {
    const errors = validateStudy(study);
    assert.deepEqual(errors, []);
  });

  check("method gate constrains a China-facing UGC study", () => {
    assert.equal(study.plan.methodGate.fit, "fit");
    assert.equal(study.plan.methodGate.allowedOutput, "directional");
    assert.ok(study.plan.methodGate.cannotProveZh.length >= 2);
  });

  check("adaptive retrieval ran real rounds and a counter query", () => {
    assert.ok(study.runs.length >= 6);
    assert.ok(study.runs.some((run) => run.round === 0));
    assert.ok(study.runs.some((run) => run.round >= 1));
    assert.ok(study.runs.some((run) => run.dimension === "counter"));
    assert.ok(study.plan.versions.length >= 2);
    assert.ok(study.retrieval.filter((entry) => entry.kind === "zhihu_search" && !entry.error).length >= 6);
  });

  check("new vocabulary is sourced from real samples", () => {
    const sourced = study.vocabulary.filter((item) => item.source === "sample" && item.sourceSampleId);
    assert.ok(sourced.length >= 3);
    for (const item of sourced) {
      const sample = study.sample.find((row) => row.id === item.sourceSampleId);
      assert.ok(sample, `missing source sample for ${item.raw}`);
      assert.ok(item.sourceQuoteZh && sample.textZh.includes(item.sourceQuoteZh.slice(0, 12)), `quote not traceable for ${item.raw}`);
    }
  });

  check("findings cover six categories with evidence and bilingual text", () => {
    const categories = new Set(study.findings.map((finding) => finding.category));
    for (const category of ["population_scene", "task_pain", "alternative", "choice_reason", "disagreement", "unknown_gap"]) {
      assert.ok(categories.has(category as never), `missing category ${category}`);
    }
    for (const finding of study.findings.filter((item) => !item.hidden)) {
      assert.ok(finding.titleZh && finding.titleEn && finding.bodyZh && finding.bodyEn);
      if (finding.category !== "unknown_gap" && finding.category !== "disagreement") {
        assert.ok(finding.evidence.length >= 1, `no evidence for ${finding.titleZh}`);
        for (const evidence of finding.evidence) assert.ok(evidence.url.startsWith("https://"));
      }
    }
    assert.ok(study.findings.some((finding) => finding.counterEvidence.length > 0 || finding.category === "disagreement"));
  });

  check("bilingual report is generated from one structured study", () => {
    assert.equal(study.report.findings.length, study.findings.filter((item) => !item.hidden).length);
    assert.ok(study.report.decisionZh && study.report.decisionEn);
    assert.ok(study.report.quotes.every((quote) => quote.url.startsWith("https://")));
    assert.ok(!/(市场规模|购买率|market size|purchase rate)/i.test(`${study.report.summaryZh} ${study.report.summaryEn}`));
  });

  check("excluding an evidence item recomputes the report", () => {
    const target = study.findings.find((finding) => finding.evidence.length > 0);
    assert.ok(target);
    const evidenceId = target!.evidence[0].itemId;
    const edited = { ...study, sample: study.sample.map((item) => (item.id === evidenceId ? { ...item, included: false } : item)) };
    const projected = projectStudy(edited);
    assert.notEqual(projected.report.findings.length + projected.findings.filter((item) => item.hidden).length, undefined);
    assert.ok(projected.findings.some((finding) => finding.hidden || finding.evidence.length < target!.evidence.length));
  });

  const blocked = await fetch(`${base}/api/v2/study`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmed: false, plan: study.plan }),
  });
  check("live study route refuses before confirmation", () => {
    assert.equal(blocked.status, 400);
  });

  if (!skipPlan) {
    const planResponse = await fetch(`${base}/api/v2/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brief: "I'm a solo founder outside China. I want to build an AI contract and payment-collection tool for Chinese freelancers. What should I validate first?",
        language: "en",
      }),
    });
    const payload = (await planResponse.json()) as { plan?: ResearchPlanV2 };
    check("English brief creates a Chinese research plan", () => {
      assert.equal(planResponse.status, 200);
      assert.ok(payload.plan);
      assert.ok(payload.plan!.queryMatrix.length >= 4);
      assert.ok(payload.plan!.queryMatrix.every((seed) => /[\u4e00-\u9fff]/.test(seed.query)));
      assert.equal(payload.plan!.confirmed, false);
    });
  } else {
    console.log("SKIP plan API check (--skip-plan)");
  }

  if (failures.length > 0) {
    console.log(`FAIL ${failures.length}`);
    process.exit(1);
  }
  console.log("PASS verify-v2");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
