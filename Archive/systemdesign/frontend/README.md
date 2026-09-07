# `SystemDesign/Frontend/` — what Part VI shed

Filled by improvement **#42**, which broke the old `SystemDesign/Frontend/` section apart. Most of it
moved rather than being archived — this directory holds only what had no destination because every one
of its sections already existed somewhere else in the book.

| File | Was | Why it is here |
| ---- | --- | -------------- |
| `performance.md` | `SystemDesign/Frontend/04-performance.md` | Every section duplicated a `Frontend/WebPerformance/` chapter: the Core Web Vitals table, LCP, INP and CLS (chapter 01), code splitting (03), caching headers (04), images (05), bundle size (06). It was a summary of the section it sat next to — a plain non-negotiable #7 violation. Nothing in the book linked to `#ch-frontend-performance-at-scale` |

## Where the rest of the section went

| Was | Now | Part |
| --- | --- | ---- |
| `01-architecture.md` | `Frontend/Architecture/01-frontend-architecture-patterns.md` | IV |
| `05-micro-frontends.md` | `Frontend/Architecture/02-micro-frontends.md` | IV |
| `08-design-systems.md` | `Frontend/Architecture/03-design-systems.md` | IV |
| `09-assets.md` | `Frontend/WebPerformance/09-font-and-css-delivery.md` | IV — rescoped to fonts, CSS and icons; its images and CDN halves duplicated chapters 05 and 04 |
| `12-monitoring.md` | `Frontend/WebPerformance/10-error-tracking.md` | IV — rescoped to error capture, privacy and sampling; its RUM half duplicated chapter 07 and its alerting half duplicated `ShipAndOperate/Observability/03` |
| `02-state-management.md`, `03-rendering.md` | Absorbed by Part III at #39 and #40 | III |
| `00`, `06`, `07`, `10`, `11` | Stayed, renumbered `01`–`05` | VI |
