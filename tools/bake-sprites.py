#!/usr/bin/env python3
"""把 16x16 像素 PNG 烘焙成 src/view/animalSprites.ts(终端渲染用的颜色网格)。

用法:
  1. 下载 CC0 素材 Tiny Creatures: https://opengameart.org/content/tiny-creatures
     解压得到 Tiles/tile_0001.png ... tile_0180.png
  2. python3 bake-sprites.py <Tiles目录>
背景抠除:从边缘 flood-fill 删与边缘相连的背景色/低 alpha 像素(保住内部黑,如瞳孔)。
选哪几只在下面 CHOSEN 改(tile 号 → 形态)。依赖 Pillow。
"""
import sys, os, glob
from collections import deque
from PIL import Image

CHOSEN = {'egg': 85, 'hatchling': 119, 'builder': 164, 'debugger': 132, 'scholar': 118, 'balanced': 170}

def grid(path):
    im = Image.open(path).convert('RGBA')
    w, h = im.size; px = im.load()
    # Tiny Creatures 每个 tile 坐在一块圆角底卡上:黑角 (0,0,0) + 枣红底卡 (63,38,49)。
    # 两者都当背景,从边缘 flood-fill 抠掉(保住与边缘不相连的内部同色像素)。
    BG = {(0, 0, 0), (63, 38, 49)}
    trans = [[False] * w for _ in range(h)]
    def isbg(x, y):
        r, g, b, a = px[x, y]
        return a < 40 or (r, g, b) in BG
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if isbg(x, y): q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if isbg(x, y): q.append((x, y))
    while q:
        x, y = q.popleft()
        if trans[y][x] or not isbg(x, y): continue
        trans[y][x] = True
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x+dx, y+dy
            if 0 <= nx < w and 0 <= ny < h and not trans[ny][nx]: q.append((nx, ny))
    rows = []
    for y in range(h):
        row = []
        for x in range(w):
            if trans[y][x]: row.append(None)
            else:
                r, g, b, a = px[x, y]; row.append('#%02x%02x%02x' % (r, g, b))
        rows.append(row)
    return rows

def main():
    tiles_dir = sys.argv[1] if len(sys.argv) > 1 else 'Tiles'
    byn = {int(os.path.basename(p).split('_')[1].split('.')[0]): p
           for p in glob.glob(os.path.join(tiles_dir, 'tile_*.png'))}
    out = ["import { BodyKey } from './spriteKey';", '',
           '// 来自 Kenney 风格 Tiny Creatures(CC0),16x16。由 tools/bake-sprites.py 烘焙,勿手改。',
           'export const ANIMAL_SPRITES: Record<BodyKey, (string | null)[][]> = {']
    for k, t in CHOSEN.items():
        g = grid(byn[t])
        cells = ',\n    '.join('[' + ','.join('null' if c is None else f'"{c}"' for c in row) + ']' for row in g)
        out.append(f'  {k}: [\n    {cells},\n  ],')
    out.append('};')
    dst = os.path.join(os.path.dirname(__file__), '..', 'src', 'view', 'animalSprites.ts')
    open(dst, 'w').write('\n'.join(out))
    print('wrote', os.path.normpath(dst))

if __name__ == '__main__':
    main()
