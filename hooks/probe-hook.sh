#!/usr/bin/env bash
# 探针:把触发它的事件名 + 时间戳追加到探针日志,证明 hook 真的 fire 了。
mkdir -p "$HOME/.claude-pet"
printf '{"ts":%s,"event":"%s"}\n' "$(date +%s000)" "${1:-unknown}" >> "$HOME/.claude-pet/probe.jsonl"
