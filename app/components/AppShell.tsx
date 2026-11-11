"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe2 } from "lucide-react";
import type { ReactNode } from "react";
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
              <small>{lang === "zh" ? "知乎研究台" : "Zhihu research desk"}</small>
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
            <button className="v2-lang" type="button" onClick={() => setLang(lang === "zh" ? "en" : "zh")} title={t("home.langHint")}>
              <Globe2 size={14} />
              {lang === "zh" ? "EN" : "中文"}
            </button>
            <Link className="v2-header-cta" href="/">
              {lang === "zh" ? "开始研究" : "Start"}
            </Link>
          </div>
        </div>
      </header>
      <div className="v2-main">{children}</div>
      <footer className="v2-footer">
        <div className="v2-footer-inner">
          <span>{lang === "zh" ? "知研台 · 知乎黑客松 S3" : "Zhiyan · Zhihu Hackathon S3"}</span>
          <a href="https://github.com/er-s-an/zhiyan" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
