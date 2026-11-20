import assert from "node:assert/strict";
import test from "node:test";
import { createResearchPlan } from "./plan";
import {
  INTERVIEW_STAGES,
  assessFeasibility,
  buildInterviewMarkdown,
  buildInterviewProfile,
  pickList,
  pickText,
  profileToBrief,
  type InterviewAnswers,
  type InterviewProfile,
} from "./interview";
import type { Lang } from "./types";

const CHINA_PROFILE: InterviewAnswers = {
  age: "28",
  occupation: "互联网公司产品经理，业余做副业",
  idea: "帮中国自由职业者用 AI 管理合同和回款。",
  audience: "刚接私活 1–2 年、在社交平台接单的独立设计师",
  problem: "改需求后不好意思加钱，尾款拖两个月，只能反复催。",
  market: "中国大陆",
  edge: "我在这个行业做过 5 年，认识 200 个目标用户。",
  model: "按年订阅，省下的时间比订阅费更值钱。",
  evidence: "聊过 8 个用户，3 个愿意试用，还没人付钱。",
  decision: "要不要先做 MVP；如果 10 个访谈里不到 3 个遇到这问题就停。",
  constraints: "业余时间，每周 10 小时。",
};

const OVERSEAS_PROFILE: InterviewAnswers = {
  age: "34",
  occupation: "全职创业",
  idea: "给北美露营者做户外储能电源。",
  audience: "北美露营爱好者",
  problem: "露营时没电，充电慢。",
  market: "北美",
  edge: "还没想好",
  model: "还没想好",
  evidence: "还没验证",
  decision: "要不要开始做",
  constraints: "1 个月",
};

const FR_PROFILE: InterviewAnswers = {
  age: "28",
  occupation: "Product manager salarié, projet annexe",
  idea: "Un outil IA de contrats et d'encaissement pour les freelances chinois.",
  audience: "Des designers indépendants en freelance depuis 1–2 ans",
  problem: "Après un changement de périmètre, il n'ose pas facturer plus et relance le solde pendant deux mois.",
  market: "Chine continentale",
  edge: "Cinq ans dans le secteur et un réseau de 200 utilisateurs cibles.",
  model: "Un abonnement annuel.",
  evidence: "J'ai parlé à 8 utilisateurs, 3 veulent essayer, personne n'a encore payé.",
  decision: "Faut-il d'abord faire un MVP ; j'arrête si moins de 3 personnes sur 10 rencontrent ce problème.",
  constraints: "10 heures par semaine.",
};

const JA_PROFILE: InterviewAnswers = {
  age: "28歳",
  occupation: "会社員で、余暇に副業",
  idea: "中国のフリーランス向けに、AIで契約と入金を管理するサービス。",
  audience: "フリーランス1〜2年目で、SNSで案件を取っている独立系デザイナー",
  problem: "仕様変更の追加料金を言い出せず、最後の支払いを2か月も催促し続けている。",
  market: "中国本土",
  edge: "業界で5年の経験があり、ターゲットユーザーを200人知っている。",
  model: "年額サブスク。",
  evidence: "8人に話を聞き、3人が試したいと言ったが、まだ支払った人はいない。",
  decision: "まずMVPを作るべきか。10人中3人未満しかこの問題に直面していなければやめる。",
  constraints: "余暇で週10時間。",
};

function profile(answers: InterviewAnswers, lang: Lang = "zh"): InterviewProfile {
  return buildInterviewProfile(answers, lang);
}

test("interview script starts with the person, then the business", () => {
  assert.equal(INTERVIEW_STAGES.length, 11);
  assert.equal(new Set(INTERVIEW_STAGES.map((stage) => stage.id)).size, 11);
  assert.equal(INTERVIEW_STAGES[0].id, "age");
  assert.equal(INTERVIEW_STAGES[1].id, "occupation");
  for (const stage of INTERVIEW_STAGES) {
    for (const lang of ["zh", "en", "fr", "ja", "ru", "ko"] as const) {
      assert.ok(pickText(stage.question, lang).length > 0);
      assert.ok(pickText(stage.hint, lang).length > 0);
      assert.ok(pickText(stage.placeholder, lang).length > 0);
      assert.ok(pickList(stage.chips, lang).length > 0);
    }
  }
});

test("empty interview is flagged as insufficient information", () => {
  const assessment = assessFeasibility(profile({}));
  assert.equal(assessment.level, "unclear");
  assert.ok(assessment.score < 20);
  assert.equal(assessment.allowedOutput, "hypotheses_only");
  assert.ok(pickList(assessment.risks, "zh").length >= 3);
});

test("specific China-facing freelancer idea scores as promising with data fit", () => {
  const assessment = assessFeasibility(profile(CHINA_PROFILE));
  assert.equal(assessment.level, "promising");
  assert.ok(assessment.score >= 80);
  assert.equal(assessment.methodFit, "fit");
  assert.equal(assessment.allowedOutput, "directional");
  assert.ok(assessment.dimensions.every((item) => item.score >= 1));
  assert.ok(pickList(assessment.nextSteps, "zh").length >= 3);
});

test("overseas market is a Zhihu data mismatch even when the idea is clear", () => {
  const assessment = assessFeasibility(profile(OVERSEAS_PROFILE));
  assert.equal(assessment.methodFit, "mismatch");
  assert.equal(assessment.allowedOutput, "hypotheses_only");
  assert.notEqual(assessment.level, "promising");
  assert.ok(pickList(assessment.mustValidate, "zh").some((item) => item.includes("当地访谈")));
});

test("profile brief carries the interview facts into the research plan", () => {
  const brief = profileToBrief(profile(OVERSEAS_PROFILE));
  assert.ok(brief.includes("目标市场：北美"));
  assert.ok(brief.includes("已有验证：还没验证"));
  assert.ok(brief.includes("户外储能电源"));
});

test("interview memo is exportable markdown with dimensions and next steps", () => {
  const value = profile(CHINA_PROFILE);
  const markdown = buildInterviewMarkdown(value, assessFeasibility(value), "zh");
  assert.ok(markdown.includes("知研台 · 用户访谈纪要"));
  assert.ok(markdown.includes("| 维度 | 状态 | 说明 |"));
  assert.ok(markdown.includes("## 下一步"));
});

test("personal background is kept and shapes the next step", () => {
  const student = profile({ ...CHINA_PROFILE, age: "20", occupation: "大学生" });
  const studentAssessment = assessFeasibility(student);
  assert.ok(pickList(studentAssessment.nextSteps, "zh").some((item) => item.includes("学校")));

  const value = profile(CHINA_PROFILE);
  const markdown = buildInterviewMarkdown(value, assessFeasibility(value), "zh");
  assert.ok(markdown.includes("- 年龄: 28"));
  assert.ok(markdown.includes("目前在做"));
  assert.ok(profileToBrief(value).includes("访谈对象背景：28，互联网公司产品经理"));
});

test("French and Japanese interviews are fully localized", () => {
  const french = profile(FR_PROFILE, "fr");
  const frenchAssessment = assessFeasibility(french);
  assert.equal(frenchAssessment.methodFit, "fit");
  assert.equal(frenchAssessment.level, "promising");
  assert.ok(pickText(frenchAssessment.levelLabel, "fr").length > 0);
  assert.ok(pickList(frenchAssessment.nextSteps, "fr").length >= 3);
  const frenchMemo = buildInterviewMarkdown(french, frenchAssessment, "fr");
  assert.ok(frenchMemo.includes("Compte rendu d'entretien"));
  assert.ok(frenchMemo.includes("## Prochaines étapes"));

  const japanese = profile(JA_PROFILE, "ja");
  const japaneseAssessment = assessFeasibility(japanese);
  assert.equal(japaneseAssessment.methodFit, "fit");
  assert.ok(pickText(japaneseAssessment.levelLabel, "ja").length > 0);
  assert.ok(pickList(japaneseAssessment.risks, "ja").length >= 1);
  const japaneseMemo = buildInterviewMarkdown(japanese, japaneseAssessment, "ja");
  assert.ok(japaneseMemo.includes("ユーザーインタビュー記録"));
  assert.ok(japaneseMemo.includes("## 次のステップ"));
});

test("Russian and Korean interview content is available", () => {
  for (const lang of ["ru", "ko"] as const) {
    const value = profile(CHINA_PROFILE, lang);
    const assessment = assessFeasibility(value);
    assert.ok(pickText(assessment.levelLabel, lang).length > 0);
    assert.ok(pickList(assessment.risks, lang).length > 0);
    for (const stage of INTERVIEW_STAGES) {
      assert.ok(pickText(stage.question, lang).length > 0);
      assert.ok(pickList(stage.chips, lang).length > 0);
    }
  }
});

test("plan overrides replace the fallback market and re-evaluate the gate", async () => {
  const previousBase = process.env.LLM_BASE_URL;
  const previousKey = process.env.LLM_API_KEY;
  const previousOpencodeKey = process.env.OPENCODE_GO_API_KEY;
  process.env.LLM_BASE_URL = "";
  process.env.LLM_API_KEY = "";
  process.env.OPENCODE_GO_API_KEY = "";
  try {
    const plan = await createResearchPlan("我想给北美露营者做户外储能电源", "zh", {
      targetMarketZh: "北美",
      targetMarketEn: "North America",
      targetUsersZh: ["北美露营爱好者"],
      targetUsersEn: ["North American campers"],
    });
    assert.equal(plan.targetMarketZh, "北美");
    assert.equal(plan.targetUsersZh[0], "北美露营爱好者");
    assert.equal(plan.methodGate.fit, "mismatch");
    assert.equal(plan.methodGate.allowedOutput, "hypotheses_only");
  } finally {
    if (previousBase === undefined) delete process.env.LLM_BASE_URL;
    else process.env.LLM_BASE_URL = previousBase;
    if (previousKey === undefined) delete process.env.LLM_API_KEY;
    else process.env.LLM_API_KEY = previousKey;
    if (previousOpencodeKey === undefined) delete process.env.OPENCODE_GO_API_KEY;
    else process.env.OPENCODE_GO_API_KEY = previousOpencodeKey;
  }
});
