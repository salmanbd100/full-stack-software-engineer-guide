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
| `case-studies/` | six more, numbered `20`–`25` | **#31d** | Rate limiter and API gateway are owned by Part V and `BuildingBlocks/07`; typeahead is replaced by the frontend study at **#43**; notification system, Instagram and distributed cache each repeat a shape that the news feed or the caching chapter already teaches |
| `building-blocks/` | `SystemDesign/BuildingBlocks/` (2 of 11) | **#31d** | File storage and monitoring. `ShipAndOperate/Cloud/03-storage-and-delivery.md` and `ShipAndOperate/Observability/` own both, for the reader who operates the system |
| `microservices/` | `SystemDesign/Microservices/` (3 of 8 + README) | **#31d** | Deployment strategies and distributed tracing duplicate Part VIII. The directory itself was dissolved: architecture, communication and data management became `BuildingBlocks/08-service-boundaries.md`, resilience became `09-resilience.md`, the API gateway pattern became `07-api-gateway.md`, and service discovery folded into `01-load-balancing.md` |

`Infrastructure/` was also the most AWS-shaped material in Part VI. `BOOK-SPEC.md` § 6 puts deep cloud
coverage out of scope; `ShipAndOperate/Cloud/` carries the three condensed chapters that replace it.

Nothing from `Fundamentals/` or `Database/` is here, for the same reason `Scalability/` is not: **#31d**
merged those chapters rather than cutting them. Eight `Fundamentals/` chapters became six, ten `Database/`
chapters became four, and Part V now owns indexing, query optimisation and schema design at
implementation depth. Git history holds every original.

Not archived, because it was merged rather than cut: `SystemDesign/Scalability/`. Its eight chapters
were folded into `Fundamentals/02-scalability.md`, `BuildingBlocks/`, `Database/03-sharding.md` and the
canonical `BuildingBlocks/` chapters by #22 and #23. Git history holds the originals; nothing in them
is missing from the book.

## The archived case studies

Sixteen of the original twenty. **#28** archived ten — Twitter, Uber, WhatsApp, YouTube, Netflix,
Amazon, Google Search, Dropbox, a web crawler and a parking lot. **#31d** archived six more —
rate limiter, typeahead, notification system, Instagram, API gateway and distributed cache — because
Part VI's 6,500-line budget pays for four backend studies alongside the five frontend ones **#43**
adds. The four that stayed are the four distinct shapes: a key-value read path, fan-out, a stateful
edge, and contention.

Each of these is a complete, correct round in the RADIO format. Nothing here is wrong; there was
simply no room for a second fan-out design or a third media pipeline. Read them as extra rehearsal
if a backend-leaning round is likely.
