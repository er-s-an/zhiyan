import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { recomputeBrief, validateBrief } from "../lib/v2/brief.ts";
import { projectStudy } from "../lib/v2/semantic.ts";
import type { DecisionBriefV21 } from "../lib/v2/brief.ts";
import type { StudyV2 } from "../lib/v2/types.ts";

const weak = new Set(["src_225214b5", "src_c00f066c", "src_b94668a9", "src_dd2687d0", "src_3836b95", "src_5802edc7"]);
const studyFile = path.join(process.cwd(), "lib", "v2", "demos", "main-case.json");
const briefFile = path.join(process.cwd(), "lib", "v2", "briefs", "main-case.json");
let study = (JSON.parse(readFileSync(studyFile, "utf8")) as { study: StudyV2 }).study;
study = {
  ...study,
  stopReasonZh: "达到查询/候选预算上限。这是预算停止，不宣称主题饱和；仍有覆盖缺口需在质检中披露。",
  stopReasonEn: "Reached the query/candidate budget. This is a budget stop, not a claim of saturation; remaining coverage gaps are disclosed in Quality.",
  sample: study.sample.map((item) =>
    weak.has(item.id)
      ? { ...item, included: false, whyIncludedZh: "质量清理：营销/无具体经历内容，不进入关键证据。", whyIncludedEn: "Quality cleanup: marketing or no concrete experience; excluded from key evidence." }
      : item,
  ),
};
study = projectStudy(study);
let brief = (JSON.parse(readFileSync(briefFile, "utf8")) as { brief: DecisionBriefV21 }).brief;
brief = recomputeBrief(brief, study);
const errors = validateBrief(brief, study);
if (errors.length > 0) {
  console.error(errors);
  process.exitCode = 1;
  process.exit();
}
writeFileSync(studyFile, JSON.stringify({ study }, null, 2), "utf8");
writeFileSync(briefFile, JSON.stringify({ brief, studyId: study.id }, null, 2), "utf8");
const indexFile = path.join(process.cwd(), "lib", "v2", "demos", "index.json");
const index = JSON.parse(readFileSync(indexFile, "utf8")) as { demos: Array<Record<string, unknown>> };
index.demos[0].includedCount = study.sample.filter((item) => item.included).length;
index.demos[0].findingCount = study.findings.filter((item) => !item.hidden).length;
index.demos[0].vocabularyCount = study.vocabulary.length;
index.demos[0].generatedAt = study.generatedAt;
writeFileSync(indexFile, JSON.stringify(index, null, 2), "utf8");
console.log(JSON.stringify({ included: index.demos[0].includedCount, sample: study.sample.length, opportunities: brief.opportunities.filter((item) => !item.hidden).length, errors }, null, 1));
