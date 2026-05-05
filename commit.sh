#!/bin/bash
set -e

FE_DIR="$(cd "$(dirname "$0")" && pwd)"
BE_DIR="$(cd "$FE_DIR/../invest-be" && pwd)"

# 변경사항 수집
collect_diff() {
  local dir="$1"
  local label="$2"
  cd "$dir"
  local diff
  diff=$(git diff; git diff --cached; git ls-files --others --exclude-standard | head -20)
  if [ -n "$diff" ]; then
    echo "=== $label ==="
    echo "$diff"
  fi
}

has_changes() {
  local dir="$1"
  cd "$dir"
  ! (git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ])
}

commit_repo() {
  local dir="$1"
  local label="$2"
  local msg="$3"

  echo ""
  echo "▶ [$label]"
  cd "$dir"

  if ! has_changes "$dir"; then
    echo "  변경 없음 — 스킵"
    return
  fi

  git add .
  git commit -m "$msg"
  git push
  echo "  완료"
}

# 커밋 메시지 결정
if [ -n "$1" ]; then
  MSG="$1"
else
  echo "변경 내역 분석 중..."

  DIFF_ALL=""
  if has_changes "$FE_DIR"; then
    DIFF_ALL+="$(collect_diff "$FE_DIR" "invest-fe")"$'\n'
  fi
  if has_changes "$BE_DIR"; then
    DIFF_ALL+="$(collect_diff "$BE_DIR" "invest-be")"$'\n'
  fi

  if [ -z "$DIFF_ALL" ]; then
    echo "변경 없음 — 종료"
    exit 0
  fi

  MSG=$(echo "$DIFF_ALL" | claude -p "아래는 git diff 내용이야. 변경 사항을 보고 커밋 메시지를 한 줄로 작성해줘. 한국어로, 50자 이내, 설명 없이 메시지만 출력해.")
  echo ""
  echo "커밋 메시지: $MSG"
  echo ""
  read -r -p "이 메시지로 커밋할까요? [Y/n] " confirm
  confirm="${confirm:-Y}"
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    read -r -p "메시지 직접 입력: " MSG
  fi
fi

commit_repo "$FE_DIR" "invest-fe" "$MSG"
commit_repo "$BE_DIR" "invest-be" "$MSG"

echo ""
echo "✓ 완료"
