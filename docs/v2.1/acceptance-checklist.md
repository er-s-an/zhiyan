# V2.1 验收清单

## M1 数据契约与样例

- [x] `InitialBelief`、`BeliefUpdate`、`OpportunityHypothesis`、`RoundSnapshot`、`StopReason`、`DecisionBrief` 类型实现。
- [x] 主案例真实 `DecisionBrief` JSON：`lib/v2/briefs/main-case.json`。
- [x] 一页手工样例：`docs/v2.1/main-case-decision-brief.html`。
- [x] 证据映射：`docs/v2.1/evidence-map.md`。
- [x] Gate A 本机阅读测试记录；外部测试待执行（`user-test-script.md`）。

## M2 三 Tab 信息架构

- [x] 决策简报 / 研究过程 / 证据与质检 三个 Tab。
- [x] 默认进入决策简报。
- [x] 完整报告不作为第四个 Tab，在决策简报内展开，并由导出按钮下载。
- [x] 调整计划、导出在右上角。
- [x] 决策简报第一屏：原想法 → 新理解 → 机会 → 建议 → 下一步。
- [x] 原想法 vs 新理解最多 3 行。
- [x] 机会卡最多 3 张；主案例 2 张，明确未凑第三张。
- [x] “这份研究没有回答的问题”是一等模块。
- [x] 研究过程三轮叙事，默认只显示认知变化；查询/覆盖/版本折叠。
- [x] 高影响关键词只展示 5 个；其余进入完整日志。

## M3 证据质量

- [x] 清理 6 条营销/无具体经历的弱相关样本；纳入从 47 降到 41（67.2%）。
- [x] 高影响关键词只保留 5 个，法律/模型术语不进入。
- [x] 停止原因改为 `budget_exhausted`，不宣称主题饱和。
- [x] 候选计数拆分为搜索候选 + 热榜纳入 = 候选样本，UI 明示。
- [x] 证据强度按作者独立性/反例/机构账号规则计算；创作者卡降为「中」。
- [x] 样本搁置后，发现和 DecisionBrief 重算；证据不足时降级为 `insufficient_evidence`。
- [x] 查询扩展概念数限制为最多 4（后续实时路径）。
- [x] 质量审计：`docs/v2.1/quality-audit.md` / `.json`。

## M4 后台任务

- [x] `POST /api/v2/jobs` 创建任务并立即返回。
- [x] `GET /api/v2/jobs/[id]` 返回状态、轮次快照、下一轮计划。
- [x] 每轮完成后写入 `RoundSnapshot`。
- [x] 研究未完成只展示轮次快照，不输出最终建议。
- [x] 失败保留已完成轮次，提供重试；搜索缓存避免重启后重复调用接口。
- [x] 本机 `next start` 后台任务完成（约 530 秒，3 轮）；外部部署环境仍需验证。

## 本机浏览器验收记录（2026-11-12）

- 生产构建 `next start` 于 `127.0.0.1:3211`。
- `/workbench?demo=main-case` 默认进入决策简报，三 Tab 可见；2 张机会卡；无 console error。
- 导出触发下载 `zhiyan-v21-brief-en.md`。
- 证据 Tab 搁置当前样本后，页面仍正常并重算；关键证据移除测试由 `verify-v21` 覆盖。
- 1440 / 1024 / 768 / 390 四档对首页、计划、示例、决策简报、研究过程、证据质检无横向溢出。
- 后台任务：计划页确认后立即跳转 `/workbench?job=...`，显示“研究进行中·未完成”，不输出最终建议；任务完成后自动进入三 Tab 简报（实测约 530 秒、3 轮）。
- 外部 3–5 人用户测试仍未执行。

## M5 最终验证

- [x] 16 项测试通过、生产构建通过、verify-v2 与 verify-v21 通过。
- [x] 浏览器实测三 Tab、导出下载、样本搁置重算、移动端无横向溢出。
- [x] 截图保存在 `docs/screenshots-v2.1/`。
- [x] README、产品说明、decisions.tsv 更新。
- [ ] GitHub 推送；不自动部署。（提交前执行）
