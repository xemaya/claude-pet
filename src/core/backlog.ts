import { PetEvent } from './events';

// 派活队列:你每跑一个工具 = 给打工动物派 1 件活(待办 +1);动物很勤劳,持续消化。
// 活堆起来"加人"(大厂逻辑:活多就加 HC)——人手随积压上升,总消化速度 = 人手 × 单只速度。
// 待办内部封顶(BACKLOG_MAX),猛干时钉在封顶不飙到上千;停手就快速清空(隔夜的活也会被消化掉)。
export const WORK_PER_TOOL = 1;       // 一个工具调用 = 一件活
export const DRAIN_PER_SEC = 0.5;     // 单只每秒消化 0.5 件(≈2 秒一件)
export const BACKLOG_MAX = 99;        // 待办封顶(避免上千的天文数字)
export const SWAMPED_AT = 10;         // ≥ 这个数 = 堆成山 + 加到 2 人
export const STRIKE_AT = 50;          // ≥ 这个数 = 集体罢工/已读乱回

/** 按积压定人手(大厂加 HC):<10 一只,10~29 两只,≥30 三只一起搬。 */
export function headcountFor(backlog: number): number {
  if (backlog >= 30) return 3;
  if (backlog >= SWAMPED_AT) return 2;
  return 1;
}

/**
 * 当前待办量:按时间顺序 fold 事件——工具到达 +1(夹到 BACKLOG_MAX),两事件之间按"人手×单只速度"扣减
 * (不为负),最后再消化到 now。人手随当前积压变(piecewise)。确定性、无副作用,适合无状态渲染。
 */
export function backlogAt(events: PetEvent[], now: number): number {
  let backlog = 0;
  let last: number | null = null;
  for (const e of events) {
    if (last !== null) {
      const dt = (e.ts - last) / 1000;
      backlog = Math.max(0, backlog - headcountFor(backlog) * DRAIN_PER_SEC * dt);
    }
    if (e.type === 'tool_start') backlog = Math.min(BACKLOG_MAX, backlog + WORK_PER_TOOL);
    last = e.ts;
  }
  if (last !== null) {
    const dt = (now - last) / 1000;
    backlog = Math.max(0, backlog - headcountFor(backlog) * DRAIN_PER_SEC * dt);
  }
  return Math.round(backlog);
}
