#!/usr/bin/env bash
#
# build-book.sh — improvement #5
#
# Builds The Senior Full Stack Handbook from the markdown in this repo.
#
#   ./scripts/build-book.sh          # PDF + EPUB
#   ./scripts/build-book.sh pdf      # PDF only  (the fast one)
#   ./scripts/build-book.sh epub     # EPUB only
#   ./scripts/build-book.sh specimen # scripts/specimen.md alone, on two pages (#81)
#
# Requires: pandoc, tectonic, Node 22.6+
#   brew install pandoc tectonic
#
# Reading order comes from front matter `part` + `chapter`, falling back to the
# directory prefix for files improvement #3 has not stamped yet.
#
# What is skipped — Archive/ included — is EXCLUDED_DIRS in scripts/lib/book.ts, which
# collect-chapters.ts imports. That is the single list; do not add a second one here.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD="$ROOT/build"
TARGET="${1:-all}"

cd "$ROOT"

# --- preflight -------------------------------------------------------------

for tool in pandoc node; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "✗ $tool is not installed. Run: brew install pandoc tectonic" >&2
    exit 1
  fi
done

if [[ "$TARGET" != "epub" ]] && ! command -v tectonic >/dev/null 2>&1; then
  echo "✗ tectonic is not installed (needed for PDF). Run: brew install tectonic" >&2
  exit 1
fi

# mermaid-cli renders the 96 Mermaid fences (#82). Checked here rather than left to
# pandoc, which would fail once per diagram with a Lua traceback. It is a global CLI like
# pandoc and tectonic rather than a devDependency on purpose: it pulls a headless
# Chromium, CI never builds the PDF, and nobody editing prose should pay for it on
# `pnpm install`.
if ! command -v mmdc >/dev/null 2>&1; then
  echo "✗ mmdc is not installed (needed to render diagrams)." >&2
  echo "  Run: pnpm add -g @mermaid-js/mermaid-cli   (or npm install -g)" >&2
  exit 1
fi

# --- collect ---------------------------------------------------------------

if [[ "$TARGET" != "specimen" ]]; then
  echo "▸ Collecting chapters"
  node --experimental-strip-types "$ROOT/scripts/collect-chapters.ts"
fi

# --- shared pandoc options -------------------------------------------------

# Pandoc's own markdown, not gfm: gfm cannot read the {#ch-slug} header attributes
# that every cross-reference in the book targets. The subtractions turn off the TeX
# passthroughs, so a `$` or a backslash in prose stays literal instead of becoming maths.
# yaml_metadata_block is off because chapters use `---` as a horizontal rule; pandoc would
# otherwise read the next few lines of prose as metadata and fail. Metadata comes from
# --metadata-file instead, which is where a book's title belongs anyway.
FROM="markdown+pipe_tables+task_lists-yaml_metadata_block-tex_math_dollars-tex_math_single_backslash-raw_tex-latex_macros"

COMMON=(
  --from="$FROM"
  --metadata-file="$ROOT/scripts/book-meta.yaml"
  --toc
  --toc-depth=2
  --top-level-division=part
)

# PDF-only options, shared by the book and the specimen (#81).
#
# One flag since #82. The engine, the header include, the three Lua filters, the
# highlight style and the eight variables that used to be spelled out here are now
# scripts/book-pdf.yaml — the same options as data, and the only place the print
# configuration is written. Its relative paths resolve against the working directory,
# which is why the `cd "$ROOT"` above is not optional.
PDF_ONLY=(
  --defaults="$ROOT/scripts/book-pdf.yaml"
)

# The EPUB takes three filters of its own. xref.lua fills in the `Chapter ??` placeholder
# there too — an e-reader has no pages to cite, but "see Chapter ??" is no better on a
# screen than on paper — and mermaid.lua renders the diagrams to SVG, which is what stops
# the EPUB shipping the same 96 listings of Mermaid source the PDF used to.
#
# epub-blocks.lua (#83) is callouts.lua's counterpart: the same shapes, read by the same
# shared classifier, tagged with class names instead of wrapped in tcolorbox environments.
# It runs last for the same reason callouts.lua does in print — it needs a Mermaid fence
# to still be a code block while it looks for the bold label above it.
EPUB_FILTERS=(
  --lua-filter="$ROOT/scripts/lua/xref.lua"
  --lua-filter="$ROOT/scripts/lua/epub-blocks.lua"
  --lua-filter="$ROOT/scripts/lua/mermaid.lua"
)

# The ten faces the EPUB embeds, out of the sixteen in assets/fonts/. The sans is never
# set in italic on screen, and the semibold serif print uses for bold runs inside body
# text is a paper-weight distinction no screen renders. scripts/epub.css declares an
# @font-face for each one against ../fonts/, which is where pandoc puts them.
EPUB_FONTS=(
  SourceSerif4-Regular SourceSerif4-It SourceSerif4-Bold SourceSerif4-BoldIt
  SourceSans3-Regular SourceSans3-Semibold SourceSans3-Bold
  SourceCodePro-Regular SourceCodePro-It SourceCodePro-Bold
)

# --- PDF -------------------------------------------------------------------

# Tectonic reports a character its fonts cannot set as a warning and carries on, printing
# nothing where the glyph was. Silence there is the failure mode, so the count is
# surfaced. #81 measured the manuscript at zero; anything above that is a new glyph that
# needs a line in scripts/tex/glyphs.tex.
report_missing_glyphs() {
  local log="$1"
  local n
  n="$(grep -c 'could not represent character' "$log" || true)"
  if [[ "$n" -gt 0 ]]; then
    echo "  ⚠️  $n character(s) have no glyph in the vendored fonts:"
    grep -o 'could not represent character "[^"]*" ([^)]*)' "$log" | sort -u | sed 's/^/     /'
    echo "     Add each to scripts/tex/glyphs.tex."
  fi
}

# The acceptance test for #82's cross-reference half: "no #ch-slug link renders without a
# page number".
#
# 🔴 It reads the **PDF**, not the log, and that is not a stylistic choice. An undefined
# \ref prints "??" where the number should be and LaTeX records it as a warning —
# tectonic then swallows the whole TeX log behind one line reading "warnings were issued
# by the TeX engine". A grep for "Reference ... undefined" in what tectonic prints finds
# nothing, on a build that shipped a broken cross-reference. Written that way first, and
# caught by breaking a reference on purpose and watching the check stay silent.
#
# xref.lua does the same check on the other side, against the anchors it collected, and
# reports before the typesetter runs. This one is the end-to-end proof: it is looking at
# the page a reader would be holding.
report_unresolved_refs() {
  local pdf="$1"
  if ! command -v pdftotext >/dev/null 2>&1; then
    echo "  ·  page references not verified: pdftotext not installed (brew install poppler)"
    return
  fi
  local n
  n="$(pdftotext "$pdf" - | grep -c "(p. ??)" || true)"
  if [[ "$n" -gt 0 ]]; then
    echo "  ⚠️  $n cross-reference(s) printed as \"(p. ??)\" — the anchor resolved to nothing."
    echo "     See scripts/lua/xref.lua, which names them before the typesetter runs."
  else
    echo "  ✓ every #ch- cross-reference resolved to a chapter and a page"
  fi
}

build_pdf() {
  echo "▸ Building PDF (tectonic)"
  # Paper size and margins are no longer passed here: `geometry` is loaded by
  # scripts/tex/structure.tex from the tokens, because a mirrored twoside page needs four
  # values rather than one and #77 tunes them. `twoside` has to be a *class option*, so it
  # stays a --variable; setting it in the preamble is too late for the class to act on.
  pandoc "$BUILD/book.md" "${COMMON[@]}" "${PDF_ONLY[@]}" \
    --output="$BUILD/handbook.pdf" 2>&1 | tee "$BUILD/handbook.log"
  echo "  ✓ build/handbook.pdf ($(du -h "$BUILD/handbook.pdf" | cut -f1))"
  report_missing_glyphs "$BUILD/handbook.log"
  report_unresolved_refs "$BUILD/handbook.pdf"
}

# --- Specimen --------------------------------------------------------------
#
# The whole block library on two pages. A 1,480-page build takes minutes and prints a
# ream; this is what you actually iterate the design against, and what you send to a mono
# laser printer to check that the three callout types stay tellable apart.

build_specimen() {
  echo "▸ Building specimen (tectonic)"
  mkdir -p "$BUILD"
  pandoc "$ROOT/scripts/specimen.md" "${COMMON[@]}" "${PDF_ONLY[@]}" \
    --output="$BUILD/specimen.pdf" 2>&1 | tee "$BUILD/specimen.log"
  echo "  ✓ build/specimen.pdf ($(du -h "$BUILD/specimen.pdf" | cut -f1))"
  report_missing_glyphs "$BUILD/specimen.log"
  report_unresolved_refs "$BUILD/specimen.pdf"
}

# --- EPUB ------------------------------------------------------------------

# The acceptance test for #83. epubcheck is what a retailer runs on upload, and the
# failures it finds — an unparseable date, a font with no declared media type, a resource
# nothing in the spine references — are all invisible in a reader that happens to be
# forgiving. Not in the preflight with pandoc and tectonic: it needs a JVM, the EPUB
# builds correctly without it, and a validator that blocks the build is a validator people
# route around.
report_epubcheck() {
  local epub="$1"
  if ! command -v epubcheck >/dev/null 2>&1; then
    echo "  ·  not validated: epubcheck not installed (brew install epubcheck)"
    return
  fi
  local log="$BUILD/epubcheck.log"
  if epubcheck "$epub" >"$log" 2>&1; then
    echo "  ✓ epubcheck: zero errors and zero warnings"
  else
    echo "  ⚠️  epubcheck found problems — see build/epubcheck.log"
    grep -E '^(ERROR|WARNING|FATAL)' "$log" | head -20 | sed 's/^/     /'
    return 1
  fi
}

build_epub() {
  echo "▸ Building EPUB"

  local font_args=()
  local face
  for face in "${EPUB_FONTS[@]}"; do
    font_args+=(--epub-embed-font="$ROOT/assets/fonts/$face.otf")
  done

  # `date` is overridden here and only here. Print sets its title page from
  # "2027 Edition", which is the right line on a page and not a date; dc:date has to be
  # W3C-DTF or epubcheck rejects it.
  pandoc "$BUILD/book.md" "${COMMON[@]}" "${EPUB_FILTERS[@]}" \
    --css="$ROOT/scripts/epub.css" \
    "${font_args[@]}" \
    --metadata=date:2027 \
    --syntax-highlighting=tango \
    --split-level=1 \
    --output="$BUILD/handbook.epub"
  echo "  ✓ build/handbook.epub ($(du -h "$BUILD/handbook.epub" | cut -f1))"
  report_epubcheck "$BUILD/handbook.epub"
}

case "$TARGET" in
  pdf) build_pdf ;;
  epub) build_epub ;;
  specimen) build_specimen ;;
  all) build_pdf; build_epub ;;
  *) echo "Usage: $0 [pdf|epub|specimen|all]" >&2; exit 1 ;;
esac
