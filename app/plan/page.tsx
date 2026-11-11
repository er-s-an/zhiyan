"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, ExternalLink, Code2 } from "lucide-react";
import { useLang } from "../components/LanguageProvider";

export default function PlanPage() {
  const { lang, t } = useLang();
  return (
    <main className="v2-page v2-narrow">
      <div className="v2-page-head">
        <p className="v2-kicker">{t("plan.title")} · V2</p>
        <h1>{lang === "zh" ? "知研台：全球 OPC 的知乎研究台" : "Zhiyan: a Zhihu research desk for global builders"}</h1>
        <p className="v2-lede">
          {lang === "zh"
            ? "把英文产品决策变成中文研究计划、适应性知乎检索和一份可复核的双语决策简报。知乎是证据来源，不是答案生成器。"
            : "Turn an English product decision into a Chinese research plan, adaptive Zhihu retrieval and a reviewable bilingual decision brief. Zhihu is the evidence source, not an answer generator."}
        </p>
      </div>

      <article className="v2-article">
        <h2>{lang === "zh" ? "一句话" : "One sentence"}</h2>
        <p>{lang === "zh" ? "让一个人，也有一支懂中国用户的研究团队。" : "A research team for global builders, built on real Zhihu conversations."}</p>

        <h2>{lang === "zh" ? "为什么是现在" : "Why now"}</h2>
        <p>
          {lang === "zh"
            ? "AI 正在把「把产品做出来」的成本打下来，判断「什么值得做」反而成为新的瓶颈。一人公司和小团队没有专职研究团队，却要在开发前理解真实用户、发现未知问题、检查产品假设。中文知乎有大量真实讨论，但海外团队很难系统使用。"
            : "AI is lowering the cost of building, which makes judgment about what to build the new bottleneck. Solo founders and small teams have no dedicated research team, yet they must understand real users and test product assumptions before building. Chinese Zhihu contains rich first-hand discussion, but global teams struggle to use it systematically."}
        </p>

        <h2>{lang === "zh" ? "三层出海" : "Three layers of going global"}</h2>
        <ul>
          <li>{lang === "zh" ? "产品出海：英文优先，面向全球用户。" : "Product: English-first, built for global users."}</li>
          <li>{lang === "zh" ? "知识出海：把知乎中文公开讨论转成可复核的英文研究证据。" : "Knowledge: turn Chinese public Zhihu discussion into reviewable English research evidence."}</li>
          <li>{lang === "zh" ? "决策出海/入华：海外团队进入中国前理解本地用户，全球 OPC 获得中文用户研究能力。" : "Decision-making: help global teams understand Chinese users before entering, and give solo founders Chinese user-research capability."}</li>
        </ul>

        <h2>{lang === "zh" ? "与通用 AI 的差别" : "How it differs from general AI"}</h2>
        <p>
          {lang === "zh"
            ? "通用 AI 可以读到部分公开网页，也可能搜到部分知乎内容。知研台的差别不是模型会不会搜索，而是系统是否真的执行研究：查询有预算和目的，新词必须来自真实样本，覆盖和反例要写进计划版本，样本可被用户修改，结论可回到原话和原文链接。"
            : "General AI can read some public pages and may find some Zhihu content. The difference is not whether a model can search; it is whether the system actually executes a study: queries have budgets and purposes, new words must come from real samples, coverage and counter-evidence enter plan versions, samples are editable, and conclusions trace back to quotes and source links."}
        </p>

        <h2>{lang === "zh" ? "P0 范围" : "P0 scope"}</h2>
        <ul>
          <li>{lang === "zh" ? "中英文 Brief 与界面切换" : "Chinese/English brief and interface"}</li>
          <li>{lang === "zh" ? "方法适用闸门与报告措辞约束" : "Method-fit gate and report wording constraints"}</li>
          <li>{lang === "zh" ? "研究计划确认与版本更新" : "Research plan confirmation and versioning"}</li>
          <li>{lang === "zh" ? "至少一轮由样本证据触发的真实查询扩展" : "At least one real query expansion triggered by sample evidence"}</li>
          <li>{lang === "zh" ? "查询目的、词汇来源、覆盖缺口可视化" : "Query purpose, vocabulary sources and coverage gaps"}</li>
          <li>{lang === "zh" ? "主动反例检索或明确的反例缺口披露" : "Active counter-example retrieval or explicit disclosure"}</li>
          <li>{lang === "zh" ? "LLM 辅助语义编码、确定性计数、人工修改" : "LLM-assisted semantic coding, deterministic counts and human edits"}</li>
          <li>{lang === "zh" ? "双语 Decision Memo 与下一步验证" : "Bilingual Decision Memo and next validation"}</li>
        </ul>

        <h2>{lang === "zh" ? "明确不做" : "Explicitly out of scope"}</h2>
        <ul>
          <li>{lang === "zh" ? "市场规模、购买率预测" : "Market size and purchase-rate forecasts"}</li>
          <li>{lang === "zh" ? "Conjoint、MaxDiff 等定量模块" : "Conjoint, MaxDiff and other quantitative modules"}</li>
          <li>{lang === "zh" ? "多平台数据接入、自动招募、AI 访谈" : "Multi-platform ingestion, auto-recruitment, AI interviews"}</li>
          <li>{lang === "zh" ? "企业 SSO、复杂权限、多 Agent 聊天界面" : "Enterprise SSO, complex permissions, multi-agent chat UI"}</li>
        </ul>

        <h2>{lang === "zh" ? "演示" : "Demo"}</h2>
        <p>{lang === "zh" ? "先看示例库里的主案例：英文决策 → 中文计划 → 新词发现 → 可接管证据 → 双语 Decision Memo。" : "Open the main case: English decision → Chinese plan → vocabulary discovery → editable evidence → bilingual Decision Memo."}</p>
        <div className="v2-row" style={{ marginTop: 10 }}>
          <Link className="v2-btn v2-btn-primary" href="/workbench?demo=main-case">{lang === "zh" ? "打开主案例" : "Open main case"} <ArrowRight size={14} /></Link>
          <Link className="v2-btn" href="/">{lang === "zh" ? "开始自己的研究" : "Start your own"}</Link>
        </div>

        <h2>{lang === "zh" ? "材料" : "Materials"}</h2>
        <ul>
          <li>
            <a href="https://github.com/er-s-an/zhiyan/blob/main/docs/%E7%9F%A5%E7%A0%94%E5%8F%B0_V2_PRD_%E5%85%A8%E7%90%83OPC%E4%B8%8E%E7%9F%A5%E4%B9%8E%E7%9F%A5%E8%AF%86%E5%87%BA%E6%B5%B7.md" target="_blank" rel="noreferrer">
              <BookOpen size={12} /> {t("plan.source")} <ExternalLink size={11} />
            </a>
          </li>
          <li>
            <a href="https://github.com/er-s-an/zhiyan" target="_blank" rel="noreferrer">
              <Code2 size={12} /> {t("plan.github")} <ExternalLink size={11} />
            </a>
          </li>
        </ul>
        <p className="v2-mini v2-muted" style={{ marginTop: 18 }}>{lang === "zh" ? "知乎讨论适合定性探索，不证明市场规模、购买率或整体人群分布。" : "Zhihu discussion supports qualitative exploration, not market size, purchase rates or population distribution."}</p>
      </article>
    </main>
  );
}
