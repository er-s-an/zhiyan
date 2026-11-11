# 知乎黑客松 S3 官网参赛指南要点（2026-11-11 从 https://hackathon-s3.event.zhihu.com/api/content 拉取）

Fold these into the Build. Do not change the locked product (知研台).

## Required submit materials
- Runnable public demo (required): judges must operate the full core loop with no local dev environment. Web = public URL. If there is login, provide a test account and never expose real user data. Zhihu OAuth is recommended for web; FAQ allows shipping the loop first and adding OAuth later.
- 产品说明计划书 (required, a primary initial-review criterion): core idea, technical implementation, fit with Zhihu community ecology, scene value, and later landing. Structure it so reviewers can score 知乎生态契合度 and AI 场景价值.
- Repo (GitHub/Gitee) and a public demo video link are optional but score-boosting. Video must be a public URL showing the core loop and a real use scene.

Submit window: 2026-12-05 10:00–12-07 10:00 Asia/Shanghai. One work per team, one track. After the close, no replacements. During the window, project info can still be edited.

## Initial review scoring (100%)
- AI 场景价值 40%: meaningful AI scene; real user/business pain; actual value inside the Zhihu ecosystem
- 创新度 25%
- 完成度 25%: usable, smooth, stable demo
- 产品体验与设计感 10%

Finals 2026-12-19: Shenzhen in person + Tencent Meeting; 5 min real Demo + 3 min Q&A. Final weights add 7% for 计划书和演示环节 (experience becomes 8%).

## Rules
- Already-awarded or already-publicly-released projects cannot enter. No copying, outsourcing, or 一稿多投. Open source and public references are allowed if disclosed; core features and main innovation must be the team’s own. Keep AI interaction logs, design drafts, and dev logs.
- Official APIs via zhihu-cli Skill only (downloaded copy at ../official/zhihu-cli-skill.zip). Quotas: 热榜 100/day, 知乎搜索 5000/day, 全网搜索 5000/day, 直答 Agent 100/day. No batch/spam posting.
- Contest language is Chinese for official materials (计划书, explainer). Product UI may be English.
- Separate 技术指南（必读） at https://rcnmkynuc7as.feishu.cn/wiki/WrJswoU8EiFbkzkzSuWcl9iDnom is currently login-walled; do not invent its contents.

## Deploy
When a public demo must go up, use the user's existing Cloudflare or Vercel accounts. Prefer Cloudflare if there is a backend; Vercel is fine for a frontend-only surface. Do not sign up for a new hosting account or bind a payment card.
