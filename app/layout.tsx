import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "./components/AppShell";

export const metadata: Metadata = {
  title: "知研台 Zhiyan · 知乎研究执行平台",
  description:
    "把一句业务问题编译成可核对的知乎研究设计，确认后检索、编码、质检，交付一份标明边界的团队研究简报。",
  icons: {
    icon: "/brand/kanshan-face.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
