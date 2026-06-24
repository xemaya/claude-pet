#!/usr/bin/env bash
# /pet 编台词:把 Claude(haiku)生成的多句新台词追加到"生成池" lines.jsonl。
# 状态栏空闲轮播时会把生成池和预设台词混着冒。只保留最近 40 条。
# 用法: pet-lines.sh "句1" "句2" ... (每句一个参数)
DIR="${CLAUDE_PET_DIR:-$HOME/.claude-pet}"
mkdir -p "$DIR"
F="$DIR/lines.jsonl"
n=0
for line in "$@"; do
  [ -z "$line" ] && continue
  ESC=$(printf '%s' "$line" | tr -d '\n' | sed 's/\\/\\\\/g; s/"/\\"/g')
  printf '{"text":"%s","ts":%s000}\n' "$ESC" "$(date +%s)" >> "$F"
  n=$((n + 1))
done
[ -f "$F" ] && { tail -n 40 "$F" > "$F.tmp" && mv "$F.tmp" "$F"; }  # 只留最近 40 条
bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pet-say.sh" "记下 ${n} 句新台词啦~ 空闲时蹦给你听 (๑•̀ㅂ•́)و"
