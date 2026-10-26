#!/usr/bin/env bash
#
# build.sh — regenerate previews, manifests and CREDITS.md
#
# Sources of truth:
#   wallpapers/<theme>/<id>.<ext>    the images
#   manifests/credits.tsv            hand-maintained metadata (title, credit, source)
#
# Generated (commit these):
#   previews/<theme>/<id>.webp       640px, EXIF-stripped
#   manifests/wallpapers.tsv         install.sh reads this
#   manifests/wallpapers.json        the gallery reads this
#   CREDITS.md                       rendered from the manifest
#
# Usage:
#   scripts/build.sh            # regenerate everything
#   scripts/build.sh --check    # exit 1 if anything is stale; writes nothing
#
# Why the strict rules: Omarchy scans ~/.config/omarchy/backgrounds/<theme>/ with
# `find -maxdepth 1`, so every image must deploy *flat*. The manifest carries the
# repo-relative path and the installer flattens it with basename().
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WALLPAPERS="$ROOT/wallpapers"
PREVIEWS="$ROOT/previews"
MANIFESTS="$ROOT/manifests"
CREDITS="$MANIFESTS/credits.tsv"

CHECK=false
case "${1:-}" in
  "") ;;
  --check) CHECK=true ;;
  *) echo "usage: $0 [--check]" >&2; exit 2 ;;
esac

for bin in magick jq sha256sum; do
  command -v "$bin" >/dev/null 2>&1 || { echo "missing dependency: $bin" >&2; exit 1; }
done

[[ -d $WALLPAPERS ]] || { echo "missing directory: wallpapers/" >&2; exit 1; }
mkdir -p "$PREVIEWS" "$MANIFESTS"
if [[ ! -f $CREDITS ]]; then
  printf 'id\ttitle\tbundled\tcredit\tsource\n' >"$CREDITS"
  echo "created $CREDITS — add a row for every image" >&2
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/previews"
tsv="$tmp/wallpapers.tsv"
ndjson="$tmp/wallpapers.ndjson"
: >"$ndjson"

printf 'theme\tid\tfile\tpreview\tsha256\tbytes\twidth\theight\ttitle\tbundled\tcredit\tsource\n' >"$tsv"

# Escape a value for a Markdown table cell.
md_cell() {
  local s="$1"
  s="${s//|/\\|}"
  printf '%s' "$s"
}

seen_ids=" "
count=0
total_bytes=0
warnings=0

while IFS= read -r -d '' src; do
  rel="${src#"$ROOT/"}"
  theme="$(basename "$(dirname "$src")")"
  base="$(basename "$src")"
  id="${base%.*}"
  ext="${base##*.}"
  ext="${ext,,}"

  [[ $theme =~ ^[a-z0-9][a-z0-9-]*$ ]] || {
    echo "bad theme directory (use lowercase ascii/digits/hyphen): $rel" >&2
    exit 1
  }
  # The picker turns the filename into the display name: leading digits are
  # stripped and hyphens become spaces. Keep ids ASCII and unique.
  [[ $id =~ ^[a-z0-9][a-z0-9-]*$ ]] || {
    echo "bad filename (use lowercase ascii/digits/hyphen, e.g. 01-nanally): $rel" >&2
    exit 1
  }
  case $seen_ids in
    *" $id "*) echo "duplicate id '$id' — ids are global (credits.tsv is keyed by id)" >&2; exit 1 ;;
  esac
  seen_ids+="$id "

  # One row per id in manifests/credits.tsv; missing rows still build, but warn.
  title="" bundled="" credit="" source=""
  read -r title bundled credit source < <(awk -F'\t' -v id="$id" '
    NR > 1 && $1 == id { printf "%s\t%s\t%s\t%s\n", $2, $3, $4, $5; exit }
  ' "$CREDITS") || true
  if [[ -z $title && -z $bundled ]]; then
    echo "warning: no credits row for '$id' (add one to manifests/credits.tsv)" >&2
    warnings=$((warnings + 1))
  fi
  title="${title:-$id}"
  bundled="${bundled:-0}"
  credit="${credit:-}"
  source="${source:-}"
  [[ $bundled == 1 ]] || bundled=0
  if [[ $title$credit$source == *$'\t'* ]]; then
    echo "credits row for '$id' contains a tab" >&2
    exit 1
  fi

  read -r width height < <(magick identify -format '%w %h\n' "$src") || true
  bytes="$(stat -c %s "$src")"
  sha="$(sha256sum "$src" | cut -d' ' -f1)"
  preview_rel="previews/$theme/$id.webp"

  # Always render into tmp; --check then diffs the result against previews/.
  mkdir -p "$(dirname "$tmp/$preview_rel")"
  magick "$src" -auto-orient -strip -resize '640x640>' -quality 80 "$tmp/$preview_rel"
  if $CHECK && [[ ! -f $ROOT/$preview_rel ]]; then
    echo "stale: missing $preview_rel (run scripts/build.sh)" >&2
    exit 1
  fi

  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$theme" "$id" "wallpapers/$theme/$base" "$preview_rel" \
    "$sha" "$bytes" "$width" "$height" "$title" "$bundled" "$credit" "$source" >>"$tsv"

  jq -nc \
    --arg id "$id" --arg theme "$theme" --arg title "$title" \
    --arg file "wallpapers/$theme/$base" --arg preview "$preview_rel" \
    --arg sha256 "$sha" --arg credit "$credit" --arg source "$source" \
    --argjson bytes "$bytes" --argjson width "$width" --argjson height "$height" \
    --argjson bundled "$([[ $bundled == 1 ]] && echo true || echo false)" \
    '{id:$id, theme:$theme, title:$title, file:$file, preview:$preview,
      bytes:$bytes, width:$width, height:$height, sha256:$sha256,
      bundled:$bundled, credit:$credit, source:$source}' >>"$ndjson"

  count=$((count + 1))
  total_bytes=$((total_bytes + bytes))
done < <(
  find "$WALLPAPERS" -mindepth 2 -maxdepth 2 -type f \
    \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \) \
    -print0 | sort -z
)

if [[ -s $ndjson ]]; then
  jq -sS '
    def titlecase: gsub("-"; " ") | split(" ")
      | map(if length == 0 then . else ((.[0:1] | ascii_upcase) + .[1:]) end)
      | join(" ");
    {
      schema: 1,
      sets: (group_by(.theme) | map({
        key: .[0].theme,
        value: {label: (.[0].theme | titlecase), wallpapers: (sort_by(.id))}
      }) | from_entries)
    }
  ' "$ndjson" >"$tmp/wallpapers.json"
else
  printf '{"schema":1,"sets":{}}\n' >"$tmp/wallpapers.json"
fi

{
  printf '# Credits\n\n'
  printf '壁纸版权归原作者/发行方所有；本仓库的代码是 MIT。\n\n'
  printf '> 本文件由 `scripts/build.sh` 从 `manifests/credits.tsv` 生成，不要直接编辑。\n\n'
  printf '| ID | 标题 | 作者/来源 | 来源链接 |\n'
  printf '|---|---|---|---|\n'
  tail -n +2 "$tsv" | while IFS=$'\t' read -r _theme id _file _preview _sha _bytes _w _h title _bundled credit source; do
    if [[ -n $source ]]; then
      printf '| `%s` | %s | %s | [来源](%s) |\n' "$id" "$(md_cell "$title")" "$(md_cell "${credit:-—}")" "$source"
    else
      printf '| `%s` | %s | %s | — |\n' "$id" "$(md_cell "$title")" "$(md_cell "${credit:-—}")"
    fi
  done
} >"$tmp/CREDITS.md"

if $CHECK; then
  stale=0
  for pair in \
    "manifests/wallpapers.tsv:$tsv" \
    "manifests/wallpapers.json:$tmp/wallpapers.json" \
    "CREDITS.md:$tmp/CREDITS.md"; do
    dest="$ROOT/${pair%%:*}"
    want="${pair#*:}"
    if ! cmp -s "$dest" "$want" 2>/dev/null; then
      echo "stale: ${pair%%:*} differs from a fresh build" >&2
      diff -u "$dest" "$want" 2>/dev/null | head -40 >&2 || true
      stale=1
    fi
  done
  if ! diff -rq "$PREVIEWS" "$tmp/previews" >/dev/null 2>&1; then
    echo "stale: previews/ differs from a fresh build" >&2
    diff -rq "$PREVIEWS" "$tmp/previews" 2>&1 | head -20 >&2 || true
    stale=1
  fi
  if (( stale )); then
    echo "run scripts/build.sh to regenerate" >&2
    exit 1
  fi
  echo "ok: manifests and previews are current ($count wallpapers, $((total_bytes / 1024)) KiB)"
  exit 0
fi

rm -rf "$PREVIEWS"
mv "$tmp/previews" "$PREVIEWS"
install -m 0644 "$tsv" "$MANIFESTS/wallpapers.tsv"
install -m 0644 "$tmp/wallpapers.json" "$MANIFESTS/wallpapers.json"
install -m 0644 "$tmp/CREDITS.md" "$ROOT/CREDITS.md"

echo "built $count wallpapers ($((total_bytes / 1024)) KiB, $warnings credit warning(s))"
echo "  previews/  manifests/  CREDITS.md"
