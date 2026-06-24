import { PetState } from '../core/petState';

// ── 漫画台词种子词库 ──
// 随便改:每个池子是一组候选,状态行每刷新按时间相位轮选一条。
// 加/删/改句子都行;只要每个池子至少留 1 条。
const POOLS = {
  egg: [
    '新人报到!',
    '还在熟悉环境…',
    '请多指教~',
  ],
  idle: [
    '……(打盹 💤)',
    '在等你开工',
    '无聊地数 token',
    '要不…再写两行?',
  ],
  thinking: [
    '让我想想…',
    '脑子转起来了',
    '嗯……这题有点东西',
  ],
  working: [
    '干就完了',
    '手在动了',
    '专注.exe 运行中',
  ],
  done: [
    '搞定!🎉',
    '这轮收工',
    '又是高产的一天',
    '✅ 下一个',
  ],
  confused: [
    '咦?出岔子了',
    '等一下…这不对',
    '我看看哪里红了',
  ],
  evolving: [
    '我转职啦!✨',
    '脱胎换骨!',
    '升级——!',
  ],
  eat: [
    '好吃~ 🍪',
    '能量+1',
    '边吃边干',
  ],
  battle: [
    '吃我一击!',
    '这 bug 我盯上了 🔍',
    '哪里跑!',
    '看招——',
  ],
  sleep: [
    '……zzZ 💤',
    '打个盹…',
    '叫我就醒',
    '(发呆中)',
  ],
  // 分支 × 干活 的专属吐槽
  builder_working: [
    '叮叮当当造起来 🔨',
    '又盖了一间',
    '代码添砖加瓦',
    '结构在长大',
  ],
  debugger_working: [
    '这 bug 我盯上了 🔍',
    '可疑…非常可疑',
    '让我看看堆栈',
    '凶手就在这几行里',
  ],
  scholar_working: [
    '翻书中 📖',
    '这段我读过…',
    '知识 +1',
    '让我查查文档',
  ],
} as const;

// 空闲时穿插的"玩法提示"——教用户怎么玩(只列真实可用的功能)。
const TIPS = [
  '💬 /pet 跟我唠两句~',
  '👍 夸我我点头,👎 我摇头给你看',
  '✍️ 多写代码喂我,攒 xp 能升级转职',
  '🔨Edit多→工匠 · 🔍Bash多→侦探 · 📖Read多→学者',
  '✦ 攒够里程碑头顶会亮星星哦',
] as const;

function poolFor(state: PetState): readonly string[] {
  if (state.mood === 'evolving') return POOLS.evolving;
  if (state.stage === 'egg') return POOLS.egg;
  if (state.mood === 'confused') return POOLS.confused;
  if (state.mood === 'done') return POOLS.done;
  if (state.mood === 'thinking') return POOLS.thinking;
  if (state.mood === 'working') {
    if (state.branch === 'builder') return POOLS.builder_working;
    if (state.branch === 'debugger') return POOLS.debugger_working;
    if (state.branch === 'scholar') return POOLS.scholar_working;
    return POOLS.working;
  }
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

/** 场景台词:按场景类别选专属池,'none' 时跟随情绪。 */
export function captionForScene(state: PetState, kind: string, idx: number): string {
  switch (kind) {
    case 'chest': return pick(POOLS.evolving, idx);
    case 'cookie': return pick(POOLS.eat, idx);
    case 'battle': return pick(POOLS.battle, idx);
    case 'build': return pick(POOLS.builder_working, idx);
    case 'study': return pick(POOLS.scholar_working, idx);
    // 打盹=空闲:每 3 拍穿插一条玩法提示,教用户怎么玩
    case 'sleep': return idx % 3 === 2 ? pick(TIPS, Math.floor(idx / 3)) : pick(POOLS.sleep, idx);
    default: return captionFor(state, idx);
  }
}
