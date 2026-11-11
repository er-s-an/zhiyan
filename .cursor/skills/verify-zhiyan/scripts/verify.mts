import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { project } from "../../../../lib/project";
import { HONEST_CAN, HONEST_CANNOT, type Study } from "../../../../lib/types";

const BRIEF = "我们准备做一款面向多猫家庭的智能喂食器，想知道应该定义哪些核心功能，以及哪些宣称不足以支撑购买.";

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const root = path.resolve(import.meta.dirname, "../../../..");
const base = arg("--base", "http://127.0.0.1:3210").replace(/\/$/, "");
const studyPath = arg("--study", "");
const failures: string[] = [];

function check(name: string, run: () => void): void {
  try {
    run();
    console.log(`PASS ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`${name}: ${message}`);
    console.log(`FAIL ${name}: ${message}`);
  }
}

const tests = spawnSync("npx", ["tsx", "--test", "lib/domain.test.ts"], { cwd: root, encoding: "utf8" });
check("domain tests", () => {
  if (tests.status !== 0) {
    throw new Error((tests.stdout + tests.stderr).slice(-800));
  }
});

async function post(urlPath: string, body: unknown): Promise<{ status: number; payload: Record<string, unknown> }> {
  const response = await fetch(`${base}${urlPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, payload };
}

const designCall = await post("/api/design", { brief: BRIEF });
check("design compiles with zero Zhihu calls", () => {
  assert.equal(designCall.status, 200);
  assert.equal(designCall.payload.zhihuCalls, 0);
  const design = designCall.payload.design as { stage?: string; queries?: string[]; zhihuCannotAnswer?: string[] };
  assert.equal(design.stage, "needs_exploration");
  assert.ok(design.queries && design.queries.length >= 1);
  assert.ok(design.queries.every((query) => /[\u4e00-\u9fff]/.test(query)));
  assert.ok(design.zhihuCannotAnswer?.some((line) => line.includes("cannot prove purchase intent")));
});

const denied = await post("/api/search", { confirmed: false, design: designCall.payload.design, query: "多猫 智能喂食器" });
check("search refuses before confirmation", () => {
  assert.equal(denied.status, 400);
  assert.equal(denied.payload.code, "CONFIRM_REQUIRED");
});

const foreign = await post("/api/search", {
  confirmed: true,
  design: designCall.payload.design,
  query: "不是这份设计里的查询",
});
check("search refuses a query outside the design", () => {
  assert.equal(foreign.status, 400);
  assert.equal(foreign.payload.code, "QUERY_NOT_IN_DESIGN");
});

if (studyPath) {
  const study = JSON.parse(readFileSync(studyPath, "utf8")) as Study;
  const view = project(study);
  check("study projection keeps the honest call", () => {
    assert.ok(view.report.includes(HONEST_CAN));
    assert.ok(view.report.includes(HONEST_CANNOT));
    assert.ok(view.report.includes("in this sample only"));
    assert.ok(view.report.includes("concept test or directed interviews"));
    assert.equal(study.auxiliary.usedAsFinding, false);
    if (study.auxiliary.text) assert.ok(!view.report.includes(study.auxiliary.text.slice(0, 40)));
    assert.ok(study.retrieval.some((entry) => entry.kind === "zhihu_search" && !entry.error));
    assert.ok(study.retrieval.some((entry) => entry.kind === "hot_list" && !entry.error));
    assert.ok(view.findings.length >= 1);
    for (const finding of view.findings) assert.ok(finding.itemIds.length >= 2);
    assert.ok(view.quality.some((flag) => flag.kind === "purchase_intent"));
  });
} else {
  console.log("SKIP study projection. Pass --study to check a saved retrieval.");
}

if (failures.length > 0) {
  console.log(`FAIL ${failures.length}`);
  process.exit(1);
}
console.log("PASS verify-zhiyan");
