import { Grid } from './halfblock';
import { PetState } from '../core/petState';

// 道具全部 1-bit 白剪影(与动物园动物同色),'.' = 透明、'e' = 白。
const P: Record<string, string | null> = {
  '.': null,
  e: '#e2e6f0',
};

function exp(rows: string[]): Grid {
  return rows.map(row => [...row].map(ch => P[ch] ?? null));
}

export type PropKey = 'cookie' | 'chest' | 'bug' | 'bugHit' | 'brick' | 'book';

export const PROPS: Record<PropKey, Grid> = {
  // 干饭:鸡腿 🍖(配 status 的 🍖)
  cookie: exp([
    '..eeee..',
    '.eeeeee.',
    '.eeeeee.',
    '..eeee..',
    '...ee...',
    '..e..e..',
  ]),
  // 升职:奖杯(替代旧宝箱)
  chest: exp([
    'eeeeeeee',
    'e.eeee.e',
    'eeeeeeee',
    '.eeeeee.',
    '..eeee..',
    '...ee...',
    '..eeee..',
    '.eeeeee.',
  ]),
  // 报错/甲方的锅:小虫
  bug: exp([
    '.e....e.',
    '..eeee..',
    '.eeeeee.',
    'eeeeeeee',
    '.eeeeee.',
    'e.e..e.e',
  ]),
  // 挨打帧(战斗第2帧):身体微动 + 溅星,与 bug 帧不同形成动画
  bugHit: exp([
    'e.e..e.e',
    '.eeeeee.',
    'eeeeeeee',
    'eeeeeeee',
    '.e.ee.e.',
    'e..ee..e',
  ]),
  // 搬砖:砖墙(留缝当砖缝)
  brick: exp([
    'eeeeeeee',
    'eee.eeee',
    'eeeeeeee',
    'e.eeee.e',
    'eeeeeeee',
  ]),
  // 文档:一本书
  book: exp([
    '.eeeeee.',
    'eeeeeeee',
    'e.eeee.e',
    'eeeeeeee',
    'e.eeee.e',
    '.eeeeee.',
  ]),
};

export type SceneKind = 'chest' | 'battle' | 'cookie' | 'build' | 'study' | 'sleep' | 'none';

/** 按状态选场景类别。优先级:转职 > 报错战斗 > 投食 > 按分支干活 > 打盹 > 无。 */
export function sceneFor(state: PetState, ate: boolean): SceneKind {
  if (state.mood === 'evolving') return 'chest';
  if (state.mood === 'confused') return 'battle';
  if (ate) return 'cookie';
  if (state.mood === 'working') {
    if (state.branch === 'builder') return 'build';
    if (state.branch === 'scholar') return 'study';
    if (state.branch === 'debugger') return 'battle';
  }
  if (state.mood === 'idle') return 'sleep';
  return 'none';
}

/** 场景类别 + 动画相位 → 实际道具网格(无道具返回 null)。battle 两帧轮换。 */
export function propForScene(kind: SceneKind, animFrame: number): Grid | null {
  switch (kind) {
    case 'chest': return PROPS.chest;
    case 'cookie': return PROPS.cookie;
    case 'build': return PROPS.brick;
    case 'study': return PROPS.book;
    case 'battle': return animFrame % 2 === 0 ? PROPS.bug : PROPS.bugHit;
    case 'sleep': return null; // 打盹只用台词 💤
    default: return null;
  }
}
