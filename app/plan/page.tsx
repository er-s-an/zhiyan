import { readFileSync } from "node:fs";
import path from "node:path";

export default function PlanPage() {
  const text = readFileSync(path.join(process.cwd(), "docs/产品说明计划书.md"), "utf8");
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <main>
      <p className="kicker">For judges</p>
      <article lang="zh" className="sheet plan" data-testid="plan">
        {blocks.map((block) => {
          const lines = block.split("\n");
          const first = lines[0] || "";
          if (first.startsWith("# ")) return <h1 key={first}>{first.slice(2)}</h1>;
          if (first.startsWith("## ")) return <h2 key={first}>{first.slice(3)}</h2>;
          if (lines.every((line) => line.startsWith("- "))) {
            return (
              <ul key={block}>
                {lines.map((line) => (
                  <li key={line}>{line.slice(2)}</li>
                ))}
              </ul>
            );
          }
          return (
            <div key={block.slice(0, 24)}>
              {lines.map((line, index) => (
                <p key={`${index}-${line.slice(0, 12)}`}>{line}</p>
              ))}
            </div>
          );
        })}
      </article>
    </main>
  );
}
