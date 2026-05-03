#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "사용법: ./commit.sh \"커밋 메시지\""
  exit 1
fi

MSG="$1"
FE_DIR="$(cd "$(dirname "$0")" && pwd)"
BE_DIR="$(cd "$FE_DIR/../invest-be" && pwd)"

commit_repo() {
  local dir="$1"
  local label="$2"

  echo ""
  echo "▶ [$label] $dir"
  cd "$dir"

  if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    echo "  변경 없음 — 스킵"
    return
  fi

  git add .
  git commit -m "$MSG"
  git push
  echo "  완료"
}

commit_repo "$FE_DIR" "invest-fe"
commit_repo "$BE_DIR" "invest-be"

echo ""
echo "✓ 완료"
