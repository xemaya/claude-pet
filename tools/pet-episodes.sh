#!/usr/bin/env bash
# /pet 编剧情:把 Claude(haiku)生成的桥段(JSON 数组)校验后并进 episodes.json。
# 引擎读取时 = 默认桥段表 + 这个文件;每帧按 context 选播。只保留最近 40 条。
# 用法: pet-episodes.sh '[{"when":{"boss":true},"say":"...","fx":["boss","sweat"]}, ...]'
DIR="${CLAUDE_PET_DIR:-$HOME/.claude-pet}"
mkdir -p "$DIR"
F="$DIR/episodes.json"
INPUT="$1"
SAYSH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pet-say.sh"

N=$(python3 - "$F" "$INPUT" <<'PY'
import json, sys
path, raw = sys.argv[1], sys.argv[2]
FLAGS = {'deepNight','payday','boss','striking','swamped','idle'}
FX = {'dim','boss','coins','sweat','zzz','heart'}
try:
    incoming = json.loads(raw)
    if not isinstance(incoming, list): incoming = []
except Exception:
    incoming = []
try:
    existing = json.load(open(path))
    if not isinstance(existing, list): existing = []
except Exception:
    existing = []

clean = []
for e in incoming:
    if not isinstance(e, dict): continue
    say = e.get('say')
    when = e.get('when')
    if not isinstance(say, str) or not say.strip(): continue
    if not isinstance(when, dict): continue
    w = {k: True for k, v in when.items() if k in FLAGS and v is True}
    if not w: continue  # 必须至少一个有效条件
    fx = [f for f in e.get('fx', []) if f in FX] if isinstance(e.get('fx'), list) else []
    clean.append({'when': w, 'say': say.strip()[:30], 'fx': fx})

# 合并 + 按 say 去重(新覆盖旧)+ 只留最近 40
merged = existing + clean
seen, out = set(), []
for e in reversed(merged):
    s = e.get('say')
    if s in seen: continue
    seen.add(s); out.append(e)
out = list(reversed(out))[-40:]
json.dump(out, open(path, 'w'), ensure_ascii=False)
print(len(clean))
PY
)

N="${N:-0}"
bash "$SAYSH" "新编了 ${N} 段剧情~ 凑齐条件就给你演 (๑•̀ㅂ•́)و"
