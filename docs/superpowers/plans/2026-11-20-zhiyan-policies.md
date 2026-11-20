# 知研台政策栏目 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增一个中英文可搜索的全国政策资源页，并在首页、主导航和现有 5 页 Pitch 中提供轻量入口。

**Architecture:** 静态双语记录与纯函数筛选位于 `lib/policies.ts`；Next.js 客户端页面负责搜索和分类；无 API 或新依赖。Pitch 仅增加一句配套说明。

**Tech Stack:** TypeScript、React、Next.js、CSS、Node.js `node:test`、ego lite。

---

### Task 1: 政策数据与搜索测试

- [ ] 新建 `lib/policies.test.ts`，测试中英文关键词、类别组合、无结果、清空搜索和 10 条官方记录。
- [ ] 运行 `npx tsx --test lib/policies.test.ts`，预期因 `lib/policies.ts` 不存在而 FAIL。
- [ ] 新建 `lib/policies.ts`，定义 `PolicyCategory`、`Policy`、`POLICIES` 和 `filterPolicies(records, query, category)`，录入已核验的 10 条官方记录。
- [ ] 将 `lib/policies.test.ts` 加入 `package.json` 的 `npm test`，再次运行，预期 PASS。

### Task 2: 页面、导航与首页入口

- [ ] 新建 `app/policies/page.tsx`，实现搜索、四类筛选、结果数量、无结果清空、双语卡片和官方链接。
- [ ] 更新 `AppShell.tsx` 和 `page.tsx`，加入政策导航和首页轻入口。
- [ ] 更新 `v2.css`，复用知乎蓝白组件并适配 375px。
- [ ] 新建 `scripts/verify-policies.mjs`，检查 10 条记录、官方链接、限制说明、页面和 Pitch 文案，运行 PASS。

### Task 3: Pitch 与验收

- [ ] 将已确认的 `pitch.html` 复制到本分支，只在第 3 页底部增加“配套：政策利好与合规指南，支持中英文搜索”。
- [ ] 停止开发服务器后运行 `npm test`、`npm run build` 和静态验收，全部通过后重启。
- [ ] 用 ego lite 验证导航、首页入口、中英文搜索、类别组合、无结果清空、官方链接和移动端。
- [ ] 检查 `git diff --check` 和状态，提交并推送当前功能分支。
