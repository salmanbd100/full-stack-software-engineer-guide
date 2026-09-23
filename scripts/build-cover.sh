#!/usr/bin/env bash
#
# build-cover.sh — improvement #90
#
#   ./scripts/build-cover.sh        # pnpm book:cover
#
# Renders scripts/cover.tex to build/cover.pdf, then rasterises it to the 1600 × 2560 PNG
# a store asks for. Two artefacts on purpose: the PDF is what a printer would want, the
# PNG is what Leanpub uploads.
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

echo "▸ Building cover (tectonic)"
tectonic --outdir "$BUILD" --chatter minimal scripts/cover.tex
echo "  ✓ build/cover.pdf ($(du -h "$BUILD/cover.pdf" | cut -f1))"

# -scale-to-x/-scale-to-y rather than a dpi, because the pixel size is the thing the store
# specifies and a dpi that rounds to 1599 is a rejected upload.
echo "▸ Rasterising to 1600 × 2560"
pdftoppm -png -r 600 -scale-to-x 1600 -scale-to-y 2560 -singlefile "$BUILD/cover.pdf" "$BUILD/cover"
echo "  ✓ build/cover.png ($(du -h "$BUILD/cover.png" | cut -f1))"

if command -v sips >/dev/null 2>&1; then
  echo "  ·  $(sips -g pixelWidth -g pixelHeight "$BUILD/cover.png" | tail -2 | tr -d ' \n' | sed 's/pixelWidth:/width /; s/pixelHeight:/ × height /')"
fi
