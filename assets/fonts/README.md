# Vendored typefaces

The book's three families, vendored so a PDF build is reproducible without installing
anything on the machine that runs it. Loaded by `scripts/tex/typography.tex` with
`fontspec`'s `Path=`, never by system font name.

| Role | Family | Version | Source |
| ---- | ------ | ------- | ------ |
| Body | Source Serif 4 | 4.005R | <https://github.com/adobe-fonts/source-serif> |
| Display | Source Sans 3 | 3.052R | <https://github.com/adobe-fonts/source-sans> |
| Code | Source Code Pro | 2.042R | <https://github.com/adobe-fonts/source-code-pro> |

Only the faces the design uses are here — 16 of the several hundred the three releases
ship. Adding a weight means adding the file and the `FontFace` line that names it.

All three are licensed under the SIL Open Font License 1.1; `OFL.txt` is Adobe's own copy,
identical across the three releases. The licence permits bundling and embedding in a PDF.
It does **not** permit selling the fonts themselves, which is not what this book does, and
it requires that the Reserved Font Name "Source" is not used for a modified version.

These are the repository's only binary files.
