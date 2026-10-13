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

## Write Bangla, not translated English

The owner's verdict on the first full pass (#128, 2026-10-13): **it reads robotic.** A reader should
feel they are reading a book written in Bangla. Translate the meaning of each paragraph, then write
it the way you would explain it out loud. These are the habits that gave the first pass away:

| Translationese | Write instead | Why |
| -------------- | ------------- | --- |
| `একটি` before every noun, copying "a/an" | Drop it, or use `একটা` / `-টা` / `-টি` only where Bangla needs a count | Bangla has no article. `একটি closure প্রশ্ন` is English grammar |
| English sentence order: `TDZ সেটাকে একটি stack trace-এ পরিণত করে` | Rebuild the sentence: `TDZ থাকলে সেখানেই error হয়, আর stack trace দোষী line-টা দেখিয়ে দেয়` | Bangla puts the verb last and prefers cause → effect |
| Stiff verbs: `পরিণত করে`, `গণ্য হয়`, `নির্ধারণ করে`, `প্রদান করে`, `সম্পন্ন হয়` | `হয়ে যায়`, `ধরা হয়`, `ঠিক হয়`, `দেয়`, `শেষ হয়` | Nobody talks like a government notice |
| `সে` for an engine, browser or function | Repeat the noun, or restructure | `সে` is for people; it sounds like a literal "it" |
| English verb + `করা` where Bangla has a verb: `Read করলে` | `পড়তে গেলে` | Keep English for terms, not for everyday verbs |
| One English sentence → one Bangla sentence, always | Merge or split freely; add `মানে`, `তাই`, `কারণ`, `ফলে`, `আসলে`, `তবু` | Connectives are what make Bangla prose flow |
| Abstract nouns: `পার্থক্য দুই জায়গায়: …` stays fine; `ব্যবহারের ক্ষেত্রে`, `এর মাধ্যমে` piled up | Say it with a verb: `ব্যবহার করলে`, `দিয়ে` | Noun stacks are the main source of the robotic feel |
| `কখনো নয়` / `উল্টোটা কখনো নয়` copied from "never the reverse" | Say the whole thought: `কিন্তু বাইরের code ভেতরেরটা দেখতে পায় না` | Elliptical English does not survive translation |

**Test before `--write`:** read the page aloud in your head. If a sentence only makes sense once you
picture the English behind it, rewrite it.

**`-টা` and `-টি`:** prefer `-টা` and `একটা` in explanation, the way people speak. `-টি` is fine in
headings and tables. Do not mix both on the same noun in one paragraph.

**Inline code and natural Bangla:** the validator counts backtick spans, so mention an identifier in
backticks exactly as often as the English does. A repeat mention that the English leaves out can be
written plainly (`i-এর reference`), which also reads better.

**Reference page:** `i18n/bn/book/part-1/closures.md` was re-translated to this standard on
2026-10-13. Match it.

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
| `## Problems to Practise` | `## অনুশীলনের জন্য Problem` |
| `Difficulty` (table column) | `কঠিনতা`; Easy / Medium / Hard and LeetCode problem names stay English |
| `## Reference Tables` | `## Reference Table` |
| `**In this chapter:**` | `**এই অধ্যায়ে:**` |
| `> ⚠️ **Moving target:**` | `> ⚠️ **যা বদলাতে থাকে:**` |
| `Durable principle` | `টেকসই নীতি` |
| `Reach for` (table column) | `কী ব্যবহার করবেন` |
| `frontend-heavy` | `frontend-heavy` — stays English, the book's own subtitle term |
| `boundary` (Server Component, error, service) | `boundary` — stays English |
| `hot` / `cold` (key, path, cache, start) | `hot` / `cold` — stay English: `hot key`, `cold start` |
| `warm` / `warm up` (cache, chunk, instance) | `warm` / `warm up` — stay English, like hot and cold: `chunk warm করে রাখুন`. Not গরম |
| `**Interview sprint:**` | `**Interview sprint:**` — stays English, a named route through the book |

Heading anchors such as `{#ch-closures}` stay exactly as they are. So do HTML comments such as
`<!-- lint-allow-fence: … -->`.

## Reference pages

Two pages set the house style. When in doubt, match them:

- `i18n/bn/book/part-1/closures.md` — a full chapter, with every standard section (re-translated to the natural standard, 2026-10-13)
- `i18n/bn/book/part-8/ship-observability-index.md` — a section index
