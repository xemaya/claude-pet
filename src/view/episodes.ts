// 剧情桥段:数据驱动,不写逐场景 if/else。引擎每帧算 context(布尔标签),matcher 选最贴的桥段来播。
// 默认表内置(没 LLM 也能玩);以后 /pet 编剧情 让 haiku 往 episodes.json 追加新桥段,引擎照播。
// fx 是固定积木词表(引擎会渲染),LLM 只能从里面选 → 安全边界。

export type FxKey = 'dim' | 'boss' | 'coins' | 'sweat' | 'zzz' | 'heart';

// context 里可被桥段引用的布尔标签
export type CtxFlag = 'deepNight' | 'payday' | 'boss' | 'striking' | 'swamped' | 'idle';
export type Ctx = Record<CtxFlag, boolean>;

export interface Episode {
  when: Partial<Record<CtxFlag, boolean>>; // 需要满足的标签(全中才匹配)
  say: string;
  fx?: FxKey[];
  weight?: number;
}

// 固定 fx 词表(校验 LLM 输出用)
export const FX_KEYS: FxKey[] = ['dim', 'boss', 'coins', 'sweat', 'zzz', 'heart'];

// ── 内置默认桥段(发布兜底)──
export const DEFAULT_EPISODES: Episode[] = [
  // 老板路过:假装很忙
  { when: { boss: true }, say: '老板来了!假装很忙 💻', fx: ['boss', 'sweat'] },
  { when: { boss: true }, say: '眼睛盯屏幕,手别停(其实在摸鱼)', fx: ['boss', 'sweat'] },
  { when: { boss: true }, say: 'Alt+Tab 速度,练到肌肉记忆了', fx: ['boss', 'sweat'] },
  // 发薪:金币雨
  { when: { payday: true }, say: '发工资了!这个月又活下来了 🤑', fx: ['coins'] },
  { when: { payday: true }, say: '到账瞬间,已经想好怎么花光了', fx: ['coins'] },
  { when: { payday: true }, say: '为这点钱…算了真香,先恰一顿 🍖', fx: ['coins'] },
  // 深夜加班:调暗
  { when: { deepNight: true }, say: '又加班到这点…图啥啊 🌙', fx: ['dim'] },
  { when: { deepNight: true }, say: '夜深了,工位就我和 bug 还醒着', fx: ['dim'] },
  { when: { deepNight: true }, say: '身体被掏空,但需求还在排队', fx: ['dim'] },
  // 组合:深夜还堆成山(更惨)
  { when: { deepNight: true, swamped: true }, say: '半夜还在赶 deadline,人没了', fx: ['dim', 'sweat'] },
];

/**
 * 从桥段表里选一条匹配当前 context 的:where 标签全中才算匹配;
 * 优先级 = 条件越多越具体 > weight 越大;同档按 idx 轮选。无匹配返回 null(走常规台词)。
 */
export function matchEpisode(episodes: Episode[], ctx: Ctx, idx: number): Episode | null {
  const ok = episodes.filter((e) =>
    Object.entries(e.when).every(([k, v]) => ctx[k as CtxFlag] === v),
  );
  if (!ok.length) return null;
  const spec = (e: Episode) => Object.keys(e.when).length;
  const maxSpec = Math.max(...ok.map(spec));
  const top = ok.filter((e) => spec(e) === maxSpec);
  const maxW = Math.max(...top.map((e) => e.weight ?? 1));
  const best = top.filter((e) => (e.weight ?? 1) === maxW);
  return best[((idx % best.length) + best.length) % best.length];
}
