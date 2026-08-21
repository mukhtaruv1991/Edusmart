#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/ubuntu/Edusmart"
OUT_DIR="$PROJECT_DIR/data/official_curriculum_sources"
mkdir -p "$OUT_DIR/pages"
: > "$OUT_DIR/books.tsv"

for entry in "7 Seven" "8 Eight" "9 Nine" "10 Ten" "11 Eleven" "12 Twelve"; do
  grade="${entry%% *}"
  class_name="${entry#* }"
  page="$OUT_DIR/pages/Class${class_name}.php"
  url="http://e-learning-moe.edu.ye/Class${class_name}.php"

  if ! curl -L --retry 3 --retry-all-errors --connect-timeout 20 --max-time 90 -sS "$url" -o "$page"; then
    https_url="https://e-learning-moe.edu.ye/Class${class_name}.php"
    curl -L --retry 3 --retry-all-errors --connect-timeout 20 --max-time 90 -sS "$https_url" -o "$page" || true
  fi

  if [[ ! -s "$page" ]]; then
    echo "WARN\tgrade-$grade\tpage unavailable\t$url" >&2
    continue
  fi

  grep -Eoi 'https?://[^"'"'"'<>[:space:]]+\.pdf' "$page" \
    | sed 's/&amp;/\&/g' \
    | sort -u \
    | while IFS= read -r pdf_url; do
        filename="${pdf_url##*/}"
        printf 'grade-%s\t%s\t%s\t%s\n' "$grade" "$filename" "$pdf_url" "$url"
      done >> "$OUT_DIR/books.tsv"
done

sort -u "$OUT_DIR/books.tsv" -o "$OUT_DIR/books.tsv"
printf 'Collected %s official PDF links into %s\n' "$(wc -l < "$OUT_DIR/books.tsv")" "$OUT_DIR/books.tsv"
awk -F '\t' '{count[$1]++} END {for (grade in count) print grade, count[grade]}' "$OUT_DIR/books.tsv" | sort -V

cp "$OUT_DIR/books.tsv" "$PROJECT_DIR/docs/official_curriculum_books.tsv"
cp "$OUT_DIR/books.tsv" "$PROJECT_DIR/data/official_curriculum_manifest.tsv"
chmod 600 "$OUT_DIR/books.tsv" "$PROJECT_DIR/docs/official_curriculum_books.tsv" "$PROJECT_DIR/data/official_curriculum_manifest.tsv"
