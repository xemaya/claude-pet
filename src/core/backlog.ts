import { PetEvent } from './events';

// 派活队列:你每跑一个工具 = 给打工动物派 1 件活(待办 +1);动物很勤劳,持续消化。
// 活堆起来时"加人"(大厂逻辑:活多就加 HC)——人手随积压上升,总消化速度 = 人手 × 单只速度。
// 所以你猛干会先堆起来→自动加人→慢慢追上;停手就快速清空。隔夜的活也会在空闲时被消化掉。
export const WORK_PER_TOOL = 1;       // 一个工具调用 = 一件活
export const DRAIN_PER_SEC = 0.3;     // 单只每秒消化 0.3 件(≈3.3 秒一件)
export const SWAMPED_AT = 8;          // 待办 ≥ 这个数 = 堆成山,开始抱怨 + 加到 2 人

/** 按积压定人手(大厂加 HC):<8 一只,8~24 两只,≥25 三只一起搬。 */
export function headcountFor(backlog: number): number {
  if (backlog >= 25) return 3;
  if (backlog >= SWAMPED_AT) return 2;
  return 1;
}

/**
 * 当前待办量:按时间顺序 fold 事件——工具到达 +1,两事件之间按"人手×单只速度"扣减(不为负),
 * 最后再消化到 now。人手随当前积压变(piecewise)。确定性、无副作用,适合无状态渲染。
 */
export function backlogAt(events: PetEvent[], now: number): number {
  let backlog = 0;
  let last: number | null = null;
  for (const e of events) {
    if (last !== null) {
      const dt = (e.ts - last) / 1000;
      backlog = Math.max(0, backlog - headcountFor(backlog) * DRAIN_PER_SEC * dt);
    }
    if (e.type === 'tool_start') backlog += WORK_PER_TOOL;
    last = e.ts;
  }
  if (last !== null) {
    const dt = (now - last) / 1000;
    backlog = Math.max(0, backlog - headcountFor(backlog) * DRAIN_PER_SEC * dt);
  }
  return Math.round(backlog);
}
