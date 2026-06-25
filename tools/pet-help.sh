#!/usr/bin/env bash
# /pet help:把一句"玩法菜单"显示到状态栏对话框(轮着冒,免得太长)。
SAYSH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pet-say.sh"
TIPS=(
  "💬 /pet <话> 跟我唠 · 👍夸我点头/👎损我摇头"
  "✍️ 你写代码=给我派活,攒 KPI 升工龄"
  "💰 工资攒够我自己买吃的(不用你管)🍖"
  "♻️ /pet reset 重新入职(+周目) · 🏆KPI破里程碑就升职"
)
# 按当前秒轮选一条,多敲几次 help 能看全
I=$(( $(date +%s) % ${#TIPS[@]} ))
bash "$SAYSH" "${TIPS[$I]}"
