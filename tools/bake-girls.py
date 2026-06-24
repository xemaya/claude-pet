#!/usr/bin/env python3
"""把 PIPOYA 32x32 chibi 角色烘焙成本机皮肤 ~/.claude-pet/skin.json(运行时优先加载)。

注意:PIPOYA 素材不可再分发,所以皮肤只烘焙到你**本机运行目录**,不进 git/npm 包。
发布包默认用 CC0 动物;你本机用这个换成美少女。

PIPOYA FREE RPG Character Sprites 32x32(免费可商用,勿转售):
  https://pipoya.itch.io/pipoya-free-rpg-character-sprites-32x32
正面 idle 帧 = 96x128 的 crop(32,0,64,32)。

用法:python3 bake-girls.py <存放 Female_*.png 的目录>
改阵容:下面 CHOSEN(形态 → 'NN-M')。依赖 Pillow。
"""
import sys, os, json
from PIL import Image

CHOSEN = {  # 形态 → PIPOYA Female id
    'egg': '20-2', 'hatchling': '04-2', 'builder': '11-2',
    'debugger': '05-2', 'scholar': '09-2', 'balanced': '23-1',
}

def grid(path):
    im = Image.open(path).convert('RGBA')
    im = im.crop((32, 0, 64, 32)) if im.size == (96, 128) else im.crop((0, 0, 32, 32))
    px = im.load(); w, h = im.size
    return [[None if px[x, y][3] < 40 else '#%02x%02x%02x' % px[x, y][:3] for x in range(w)] for y in range(h)]

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else '.'
    skin = {}
    for k, cid in CHOSEN.items():
        p = os.path.join(src, f'Female_{cid}.png')
        if not os.path.exists(p):
            p = os.path.join(src, f'Female {cid}.png')
        skin[k] = grid(p)
    dst = os.path.join(os.path.expanduser('~/.claude-pet'), 'skin.json')
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    json.dump(skin, open(dst, 'w'))
    print('wrote', dst, '— 重启/刷新状态行即用美少女皮肤(删掉它回到默认动物)')

if __name__ == '__main__':
    main()
