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
# `monochrome` rather than `tango`, because the interior prints in one ink: tango's
# palette greys out into four tones that sit within a few percent of each other, so
# keywords, strings and comments become the same. monochrome carries the same
# distinctions in weight and italic, which survive the press. The EPUB keeps tango —
# BOOK-SPEC's black-and-white constraint is print-only.
PDF_ONLY=(
  --pdf-engine=tectonic
  --include-in-header="$ROOT/scripts/book-header.tex"
  --lua-filter="$ROOT/scripts/lua/callouts.lua"
  --syntax-highlighting=monochrome
  --variable=documentclass:book
  --variable=classoption:twoside
  --variable=fontsize:10pt
  --variable=colorlinks:true
  --variable=linkcolor:RoyalBlue
  --variable=toccolor:black
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
}

# --- EPUB ------------------------------------------------------------------

build_epub() {
  echo "▸ Building EPUB"
  pandoc "$BUILD/book.md" "${COMMON[@]}" \
    --syntax-highlighting=tango \
    --split-level=1 \
    --output="$BUILD/handbook.epub"
  echo "  ✓ build/handbook.epub ($(du -h "$BUILD/handbook.epub" | cut -f1))"
}

case "$TARGET" in
  pdf) build_pdf ;;
  epub) build_epub ;;
  specimen) build_specimen ;;
  all) build_pdf; build_epub ;;
  *) echo "Usage: $0 [pdf|epub|specimen|all]" >&2; exit 1 ;;
esac
