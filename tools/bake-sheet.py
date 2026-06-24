#!/usr/bin/env python3
"""把 gpt-image-2 出的 3x3 表情九宫格(品红底)烘焙成多表情皮肤 skin.json。

每张图 = 一个形态的 9 表情;按行优先映射到 EXPR_ORDER。
输出: { 形态: { 表情: 颜色网格 } },网格元素为 "#rrggbb" 或 null(透明)。

用法: python3 bake-sheet.py <sprites目录> <输出skin.json> [--height 24]
  sprites目录里需有 egg.png hatchling.png builder.png debugger.png scholar.png balanced.png
"""
import sys, json
from pathlib import Path
from PIL import Image, ImageFilter

EXPR_ORDER = ["neutral", "smile", "blink", "laugh", "surprised", "think", "cry", "sleepy", "angry"]
FORMS = ["egg", "hatchling", "builder", "debugger", "scholar", "balanced"]
MAGENTA = (255, 0, 255)


def is_bg(px, tol=60):
    r, g, b = px[0], px[1], px[2]
    return abs(r - 255) < tol and g < tol and abs(b - 255) < tol  # 品红及其抗锯齿边


def bake_cell(cell: Image.Image, height: int):
    cell = cell.convert("RGBA")
    px = cell.load()
    W, H = cell.size
    # 1) 抠品红背景
    for y in range(H):
        for x in range(W):
            if is_bg(px[x, y]):
                px[x, y] = (0, 0, 0, 0)
    # 2) 内容 bbox
    bbox = cell.getbbox()
    if not bbox:
        return [[None]]
    cell = cell.crop(bbox)
    # 完整角色(头+身);不裁身子,避免"只剩一颗大头"
    # 收边 2px:腐蚀 alpha,削掉品红与角色交界的抗锯齿毛刺(杂色主因)
    r, g, b, a = cell.split()
    a = a.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MinFilter(3))
    # 满分辨率先压平到 8 色(去掉插画阴影/抖动 → 缩小不生成橄榄绿杂色)
    flat = Image.merge("RGB", (r, g, b)).quantize(colors=8, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
    cell = Image.merge("RGBA", (*flat.split(), a))
    # 3) 缩到目标高度(保持比例)
    w, h = cell.size
    tw = max(1, round(w * height / h))
    small = cell.resize((tw, height), Image.NEAREST)  # 已压平,用 NEAREST 保持纯色不再混色
    # 4) alpha 阈值
    rgb = small.convert("RGB")
    a = small.split()[3]
    grid = []
    for y in range(height):
        row = []
        for x in range(tw):
            if a.getpixel((x, y)) < 128:
                row.append(None)
            else:
                r, g, b = rgb.getpixel((x, y))
                row.append(f"#{r:02x}{g:02x}{b:02x}")
        grid.append(row)
    return grid


def bake_sheet(path: Path, height: int):
    im = Image.open(path).convert("RGB")
    W, H = im.size
    cw, ch = W // 3, H // 3
    out = {}
    for i, expr in enumerate(EXPR_ORDER):
        cx, cy = i % 3, i // 3
        cell = im.crop((cx * cw, cy * ch, (cx + 1) * cw, (cy + 1) * ch))
        out[expr] = bake_cell(cell, height)
    return out


def main():
    src = Path(sys.argv[1]); dst = Path(sys.argv[2])
    height = int(sys.argv[sys.argv.index("--height") + 1]) if "--height" in sys.argv else 24
    skin = {}
    for form in FORMS:
        p = src / f"{form}.png"
        if not p.exists():
            print(f"[MISS] {p}"); continue
        skin[form] = bake_sheet(p, height)
        print(f"[OK] {form}: {list(skin[form])} ({len(skin[form]['neutral'][0])}x{height})")
    dst.write_text(json.dumps(skin))
    print(f"wrote {dst} ({dst.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
