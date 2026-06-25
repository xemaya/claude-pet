import { PetEvent } from './events';

// 派活队列:你每跑一个工具 = 给打工动物派 1 件活(待办 +1);它很勤劳,持续消化(每 DRAIN 秒清 1 件)。
// 所以你猛干活时待办堆起来,你一停它慢慢清空;隔夜的活也会在空闲时被消化掉(不会无限堆积)。
export const WORK_PER_TOOL = 1;       // 一个工具调用 = 一件活
export const DRAIN_PER_SEC = 0.1;     // 每秒消化 0.1 件(≈10 秒一件)
export const SWAMPED_AT = 10;         // 待办 ≥ 这个数 = 堆成山,开始抱怨

/**
 * 当前待办量:按时间顺序 fold 事件——工具到达时 +1,两事件之间按消化速率扣减(不为负),
 * 最后再从最后一个事件消化到 now。确定性、无副作用,适合无状态渲染。
 */
export function backlogAt(events: PetEvent[], now: number): number {
  let backlog = 0;
  let last: number | null = null;
  for (const e of events) {
    if (last !== null) backlog = Math.max(0, backlog - DRAIN_PER_SEC * (e.ts - last) / 1000);
    if (e.type === 'tool_start') backlog += WORK_PER_TOOL;
    last = e.ts;
  }
  if (last !== null) backlog = Math.max(0, backlog - DRAIN_PER_SEC * (now - last) / 1000);
  return Math.round(backlog);
}
