"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  FileText,
  LayoutDashboard,
  LibraryBig,
  PenLine,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { href: "/", label: "工作台", icon: LayoutDashboard, match: (path: string) => path === "/" },
  { href: "/design", label: "新建研究", icon: PenLine, match: (path: string) => path.startsWith("/design") },
  { href: "/workbench", label: "当前研究", icon: Sparkles, match: (path: string) => path.startsWith("/workbench") },
  { href: "/examples", label: "示例库", icon: LibraryBig, match: (path: string) => path.startsWith("/examples") },
  { href: "/plan", label: "产品说明", icon: FileText, match: (path: string) => path.startsWith("/plan") },
];

const TITLES: [RegExp, string][] = [
  [/^\/$/, "工作台"],
  [/^\/design/, "研究设计"],
  [/^\/workbench/, "当前研究"],
  [/^\/examples/, "示例库"],
  [/^\/plan/, "产品说明"],
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const title = TITLES.find(([pattern]) => pattern.test(pathname))?.[1] || "知研台";

  return (
    <div className="app">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="知研台首页">
          <span className="brand-mark">
            <img src="/brand/kanshan-face.png" alt="" width={34} height={34} />
          </span>
          <span className="brand-text">
            <b>知研台</b>
            <small>ZHIYAN</small>
          </span>
        </Link>

        <nav className="side-nav" aria-label="主导航">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <Link key={item.href} href={item.href} className={`side-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
                <Icon size={18} strokeWidth={1.9} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="side-spacer" />

        <div className="cap-card">
          <div className="cap-title">
            <span className="zhihu-mark">知</span>
            知乎开放能力
          </div>
          <p className="cap-status">
            <span className="status-dot" />
            搜索 · 热榜 · 直答
          </p>
          <p className="cap-note">确认设计后才会发起调用</p>
        </div>

        <Link className="side-demo" href="/examples">
          <PlayCircle size={16} />
          评委演示入口
        </Link>

        <p className="side-foot">
          知乎黑客松 S3
          <br />
          湾区共创季
        </p>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-brand">知研台</span>
            <span className="crumb-sep">/</span>
            <span className="crumb">{title}</span>
          </div>
          <div className="topbar-right">
            <Link className="badge-link" href="/plan">
              <BookOpen size={14} />
              产品说明
            </Link>
            <span className="hack-pill">知乎黑客松 S3 · 湾区共创季</span>
            <span className="avatar" title="研究员">
              研
            </span>
          </div>
        </header>
        <div className="page">{children}</div>
      </div>
    </div>
  );
}
