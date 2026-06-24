import { Grid } from './halfblock';
import { BodyKey } from './spriteKey';
import { ANIMAL_SPRITES } from './animalSprites';

/** 皮肤 = 六形态的像素网格。运行时可被 ~/.claude-pet/skin.json 覆盖。 */
export type Skin = Record<BodyKey, Grid>;

/** 发布默认皮肤:Tiny Creatures(CC0,可自由分发)。 */
export const DEFAULT_SKIN: Skin = ANIMAL_SPRITES;
