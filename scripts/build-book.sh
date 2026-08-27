#!/usr/bin/env bash
#
# build-book.sh — improvement #5
#
# Builds The Senior Full Stack Handbook from the markdown in this repo.
#
#   ./scripts/build-book.sh          # PDF + EPUB
#   ./scripts/build-book.sh pdf      # PDF only  (the fast one)
#   ./scripts/build-book.sh epub     # EPUB only
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

echo "▸ Collecting chapters"
node --experimental-strip-types "$ROOT/scripts/collect-chapters.ts"

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
  --syntax-highlighting=tango
)

# --- PDF -------------------------------------------------------------------

build_pdf() {
  echo "▸ Building PDF (tectonic)"
  pandoc "$BUILD/book.md" "${COMMON[@]}" \
    --pdf-engine=tectonic \
    --include-in-header="$ROOT/scripts/book-header.tex" \
    --variable=documentclass:book \
    --variable=papersize:a4 \
    --variable=fontsize:10pt \
    --variable=geometry:margin=2.2cm \
    --variable=colorlinks:true \
    --variable=linkcolor:RoyalBlue \
    --variable=toccolor:black \
    --output="$BUILD/handbook.pdf"
  echo "  ✓ build/handbook.pdf ($(du -h "$BUILD/handbook.pdf" | cut -f1))"
}

# --- EPUB ------------------------------------------------------------------

build_epub() {
  echo "▸ Building EPUB"
  pandoc "$BUILD/book.md" "${COMMON[@]}" \
    --split-level=1 \
    --output="$BUILD/handbook.epub"
  echo "  ✓ build/handbook.epub ($(du -h "$BUILD/handbook.epub" | cut -f1))"
}

case "$TARGET" in
  pdf) build_pdf ;;
  epub) build_epub ;;
  all) build_pdf; build_epub ;;
  *) echo "Usage: $0 [pdf|epub|all]" >&2; exit 1 ;;
esac
