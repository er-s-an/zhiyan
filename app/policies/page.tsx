"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Search, ShieldCheck } from "lucide-react";
import { useLang } from "../components/LanguageProvider";
import { pickLang } from "../../lib/v2/lang";
import { filterPolicies, POLICIES, type PolicyCategory } from "../../lib/policies";
import type { Lang } from "../../lib/v2/types";

type CategoryFilter = PolicyCategory | "all";

function tr(lang: Lang, zh: string, en: string, fr: string, ja: string): string {
  return pickLang(lang, zh, en, fr, ja);
}

export default function PoliciesPage() {
  const { lang } = useLang();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const results = useMemo(() => filterPolicies(POLICIES, query, category), [query, category]);
  const categories: { id: CategoryFilter; label: string }[] = [
    { id: "all", label: tr(lang, "全部", "All", "Tout", "すべて") },
    { id: "tax", label: tr(lang, "税费优惠", "Tax relief", "Avantages fiscaux", "税優遇") },
    { id: "startup", label: tr(lang, "创业支持", "Startup support", "Soutien à la création", "起業支援") },
    { id: "foreign", label: tr(lang, "来华经营", "Doing business in China", "Affaires en Chine", "中国での事業") },
  ];

  return (
    <main className="v2-page">
      <div className="v2-page-head">
        <p className="v2-kicker">{tr(lang, "政策利好 · 全国通用", "Policy benefits · nationwide", "Aides nationales", "全国政策")}</p>
        <h1>{tr(lang, "政策利好与来华经营指南", "Policy benefits and doing business in mainland China", "Aides et affaires en Chine continentale", "政策優遇と中国での事業ガイド")}</h1>
        <p className="v2-lede">
          {tr(
            lang,
            "为国内一人公司、自由职业者和海外 OPC 整理。看清有什么好处、适合谁、有什么限制，再去官方原文确认。",
            "For one-person companies, freelancers and global OPCs. See the benefit, eligibility and limits, then confirm with the official source.",
            "Pour les entreprises unipersonnelles, les indépendants et les OPC internationaux. Voyez les avantages, les conditions et les limites, puis vérifiez la source officielle.",
            "一人会社、フリーランス、海外OPC向け。優遇内容、対象者、制限を確認し、公式原文へ進めます。",
          )}
        </p>
      </div>

      <section className="v2-policy-controls" aria-label={tr(lang, "搜索和筛选政策", "Search and filter policies", "Rechercher et filtrer", "政策を検索・絞り込み")}>
        <label className="v2-policy-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tr(lang, "搜索增值税、个体户、社保、贷款、外资、工作许可…", "Search VAT, freelance, insurance, loans, foreign investment, work permit…", "Rechercher TVA, indépendant, assurance, prêt, investissement, permis…", "VAT、個人事業、社保、ローン、外資、就労許可を検索…")}
            aria-label={tr(lang, "搜索政策", "Search policies", "Rechercher des politiques", "政策を検索")}
          />
        </label>
        <div className="v2-policy-filters" role="group" aria-label={tr(lang, "按类别筛选", "Filter by category", "Filtrer par catégorie", "カテゴリーで絞り込み")}>
          {categories.map((item) => (
            <button
              className={`v2-chip${category === item.id ? " is-active" : ""}`}
              type="button"
              key={item.id}
              aria-pressed={category === item.id}
              onClick={() => setCategory(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <div className="v2-policy-result-meta">
        <span>{tr(lang, `找到 ${results.length} 条政策`, `${results.length} policies found`, `${results.length} politiques`, `${results.length}件の政策`)}</span>
        <span>{tr(lang, "最近核验：2026-11-20", "Last verified: 20 Nov 2026", "Vérifié le 20 nov. 2026", "最終確認：2026-11-20")}</span>
      </div>

      {results.length > 0 ? (
        <div className="v2-policy-grid">
          {results.map((policy) => (
            <article className="v2-card v2-policy-card" key={policy.id}>
              <div className="v2-policy-card-top">
                <span className="v2-tag v2-tag-blue">{categories.find((item) => item.id === policy.category)?.label}</span>
                <span className="v2-tag">{tr(lang, "全国", "Nationwide", "National", "全国")}</span>
              </div>
              <h2>{lang === "zh" ? policy.title.zh : policy.title.en}</h2>
              <p className="v2-policy-benefit">{lang === "zh" ? policy.benefit.zh : policy.benefit.en}</p>
              <dl className="v2-policy-facts">
                <div>
                  <dt>{tr(lang, "适合谁", "Who it is for", "Pour qui", "対象者")}</dt>
                  <dd>{lang === "zh" ? policy.audience.zh : policy.audience.en}</dd>
                </div>
                <div>
                  <dt>{tr(lang, "限制条件", "Limits", "Limites", "制限")}</dt>
                  <dd>{lang === "zh" ? policy.caveat.zh : policy.caveat.en}</dd>
                </div>
                <div>
                  <dt>{tr(lang, "有效期", "Validity", "Validité", "有効期間")}</dt>
                  <dd>{lang === "zh" ? policy.validity.zh : policy.validity.en}</dd>
                </div>
              </dl>
              <div className="v2-policy-source">
                <span>{policy.documentNo}</span>
                <a href={policy.sourceUrl} target="_blank" rel="noreferrer">
                  {tr(lang, "查看官方原文", "Official source", "Source officielle", "公式原文")} <ArrowUpRight size={13} />
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="v2-card v2-empty">
          <h2>{tr(lang, "没有找到匹配政策", "No matching policies", "Aucun résultat", "該当する政策がありません")}</h2>
          <p>{tr(lang, "试试“增值税”“社保”“外资”或更短的关键词。", "Try “VAT”, “insurance”, “foreign investment”, or a shorter keyword.", "Essayez « TVA », « assurance », « investissement » ou un mot plus court.", "「VAT」「保険」「外資」など、短いキーワードをお試しください。")}</p>
          <button className="v2-btn v2-btn-primary" type="button" onClick={() => { setQuery(""); setCategory("all"); }}>
            {tr(lang, "清空搜索并查看全部", "Clear and show all", "Effacer et tout afficher", "クリアしてすべて表示")}
          </button>
        </section>
      )}

      <div className="v2-policy-note">
        <ShieldCheck size={15} />
        <p>{tr(
          lang,
          "仅作政策指引，不构成法律或税务意见。具体资格和办理以主管部门及当地最新口径为准；海外 OPC 不自动适用个体户或毕业生优惠。",
          "Guidance only, not legal or tax advice. Eligibility and procedures follow the latest official and local rules. Overseas OPCs are not automatically eligible for individual-business or graduate incentives.",
          "À titre indicatif uniquement, sans valeur de conseil juridique ou fiscal. L’éligibilité et les procédures dépendent des règles officielles et locales. Les OPC étrangers ne sont pas automatiquement éligibles aux aides aux indépendants ou aux diplômés.",
          "情報提供のみを目的とし、法的・税務助言ではありません。資格と手続きは最新の公式・地域ルールに従ってください。海外OPCが個人事業主・卒業生向け優遇に自動的に該当するわけではありません。",
        )}</p>
      </div>

    </main>
  );
}
