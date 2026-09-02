# Staged for Part III — `Frontend/ModernStack/`

Two chapters lifted out of `SystemDesign/Frontend/` by improvement **#31d**, ahead of the move that
**#42** already schedules. Both describe framework-agnostic concerns that Part III owns, and both are
about to be replaced by six chapters each rather than moved as they are.

| File | Absorbed by | Into | What is worth keeping |
| ---- | ----------- | ---- | --------------------- |
| `rendering.md` | **#39** | `Frontend/ModernStack/Rendering/` | The SSG / ISR / SSR / CSR decision table and the per-route framing. The streaming and PPR material has to be written fresh |
| `state-management.md` | **#40** | `Frontend/ModernStack/StateManagement/` | The server-state versus client-state split, which is the distinction the whole section is built on |

Taking them out early was a budget decision: Part VI had to reach 6,500 lines, and 412 lines of Part III
material sitting inside Part VI was the least damaging 412 lines to move. Nothing in the book links to
either anchor.

Both keep their old Part VI front matter with `in_book: false`. Do not fix that in place — the new
chapters get fresh front matter, and these files are deleted once absorbed. See
[`../README.md`](../README.md) for the absorb procedure.
