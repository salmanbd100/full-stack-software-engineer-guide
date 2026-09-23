# Vendored typefaces

The book's three families, vendored so a PDF build is reproducible without installing
anything on the machine that runs it. Loaded by `scripts/tex/typography.tex` with
`fontspec`'s `Path=`, never by system font name.

| Role | Family | Version | Source |
| ---- | ------ | ------- | ------ |
| Body | Source Serif 4 | 4.005R | <https://github.com/adobe-fonts/source-serif> |
| Display | Source Sans 3 | 3.052R | <https://github.com/adobe-fonts/source-sans> |
| Code | Source Code Pro | 2.042R | <https://github.com/adobe-fonts/source-code-pro> |
| Four CJK glyphs | Noto Sans JP, subset | — | <https://github.com/notofonts/noto-cjk> |

Only the faces the design uses are here — 16 of the several hundred the three releases
ship. Adding a weight means adding the file and the `FontFace` line that names it.

All three are licensed under the SIL Open Font License 1.1; `OFL.txt` is Adobe's own copy,
identical across the three releases. The licence permits bundling and embedding in a PDF.
It does **not** permit selling the fonts themselves, which is not what this book does, and
it requires that the Reserved Font Name "Source" is not used for a modified version.

## The CJK subset — improvement #93

`NotoSansJP-Subset.otf` is **4 KB**, and it holds five glyphs: 年 月 日 ￥ and a space.

It exists because twelve occurrences of the first four — all of them inside the `Intl`
samples in the internationalisation chapter, showing what
`Intl.DateTimeFormat('ja-JP')` actually returns — printed as holes in every build from #79
onward. #77 costed the fix and left it, on the grounds that a CJK face costs an order of
magnitude more than all three Source families. That is true of a *face*; it is not true of
four characters.

Subset from `NotoSansJP-Regular.otf` (4.5 MB) with `fontTools.subset`:

```bash
python3 -m fontTools.subset NotoSansJP-Regular.otf --text="年月日￥ " \
  --output-file=assets/fonts/NotoSansJP-Subset.otf --name-IDs='*'
```

**The space is not an accident.** Without U+0020 in the subset, XeTeX reports "could not
represent character" for a space every time it sets a run in this family, and the build
prints six warnings that look like a different bug entirely.

`--name-IDs='*'` keeps the name table, so the OFL notice travels with the file. Noto Sans
JP is OFL 1.1, the same licence as the three Source families, and the licence explicitly
permits subsetting; the result is a Modified Version, which may not use a Reserved Font
Name — Noto declares none.

`scripts/tex/glyphs.tex` loads it as `\bookcjkfont` and maps the four characters to it by
code point. The code point matters: `\newunicodechar` makes a character active, so
writing 年 inside its own replacement text recurses.

These are the repository's only binary files.
