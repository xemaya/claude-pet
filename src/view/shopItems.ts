import { Grid } from './halfblock';

// 商品像素图调色板;'.' = 透明
const P: Record<string, string | null> = {
  '.': null,
  k: '#241208', K: '#3a2410',          // 黑/深棕(礼帽)
  n: '#7a4a1e', y: '#e6c45a', Y: '#fff0a0', // 草帽:棕边/麦黄/高光
  r: '#d6314a', R: '#ff5a72', e: '#fff7f0', // 红/亮红/白(圣诞、爱心)
  p: '#e58fb0', P: '#c46a90',          // 粉(猫耳/蝴蝶结)
  g: '#5fd0c0', b: '#5aa0ff', o: '#ffb347', // 杂色(特效:青/蓝/橙星)
};

function exp(rows: string[]): Grid {
  return rows.map((row) => [...row].map((ch) => P[ch] ?? null));
}

export type ItemType = 'hat' | 'effect';
export interface ShopItem {
  id: string;
  name: string;          // 中文名(buy/wear 识别用)
  price: number;
  type: ItemType;
  grid: Grid;            // hat:头顶贴;effect:头顶上方飘的叠加贴
  durationMs?: number;   // effect 持续时长
}

// ── 帽子/配饰(永久,戴头顶,像成体金冠一样 blit)──
const HATS: ShopItem[] = [
  {
    id: 'straw', name: '草帽', price: 30, type: 'hat', grid: exp([
      '...nnnnn...',
      '..nyYYYyn..',
      '.nyyyyyyyn.',
      'nnnnnnnnnnn',
    ]),
  },
  {
    id: 'catears', name: '猫耳', price: 40, type: 'hat', grid: exp([
      'pp.......pp',
      'pPp.....pPp',
      '.Pp.....pP.',
    ]),
  },
  {
    id: 'tophat', name: '礼帽', price: 50, type: 'hat', grid: exp([
      '...kkkkk...',
      '...kkkkk...',
      '...kkkkk...',
      '.kkkkkkkkk.',
      'KKKKKKKKKKK',
    ]),
  },
  {
    id: 'santa', name: '圣诞帽', price: 60, type: 'hat', grid: exp([
      '........ee.',
      '.....rree..',
      '..rrrrrr...',
      '.rrrrrr....',
      'eeeeeeeee..',
    ]),
  },
  {
    id: 'bow', name: '蝴蝶结', price: 35, type: 'hat', grid: exp([
      'pp..p..pp',
      'pPp.p.pPp',
      'pp..p..pp',
    ]),
  },
];

// ── 零食(临时特效,买了头顶飘几秒)──
const EFFECTS: ShopItem[] = [
  {
    id: 'hearts', name: '爱心', price: 20, type: 'effect', durationMs: 8000, grid: exp([
      '.r.....r.',
      'rRr...rRr',
      '.rRr.rRr.',
      '..rRrRr..',
      '...rRr...',
    ]),
  },
  {
    id: 'fireworks', name: '烟花', price: 25, type: 'effect', durationMs: 8000, grid: exp([
      'b..o..g..',
      '.b.o.g...',
      'oogYYboo.',
      '.b.o.g...',
      'b..o..g..',
    ]),
  },
];

export const SHOP_ITEMS: ShopItem[] = [...HATS, ...EFFECTS];

/** 按中文名/英文 id 模糊找商品(buy/wear 用)。 */
export function findItem(query: string): ShopItem | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  for (const it of SHOP_ITEMS) {
    if (it.id === q || it.name === query.trim()) return it;
  }
  for (const it of SHOP_ITEMS) {
    if (query.includes(it.name) || q.includes(it.id)) return it;
  }
  return null;
}

export function itemById(id: string | null): ShopItem | null {
  return id ? SHOP_ITEMS.find((i) => i.id === id) ?? null : null;
}
