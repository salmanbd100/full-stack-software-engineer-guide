<!--
  specimen.md — improvement #81

  A fixture, not a chapter. It is written at the level `collect-chapters.ts` leaves the
  manuscript at — level 1 is a part, level 2 is a chapter — so that what tectonic sees
  here is exactly what it sees in build/book.md, and it exercises every block in
  scripts/tex/blocks.tex on two pages instead of on a 1,480-page build.

  `scripts` is in EXCLUDED_DIRS, so nothing that walks the manuscript reads this file:
  it is invisible to lint:docs, index:questions, check:code-samples and book:collect.

  Build it with `pnpm book:specimen`. Print build/specimen.pdf on a mono laser printer —
  that is the acceptance test the design was drawn for, and the one nothing in this
  repository can run.
-->

# Part 1 — Foundations

## The Specimen Chapter {#ch-specimen}

> Prove the whole block library on two pages, in the ink the book will actually be printed in.

**In this chapter:** the three callouts · the metadata pill · `tables` and how they band · code and how it wraps · pull quotes and the notes they split from · what greyscale actually does to a three-hue palette

### 💡 The Core Idea

The reference design told three callouts apart by the colour of their ground — a mint, a
lavender and a pale gold. Converted to greyscale those three land at 94%, 94% and 95% K.
They are the same block. So this design carries the distinction in **structure**: a full
box, a pair of rules, and a solid left bar. Structure survives greyscale, a photocopier
and an e-ink screen, and a reader can name it without knowing the word for it.

| Reference ground | Greyscale | What happens |
| ---------------- | --------- | ------------ |
| Mint `#E3F2EC`   | 94% K     | —            |
| Lavender `#EBEFF7` | 94% K   | Identical to mint |
| Pale gold `#FAF3E0` | 95% K  | Identical to both |

> A distinction that survives one ink is a distinction in shape.

### How It Works

Each block is a tcolorbox or a pair of rules, and every length in it is a token from
`tokens.tex`. Nothing reaches these environments from the markdown directly — the filter
reads the Book Chapter Standard's own vocabulary and maps it across.

> ⚠️ A callout that only differs by fill is a callout that disappears the first time
> somebody photocopies the page. That is the whole reason this file exists: it is cheap to
> check a design on screen and expensive to check it after a print run.

> ⚠️ **Moving target:** tectonic ships its own TeX Live snapshot, so the version of
> `tabularray` the header band depends on moves when tectonic does. The durable principle
> is that the band is a row specification rather than a package feature — if the package
> changes, one line in `blocks.tex` changes with it.

**The table treatment, in one row each:**

| Block | Treatment | Why it survives one ink |
| ----- | --------- | ----------------------- |
| 💡 The Core Idea | 0.4pt full box, no tint | A closed shape reads at arm's length |
| 🔑 Key Takeaways | Rules top and bottom | Open, so it does not read as a second chapter opening |
| ⚠️ Gotcha | 2.5pt left bar over 12% K | The bar is the only element heavy enough to interrupt prose |
| Metadata pill | Hairline box, 8pt sans | Small enough to skip, boxed enough to find |
| Table | 100% K header band, 6% K zebra | The band is what makes thirty tables scannable |
| Code | 8.5/10.5 mono on 6% K, no border | A tint and a border together shout louder than the heading |
| Pull quote | 12/15 serif italic, rules, centred | Rules give it air the paragraph spacing cannot |

A wider table, to prove the column weights and the zebra at eight columns:

| # | Token | Value | Used for | Family | Size | Tint | Rule |
| - | ----- | ----- | -------- | ------ | ---- | ---- | ---- |
| 1 | `ink` | 100% K | Body | Serif | 10pt | — | — |
| 2 | `inkmid` | 55% K | Eyebrow | Sans | 8pt | — | — |
| 3 | `inklight` | 35% K | Hairlines | — | — | — | 0.4pt |
| 4 | `tintone` | 6% K | Code ground | Mono | 8.5pt | ✅ | — |
| 5 | `tinttwo` | 12% K | Gotcha ground | Serif | 10pt | ✅ | 2.5pt |

### When to Use It

**A labelled fence, wrapped at the measure:**

```typescript
interface CalloutSpec {
  readonly environment: "bookcoreidea" | "bookkeytakeaways" | "bookgotcha";
  readonly label: string | null;
  readonly breakable: boolean;
}

// The long line below has no spaces to break at, which is why the code block asks
// fvextra for `breakanywhere` rather than for plain `breaklines`.
type VeryLongGenericParameterNameThatWouldOtherwiseOverflowTheMeasure<TFirstArgument, TSecondArgument> = readonly [TFirstArgument, TSecondArgument];

export function labelFor(spec: CalloutSpec): string {
  return spec.label ?? spec.environment.replace(/^book/, "").toUpperCase();
}
```

**An unlabelled fence, to prove the ground is the same either way:**

```bash
pnpm book:specimen
```

**An ASCII diagram inside a fence, which is the only place box-drawing characters appear
in this book — Source Code Pro carries them, so they need no substitution:**

```text
scripts/tex/
├── tokens.tex
├── typography.tex
├── glyphs.tex
├── structure.tex
└── blocks.tex
```

### Common Mistakes

❌ Desaturating a colour palette and calling it a black-and-white design.

✅ Redrawing the distinctions in rule weight, type weight and shape, then checking them on
a mono laser print rather than on a screen.

> This is the second kind of blockquote: long enough that centring it in italic would read
> as a typesetting fault rather than as emphasis, so it gets the quiet treatment — full
> measure, upright, one hairline down the left. The filter picks between the two on
> length, at 140 characters.

### 🔑 Key Takeaways

- Greyscale collapses a three-hue palette into one tone, so print distinctions have to be
  structural.
- Each callout keeps an uppercase sans label, because the label is what a first-time
  reader actually reads.
- Two tint steps is the whole budget: under 6% K vanishes on uncoated stock and over 12% K
  goes muddy behind 10pt text.
- Every length in the library is a token, so calibration stays a one-file edit.

### Interview Questions

**Q: Why not just print the book in colour?**

Colour interiors roughly double the unit cost on a 1,400-page print run, and the EPUB
keeps the colour anyway. The constraint is print-only, which is why `epub.css` can port
the same structure without porting the greyscale.

### What to Read Next

- [Chapter ?? — The Specimen Chapter](#ch-specimen) — a cross-reference to itself, to
  prove the link renders while nothing resolves it yet
