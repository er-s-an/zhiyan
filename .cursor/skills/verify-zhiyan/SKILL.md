---
name: verify-zhiyan
description: Verify Zhiyan's research loop. Use before calling the demo done. Checks the confirm gate, the feeder design, the honest purchase-intent limit, and a real study projection.
---

# Verify Zhiyan

Run this from the repository root while the app is serving, or pass `--base` for a public URL. The script does not treat a green compile as success.

```bash
npx tsx .cursor/skills/verify-zhiyan/scripts/verify.mts --base http://127.0.0.1:3210 --study /tmp/zhiyan-study.json
```

Pass criteria, all required:

- `npm test` passes. The tests cover confirmation before any port call, Chinese and English feeder briefs, Zhida absent from the report, exclude or restore or relabel, and the locked purchase-intent limit.
- `POST /api/design` with the feeder brief returns `zhihuCalls: 0`, stage `needs_exploration`, and Chinese queries.
- `POST /api/search` with `confirmed` not true returns 400 and `CONFIRM_REQUIRED`.
- `POST /api/search` with a query outside the design returns 400 and `QUERY_NOT_IN_DESIGN`.
- When a study file is passed, its projection contains both locked sentences, `in this sample only`, a concept test or directed interviews as the next method, at least one Zhihu search and one hot list, `usedAsFinding` false, and no Zhida text inside the report. Every finding cites at least two items.

After the script passes, open the UI and walk the loop. Submit the feeder brief, read the design before retrieval, confirm, then open Sample, Analysis, Quality, and Delivery. Exclude one included item and confirm the theme count and the report both change. Restore it. Screenshot the design before retrieval and the honest call on Quality and Delivery.

Do not pass the demo from this script alone if the browser loop was not exercised. Do not pass it from a written status file.
