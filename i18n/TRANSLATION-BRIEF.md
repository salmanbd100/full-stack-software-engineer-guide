# Translation Brief — the Bangla Web Edition

The rules every page in `i18n/bn/` is translated by (decision #25, improvements #126–#129). A
session that translates pages reads this first. Change a rule here, not in a prompt, so the next
session uses it too.

## The workflow, per page

```bash
pnpm site:translate --list --only=part-3                 # what is missing or stale
pnpm -s site:translate --source=/book/part-3/hooks > en.md
# translate en.md into bn.md
pnpm site:translate --write=/book/part-3/hooks --from=bn.md
```

`--write` refuses a page that fails the validator, and prints why. Fix `bn.md` and run it again.
Never write into `i18n/bn/` by hand.

## The register

- **Natural, spoken-standard Bangla (চলিত ভাষা)**, the way a senior Bangladeshi engineer explains
  something to a colleague. Never সাধু ভাষা, never a word-for-word copy of English sentence order
- **Short sentences.** The English was written for second-language readers (BOOK-SPEC § 3). Keep
  that: one idea per sentence. Split a long Bangla sentence rather than joining two English ones
- **Address the reader as আপনি**, consistently
- Keep the author's tone: direct, a little dry, opinionated. Do not add politeness the English does
  not have, and do not soften a warning

## What stays in English

- **Technical terms a Bangladeshi engineer says in English at work**, written in Latin script:
  React, closure, hydration, cache, API, server, database, query, deploy, bundle, state, props,
  component, hook, thread, event loop, latency, throughput, token, prompt, interviewer, system design.
  Attach Bangla suffixes with a hyphen: `component-এর`, `cache-এ`, `API-টি`, `interviewer-রা`
- **Library, product and API names**, always: `useEffect`, Next.js, PostgreSQL, Vercel
- **Numbers and units** in Western digits: `200 ms`, `p99`, `HTTP 429`, `3x`, chapter `01`.
  Do not convert to ০–৯
- **The `**Q: ` marker** at the start of each interview question. The question after it is translated
- **Proper names** of people and companies

Translate everything else, including headings, table cells, link text and callout text. If a
term has an everyday Bangla word engineers actually use (সমস্যা, পদ্ধতি, প্রশ্ন, উত্তর), use it.
If the Bangla word is one nobody says at work (e.g. "প্রতিক্রিয়াশীলতা" for reactivity), keep the
English.

## What must not change

The validator enforces these, and a page that breaks one is not written:

- **`<!-- fence N -->` lines** — leave each one exactly as it is, on its own line, in its place.
  They are the code blocks, put back from the English after translation
- **Inline code** — everything between backticks, byte for byte. `` `useState` `` stays
  `` `useState` ``, even when it reads like a word. Do not add backticks the English does not
  have, either: the validator counts them
- **Link targets** — `(#ch-…)`, `(/book/…)`, `https://…`. Translate the link *text* only
- **Headings** — the same number of `##` and `###` headings. Translate the words, keep the level
- **Emoji callouts** — 💡 🔑 ⚠️ ✅ ❌ stay where they are, in the same shape (`## 💡 …`, `> ⚠️ …`)
- **Table shape** — the same columns and rows. Cell widths do not need to line up

## Titles and cross-references

Every page's Bangla title is in `i18n/titles.bn.json`, decided once for the whole book. `--write`
takes the title from there, and rewrites every cross-reference that names its target —
`[Chapter ?? — Title](#ch-slug)`, or a bare `[Title](#ch-slug)` in an index table — to that title.
So translate link text freely; it is corrected on the way in. Use the mapped title in the page's
own `#` heading too. To change a title, edit the map and run `pnpm site:translate --normalise`.

Keep the `Chapter ?? — ` prefix in English: `build-site.ts` strips exactly that string.

## Standard headings and labels

The same sections recur in every chapter. Always translate them this way:

| English | Bangla |
| ------- | ------ |
| `## 💡 The Core Idea` | `## 💡 মূল ধারণা` |
| `## How It Works` | `## কীভাবে কাজ করে` |
| `## When to Use It` | `## কখন ব্যবহার করবেন` |
| `## Common Mistakes` | `## সাধারণ ভুল` |
| `## 🔑 Key Takeaways` | `## 🔑 মূল শিক্ষা` |
| `## Interview Questions` | `## Interview-এর প্রশ্ন` |
| `## What to Read Next` | `## এরপর কী পড়বেন` |
| `## What Interviewers Probe For` | `## Interviewer-রা যা যাচাই করেন` |
| `## Chapters` | `## অধ্যায়গুলো` |
| `## Reading Order` | `## পড়ার ক্রম` |
| `**In this chapter:**` | `**এই অধ্যায়ে:**` |
| `> ⚠️ **Moving target:**` | `> ⚠️ **যা বদলাতে থাকে:**` |
| `Durable principle` | `টেকসই নীতি` |
| `Reach for` (table column) | `কী ব্যবহার করবেন` |
| `frontend-heavy` | `frontend-heavy` — stays English, the book's own subtitle term |
| `boundary` (Server Component, error, service) | `boundary` — stays English |
| `**Interview sprint:**` | `**Interview sprint:**` — stays English, a named route through the book |

Heading anchors such as `{#ch-closures}` stay exactly as they are. So do HTML comments such as
`<!-- lint-allow-fence: … -->`.

## Reference pages

Two pages set the house style. When in doubt, match them:

- `i18n/bn/book/part-1/closures.md` — a full chapter, with every standard section
- `i18n/bn/book/part-8/ship-observability-index.md` — a section index
