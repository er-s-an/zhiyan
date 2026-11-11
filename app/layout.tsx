import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zhiyan 知研台",
  description: "Research execution on Zhihu. A brief becomes a design, then a sample, then a checked report.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="top">
            <a className="brand" href="/">
              <b>知研台 Zhiyan</b>
              <span>Research execution</span>
            </a>
            <nav className="nav">
              <a href="/">Brief</a>
              <a href="/design">Design</a>
              <a href="/workbench">Workbench</a>
              <a href="/plan">计划书</a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
