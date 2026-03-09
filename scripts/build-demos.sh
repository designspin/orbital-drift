#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEMOS_DIR="$ROOT_DIR/docs/public/demos"
mkdir -p "$DEMOS_DIR"

CHAPTERS=(
  "01:chapter-01-setup"
  "02:chapter-02-drawing"
  "03:chapter-03-gameloop"
  "04:chapter-04-input"
  "05:chapter-05-entities"
  "06:chapter-06-collision"
  "07:chapter-07-ui"
  "08:chapter-08-state"
  "09:chapter-09-assets"
  "10:chapter-10-camera"
  "11:chapter-11-sound"
  "12:chapter-12-particles"
  "13:chapter-13-improvements"
  "14:chapter-14-architecture"
)

for entry in "${CHAPTERS[@]}"; do
  NUM="${entry%%:*}"
  DIR="${entry##*:}"
  CHAPTER_DIR="$ROOT_DIR/chapters/$DIR"
  DEST="$DEMOS_DIR/ch$NUM"

  echo "Building $DIR -> demos/ch$NUM"

  (cd "$CHAPTER_DIR" && npx vite build --base=./)

  rm -rf "$DEST"
  cp -R "$CHAPTER_DIR/dist/" "$DEST"

  # Rewrite absolute public-asset paths to relative in built JS bundles.
  # Source uses e.g. '/spaceship.png' which Vite preserves as-is for public
  # assets. We convert '"/foo.ext"' to '"./foo.ext"' so demos work when
  # served under a subpath (e.g. GitHub Pages /orbital-drift/).
  for js in "$DEST"/assets/*.js; do
    [ -f "$js" ] || continue
    # portable in-place sed (works on both macOS and Linux)
    sed -E 's!"(/[^"]+\.(png|jpg|jpeg|svg|gif|webp|mp3|ogg|wav|json))"!".\1"!g' "$js" > "$js.tmp" && mv "$js.tmp" "$js"
  done
done

echo "All demos built successfully."
