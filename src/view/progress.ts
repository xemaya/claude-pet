import { PetState } from '../core/petState';
import { CONFIG } from '../core/config';

/**
 * 工龄等级:指数曲线,每级所需是上一级的 2 倍。
 * 到达 Lv L 的累计 xp = base*(2^(L-1)-1),base=CONFIG.xpPerLevel。
 * 反解:Lv = floor(log2(xp/base + 1)) + 1。
 */
export function levelOf(xp: number): number {
  return Math.floor(Math.log2(Math.max(0, xp) / CONFIG.xpPerLevel + 1)) + 1;
}

/** 资深:KPI 过 adultXp(熬成老员工,头顶冠=卷成管理层的梗)。 */
export function isAdult(state: PetState): boolean {
  return state.stage === 'branched' && state.xp >= CONFIG.adultXp;
}

/** 称号:动物都是打工人,资深的卷成"卷王"。不再有职业名(侦探/工匠…)。 */
export function titleFor(state: PetState): string {
  return isAdult(state) ? '卷王打工人' : '打工人';
}

/** 已达成的里程碑数(✦)。 */
export function milestonesReached(xp: number): number {
  return CONFIG.milestones.filter(m => xp >= m).length;
}
