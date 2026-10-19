---
title: "How This Book Is Built"
description: "How one repository of markdown becomes a PDF, an EPUB and this website in English and Bangla — and how the website reaches www.salmanrahman.com/handbook."
outline: [2, 3]
---

# How This Book Is Built

> One repository of markdown files becomes a print-ready PDF, a valid EPUB and this website, in English and Bangla. This page shows how, step by step, so you can build it yourself.

This page is for developers. It exists only on the web — the build skips the `site/` folder, so it is never bound into the PDF or the EPUB.

The source is public: [github.com/salmanbd100/full-stack-software-engineer-guide](https://github.com/salmanbd100/full-stack-software-engineer-guide).

## The Big Picture

Every chapter is a markdown file. One TypeScript module reads them all and decides what counts as the book. Three builds use that one module, so the PDF, the EPUB and the website can never disagree about what is in the book.

```mermaid
flowchart TD
    MD["Chapters as markdown<br/>Frontend/ Backend/ AI/ DSA/ …"] --> LB["scripts/lib/book.ts<br/>loadBook()"]
    LB --> CC["collect-chapters.ts<br/>build/book.md"]
    LB --> BS["build-site.ts<br/>site/book/** + site/bn/book/**"]
    BN["i18n/bn/<br/>Bangla cache"] --> BS
    CC --> PD["pandoc + Lua filters"]
    PD --> TX["tectonic (LaTeX)"]
    TX --> PDF["PDF"]
    PD --> EPUB["EPUB"]
    BS --> VP["VitePress"]
    VP --> WEB["This website"]
```

**One source, three outputs. Only `loadBook()` decides what a chapter is.**

| Output | Command | Lands in | Tools it needs |
| ------ | ------- | -------- | -------------- |
| PDF, both volumes | `pnpm book:pdf`, `pnpm book:companion` | `build/*.pdf` | pandoc, tectonic, mermaid-cli |
| EPUB, both volumes | `pnpm book:epub`, `pnpm book:companion` | `build/*.epub` | pandoc, mermaid-cli, epubcheck (optional) |
| Website, English and Bangla | `pnpm site:build` | `site/.vitepress/dist` | Node and pnpm only |

## Build It Yourself

### 1. Install the tools

You need **Node 22.6 or later** and **pnpm 9**. The scripts are TypeScript, and Node runs them directly with `--experimental-strip-types`, so there is no compile step.

**Clone and install:**

```bash
git clone https://github.com/salmanbd100/full-stack-software-engineer-guide.git
cd full-stack-software-engineer-guide
pnpm install
```

That is enough for the website. The PDF and EPUB need four more tools (macOS shown):

**Print toolchain:**

```bash
brew install pandoc tectonic poppler epubcheck
pnpm add -g @mermaid-js/mermaid-cli
```

| Tool | What it does here |
| ---- | ----------------- |
| **pandoc** | Reads the markdown and writes LaTeX (for the PDF) or XHTML (for the EPUB) |
| **tectonic** | A self-contained LaTeX engine. It downloads the packages it needs on the first run |
| **mermaid-cli** (`mmdc`) | Turns every ` ```mermaid ` fence into a vector PDF or an SVG. It brings a headless Chromium, which is why it is a global install and not a dependency |
| **poppler** | `pdftoppm` turns the cover into PNGs; `pdftotext` lets the build check every page reference |
| **epubcheck** | Validates the EPUB. Optional — without it the build says "not validated" and carries on |

### 2. Check the design in seconds

```bash
pnpm book:specimen
```

This typesets `scripts/specimen.md` alone — ten pages that use every part of the print design. Run it after any change to the design. The full book takes minutes; the specimen takes seconds.

### 3. Build the covers, then the books

```bash
pnpm book:cover      # build/cover.png and build/cover-book-2.png
pnpm book:build      # Book 1: PDF + EPUB
pnpm book:companion  # Book 2: DSA Patterns, PDF + EPUB
```

The EPUB needs the cover PNG, so the build stops and tells you if `book:cover` has not run. The first build is slow because every diagram goes through Chromium. Diagrams are cached by content hash in `build/diagrams/`, so the next build skips them.

The end of each build prints three checks. **Read them — silence is the failure mode:**

- characters the fonts cannot draw (should be zero)
- cross-references printed as `(p. ??)` (should be zero)
- the epubcheck result

### 4. Run the website

```bash
pnpm site:dev        # live preview at http://localhost:5173/handbook/
pnpm site:build      # static build into site/.vitepress/dist
vercel dev           # the same site plus the api/ folder, for the progress tracker
```

`vercel dev` needs the Vercel CLI (`pnpm add -g vercel`), the project linked once with `vercel link`, and its environment variables pulled with `vercel env pull .env.local`.

## How a Chapter Is Written

Each chapter is a markdown file with YAML front matter. The front matter is what places it in the book:

```yaml
---
title: Closures
part: 1
chapter: 3
slug: closures
in_book: true
---
```

| Field | Used for |
| ----- | -------- |
| `part`, `chapter` | Reading order. `pnpm number:chapters` stamps `chapter` from the section order in `scripts/lib/book.ts` |
| `slug` | The chapter's identity. Cross-references point at it, and the website uses it as the URL |
| `in_book: false` | Keeps a file in the repository but out of every build |

**Cross-references never use file paths.** A link to another chapter is written as `[Chapter ?? — Closures](#ch-closures)`, and each H1 carries `{#ch-closures}`. A file path would break in the PDF and the EPUB. A slug can be resolved by each build in its own way:

| Build | `[Chapter ?? — Closures](#ch-closures)` becomes |
| ----- | ------------------------------------------------ |
| PDF | "Chapter 3 — Closures (p. N)", with the real page number |
| EPUB | "Chapter 3 — Closures", as a working link |
| Website | "Closures", linking to `/handbook/book/part-1/closures` |

## The PDF and EPUB, Step by Step

### Step 1 — Collect

`scripts/collect-chapters.ts` asks `loadBook()` for every file, in order. It skips `Archive/`, `scripts/`, `site/` and the other folders in `EXCLUDED_DIRS`, and every file marked `in_book: false`. Then it writes one long file, `build/book.md`. On the way it:

- removes each chapter's front matter, so no chapter can claim the book's title
- moves every heading down one level (`#` becomes `##`), leaving level 1 free for the part pages it adds
- marks the headings in the front and back matter as unnumbered, so the contents stays short

`--volume=companion` does the same for Book 2 and writes `build/companion.md`.

### Step 2 — Pandoc and the Lua filters

`scripts/build-book.sh` runs pandoc over `build/book.md`. All the PDF settings live in one data file, `scripts/book-pdf.yaml`: the engine, the header, the filters, the highlight style and the LaTeX class options. The book metadata — title, author, the fixed EPUB identifier — is in `scripts/book-meta.yaml`.

The Lua filters turn the chapter format into the design, so **a chapter never has to change to suit the design**:

| Filter | Reads | Writes |
| ------ | ----- | ------ |
| `xref.lua` | `#ch-slug` links | "Chapter N — Title (p. P)" in print, a working link in the EPUB |
| `callout-shapes.lua` | `## 💡`, `## 🔑`, `> ⚠️`, bold code labels | Nothing — it only *names* the shapes, so both formats agree what a callout is |
| `callouts.lua` | Those shapes, and every table | The LaTeX boxes from `scripts/tex/blocks.tex` (PDF only) |
| `epub-blocks.lua` | The same shapes | HTML with class names, styled by `scripts/epub.css` (EPUB only) |
| `mermaid.lua` | ` ```mermaid ` fences | A vector PDF for print, an SVG for the EPUB |

> ⚠️ **The order is load-bearing.** `xref.lua` must run first, because `callouts.lua` turns tables into raw LaTeX and links inside them would then be invisible. `mermaid.lua` must run last, because the callout filters need to see a diagram still as a code block. The build also has to run from the repository root, since every path in `book-pdf.yaml` is relative to the working directory.

### Step 3 — The print design

The design is five LaTeX files in `scripts/tex/`. `tokens.tex` holds every value you can tune — trim size, margins, type sizes, colours. The other four only read it:

| File | Holds |
| ---- | ----- |
| `tokens.tex` | Every number and colour. The only file you edit to recalibrate |
| `typography.tex` | Fonts (Source Serif 4, Source Sans 3, Source Code Pro, from `assets/fonts/`) |
| `structure.tex` | Page geometry, part and chapter openings, running heads |
| `blocks.tex` | Callout boxes, code blocks, tables |
| `glyphs.tex` | Fallbacks for characters the main fonts lack |

Tectonic typesets the result into an A4 PDF. The covers are separate LaTeX files (`scripts/cover.tex`, `scripts/cover-book-2.tex`), which `pnpm book:cover` builds and then turns into 1600 × 2560 PNGs.

### Step 4 — The EPUB

The EPUB uses the same collected file and the same classifier. Instead of LaTeX boxes, it gets `epub.css`, ten embedded font files, SVG diagrams and one XHTML file per chapter. epubcheck then validates it.

## The Website, Step by Step

`scripts/build-site.ts` is the website's version of the collector:

1. It calls the same `loadBook()`.
2. It writes each page to `site/book/<route>.md`. Front and back matter go under `front/` and `back/`, and chapters under `part-N/<slug>`.
3. It rewrites every `#ch-slug` link into a site route.
4. It writes every page a second time under `site/bn/book/`, from the Bangla cache in `i18n/bn/` (see below).
5. It writes `site/.vitepress/sidebar.json`, grouped by part, with an English and a Bangla sidebar.
6. It checks the hand-written pages (this one, both home pages and the config). The build fails if any of them states a count of chapters or interview questions that no longer matches the manuscript.

The generated files are in `.gitignore`. Only the two home pages (`site/index.md` and `site/bn/index.md`), this page, `site/.vitepress/config.ts` and the theme in `site/.vitepress/theme/` are written by hand. The theme widens the text column, raises the type size, adds the EN/BN switch beside the dark-mode toggle and adds the reading-progress tracker — web only, the print design never sees it.

VitePress then builds the static site. Four settings in `config.ts` matter:

**`site/.vitepress/config.ts` (excerpt):**

```typescript
export default withMermaid(
  defineConfig({
    base: "/handbook/", // every URL, asset and sidebar link gets this prefix
    cleanUrls: true, // /book/part-1/closures, not closures.html
    ignoreDeadLinks: false, // a broken link fails the build
    locales: {
      root: { label: "English", lang: "en-GB" },
      bn: { label: "বাংলা", lang: "bn-BD", link: "/bn/" }, // the Bangla edition
    },
  }),
);
```

`withMermaid` comes from `vitepress-plugin-mermaid`. It draws the diagrams in the browser, so the website needs no Chromium at build time.

## The Bangla Edition

Every page of the website also exists in Bangla, at `/handbook/bn/`. The EN/BN switch in the nav bar opens the same page in the other language.

The Bangla is machine-translated. Claude translates each page in a Claude Code session, and the result is reviewed against a translation brief, `i18n/TRANSLATION-BRIEF.md`. No script calls a model, and no API key is needed anywhere. The translations are committed to `i18n/bn/`, which works as a cache:

| Step | Command | What happens |
| ---- | ------- | ------------ |
| Find the work | `pnpm site:translate --list` | Lists every page that is missing or stale |
| Get the English | `pnpm site:translate --source=<route>` | Prints the page with its code fences masked, so a translator cannot change code |
| Store the Bangla | `pnpm site:translate --write=<route> --from=bn.md` | Puts the fences back, validates the page and writes it to `i18n/bn/`. A page that fails validation is refused |
| Check it | `pnpm site:translate --check` | Fails if any cached page is stale or invalid |

Each cached page records a SHA-256 hash of the English it came from. Edit a chapter and the hash no longer matches, so only that page goes stale. A stale or missing page is never a 404: the Bangla site shows the English with a short notice until the page is translated again.

The validator checks that code, inline code, link targets, Mermaid source and the `**Q: **` markers come back byte for byte. Chapter titles never come from the translator. They come from `i18n/titles.bn.json`, so the sidebar and every cross-reference agree on what a chapter is called. The rules for the Bangla itself — natural spoken Bangla, short sentences, technical terms kept in English — are in `i18n/TRANSLATION-BRIEF.md`.

Bangla text is set in Noto Sans Bengali from Google Fonts, with more line height than English, because Bengali vowel signs stack above and below the line.

The Bangla edition is web only. The PDF and the EPUB stay English, because both are built from the manuscript and never read `i18n/bn/`.

## Tracking Reading Progress

A reader can tick each chapter in the sidebar once they have read it. The nav bar shows the share of the book that is ticked, as a bar and a percentage. Nothing shows until the reader gives a name and an email.

| Piece | File | Job |
| ----- | ---- | --- |
| The store | `site/.vitepress/theme/progress.ts` | The profile, the ticked slugs and the percentage, shared by everything below |
| The checkboxes | `site/.vitepress/theme/ProgressSidebarItem.vue` | A copy of VitePress's sidebar item with a checkbox added. `config.ts` swaps it in with a Vite alias |
| The bar | `site/.vitepress/theme/ReadingProgress.vue` | "Track progress" when signed out, the bar when signed in |
| The form | `site/.vitepress/theme/SignInDialog.vue` | Name and email, and a line saying both are stored |
| The API | `api/progress.ts` | A Vercel function that reads and writes Upstash Redis |

The record is keyed by email, so it follows the reader to another device. There is no email check: anyone who types an address sees its ticks. That is fine for a reading list, and it keeps sign-in to one form. A tick is stored without the `/bn` prefix, so the English and Bangla editions share one record.

> ⚠️ The sidebar item is a VitePress internal. On every VitePress upgrade, compare `ProgressSidebarItem.vue` with VitePress's own `VPSidebarItem.vue` and carry the changes over.

The API is served at `/handbook/api/progress`, through the same rewrites as every page. It needs the Upstash Redis integration on the Vercel project, which sets the `KV_REST_API_URL` and `KV_REST_API_TOKEN` variables. To see who has signed up, run `SMEMBERS readers` in the Upstash console. Plain `pnpm site:dev` serves no `api/` folder, so the checkboxes save nothing there. Use `vercel dev` to try the whole flow locally.

## Connecting the Book to www.salmanrahman.com

The portfolio at www.salmanrahman.com is a separate Next.js app, in a separate repository (`salman-portfolio`). The book is not copied into it. Instead, there are **two Vercel projects, joined by one rewrite**.

```mermaid
sequenceDiagram
    participant R as Reader
    participant P as salmanrahman.com (Next.js)
    participant H as Handbook project (VitePress)
    R->>P: GET /handbook/book/part-1/closures
    P->>H: rewrite (proxied, URL unchanged)
    H-->>P: closures.html
    P-->>R: page, still on salmanrahman.com
```

**The reader never leaves salmanrahman.com. The portfolio only forwards the request.**

This split is what makes updates automatic. Pushing to the book repository rebuilds only the handbook project. The portfolio does not need to know the book changed.

### 1. Deploy the book as its own Vercel project

`vercel.json` at the root of the book repository tells Vercel how to build it:

**`vercel.json` (excerpt):**

```json
{
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "pnpm site:build",
  "outputDirectory": "site/.vitepress/dist",
  "cleanUrls": true,
  "trailingSlash": false,
  "rewrites": [
    { "source": "/handbook", "destination": "/" },
    { "source": "/handbook/:path*", "destination": "/:path*" }
  ]
}
```

VitePress writes files to the root of `dist/`, but the pages ask for everything under `/handbook/`. The two rewrites strip that prefix, so the project works both on its own `*.vercel.app` address and behind the portfolio. `trailingSlash: false` makes `/handbook/` redirect to `/handbook` — without it, Vercel answers `/handbook/` with a 404. For the same reason the portfolio never forwards a trailing slash: the redirect would send the reader to the `*.vercel.app` host.

**Set-up, once:**

1. In Vercel, choose **Add New → Project** and import `salmanbd100/full-stack-software-engineer-guide`.
2. Leave the build settings alone — `vercel.json` sets them. Set the production branch to `main`.
3. Deploy. Note the production address, for example `https://senior-full-stack-handbook.vercel.app`.

> ⚠️ If Vercel says it **cannot connect the repository**, the Vercel GitHub app has not been given access to it. Open GitHub → Settings → Applications → Vercel → Configure, add the repository, then connect it under the project's **Settings → Git**. Until then, `vercel deploy --prod` from the repository root deploys by hand.

### 2. Point the portfolio at it

In the portfolio, `lib/site.ts` names the address, and `next.config.ts` adds the rewrite:

**`lib/site.ts`:**

```typescript
export const HANDBOOK = {
  path: "/handbook",
  origin: process.env.HANDBOOK_ORIGIN ?? "https://senior-full-stack-handbook.vercel.app",
} as const;
```

**`next.config.ts`:**

```typescript
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: HANDBOOK.path, destination: `${HANDBOOK.origin}${HANDBOOK.path}` },
      {
        source: `${HANDBOOK.path}/:path*`,
        destination: `${HANDBOOK.origin}${HANDBOOK.path}/:path*`,
      },
    ];
  },
};
```

Two details matter:

- **Links to the handbook are a plain `<a>`, not `next/link`.** The handbook is a different app, so the Next.js client router cannot render it. The portfolio's navigation uses a full page load for anything under `/handbook`.
- **`robots.txt` lists both sitemaps** — the portfolio's own and `/handbook/sitemap.xml`, which VitePress writes.

### 3. What happens on every change

```mermaid
flowchart LR
    E["Edit a chapter"] --> G["git push to main"]
    G --> CI["GitHub Actions<br/>lint, tests, site build"]
    G --> V["Vercel builds<br/>pnpm site:build"]
    V -->|passes| L["Live on salmanrahman.com/handbook"]
    V -->|fails| K["Last good version stays live"]
```

**A push is the trigger. A failed build never replaces a working site.**

- **GitHub Actions** (`.github/workflows/lint-docs.yml`) runs the chapter lint, the chapter-numbering check, the index check, the code-sample compiler, the full site build, the version and stale-term checks, the plan check, the tests and the collector on every push and pull request. A broken link fails the pull request.
- **Vercel** builds every push. A pull request gets its own preview URL; `main` goes to production. It deploys `api/progress.ts` with the site, as a function.
- **The Bangla cache is not rebuilt.** A chapter edit makes its Bangla page stale until someone translates it again and commits `i18n/bn/`.
- **The PDF and EPUB are not built in CI or on Vercel.** They need the LaTeX toolchain, so you build them locally with `pnpm book:build`.

### 4. Test the connection locally

Run both apps and point the portfolio at your local book:

```bash
# in the book repository
pnpm site:build && pnpm exec vitepress preview site --port 4173

# in the portfolio repository
HANDBOOK_ORIGIN=http://localhost:4173 pnpm dev
```

Then open `http://localhost:3000/handbook`.

## The Checks That Keep It Honest

| Command | Fails when |
| ------- | ---------- |
| `pnpm lint:docs` | A chapter breaks the chapter standard — eleven rules, compared against `.lint-baseline.json` |
| `pnpm check:code-samples` | A TypeScript fence does not parse (types are compared against a baseline) |
| `pnpm index:check` | The interview-question index is out of date with the chapters |
| `pnpm number:chapters --check` | A `chapter` number disagrees with the section order |
| `pnpm check:versions --check` | A claim that depends on a version does not name the version |
| `pnpm check:stale --check` | A term with no correct present-tense use is still in the book |
| `pnpm plan:check` | The improvement plan's counters disagree with its checkboxes |
| `pnpm site:translate --check` | A Bangla page is stale or fails validation (run by hand, not in CI) |
| `pnpm test` | The book model or a script's command-line behaviour changed |
| `pnpm site:build` | A link on the website points nowhere |

The two baselines can only go down. A count that rises fails the build. A count that falls should be committed as the new baseline.

## When Something Goes Wrong

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `/handbook` shows a 404 locally | The portfolio is forwarding to a Vercel address that has no deployment yet | Set `HANDBOOK_ORIGIN` to your local preview |
| `mmdc is not installed` | mermaid-cli is missing | `pnpm add -g @mermaid-js/mermaid-cli` |
| `build/cover.png does not exist` | The EPUB needs the cover | `pnpm book:cover` |
| "not found in resource path" | pandoc ran from the wrong folder | Use the `pnpm` scripts — they run from the repository root |
| `(p. ??)` in the PDF | A `#ch-` link names a slug no chapter has | Fix the slug; `pnpm lint:docs --rule=broken-link` lists them all |
| The site build fails on a count | A hand-written page states an old number | Use the number the error message gives |
| A Bangla page shows English with a notice | The English changed after it was translated | `pnpm site:translate --list`, then translate and `--write` it |
| The progress tracker cannot sign in | No Upstash database on the project, or `pnpm site:dev`, which has no `api/` | Add Upstash Redis in Vercel; use `vercel dev` locally |

## Read the Book

All 166 chapters and all 734 interview questions are free here — start with the [Preface](/book/front/preface), or go to the [Contents](/book/). To read in Bangla, start at the [Bangla home page](/bn/). The author's site is [www.salmanrahman.com](https://www.salmanrahman.com/).
