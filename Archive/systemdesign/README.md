# Archived from `SystemDesign/`

Part VI came into the plan at 21,903 lines against a 6,500-line budget, and most of the excess was
duplication rather than depth — load balancing documented in three places, caching in three, CDN in
three. Improvements **#22** and **#23** resolved that. What is here is what neither survived the merge
nor belonged in Part VI in the first place.

| Directory | From | Item | Why it is out |
| --------- | ---- | ---- | ------------- |
| `infrastructure/` | `SystemDesign/Infrastructure/` (8 chapters + README) | **#23** | Cloud primitives, containers, CI/CD, monitoring and disaster recovery — every one of them owned by Part VIII, and covered there for the reader who operates the system rather than the one designing it |

`Infrastructure/` was also the most AWS-shaped material in Part VI. `BOOK-SPEC.md` § 6 puts deep cloud
coverage out of scope; `ShipAndOperate/Cloud/` carries the three condensed chapters that replace it.

Not archived, because it was merged rather than cut: `SystemDesign/Scalability/`. Its eight chapters
were folded into `Fundamentals/02-scalability.md`, `BuildingBlocks/`, `Database/03-sharding.md` and the
canonical `BuildingBlocks/` chapters by #22 and #23. Git history holds the originals; nothing in them
is missing from the book.
