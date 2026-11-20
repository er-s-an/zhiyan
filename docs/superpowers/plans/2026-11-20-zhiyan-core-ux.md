# 知研台核心路径 UI/UX 优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改研究逻辑的前提下，优化首页、访谈结果、研究台和落地方案的信息层级、行动出口与移动端可用性。

**Architecture:** 移动既有 JSX 区块并添加少量展示状态；首页通过自定义事件复用研究搭子澄清流程。静态脚本检查页面顺序和关键接线，项目测试与构建检查回归，ego lite 验证真实用户路径。

**Tech Stack:** Next.js 15、React 19、TypeScript、CSS、Node.js 静态验收脚本、ego lite。

---

## 文件结构

- Create: `scripts/verify-core-ux.mjs` — 核心路径静态验收。
- Modify: `app/page.tsx` — 首页双入口与 Brief 聚焦。
- Modify: `app/components/AppShell.tsx` — 核心导航、访谈/方案入口。
- Modify: `app/components/InterviewDock.tsx` — 响应 `zhiyan:clarify`。
- Modify: `app/interview/page.tsx` — 访谈结果行动优先。
- Modify: `app/workbench/page.tsx` — 去重复并加入方案出口。
- Modify: `app/action-plan/page.tsx` — 7 天行动优先、次级内容折叠。
- Modify: `app/v2.css` — 新布局、对比度与移动端修正。

### Task 1: 核心路径静态验收

- [ ] 新建 `scripts/verify-core-ux.mjs`，读取上述源文件，断言：导航含 `/interview` 与 `/action-plan`；首页和 Dock 含 `zhiyan:clarify`；访谈结果中 `v2-assess-next` 位于 `v2-dim-list` 前；落地方案中 `v2-plan-next` 位于 `v2-plan-mvp` 前；研究台含方案链接；CSS 辅助色不再为 `#8590a6`。
- [ ] 运行 `node scripts/verify-core-ux.mjs`，预期因缺少新入口和新顺序而 FAIL。

### Task 2: 首页、导航与澄清入口

- [ ] `InterviewDock` 添加 `zhiyan:clarify` 监听，打开抽屉并复用 `startClarify`，卸载时清理。
- [ ] 首页增加“4 问快速澄清”和“已有 Brief”双入口；Brief 输入区添加 `ref` 与锚点，选择后滚动聚焦。保留原随机案例和生成计划逻辑。
- [ ] `AppShell` 核心导航改为首页、访谈、研究台、方案；页脚加入示例和产品说明；顶部 CTA 链到 `/interview`，完成访谈后链到 `/action-plan`。
- [ ] 运行静态验收，确认首页和导航断言通过，其余未改项仍失败。

### Task 3: 结果页行动优先

- [ ] 访谈结果页将关键假设与 `v2-assess-next` 移到八维度前，八维度包入 `details`，分数改为小号参考信息；保留生成计划、下载和恢复逻辑。
- [ ] 研究台移除外层重复标题和重复建议，添加 `/action-plan` 主出口，保留三个视图与导出。
- [ ] 落地方案将 `v2-plan-next` 移到 MVP 前，压缩定位层级，将路线图、商业模式、实验和证据细节包入 `details`，次级操作归入“更多操作”。
- [ ] 运行 `node scripts/verify-core-ux.mjs`，预期全部 PASS。

### Task 4: 可读性与移动端

- [ ] 将 `--z-muted` 调整为对比度至少 4.5:1 的 `#64748b`，补充新首页、结果页和折叠区样式。
- [ ] 680px 以下 launcher 改为 44px 圆形图标，主内容增加底部安全间距，芯片与按钮增大触控区域；压缩研究台头部非关键内容。
- [ ] 运行 `npm test`、`npm run build` 和静态验收，预期全部通过。

### Task 5: ego lite 真实路径验收

- [ ] 启动本地 Next.js，使用缓存主案例，不调用真实知乎检索。
- [ ] 桌面验证：首页打开 4 问澄清、Brief 聚焦、完整访谈结果 CTA、研究台到落地方案、折叠控件键盘操作。
- [ ] 375×667 验证四页无横向溢出、首屏主动作可见、launcher 不遮挡正文。
- [ ] 删除临时截图和本地服务日志，`git status --short` 仅保留本任务文件。
