import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const data = read("lib/policies.ts");
const page = read("app/policies/page.tsx");
const shell = read("app/components/AppShell.tsx");
const home = read("app/page.tsx");
const pitch = read("pitch.html");

const records = data.match(/^\s{4}id: "/gm) ?? [];
assert.equal(records.length, 10, "policy catalog must contain ten records");
assert.equal((data.match(/sourceUrl: "https:\/\//g) ?? []).length, 10, "every policy must use an HTTPS official source");
assert.equal((data.match(/verifiedAt: "2026-11-20"/g) ?? []).length, 10, "every policy must carry the verification date");
for (const copy of ["海外OPC", "海外人士", "工作许可", "限制", "foreign", "work permit"]) {
  assert.ok(data.includes(copy), `missing policy scope: ${copy}`);
}
assert.ok(page.includes("filterPolicies") && page.includes("type=\"search\""), "policy search must be wired");
assert.ok(page.includes("清空搜索并查看全部"), "empty results must have a recovery action");
assert.ok(shell.includes('href: "/policies"'), "main navigation must include policies");
assert.ok(home.includes('href="/policies"'), "home must include the policy entry");
assert.ok(pitch.includes("配套：政策利好与合规指南 · 支持中英文搜索"), "pitch must mention policy search once");
assert.equal((pitch.match(/<section\b[^>]*\bclass="[^"]*\bslide\b/g) ?? []).length, 5, "pitch must stay at five slides");
console.log("policies: ten sourced records, search, navigation, recovery and five-slide pitch verified");
