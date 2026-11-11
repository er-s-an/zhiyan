import assert from "node:assert/strict";
import test from "node:test";
import { compileDesign, normalizeDesign } from "./compile";
import { project, relabel, setIncluded } from "./project";
import { executeConfirmed, type ZhihuPort } from "./run";
import { assembleSample } from "./sample";
import { HONEST_CAN, HONEST_CANNOT, type ResearchDesign, type ZhihuContent } from "./types";

const NOW = new Date("2026-11-11T08:00:00Z");
const BRIEF =
  "我们准备做一款面向多猫家庭的智能喂食器，想知道应该定义哪些核心功能，以及哪些宣称不足以支撑购买.";
const ENGLISH =
  "We are preparing a smart feeder for multi-cat households. We need to know which core functions to define, and which claims are too weak to support a purchase.";

function hit(partial: Partial<ZhihuContent> & Pick<ZhihuContent, "title" | "url" | "text">): ZhihuContent {
  return {
    author: "caretaker",
    contentType: "Answer",
    publishTime: 1_750_000_000,
    votes: 3,
    comments: 1,
    badge: "",
    ...partial,
  };
}

function portFor(calls: { search: string[]; hot: number; zhida: number }): ZhihuPort {
  const hit1 = hit({
    title: "两只猫抢一台喂食器",
    url: "https://www.zhihu.com/answer/1",
    text: "我家两只猫抢食，定时也压不住。智能喂食器的定量经常被抢完。",
  });
  const hit2 = hit({
    title: "三只猫的分食",
    url: "https://www.zhihu.com/answer/2",
    text: "我家三只猫抢食，必须分食。喂食器要按只数出粮。",
    publishTime: 1_760_000_000,
  });
  const hit3 = hit({
    title: "卡粮一夜",
    url: "https://www.zhihu.com/answer/3",
    text: "我家喂食器卡粮，不出粮，猫饿了一夜。",
  });
  const hit4 = hit({
    title: "份量不对",
    url: "https://www.zhihu.com/answer/4",
    text: "自动喂食器又卡粮了，份量也不对。",
  });
  const hit5 = hit({
    title: "识猫是鸡肋",
    url: "https://www.zhihu.com/answer/5",
    text: "摄像头和识猫是鸡肋，宣传得很响，实际闲置。",
  });
  const hit6 = hit({
    title: "远程摄像头",
    url: "https://www.zhihu.com/answer/6",
    text: "我家离不开摄像头，真的需要远程看喂食器。",
  });
  const hit7 = hit({
    title: "又一个鸡肋功能",
    url: "https://www.zhihu.com/answer/7",
    text: "语音喂食是鸡肋，噱头大于用处。智能喂食器不需要这个。",
  });
  const power1 = hit({
    title: "停电之后",
    url: "https://www.zhihu.com/answer/8",
    text: "我家喂食器一断电就不工作，没有电池。",
  });
  const power2 = hit({
    title: "听说会断电",
    url: "https://www.zhihu.com/answer/9",
    text: "听说喂食器断网之后就不出粮。",
  });
  const old = hit({
    title: "仓里发霉",
    url: "https://www.zhihu.com/answer/10",
    text: "我家喂食器清洁不到，粮仓发霉。",
    publishTime: 1_577_836_800,
  });
  const clean = hit({
    title: "每周要拆洗",
    url: "https://www.zhihu.com/answer/11",
    text: "喂食器要每周清洗，不然残留会受潮。",
    publishTime: 1_760_000_000,
  });
  const ad = hit({
    title: "旗舰店喂食器",
    url: "https://www.zhihu.com/answer/12",
    text: "旗舰店优惠券，智能喂食器种草链接。",
    badge: "官方",
  });
  return {
    async search(query: string) {
      calls.search.push(query);
      if (query.includes("抢食")) return [hit1, hit2, ad];
      if (query.includes("卡粮")) return [hit3, hit4, power1, power2];
      if (query.includes("摄像头")) return [hit5, hit6, hit7, old, clean];
      return [hit1];
    },
    async hot() {
      calls.hot += 1;
      return [
        hit({
          title: "如何看待拆迁赔偿",
          url: "https://www.zhihu.com/question/99",
          text: "施工队改了方案。",
        }),
        hit({
          title: "智能喂食器上了热榜",
          url: "https://www.zhihu.com/question/100",
          text: "智能喂食器今天被讨论。",
        }),
      ];
    },
    async zhida() {
      calls.zhida += 1;
      return "UNIQUE_ZHIDA_GAP_HINT_9f3";
    },
  };
}

async function runFixture(design: ResearchDesign = compileDesign(BRIEF, NOW)) {
  const calls = { search: [] as string[], hot: 0, zhida: 0 };
  const study = await executeConfirmed({
    design,
    confirmed: true,
    port: portFor(calls),
    translate: async (pairs) => Object.fromEntries(pairs.map((pair) => [pair.id, `EN: ${pair.zh.slice(0, 80)}`])),
    now: NOW,
    id: "study_test",
  });
  return { study, calls };
}

test("compile the Chinese feeder brief before any retrieval", () => {
  const design = compileDesign(BRIEF, NOW);
  assert.equal(design.briefLanguage, "zh");
  assert.equal(design.stage, "needs_exploration");
  assert.ok(design.subjects.includes("users"));
  assert.ok(design.subjects.includes("buyers"));
  assert.ok(design.decision.length > 20);
  assert.ok(design.scenes.length >= 4);
  assert.ok(design.populations.length >= 2);
  assert.equal(design.timeWindow.start, "2024-11-11");
  assert.equal(design.timeWindow.end, "2026-11-11");
  assert.ok(design.inclusion.length >= 1);
  assert.ok(design.exclusion.length >= 1);
  assert.ok(design.stoppingRule.includes("两条"));
  assert.ok(design.queries.every((query) => /[\u4e00-\u9fff]/.test(query)));
  assert.ok(design.zhihuCannotAnswer.some((line) => line.includes("不能证明购买意愿")));
  assert.ok(design.zhihuCanAnswer.length >= 1);
});

test("buyer language without a household mark is still a buyer", () => {
  const design = compileDesign(BRIEF, NOW);
  const { items } = assembleSample(
    design,
    [
      {
        source: "zhihu_search",
        query: design.queries[0],
        title: "这台喂食器多少钱才值",
        url: "https://www.zhihu.com/answer/buyer-only",
        author: "shopper",
        contentType: "Answer",
        text: "智能喂食器多少钱，买了才知道值不值。",
        publishTime: 1_760_000_000,
        votes: 1,
        comments: 0,
        badge: "",
      },
    ],
    {},
  );
  assert.equal(items[0]?.role, "buyer");
});

test("the same engine accepts an English feeder brief and keeps Chinese queries", () => {
  const design = compileDesign(ENGLISH, NOW);
  assert.equal(design.briefLanguage, "en");
  assert.equal(design.stage, "needs_exploration");
  assert.ok(design.queries.every((query) => /[\u4e00-\u9fff]/.test(query)));
});

test("confirmation is required before the port is called", async () => {
  const calls = { search: [] as string[], hot: 0, zhida: 0 };
  await assert.rejects(
    () =>
      executeConfirmed({
        design: compileDesign(BRIEF, NOW),
        confirmed: false,
        port: portFor(calls),
        translate: async () => ({}),
        now: NOW,
      }),
    /CONFIRM_REQUIRED/,
  );
  assert.equal(calls.search.length, 0);
  assert.equal(calls.hot, 0);
  assert.equal(calls.zhida, 0);
});

test("execution uses search and the hot list, and Zhida is not a finding", async () => {
  const { study, calls } = await runFixture();
  assert.ok(calls.search.length >= 1);
  assert.equal(calls.hot, 1);
  assert.equal(calls.zhida, 1);
  assert.equal(study.auxiliary.usedAsFinding, false);
  assert.equal(study.auxiliary.text, "UNIQUE_ZHIDA_GAP_HINT_9f3");
  const view = project(study);
  assert.ok(!view.report.includes("UNIQUE_ZHIDA_GAP_HINT_9f3"));
  assert.ok(view.report.includes("直答只作补漏提示"));
  assert.equal(study.hotScan.scanned, 2);
  assert.equal(study.hotScan.droppedTitles.includes("如何看待拆迁赔偿"), true);
  assert.equal(study.sample.some((item) => item.title === "如何看待拆迁赔偿"), false);
  assert.equal(study.sample.some((item) => item.flags.duplicate), true);
  assert.equal(study.sample.some((item) => item.flags.marketing), true);
  assert.equal(study.sample.some((item) => item.flags.secondhand), true);
  for (const item of study.sample) {
    assert.ok(item.whyIncluded.length > 0);
    assert.ok(item.query.length > 0);
    assert.ok(item.publishDate.length > 0);
    assert.ok(item.sceneLabel.length > 0);
    if (item.included) {
      assert.ok(item.excerptZh.length > 0);
      assert.ok(item.excerptEn.startsWith("EN:"));
    }
  }
  assert.ok(view.findings.length >= 1);
  for (const finding of view.findings) {
    assert.ok(finding.itemIds.length >= 2);
    assert.ok(finding.text.includes("在本样本中"));
  }
  assert.ok(view.report.includes("所有计数只属于本样本"));
  assert.ok(view.report.includes(HONEST_CAN));
  assert.ok(view.report.includes(HONEST_CANNOT));
  assert.ok(view.report.includes("概念测试或定向访谈"));
  assert.ok(!/市场份额|全国结论/.test(view.report));
  assert.ok(view.quality.some((flag) => flag.kind === "purchase_intent"));
  assert.ok(view.quality.some((flag) => flag.kind === "stale"));
  assert.ok(view.quality.some((flag) => flag.kind === "inference_beyond_evidence"));
  assert.ok(view.honest.missingRoles.some((role) => role.includes("购买发生时的买家")));
});

test("exclude, restore, and relabel change the analysis and the report", async () => {
  const { study } = await runFixture();
  const before = project(study);
  const theme = before.themes.find((row) => row.label === "多猫争食");
  assert.ok(theme);
  assert.ok(theme.count >= 2);
  const target = theme.itemIds[0];
  const excluded = project(setIncluded(study, target, false));
  const excludedTheme = excluded.themes.find((row) => row.label === "多猫争食");
  assert.equal(excludedTheme?.count, theme.count - 1);
  assert.notEqual(excluded.report, before.report);
  const restored = project(setIncluded(study, target, true));
  assert.equal(restored.themes.find((row) => row.label === "多猫争食")?.count, theme.count);
  const item = study.sample.find((row) => row.id === target);
  assert.ok(item);
  const relabeled = project(
    relabel(study, target, { codeIds: item.codeIds.filter((id) => id !== "multi_cat") }),
  );
  assert.equal(
    relabeled.themes.find((row) => row.label === "多猫争食")?.count,
    theme.count - 1,
  );
});

test("a weakened design cannot erase the purchase-intent limit from the report", async () => {
  const design = compileDesign(BRIEF, NOW);
  design.zhihuCannotAnswer = ["Posts prove demand."];
  design.stage = "purchase_friction";
  const { study } = await runFixture(design);
  const view = project(study);
  assert.ok(view.report.includes(HONEST_CAN));
  assert.ok(view.report.includes(HONEST_CANNOT));
  assert.ok(!view.report.includes("Posts prove demand."));
  assert.ok(study.design.zhihuCannotAnswer[0].includes("不能证明购买意愿"));
  assert.equal(normalizeDesign(design).zhihuCannotAnswer[0].includes("不能证明购买意愿"), true);
});

test("a curated scenario compiles the same shape as the feeder case", () => {
  const design = compileDesign(
    "我们在做一款面向产研团队的 AI 会议纪要工具，想知道团队真实的使用场景、现有工具的痛点，以及哪些能力只是演示效果。",
    NOW,
  );
  assert.equal(design.briefLanguage, "zh");
  assert.equal(design.stage, "needs_exploration");
  assert.ok(design.scenes.length >= 6);
  assert.ok(design.codebook.length >= 6);
  assert.ok(design.queries.length >= 4);
  assert.ok(design.decision.includes("会议纪要"));
  assert.ok(design.zhihuCannotAnswer[0].includes("不能证明购买意愿"));
});
