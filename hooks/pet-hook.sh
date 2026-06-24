#!/usr/bin/env bash
# 用法:pet-hook.sh <event-type>。从 stdin 读 Claude Code 的 JSON,提取 tool_name,追加一行事件。
# 用 sed 抽取(免 python/jq 依赖,更通用)。
DIR="$HOME/.claude-pet"
mkdir -p "$DIR"
EVENT="${1:-unknown}"
PAYLOAD="$(cat)"
# 假设 Claude Code PreToolUse stdin 含 "tool_name":"..." —— 字段名不同就改这里
TOOL="$(printf '%s' "$PAYLOAD" | sed -n 's/.*"tool_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
TS="$(date +%s)000"
if [ -n "$TOOL" ]; then
  printf '{"ts":%s,"type":"%s","tool":"%s"}\n' "$TS" "$EVENT" "$TOOL" >> "$DIR/events.jsonl"
else
  printf '{"ts":%s,"type":"%s"}\n' "$TS" "$EVENT" >> "$DIR/events.jsonl"
fi
