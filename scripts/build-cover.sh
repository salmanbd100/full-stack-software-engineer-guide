#!/usr/bin/env bash
#
# build-cover.sh — improvement #90
#
#   ./scripts/build-cover.sh        # pnpm book:cover
#
# Renders scripts/cover.tex to build/cover.pdf — front and back, #115 — and Book 2's
# scripts/cover-book-2.tex to build/cover-book-2.pdf (#118), then rasterises each page to
# the 1600 × 2560 PNG a store asks for. Two artefacts on purpose: the PDF is
# what a printer would want, the PNG is what the store uploads.
#
# 🔴 Relative paths in cover.tex resolve against the working directory, like every other
# path in this build, which is why this script cds to the repo root first.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD="$ROOT/build"
cd "$ROOT"
mkdir -p "$BUILD"

for tool in tectonic pdftoppm; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "✗ $tool is not installed. Run: brew install tectonic poppler" >&2
    exit 1
  fi
done

# Two volumes since #118: the handbook's cover.tex and Book 2's cover-book-2.tex. Each
# builds to its own PDF, and each page of it to its own PNG. The EPUB build reads the two
# fronts, cover.png and cover-book-2.png, and refuses to run without them.
#
# -scale-to-x/-scale-to-y rather than a dpi, because the pixel size is the thing the store
# specifies and a dpi that rounds to 1599 is a rejected upload.
# The handbook's front keeps the name cover.png, because that is the file the store upload
# has always pointed at.
for volume in cover:cover:cover-back cover-book-2:cover-book-2:cover-book-2-back; do
  IFS=: read -r src front back <<<"$volume"

  echo "▸ Building $src (tectonic)"
  tectonic --outdir "$BUILD" --chatter minimal "scripts/$src.tex"
  echo "  ✓ build/$src.pdf ($(du -h "$BUILD/$src.pdf" | cut -f1))"

  echo "▸ Rasterising to 1600 × 2560"
  for page in "1:$front" "2:$back"; do
    n="${page%%:*}" name="${page#*:}"
    pdftoppm -png -r 600 -scale-to-x 1600 -scale-to-y 2560 -f "$n" -l "$n" -singlefile \
      "$BUILD/$src.pdf" "$BUILD/$name"
    echo "  ✓ build/$name.png ($(du -h "$BUILD/$name.png" | cut -f1))"
    if command -v sips >/dev/null 2>&1; then
      echo "    $(sips -g pixelWidth -g pixelHeight "$BUILD/$name.png" | tail -2 | tr -d ' \n' | sed 's/pixelWidth:/width /; s/pixelHeight:/ × height /')"
    fi
  done
done
