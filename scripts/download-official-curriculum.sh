#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/ubuntu/Edusmart"
SOURCE_TSV="$PROJECT_DIR/data/official_curriculum_sources/books.tsv"
DEST_ROOT="/home/ubuntu/yemen_curriculum_official"
DOWNLOAD_ROOT="$DEST_ROOT/pdfs"
STATUS_ROOT="$DEST_ROOT/status"
SUMMARY="$DEST_ROOT/download_manifest.tsv"

mkdir -p "$DOWNLOAD_ROOT" "$STATUS_ROOT"

is_pdf() {
  local file="$1"
  [[ -s "$file" ]] || return 1
  local magic
  magic="$(head -c 5 "$file" 2>/dev/null || true)"
  [[ "$magic" == "%PDF-" ]] && return 0
  file --brief "$file" 2>/dev/null | grep -qi 'PDF document'
}

download_one() {
  local line="$1"
  local index grade filename url source
  IFS=$'\t' read -r index grade filename url source <<< "$line"
  local grade_dir="$DOWNLOAD_ROOT/$grade"
  local target="$grade_dir/$filename"
  local temp="$target.part"
  local status_file="$STATUS_ROOT/$index.tsv"
  local download_url="${url/https:\/\//http:\/\/}"
  mkdir -p "$grade_dir"

  if is_pdf "$target"; then
    printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$index" "$grade" "$filename" "existing" "$(stat -c '%s' "$target")" "$download_url" > "$status_file"
    return 0
  fi

  rm -f "$temp"
  if curl -fL --retry 2 --retry-all-errors --connect-timeout 20 --max-time 900 --speed-time 30 --speed-limit 1024 --user-agent 'EduSmart curriculum downloader/1.0' -sS "$download_url" -o "$temp"; then
    if is_pdf "$temp"; then
      mv -f "$temp" "$target"
      printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$index" "$grade" "$filename" "downloaded" "$(stat -c '%s' "$target")" "$download_url" > "$status_file"
      return 0
    fi
    printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$index" "$grade" "$filename" "invalid-content" "$(stat -c '%s' "$temp" 2>/dev/null || echo 0)" "$download_url" > "$status_file"
  else
    printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$index" "$grade" "$filename" "download-failed" "0" "$download_url" > "$status_file"
  fi
  rm -f "$temp"
  return 0
}

export DOWNLOAD_ROOT STATUS_ROOT
export -f is_pdf download_one

awk -F '\t' 'NF >= 4 { print NR "\t" $0 }' "$SOURCE_TSV" \
  | tr '\n' '\0' \
  | xargs -0 -r -P 1 -n 1 bash -c 'download_one "$1"' _

{
  printf 'index\tgrade\tfilename\tstatus\tbytes\turl\n'
  cat "$STATUS_ROOT"/*.tsv 2>/dev/null | sort -n -k1,1 || true
} > "$SUMMARY"

printf 'Download summary: %s\n' "$SUMMARY"
printf 'Succeeded: %s\n' "$(awk -F '\t' 'NR > 1 && ($4 == "downloaded" || $4 == "existing") { n++ } END { print n + 0 }' "$SUMMARY")"
printf 'Failed or invalid: %s\n' "$(awk -F '\t' 'NR > 1 && ($4 != "downloaded" && $4 != "existing") { n++ } END { print n + 0 }' "$SUMMARY")"
awk -F '\t' 'NR > 1 { count[$2 ":" $4]++ } END { for (key in count) print key "\t" count[key] }' "$SUMMARY" | sort
