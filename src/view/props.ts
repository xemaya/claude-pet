import { Grid } from './halfblock';
import { PetState } from '../core/petState';

// 共享调色板;'.' = 透明。道具用彩色,跟 1-bit 白动物拉开区分(白道具会和白动物糊一起)。
const P: Record<string, string | null> = {
  '.': null,
  o: '#4a2f1a', w: '#8a5a2a', W: '#b07a3a', g: '#d9a528', y: '#ffe04a', k: '#241208', s: '#fff7c0', // 宝箱/奖杯
  n: '#5a3a22', c: '#cf9244', h: '#6e3f17', // 饼/鸡腿
  m: '#3a1448', p: '#8a3aa0', P: '#b060c0', e: '#ffffff', r: '#e0455a', l: '#5a2070', // bug 怪
  B: '#b0623a', M: '#7a5038', // 砖
  R: '#c0392b', u: '#ece6d8', // 书(红封 + 书页)
  G: '#f7e36a', // 闪光/星/金币
  D: '#2b3a55', F: '#e6b48a', // 老板:西装深蓝 + 肤色
};

function exp(rows: string[]): Grid {
  return rows.map(row => [...row].map(ch => P[ch] ?? null));
}

export type PropKey = 'cookie' | 'chest' | 'bug' | 'bugHit' | 'brick' | 'book' | 'boss';

export const PROPS: Record<PropKey, Grid> = {
  cookie: exp([
    '............',
    '...nnnnnn...',
    '..nccccccn..',
    '.nccccccccn.',
    '.ncchcccccn.',
    '.nccccchccn.',
    '.nchccccccn.',
    '..nccccccn..',
    '...nnnnnn...',
    '............',
  ]),
  chest: exp([
    '...s....s...',
    '..oooooooo..',
    '.oWWWWWWWWo.',
    '.oWggggggWo.',
    '.oWWWWWWWWo.',
    '.okyyyyyyko.',
    '.owwwwwwwwo.',
    '.owwggggwwo.',
    '.owwwwwwwwo.',
    '..oooooooo..',
  ]),
  bug: exp([
    '...m....m...',
    '....mmmm....',
    '..mppppppm..',
    '.mppppppppm.',
    '.mpekppkepm.',
    '.mpprrrrppm.',
    '..mppppppm..',
    'l..l..l..l..',
    '............',
  ]),
  // 挨打帧:X 眼 + 头顶闪光,身体微缩(战斗第2帧)
  bugHit: exp([
    '..G..ss..G..',
    '...G.mm.G...',
    '...mppppm...',
    '..mpkppkpm..',
    '..mpkppkpm..',
    '..mprrrrpm..',
    '...mppppm...',
    '..l..ll..l..',
    '............',
  ]),
  // 砖墙(搬砖)
  brick: exp([
    'BBBBMBBBBB',
    'MMMMMMMMMM',
    'BBMBBBBBMB',
    'MMMMMMMMMM',
    'BBBBMBBBBB',
    'MMMMMMMMMM',
  ]),
  // 书(红封 + 书页)
  book: exp([
    '..oooooo..',
    '.oRRRRRRo.',
    '.oRRuuRRo.',
    '.oRRRRRRo.',
    '.oRRRRRRo.',
    '.oRRuuRRo.',
    '.oRRRRRRo.',
    '.ouuuuuuo.',
    '..oooooo..',
  ]),
  // 老板(西装人,彩色,跟白动物区分):路过吓得假装干活
  boss: exp([
    '..kkkk..',
    '.kFFFFk.',
    '.FkFFkF.',
    '.FFFFFF.',
    '..DDDD..',
    '.DDRDDD.',
    '.DDRDDD.',
    '.DD..DD.',
  ]),
};

// 发薪金币雨(金色,头顶飘):payday fx
export const COINS_FX: Grid = exp([
  '.G..G.',
  '..G.G.',
  'G..G..',
  '.G.G..',
]);

export type SceneKind = 'chest' | 'battle' | 'cookie' | 'build' | 'study' | 'sleep' | 'boss' | 'none';

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
    case 'boss': return PROPS.boss;
    case 'sleep': return null; // 打盹只用台词 💤
    default: return null;
  }
}
