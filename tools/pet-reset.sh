#!/usr/bin/env bash
# 转生:清空成长(events.jsonl)回到新人重抽职业,并把"周目"+1(永久徽章)。
DIR="${CLAUDE_PET_DIR:-$HOME/.claude-pet}"
mkdir -p "$DIR"
PRE=$(python3 -c "import json,os;p='$DIR/prestige.json';print((json.load(open(p)).get('count',0) if os.path.exists(p) else 0)+1)" 2>/dev/null || echo 1)
printf '{"count":%s}\n' "$PRE" > "$DIR/prestige.json"
: > "$DIR/events.jsonl"
# 金币归零(已赚随 events 清空归零,已花也清零→余额 0),但衣橱(owned/equipped)保留
[ -f "$DIR/wallet.json" ] && sed -i '' 's/"spent":[0-9]*/"spent":0/' "$DIR/wallet.json" 2>/dev/null || true
echo "转生! 现在第 ${PRE} 周目 —— 宠物回到新人,按你接下来干的活重新转职。"
