#!/usr/bin/env bash
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 \"<query>\" \"<max_tokens>\" \"<role>\" \"<analysis_mode>\""
  exit 1
fi

QUERY="$1"
MAX_TOKENS="${2:-65536}"
ROLE="$3"
ANALYSIS_MODE="$4"

# Temp file to capture the full streamed output while still showing it live
TMPFILE="$(mktemp)"
trap 'rm -f "$TMPFILE"' EXIT

# Stream to stdout AND save to file
http http://localhost:5000/agent/query-stream \
  query="$QUERY" max_tokens:="$MAX_TOKENS" role="$ROLE" analysis_mode:="$ANALYSIS_MODE" \
  | tee "$TMPFILE"

# After the stream ends, extract the final_response JSON and print just the message
# We split the stream into blank-line-separated SSE "records", pick the one that
# contains "type": "final_response", strip the "data: " prefixes, and jq the message.
FINAL_MSG=$(
  awk -v RS= -v ORS="\n\n" '/"type": *"final_response"/ {print}' "$TMPFILE" \
  | sed 's/^data: //g' \
  | jq -r '.data.response // empty' 2>/dev/null || true
)

if [ -n "$FINAL_MSG" ]; then
  printf "\n\033[1mFinal:\033[0m %s\n" "$FINAL_MSG"
else
  printf "\n\033[1mFinal:\033[0m (no final_response found)\n"
fi
