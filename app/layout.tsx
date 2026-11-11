import type { Metadata } from "next";
import "./globals.css";
import "./v2.css";
import { AppShell } from "./components/AppShell";
import { LanguageProvider } from "./components/LanguageProvider";

export const metadata: Metadata = {
  title: "知研台 Zhiyan · 全球 OPC 的知乎研究台",
  description:
    "把英文产品决策变成中文研究计划、适应性知乎检索和可复核的双语决策简报。",
  icons: { icon: "/brand/kanshan-face.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <LanguageProvider>
          <AppShell>{children}</AppShell>
        </LanguageProvider>
      </body>
    </html>
  );
}
