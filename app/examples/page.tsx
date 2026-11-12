"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, FileText, LibraryBig } from "lucide-react";
import { useLang } from "../components/LanguageProvider";
import { Kanshan } from "../components/Kanshan";
import type { DemoSummaryV2 } from "../../lib/v2/types";

const AUX = [
  { zh: "多猫智能喂食器", en: "Multi-cat smart feeder", tagZh: "消费硬件", tagEn: "Consumer hardware", descZh: "多猫争食、卡粮、清洁与摄像头功能的需求探索。", descEn: "Needs exploration around multi-cat competition, jams, cleaning and cameras." },
  { zh: "AI 会议纪要", en: "AI meeting notes", tagZh: "B2B SaaS", tagEn: "B2B SaaS", descZh: "产研团队对会议纪要工具的真实使用与采购阻力。", descEn: "How product teams actually use meeting-note tools and what blocks adoption." },
  { zh: "户外储能出海", en: "Outdoor power going global", tagZh: "跨境出海", tagEn: "Cross-border", descZh: "露营、停电和房车场景下的户外电源使用与参数焦虑。", descEn: "Outdoor power usage and spec anxiety in camping, outage and RV scenes." },
  { zh: "AI 知识库落地", en: "AI knowledge base", tagZh: "企业 AI", tagEn: "Enterprise AI", descZh: "50 人产研团队的知识检索、权限与 RAG 幻觉问题。", descEn: "Search, permissions and RAG hallucination in a 50-person product team." },
];

export default function ExamplesPage() {
  const { lang, t } = useLang();
  const [demos, setDemos] = useState<DemoSummaryV2[]>([]);

  useEffect(() => {
    fetch("/api/v2/demos")
      .then((response) => response.json())
      .then((body: { demos?: DemoSummaryV2[] }) => setDemos(Array.isArray(body.demos) ? body.demos : []))
      .catch(() => setDemos([]));
  }, []);

  const main = demos.find((demo) => demo.id === "main-case");

  return (
    <main className="v2-page">
      <div className="v2-page-head">
        <p className="v2-kicker">{t("examples.title")} · V2</p>
        <h1>{lang === "zh" ? "两个案例，一条证据链" : "Two cases, one evidence chain"}</h1>
        <p className="v2-lede">{t("examples.lede")}</p>
      </div>

      <section className="v2-card v2-example-card">
        <div>
          <div className="v2-row">
            <span className="v2-tag v2-tag-blue">{t("examples.main")}</span>
            <span className="v2-tag">{lang === "zh" ? "AI × 出海" : "AI × Going Global"}</span>
            <span className="v2-tag">{lang === "zh" ? "真实知乎检索缓存" : "Real Zhihu cache"}</span>
          </div>
          <h2 style={{ marginTop: 9 }}>{lang === "zh" ? "海外 OPC × 中国自由职业者：AI 合同与回款工具" : "Global OPC × Chinese freelancers: AI contract and payment tool"}</h2>
          <p>
            {lang === "zh"
              ? "一个海外独立开发者想判断：为中国自由职业者做 AI 合同与回款工具，是否值得投入开发。系统从真实知乎讨论中发现报价、改需求、验收、尾款、水印预览、视为验收条款等原生表达，并保留反例和证据缺口。"
              : "A solo founder outside China wants to know whether an AI contract and payment-collection tool for Chinese freelancers is worth building. The system discovers native language around quoting, scope changes, acceptance, final payment, watermarked previews and acceptance clauses, while keeping counter-evidence and evidence gaps."}
          </p>
          {main ? (
            <div className="v2-home-stats">
              <span>{main.opportunityCount ?? 2} {lang === "zh" ? "个机会假设" : "opportunity hypotheses"}</span>
              <span>{main.beliefUpdateCount ?? 3} {lang === "zh" ? "条认知更新" : "belief updates"}</span>
              <span>{main.includedCount} {lang === "zh" ? "条可回查证据" : "traceable evidence items"}</span>
            </div>
          ) : null}
          <div className="v2-row" style={{ marginTop: 14 }}>
            <Link className="v2-btn v2-btn-primary" href="/workbench?demo=main-case">
              {t("examples.open")} <ArrowRight size={14} />
            </Link>
            <Link className="v2-btn" href="/">{lang === "zh" ? "自己跑一个" : "Run your own"}</Link>
          </div>
        </div>
        <div className="v2-home-example-art">
          <Kanshan variant="side" size={120} hidden />
        </div>
      </section>

      <section className="v2-section">
        <div className="v2-section-head">
          <div>
            <h2>{t("examples.aux")}</h2>
            <p>{lang === "zh" ? "旧版缓存保留为辅助演示；不再承担主叙事。" : "Older caches remain as supporting demos; they are not the main narrative."}</p>
          </div>
          <span className="v2-tag"><LibraryBig size={11} /> V1 cache</span>
        </div>
        <div className="v2-card" style={{ padding: "0 20px" }}>
          {AUX.map((item) => (
            <article className="v2-feed-item" key={item.zh}>
              <span className="v2-feed-dot"><FileText size={12} /></span>
              <div>
                <div className="v2-feed-title">{lang === "zh" ? item.zh : item.en}</div>
                <div className="v2-feed-desc">{lang === "zh" ? item.descZh : item.descEn}</div>
                <div className="v2-feed-meta">
                  <span className="v2-tag">{lang === "zh" ? item.tagZh : item.tagEn}</span>
                  <span>{lang === "zh" ? "历史缓存，仅供对照" : "Historical cache, for comparison only"}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="v2-section">
        <div className="v2-section-head">
          <div>
            <h2>{t("plan.demo")}</h2>
            <p>{lang === "zh" ? "5 分钟 Demo 建议按这个顺序走。" : "A five-minute demo flow."}</p>
          </div>
        </div>
        <div className="v2-card v2-card-pad">
          <ol className="v2-list" style={{ paddingLeft: "1.4em" }}>
            <li>{lang === "zh" ? "先讲问题：AI 让产品更容易做出来，但 OPC 仍靠猜决定做什么。" : "Start with the problem: AI makes building easier, but solo founders still guess what to build."}</li>
            <li>{lang === "zh" ? "用英文输入主案例，展示中文研究计划和「知乎不能证明付费率」的闸门。" : "Enter the main case in English; show the Chinese research plan and the gate that says Zhihu cannot prove willingness to pay."}</li>
            <li>{lang === "zh" ? "打开探索：展示从样本长出的新词、来源原句、下一轮查询和反例检索。" : "Open Explore: show vocabulary grown from samples, source quotes, follow-up queries and counter-example retrieval."}</li>
            <li>{lang === "zh" ? "打开样本：排除一条营销/不可靠样本，发现和双语报告即时变化。" : "Open Sample: hold out a marketing or unreliable sample and watch findings and the bilingual report update."}</li>
            <li>{lang === "zh" ? "打开交付：英文 Decision Memo、中文原话、原文链接和下一步访谈证伪条件。" : "Open Delivery: English Decision Memo, Chinese originals, source links and the next interview / falsification plan."}</li>
          </ol>
          <div className="v2-row" style={{ marginTop: 12 }}>
            <Link className="v2-btn v2-btn-primary" href="/workbench?demo=main-case">{t("examples.open")} <ArrowRight size={14} /></Link>
            <a className="v2-btn" href="https://github.com/er-s-an/zhiyan" target="_blank" rel="noreferrer"><ExternalLink size={13} /> GitHub</a>
          </div>
        </div>
      </section>
    </main>
  );
}
