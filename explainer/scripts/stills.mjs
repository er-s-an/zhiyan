import {bundle} from "@remotion/bundler";
import {openBrowser, renderStill, selectComposition} from "@remotion/renderer";
import path from "node:path";

const entry = path.join(process.cwd(), "src/index.ts");
const outDir = path.join(process.cwd(), "out/check");

const jobs = [
  ["SceneDiscuss", 180, "discuss-early.png"],
  ["SceneDiscuss", 500, "discuss-late.png"],
  ["SceneBrief", 500, "brief.png"],
  ["SceneDesign", 360, "design.png"],
  ["SceneExecute", 280, "execute.png"],
  ["SceneWorkbench", 200, "workbench-early.png"],
  ["SceneWorkbench", 560, "workbench-late.png"],
  ["SceneAnalysis", 420, "analysis.png"],
  ["SceneQuality", 360, "quality.png"],
  ["SceneClose", 420, "close.png"],
];

const bundled = await bundle({entryPoint: entry});
const browser = await openBrowser("chrome");
try {
  for (const [id, frame, file] of jobs) {
    const composition = await selectComposition({
      serveUrl: bundled,
      id,
      browser,
    });
    const output = path.join(outDir, file);
    await renderStill({
      composition,
      serveUrl: bundled,
      output,
      frame,
      browser,
      imageFormat: "png",
    });
    console.log("wrote", output);
  }
} finally {
  await browser.close({silent: true});
}
