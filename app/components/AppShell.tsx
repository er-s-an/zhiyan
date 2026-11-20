"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe2 } from "lucide-react";
import type { ReactNode } from "react";
import type { Lang } from "../../lib/v2/types";
import { pickLang } from "../../lib/v2/lang";
import { InterviewDock } from "./InterviewDock";
import { useLang } from "./LanguageProvider";

const NAV = [
  { href: "/", key: "nav.home" },
  { href: "/workbench", key: "nav.research" },
  { href: "/examples", key: "nav.examples" },
  { href: "/plan", key: "nav.plan" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const { lang, setLang, t } = useLang();

  return (
    <div className="v2">
      <header className="v2-header">
        <div className="v2-header-inner">
          <Link className="v2-brand" href="/">
            <span className="v2-brand-mark">
              <img src="/brand/kanshan-face.png" alt="" width={30} height={30} />
            </span>
            <span className="v2-brand-text">
              <b>{t("app.name")}</b>
              <small>
                {pickLang(lang, "知乎研究台", "Zhihu research desk", "Bureau de recherche Zhihu", "Zhihuリサーチデスク")}
              </small>
            </span>
          </Link>

          <nav className="v2-nav" aria-label="Main navigation">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} className={`v2-nav-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>

          <div className="v2-header-actions">
            <label className="v2-lang" title={t("home.langHint")}>
              <Globe2 size={14} />
              <select
                className="v2-lang-select"
                value={lang}
                aria-label={t("home.langHint")}
                onChange={(event) => setLang(event.target.value as Lang)}
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="ja">日本語</option>
                <option value="ru">Русский</option>
                <option value="ko">한국어</option>
              </select>
            </label>
            <Link className="v2-header-cta" href="/">
              {pickLang(lang, "开始研究", "Start", "Commencer", "始める")}
            </Link>
          </div>
        </div>
      </header>
      <div className="v2-main">{children}</div>
      <footer className="v2-footer">
        <div className="v2-footer-inner">
          <span>
            {pickLang(lang, "知研台 · 知乎黑客松 S3", "Zhiyan · Zhihu Hackathon S3", "Zhiyan · Hackathon Zhihu S3", "Zhiyan · Zhihuハッカソン S3")}
          </span>
          <a href="https://github.com/er-s-an/zhiyan" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </footer>
      <InterviewDock />
    </div>
  );
}
