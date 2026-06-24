import { Grid } from './halfblock';
import { BodyKey } from './spriteKey';
import { ANIMAL_SPRITES } from './animalSprites';

// 表情键(对应一张 3x3 九宫格的 9 格,按行优先)。
export type ExprKey =
  | 'neutral' | 'smile' | 'blink' | 'laugh' | 'surprised'
  | 'think' | 'cry' | 'sleepy' | 'angry';

/**
 * 一个形态的精灵:可以是单帧网格(动物皮/旧 skin.json),
 * 也可以是按表情分的多帧(自绘美少女皮)。
 */
export type FormSprites = Grid | Partial<Record<ExprKey, Grid>>;

/** 皮肤 = 六形态。运行时可被 ~/.claude-pet/skin.json 覆盖。 */
export type Skin = Record<BodyKey, FormSprites>;

/** 取某形态某表情的网格;单帧皮肤忽略表情;缺该表情则回退 neutral。 */
export function spriteFor(skin: Skin, body: BodyKey, expr: ExprKey): Grid {
  const f = skin[body];
  if (Array.isArray(f)) return f;                       // 单帧
  return f[expr] ?? f.neutral ?? Object.values(f)[0] as Grid;
}

/** 发布默认皮肤(目前是 CC0 动物单帧;自绘多表情皮烘好后替换)。 */
export const DEFAULT_SKIN: Skin = ANIMAL_SPRITES;
