#!/usr/bin/env bash
# 让宠物在状态栏对话框"说话":pet-say.sh "短台词"。写 ~/.claude-pet/say.json,30s 内状态行优先显示。
# 可选环境变量:
#   PET_REACT=nod|shake   附带一个反应动作(点头/摇头),前 3s 播放。
#   PET_LOG_USER="原话"    把用户这句追加到 chat-history.jsonl(供空闲回忆)。
DIR="${CLAUDE_PET_DIR:-$HOME/.claude-pet}"
mkdir -p "$DIR"
TEXT="$*"
REACT="${PET_REACT:-}"

# 记忆:把用户原话存进历史(供 run.ts 空闲回忆)
if [ -n "${PET_LOG_USER:-}" ]; then
  UESC=$(printf '%s' "$PET_LOG_USER" | tr -d '\n' | sed 's/\\/\\\\/g; s/"/\\"/g')
  printf '{"role":"user","text":"%s","ts":%s000}\n' "$UESC" "$(date +%s)" >> "$DIR/chat-history.jsonl"
fi

# JSON 转义反斜杠与双引号(去掉换行)
ESC=$(printf '%s' "$TEXT" | tr -d '\n' | sed 's/\\/\\\\/g; s/"/\\"/g')
if [ -n "$REACT" ]; then
  printf '{"text":"%s","ts":%s000,"react":"%s"}\n' "$ESC" "$(date +%s)" "$REACT" > "$DIR/say.json"
else
  printf '{"text":"%s","ts":%s000}\n' "$ESC" "$(date +%s)" > "$DIR/say.json"
fi
