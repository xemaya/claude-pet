import { PetState } from '../core/petState';
import { SWAMPED_AT } from '../core/backlog';

// ── 漫画台词种子词库 ──
// 随便改:每个池子是一组候选,状态行每刷新按时间相位轮选一条。
// 加/删/改句子都行;只要每个池子至少留 1 条。
const POOLS = {
  egg: [
    '入职第一天,工牌还没发…',
    'onboarding 中,啥都不会',
    '说好的双休呢?',
    '新来的牛马,请多关照 🐂',
  ],
  idle: [
    '摸鱼中 🐟 别戳穿我',
    '带薪发呆.exe',
    '老板不在,放个风',
    '工位都长蘑菇了…',
    '这点工资,爱干干',
    '什么时候发工资啊喂',
  ],
  thinking: [
    '在算这月绩效…',
    '让我想想怎么甩锅',
    '这需求…装没看见行吗',
    '脑子 buffering…别催',
  ],
  working: [
    '又是为老板搬砖的一天 🧱',
    'KPI 还差亿点点',
    '搬砖.jpg 进行中',
    '这活干得我尾巴都秃了',
    '资本家的饼是真大啊',
  ],
  done: [
    '今日 KPI 达标!(才不是为你)',
    '下班!…哦还没',
    '又是高产的牛马一天 🐂',
    '这波我超额了,加鸡腿吧老板',
    '收工,工资记得打啊喂',
  ],
  confused: [
    '需求又双叒变了?!',
    '锅从天降,稳稳接住',
    '这 bug…肯定是甲方的锅',
    '它昨天还好好的(打工人之歌)',
    '先别慌,八成是缓存',
  ],
  evolving: [
    '我升职加薪啦!✨',
    '喜提工龄 +1!',
    '绩效 A!老板良心发现?',
  ],
  eat: [
    '工资到账,先恰一口 🍖',
    '干饭是打工人的尊严',
    '这顿我自己请(血汗钱)',
    '吃饱了才有力气搬砖',
  ],
  battle: [
    '这 bug 我盯上了 🔍',
    '加班也要弄死你',
    '哪里跑!',
    '看招——为了准点下班',
  ],
  sleep: [
    '……zzZ(带薪假寐)💤',
    '梦到双休了…',
    '叫我下班就醒',
    '工位假寐,专业的',
  ],
} as const;

// 空闲时穿插的"玩法提示"——教用户怎么玩(只列真实可用的功能)。
const TIPS = [
  '💬 /pet 跟我唠两句~',
  '👍 夸我我点头,👎 我摇头给你看',
  '✍️ 你写代码=给我派活,攒 KPI 升工龄',
  '💰 工资攒够我自己买吃的(不用你管)',
  '🏆 KPI 破里程碑就升职加薪',
] as const;

function poolFor(state: PetState): readonly string[] {
  if (state.mood === 'evolving') return POOLS.evolving;
  if (state.stage === 'egg') return POOLS.egg;
  if (state.mood === 'confused') return POOLS.confused;
  if (state.mood === 'done') return POOLS.done;
  if (state.mood === 'thinking') return POOLS.thinking;
  if (state.mood === 'working') return POOLS.working; // 动物都是打工人,不分职业
  return POOLS.idle;
}

function pick(pool: readonly string[], idx: number): string {
  return pool[((idx % pool.length) + pool.length) % pool.length]; // 防负
}

/** 按状态选池子,按相位 idx 轮选一条台词。空闲时每 3 拍穿插一条玩法提示。纯函数、确定性。 */
export function captionFor(state: PetState, idx: number): string {
  if (state.mood === 'idle' && state.stage !== 'egg' && idx % 3 === 2) {
    return pick(TIPS, Math.floor(idx / 3));
  }
  return pick(poolFor(state), idx);
}

// 工种(随时间轮换):[名, 量词]
const WORK_UNITS: [string, string][] = [
  ['奶茶', '杯'], ['PPT', '份'], ['报表', '张'], ['周报', '份'], ['需求', '个'], ['Excel', '张'], ['会', '场'],
];
const CLEARED = [
  '活干完了!摸鱼时间 🐟',
  '难得清空,带薪发呆',
  '老板不在,放个风~',
  '双休是不可能的,但先歇会',
];

/**
 * 待办量 → 台词:清空=摸鱼;加了人(headcount>1)=人月神话吐槽;堆成山=抱怨;否则埋头干。
 * 工种名随 idx 轮换。headcount = 当前一起干活的动物数。
 */
export function backlogCaption(backlog: number, idx: number, headcount = 1): string {
  if (backlog <= 0) return pick(CLEARED, idx);
  const [u, m] = WORK_UNITS[((Math.floor(idx / 2) % WORK_UNITS.length) + WORK_UNITS.length) % WORK_UNITS.length];
  if (headcount > 1) {
    // 大厂逻辑:活多就加 HC;加了人也救不了——人月神话石锤
    const crew = [
      `加了 ${headcount} 只还是做不完…`,
      `${headcount} 个牛马一起搬,人月神话石锤`,
      '老板:活多就加人!(加完更乱)',
      '十月怀胎,加人也变不成 5 个月啊',
      `${headcount} 只一起开摆,${backlog} 件就 ${backlog} 件吧`,
      `人是加了,饼摊得更大了`,
    ];
    return pick(crew, idx);
  }
  const swamped = [
    `活堆成山!还有 ${backlog} ${m}${u}没做 (>﹏<)`,
    `${backlog} ${m}${u}压头上,救命 💢`,
    '又来大活??老板你有点良心',
    `做不完了…根本做不完(${backlog} 件)`,
  ];
  const busy = [
    `还剩 ${backlog} ${m}${u},埋头干`,
    `待办 ${backlog},正在消化中…`,
    `${backlog} ${m}${u}排队等我,马上`,
    `搬砖.jpg(还有 ${backlog} 件)`,
  ];
  return pick(backlog >= SWAMPED_AT ? swamped : busy, idx);
}

/** 场景台词:按场景类别选专属池,'none' 时跟随情绪。 */
export function captionForScene(state: PetState, kind: string, idx: number): string {
  switch (kind) {
    case 'chest': return pick(POOLS.evolving, idx);
    case 'cookie': return pick(POOLS.eat, idx);
    case 'battle': return pick(POOLS.battle, idx);
    case 'build': return pick(POOLS.working, idx);
    case 'study': return pick(POOLS.working, idx);
    // 打盹=空闲:每 3 拍穿插一条玩法提示,教用户怎么玩
    case 'sleep': return idx % 3 === 2 ? pick(TIPS, Math.floor(idx / 3)) : pick(POOLS.sleep, idx);
    default: return captionFor(state, idx);
  }
}
