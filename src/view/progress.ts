import { PetState, Branch } from '../core/petState';
import { CONFIG } from '../core/config';

const BRANCH_LABEL: Record<Branch, string> = {
  builder: '工匠', debugger: '侦探', scholar: '学者', balanced: '全能',
};

/**
 * 等级:指数曲线,每级所需是上一级的 2 倍。
 * 到达 Lv L 的累计 xp = base*(2^(L-1)-1),base=CONFIG.xpPerLevel。
 * 反解:Lv = floor(log2(xp/base + 1)) + 1。
 */
export function levelOf(xp: number): number {
  return Math.floor(Math.log2(Math.max(0, xp) / CONFIG.xpPerLevel + 1)) + 1;
}

/** 成体:已转职且 xp 过 adultXp(加冠/大师)。 */
export function isAdult(state: PetState): boolean {
  return state.stage === 'branched' && state.xp >= CONFIG.adultXp;
}

/** 称号:新人 / 见习 / (大)工匠… */
export function titleFor(state: PetState): string {
  if (state.stage === 'egg') return '新人';
  if (state.stage === 'hatchling') return '见习';
  const base = state.branch ? BRANCH_LABEL[state.branch] : '全能';
  return (isAdult(state) ? '大' : '') + base;
}

/** 已达成的里程碑数(✦)。 */
export function milestonesReached(xp: number): number {
  return CONFIG.milestones.filter(m => xp >= m).length;
}
