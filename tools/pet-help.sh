#!/usr/bin/env bash
# /pet help:把一句"玩法菜单"显示到状态栏对话框(轮着冒,免得太长)。
SAYSH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pet-say.sh"
TIPS=(
  "💬 /pet <话> 跟我聊 · 👍夸我点头/👎损我摇头"
  "✍️ 写代码喂我攒xp:Edit→工匠🔨 Bash→侦探🔍 Read→学者📖"
  "🪙 /pet shop 逛商城 · /pet 买草帽 · /pet 戴猫耳"
  "♻️ /pet reset 转生(清空重来+周目) · ✦攒里程碑亮星"
)
# 按当前秒轮选一条,多敲几次 help 能看全
I=$(( $(date +%s) % ${#TIPS[@]} ))
bash "$SAYSH" "${TIPS[$I]}"
