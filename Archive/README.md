# Archive

> **Nothing in this directory is in the book. Nothing in this directory has been deleted.**

This is where content goes when it is genuinely useful but out of scope for
**The Senior Full Stack Handbook**. It stays in the repository, stays in git history, and stays
searchable. It is simply invisible to the book build.

Created by improvement #7. Filled by improvements #8 and #20–#31c.

`dsa-solutions/` is the one sub-tree whose originals were **replaced rather than removed** — each
archived file has a trimmed successor at the same name under `DSA/`.

---

## Why this exists rather than `git rm`

The book has a line budget — roughly 55,000 lines against the repository's current ~134,000
(see [BOOK-SPEC.md § 5](../BOOK-SPEC.md)). Getting there means saying no to about 79,000 lines of
work that was correct when it was written and is still correct now. It is the wrong material for
*this* book, which is not the same as being wrong.

Deleting it would mean:

- losing reference material that is still useful day to day
- making the "should this be in the book?" decision unrecoverable
- pretending the decision was obvious, when most of these were judgement calls

Moving it costs nothing and keeps every one of those doors open. If a DevOps volume ever gets
written, its source material is right here.

## What lands here

The full list with reasons is [BOOK-SPEC.md § 6](../BOOK-SPEC.md). In short:

| Category | Examples | Why it is out |
| -------- | -------- | ------------- |
| **Platform engineering** | Terraform and IaC, Linux administration, Kubernetes operations | A different career, not this reader's job |
| **Non-TypeScript automation** | Python and shell scripting | The book is TypeScript-only; scripting breaks that rule |
| **Deep cloud coverage** | Most of `AWS/`, cost optimisation | Three condensed chapters, not sixteen. Clouds differ; principles do not |
| **Adjacent professions** | Model training and fine-tuning, FinOps | Part VII builds *with* models; training is someone else's job |
| **Out-of-platform** | Mobile and React Native, Vue and Angular | Web platform only, three frameworks maximum |
| **Ages badly** | Company-by-company interview guides | Stale within a quarter |
| **Personal material** | English-language coaching, marketing assets, planning documents | Useful to one person, not to a reader who paid for a book |

## Layout

Sub-directories mirror where the content came from, so a file's origin stays obvious:

```text
Archive/
├── README.md            ← this file
├── planning/            ← #8:  superseded plans and marketing assets
├── salvage/             ← staged for a later part, not out of scope — see salvage/README.md
│   └── ai/                  2 files inbound to Part VII at #45 and #49
├── foundations/         ← #26: what Part I shed when OOP/ and DesignPatterns/ merged
│   ├── oop/                 all 7 + README — condensed into two chapters
│   └── patterns/            3 of 5 — the GoF catalogue, condensed into one chapter
├── backend/             ← #31c: the 15 files Part V shed reaching its 6,500-line budget
│   ├── api/                 1 of 6 — documentation, merged into API/03 (versioning and contracts)
│   ├── nodejs/              3 of 9 — security folded into Backend/Security/; child processes and
│   │                            clustering merged into NodeJS/06 (scaling a Node process)
│   ├── nosql/               2 of 7 — indexing merged into NoSQL/03; Mongoose folded into 01 and 02
│   ├── security/            2 of 9 — SQL injection merged into Security/06; encryption cut on scope
│   ├── sql/                 3 of 9 — PostgreSQL, migrations and optimisation distributed across
│   │                            SQL/02–05, which now carry them by concept rather than by tool
│   └── testing/             4 of 7 — E2E, TDD, mocking and best practices; Part IV owns the
│                                discipline, Part V keeps only what is backend-specific
├── dsa-solutions/       ← #27: the full solution sets, 4 of 16 so far — see its README
├── communication/       ← #29: 2 of 8 + README — the STAR duplicate and the ESL practice
├── systemdesign/        ← #23–24, #28: what Part VI shed to Parts V and VIII, and to balance
│   ├── infrastructure/      all 8 + README — cloud, containers, CI/CD, monitoring, DR
│   ├── security/            all 6 + README — #24; authz, encryption, SSRF, MFA and SSO
│   │                            moved into Backend/Security/ first
│   └── case-studies/        10 of 20 — #28; the backend-heaviest, CaseStudies/ keeps 10
└── devops/              ← #20: the 98 files DevOps/ shed, plus genai/ (#21) and agile/ (#25)
    ├── README.md            the old 1,378-line DevOps curriculum index
    ├── agile/               all 8 + README — #25; two Part IX chapters were written from it first
    ├── aws/                 11 of 15 — Cloud/ keeps fundamentals, serverless, storage, CDN
    ├── cicd/                3 of 8 — the vendor-specific pipelines
    ├── cost-optimization/   all 7 — FinOps is its own field
    ├── devsecops/           all 11 — the unique parts are in ShipAndOperate/CICD/04
    ├── docker/              4 of 9 — Containers/ keeps 5
    ├── genai/               6 of 8 + README — #21; the other 2 are staged under salvage/ai/
    ├── iac/                 all 3
    ├── kubernetes/          9 of 11 — Containers/ keeps architecture and pods
    ├── linux/               all 9
    ├── monitoring/          4 of 8 — Observability/ keeps 4
    ├── networking/          all 9
    ├── scripting/           all 7 — Python and bash break the TypeScript-only rule
    ├── security/            all 9 — #24 decided: nothing returns; Backend/Security/ covers it
    └── terraform/           all 11
```

**`DevOps/` no longer exists.** #20 took 98 of its files here and renamed the rest `ShipAndOperate/`;
#21 took `GenAI/`, staging the two chapters Part VII wants under `salvage/ai/`; and #25 took `Agile/`,
the last directory standing, after writing two Part IX chapters from it.

Directories appear as the items that fill them run. An empty one is not missing — it is not due yet.

`salvage/` is the one sub-tree that is **not** out of scope. It holds material waiting for a part that has
not been written, and each file there names the item that will absorb it. Read
[`salvage/README.md`](./salvage/README.md) before adding to it — anything without a named destination is
archived, not staged.

## How the exclusion actually works

One list, in one place: `EXCLUDED_DIRS` in [`scripts/lib/book.ts`](../scripts/lib/book.ts).

Both the build and the lint import it, so they cannot disagree about whether this directory counts.
That means archived content is skipped by:

| Tool | Effect |
| ---- | ------ |
| `pnpm book:build` | Never collected into `build/book.md`, so it reaches neither the PDF nor the EPUB |
| `pnpm lint:docs` | Not linted — archived files keep whatever style they had and never fail CI |
| `scripts/add-frontmatter.ts` (#3) | No front matter stamped; these are not chapters |

**Do not add a second exclusion list.** If a new script walks the manuscript, it imports
`scripts/lib/book.ts` like the other two.

## Moving something here

1. `git mv` it — never copy, never delete, so history follows the file
2. Put it under the sub-directory matching where it came from
3. Re-run `pnpm lint:docs`. The counts should **fall**; commit `.lint-baseline.json` with the new,
   lower numbers so the gate ratchets down
4. Fix any link that pointed at it. A chapter that cross-references archived content is a broken
   promise to the reader, and `lint:docs` will catch it as a broken link

## Moving something back

Reverse the `git mv`, then bring the file up to the Book Chapter Standard — front matter, the six
blocks, TypeScript-only fences. Archived files predate the standard and none of them will pass
`lint:docs` as they are. Start from
[`.claude/skills/write-topic-docs/CHAPTER-TEMPLATE.md`](../.claude/skills/write-topic-docs/CHAPTER-TEMPLATE.md)
and use [`REFERENCE-CHAPTER.md`](../REFERENCE-CHAPTER.md) as the worked example.
