import { levelOf, isAdult, titleFor, milestonesReached } from '../../src/view/progress';
import { initialState } from '../../src/core/petState';
import { CONFIG } from '../../src/core/config';

const s = (over: any) => ({ ...initialState(0), ...over });

test('指数等级:每级所需翻倍(Lv2@100 Lv3@300 Lv5@1500)', () => {
  expect(levelOf(0)).toBe(1);
  expect(levelOf(99)).toBe(1);
  expect(levelOf(100)).toBe(2);
  expect(levelOf(300)).toBe(3);
  expect(levelOf(700)).toBe(4);
  expect(levelOf(1500)).toBe(5);
  expect(levelOf(12700)).toBe(8);
});
test('成体:已转职且 xp≥adultXp', () => {
  expect(isAdult(s({ stage: 'branched', branch: 'debugger', xp: CONFIG.adultXp - 1 }))).toBe(false);
  expect(isAdult(s({ stage: 'branched', branch: 'debugger', xp: CONFIG.adultXp }))).toBe(true);
  expect(isAdult(s({ stage: 'hatchling', xp: CONFIG.adultXp + 1 }))).toBe(false); // 没转职不算成体
});
test('称号:动物都是打工人,资深=卷王打工人', () => {
  expect(titleFor(s({ stage: 'egg' }))).toBe('打工人');
  expect(titleFor(s({ stage: 'hatchling' }))).toBe('打工人');
  expect(titleFor(s({ stage: 'branched', branch: 'scholar', xp: CONFIG.adultXp - 1 }))).toBe('打工人');
  expect(titleFor(s({ stage: 'branched', branch: 'scholar', xp: CONFIG.adultXp }))).toBe('卷王打工人');
});
test('里程碑计数', () => {
  const [m0, m1] = CONFIG.milestones;
  expect(milestonesReached(m0 - 1)).toBe(0);
  expect(milestonesReached(m1 - 1)).toBe(1);
  expect(milestonesReached(99_999_999)).toBe(CONFIG.milestones.length);
});
