# Staged for Part III — `Frontend/ModernStack/` — ✅ empty

Two chapters were lifted out of `SystemDesign/Frontend/` by improvement **#31d**, ahead of the move that
**#42** already schedules. Both described framework-agnostic concerns that Part III owns, and both have
now been replaced by six chapters each rather than moved as they were.

| File | Absorbed by | Into | Status |
| ---- | ----------- | ---- | ------ |
| `rendering.md` | **#39** | `Frontend/ModernStack/Rendering/` | ✅ Absorbed and deleted, 2026-09-07. Its decision matrix became chapter 04's route inventory; the CSR/SSR/SSG/ISR comparison became chapter 01 |
| `state-management.md` | **#40** | `Frontend/ModernStack/StateManagement/` | ✅ Absorbed and deleted, 2026-09-07. Its server-state versus client-state split became chapter 01's four-category framing; Context, Zustand and Redux Toolkit became chapter 03 |

Taking them out early was a budget decision: Part VI had to reach 6,500 lines, and 412 lines of Part III
material sitting inside Part VI was the least damaging 412 lines to move. Nothing in the book linked to
either anchor.

**This directory now holds only this file.** It is kept as the record of where those 412 lines went;
#42 may delete it once the rest of `SystemDesign/Frontend/` has moved.
