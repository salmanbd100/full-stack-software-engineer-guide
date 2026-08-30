# Archived from `SystemDesign/`

Part VI came into the plan at 21,903 lines against a 6,500-line budget, and most of the excess was
duplication rather than depth — load balancing documented in three places, caching in three, CDN in
three. Improvements **#22**, **#23**, **#24** and **#28** resolved that. What is here is what neither
survived the merge nor belonged in Part VI in the first place.

| Directory | From | Item | Why it is out |
| --------- | ---- | ---- | ------------- |
| `infrastructure/` | `SystemDesign/Infrastructure/` (8 chapters + README) | **#23** | Cloud primitives, containers, CI/CD, monitoring and disaster recovery — every one of them owned by Part VIII, and covered there for the reader who operates the system rather than the one designing it |
| `security/` | `SystemDesign/Security/` (6 chapters + README) | **#24** | The unique material — authorisation, encryption at rest, SSRF, MFA and SSO — moved into `Backend/Security/` first. What is here is what that spine already said |
| `case-studies/` | `SystemDesign/InterviewQuestions/` (10 of 20 chapters) | **#28** | Backend-heavy variations on patterns the surviving ten already teach. The parking lot is an object modelling exercise, not a system design one |

`Infrastructure/` was also the most AWS-shaped material in Part VI. `BOOK-SPEC.md` § 6 puts deep cloud
coverage out of scope; `ShipAndOperate/Cloud/` carries the three condensed chapters that replace it.

Not archived, because it was merged rather than cut: `SystemDesign/Scalability/`. Its eight chapters
were folded into `Fundamentals/02-scalability.md`, `BuildingBlocks/`, `Database/03-sharding.md` and the
canonical `BuildingBlocks/` chapters by #22 and #23. Git history holds the originals; nothing in them
is missing from the book.

## The ten case studies

Twitter, Uber, WhatsApp, YouTube, Netflix, Amazon, Google Search, Dropbox, a web crawler and a
parking lot. The book is **frontend-heavy**, and twenty backend-shaped case studies was the wrong
balance for it — improvement #43 adds five frontend studies to the ten that stayed.

Each of these is a complete, correct round in the RADIO format. Nothing here is wrong; there was
simply no room for a second fan-out design or a third media pipeline. Read them as extra rehearsal
if a backend-leaning round is likely.
