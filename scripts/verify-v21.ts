import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateBrief, recomputeBrief } from "../lib/v2/brief.ts";
import type { DecisionBriefV21 } from "../lib/v2/brief.ts";
import type { StudyV2 } from "../lib/v2/types.ts";

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const base = arg("--base", "http://127.0.0.1:3210").replace(/\/$/, "");
const failures: string[] = [];
function check(name: string, run: () => void): void {
  try {
    run();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(name);
    console.log(`FAIL ${name}: ${error instanceof Error ? error.message : error}`);
  }
}

const study = (JSON.parse(readFileSync("lib/v2/demos/main-case.json", "utf8")) as { study: StudyV2 }).study;
const brief = (JSON.parse(readFileSync("lib/v2/briefs/main-case.json", "utf8")) as { brief: DecisionBriefV21 }).brief;

check("V2.1 brief passes the data-contract validation", () => assert.deepEqual(validateBrief(brief, study), []));
check("initial belief was captured before retrieval", () => assert.ok(new Date(brief.initialBelief.capturedAt).getTime() <= new Date(study.confirmedAt).getTime()));
check("brief has at most three belief updates and opportunities", () => {
  assert.ok(brief.beliefUpdates.length <= 3);
  assert.ok(brief.opportunities.length <= 3);
});
check("opportunities are evidence-grounded and not padded", () => {
  assert.ok(brief.opportunities.length >= 2);
  for (const card of brief.opportunities) {
    assert.ok(card.evidenceIds.length >= 1);
    assert.ok(card.evidenceIds.every((id) => study.sample.some((sample) => sample.id === id && sample.included)));
    assert.ok(card.counterIds.length >= 1);
  }
  assert.ok(brief.unansweredZh.some((line) => line.includes("第三个机会")));
});
check("stop reason is budget exhaustion, not saturation", () => {
  assert.equal(brief.stopReason.type, "budget_exhausted");
  assert.ok(brief.stopReason.detailZh.includes("预算"));
  assert.ok(!brief.stopReason.detailZh.includes("主题已经饱和"));
  assert.ok(!brief.stopReason.detailZh.includes("主题趋于稳定"));
});
check("key evidence can be traced to included Zhihu posts", () => {
  for (const opportunity of brief.opportunities) {
    for (const id of opportunity.evidenceIds) {
      const evidence = brief.evidenceIndex[id];
      assert.ok(evidence, `missing evidence ${id}`);
      assert.ok(evidence.url.startsWith("https://www.zhihu.com") || evidence.url.startsWith("https://zhuanlan.zhihu.com"), `not a Zhihu link: ${evidence.url}`);
      assert.ok(evidence.author && evidence.quoteZh);
    }
  }
});
check("three-round narrative separates budget from saturation", () => {
  assert.equal(brief.roundSnapshots.length, 3);
  assert.equal(brief.roundSnapshots[2].stopReason?.type, "budget_exhausted");
  assert.ok(brief.roundSnapshots[0].nextRoundReasonZh.includes("下一轮"));
});
check("high-impact terms are limited and sourced", () => {
  assert.ok(brief.highImpactTerms.length >= 3 && brief.highImpactTerms.length <= 5);
  for (const term of brief.highImpactTerms) {
    assert.ok(term.sourceSampleId);
    assert.ok(study.sample.some((sample) => sample.id === term.sourceSampleId && sample.included));
  }
});
check("holding out key evidence downgrades the brief", () => {
  const ids = new Set(brief.opportunities.flatMap((item) => item.evidenceIds));
  const edited = { ...study, sample: study.sample.map((item) => (ids.has(item.id) ? { ...item, included: false } : item)) };
  const next = recomputeBrief(brief, edited);
  assert.equal(next.recommendation, "insufficient_evidence");
});

async function main(): Promise<void> {
  const briefResponse = await fetch(`${base}/api/v2/briefs/main-case`);
  check("brief API serves the real main case", () => assert.equal(briefResponse.status, 200));
  const jobBlocked = await fetch(`${base}/api/v2/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan: study.plan, confirmed: false, mode: "lite" }),
  });
  check("job API refuses before plan confirmation", () => assert.equal(jobBlocked.status, 400));
  if (failures.length > 0) {
    console.log(`FAIL ${failures.length}`);
    process.exit(1);
  }
  console.log("PASS verify-v21");
}

void main();
