#!/usr/bin/env bash
set -euo pipefail

GIT_DIR="$(git rev-parse --git-dir 2>/dev/null || echo '.git')"

if [ ! -d "$GIT_DIR" ]; then
  echo "Error: Not a git repository. Run 'git init' first."
  exit 1
fi

EXCLUDE_FILE="$GIT_DIR/info/exclude"
mkdir -p "$GIT_DIR/info"

add_exclude() {
  local pattern="$1"
  if ! grep -qxF "$pattern" "$EXCLUDE_FILE" 2>/dev/null; then
    echo "$pattern" >> "$EXCLUDE_FILE"
    echo "Added '$pattern' to $EXCLUDE_FILE"
  fi
}

add_exclude ".codegraph/"
add_exclude "graphify-out/"
add_exclude ".env*.local"
add_exclude "node_modules/"
add_exclude ".next/"

echo "Git exclude setup complete."
