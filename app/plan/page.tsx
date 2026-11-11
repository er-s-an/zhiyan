import { readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { ArrowRight, BadgeCheck, BookOpen, ExternalLink, PlayCircle, Sparkles } from "lucide-react";
import { Kanshan } from "../components/Kanshan";

interface Block {
  kind: "h1" | "h2" | "h3" | "ul" | "ol" | "quote" | "p" | "table";
  content: string | string[];
  header?: string[];
  rows?: string[][];
}

function parse(text: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of text.trim().split(/\n{2,}/)) {
    const lines = chunk.split("\n").map((line) => line.trimEnd());
    const first = lines[0] || "";
    if (lines.length === 1 && first.startsWith("# ")) {
      blocks.push({ kind: "h1", content: first.slice(2) });
    } else if (lines.length === 1 && first.startsWith("## ")) {
      blocks.push({ kind: "h2", content: first.slice(3) });
    } else if (lines.length === 1 && first.startsWith("### ")) {
      blocks.push({ kind: "h3", content: first.slice(4) });
    } else if (lines.every((line) => line.startsWith("- "))) {
      blocks.push({ kind: "ul", content: lines.map((line) => line.slice(2)) });
    } else if (lines.every((line) => /^\d+\.\s/.test(line))) {
      blocks.push({ kind: "ol", content: lines.map((line) => line.replace(/^\d+\.\s/, "")) });
    } else if (lines.every((line) => line.startsWith(">"))) {
      blocks.push({ kind: "quote", content: lines.map((line) => line.replace(/^>\s?/, "")).join(" ") });
    } else if (lines.every((line) => line.trim().startsWith("|"))) {
      const cells = (line: string) =>
        line
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => cell.trim());
      const rows = lines.filter((line) => !/^\|[\s:|-]+\|?$/.test(line.trim())).map(cells);
      if (rows.length > 0) blocks.push({ kind: "table", content: "", header: rows[0], rows: rows.slice(1) });
    } else {
      blocks.push({ kind: "p", content: lines.join(" ") });
    }
  }
  return blocks;
}

function Inline({ text }: { text: string }) {
  const chunks = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <>
      {chunks.map((chunk, index) => {
        if (chunk.startsWith("**") && chunk.endsWith("**")) {
          return <strong key={index}>{chunk.slice(2, -2)}</strong>;
        }
        if (chunk.startsWith("`") && chunk.endsWith("`")) {
          return <code key={index}>{chunk.slice(1, -1)}</code>;
        }
        return <span key={index}>{chunk}</span>;
      })}
    </>
  );
}

export default function PlanPage() {
  const text = readFileSync(path.join(process.cwd(), "docs/产品说明计划书.md"), "utf8");
  const blocks = parse(text);
  const sections = blocks
    .filter((block): block is Block & { kind: "h2"; content: string } => block.kind === "h2")
    .map((block, index) => ({ title: String(block.content), id: `section-${index + 1}` }));
  let h2Index = 0;

  return (
    <main>
      <section className="plan-hero">
        <div>
          <span className="eyebrow">
            <BookOpen size={14} /> 知乎黑客松 S3 · 湾区共创季
          </span>
          <h1>知研台 Zhiyan</h1>
          <p>
            把一句业务问题编译成可核对的研究设计，确认后检索知乎、建立样本、编码分析，交付一份写明边界的团队研究简报。
          </p>
          <div className="head-meta">
            <span className="pill pill-blue">
              <BadgeCheck size={12} /> AI × 知识与探索
            </span>
            <span className="pill">Next.js · TypeScript</span>
            <span className="pill">知乎搜索 / 热榜 / 直答</span>
            <span className="pill">刘看山 IP</span>
          </div>
        </div>
        <Kanshan variant="front" size={168} hidden />
      </section>

      <div className="plan-layout">
        <aside className="card plan-toc">
          <h3>目录</h3>
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              {section.title}
            </a>
          ))}
          <div className="divider" />
          <a href="#demo" style={{ color: "var(--blue)", fontWeight: 600 }}>
            评委演示动线
          </a>
        </aside>

        <article className="card plan-article" lang="zh-CN" data-testid="plan">
          {blocks.map((block, index) => {
            if (block.kind === "h1") {
              if (index === 0) return null;
              return <h1 key={index}>{String(block.content)}</h1>;
            }
            if (block.kind === "h2") {
              h2Index += 1;
              return (
                <h2 key={index} id={`section-${h2Index}`}>
                  {String(block.content)}
                </h2>
              );
            }
            if (block.kind === "h3") {
              return <h3 key={index}>{String(block.content)}</h3>;
            }
            if (block.kind === "ul") {
              return (
                <ul key={index}>
                  {(block.content as string[]).map((line) => (
                    <li key={line}>
                      <Inline text={line} />
                    </li>
                  ))}
                </ul>
              );
            }
            if (block.kind === "ol") {
              return (
                <ol key={index}>
                  {(block.content as string[]).map((line) => (
                    <li key={line}>
                      <Inline text={line} />
                    </li>
                  ))}
                </ol>
              );
            }
            if (block.kind === "quote") {
              return (
                <blockquote key={index}>
                  <Inline text={String(block.content)} />
                </blockquote>
              );
            }
            if (block.kind === "table") {
              return (
                <div key={index} style={{ overflowX: "auto", marginTop: 12 }}>
                  <table className="plan-table">
                    <thead>
                      <tr>
                        {(block.header || []).map((cell) => (
                          <th key={cell}>{cell}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(block.rows || []).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex}>
                              <Inline text={cell} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
            return (
              <p key={index}>
                <Inline text={String(block.content)} />
              </p>
            );
          })}

          <div id="demo" style={{ scrollMarginTop: 84 }}>
            <h2>评委演示动线</h2>
            <p>现场建议 5 分钟，按下面的顺序走。示例库里的数据已经缓存，不依赖现场网络和额度。</p>
            <ol>
              <li>
                打开 <Link href="/examples">示例库</Link>，选「多猫智能喂食器」，进入「协议」页：先讲清楚先确认、后检索。
              </li>
              <li>切到「样本」：点一条来源，展示纳入理由、原始中文摘录和编码；搁置一条，看分析计数与报告一起变化。</li>
              <li>切到「分析」：指出发现的门槛是两条纳入条目，不是模型自由发挥。</li>
              <li>切到「质检」：第一屏就是「可以支持 / 不能证明」，再讲场景与角色覆盖、过时内容和单一来源。</li>
              <li>切到「交付」：导出 Markdown，或者复制报告；最后回到首页，用一句新的业务问题现场生成设计。</li>
            </ol>
            <div className="plan-cta">
              <div>
                <strong>现在打开一个完整示例</strong>
                <span>四个案例覆盖消费硬件、B2B SaaS、跨境出海和企业知识管理。</span>
              </div>
              <Link className="btn btn-primary" href="/examples">
                <PlayCircle size={15} /> 打开示例库 <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </article>
      </div>

      <div className="row" style={{ marginTop: 20, justifyContent: "space-between" }}>
        <span className="mini muted">
          <Sparkles size={12} style={{ verticalAlign: "-1px", marginRight: 4 }} />
          设计遵循知乎蓝白主题，使用刘看山官方三视图素材
        </span>
        <span className="row" style={{ gap: 14 }}>
          <a className="mini" href="https://github.com/er-s-an/zhiyan" target="_blank" rel="noreferrer">
            <ExternalLink size={12} style={{ verticalAlign: "-1px", marginRight: 4 }} />
            GitHub 仓库
          </a>
          <Link className="mini" href="/">
            回到工作台
          </Link>
        </span>
      </div>
    </main>
  );
}
