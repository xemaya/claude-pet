# 素材署名

## 默认形象(随包发布)= CC0 动物

发布包内置的默认皮肤(6 形态:蛋/幼体/工匠/侦探/学者/全能)取自:
- **Tiny Creatures**(Kenney 风格,16×16)— https://opengameart.org/content/tiny-creatures
- 许可:**CC0 1.0**(公共领域,可自由分发);由 `tools/bake-sprites.py` 抠背景烘焙成 `src/view/animalSprites.ts`。

## 美少女皮肤(本地可选,**不随包分发**)

- **PIPOYA FREE RPG Character Sprites 32×32** — https://pipoya.itch.io/pipoya-free-rpg-character-sprites-32x32
- 许可:免费可商用,署名自愿,**禁止转售/再分发原始素材**。
- 因此本仓库/npm 包**不含**任何 PIPOYA 数据。想用美少女:自行下载 PIPOYA,本地跑
  `python3 tools/bake-girls.py <Female目录>` → 烘焙到 `~/.claude-pet/skin.json`(运行时优先加载,只在你本机)。
  删掉 `~/.claude-pet/skin.json` 即回到默认 CC0 动物。

## 换任意皮肤

把 6 形态的 16/32px PNG 准备好,仿 `tools/bake-girls.py` 烘焙成 `~/.claude-pet/skin.json`(`{形态: 颜色网格}`)即可。
