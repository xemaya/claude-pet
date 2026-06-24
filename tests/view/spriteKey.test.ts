import { bodyKeyFor, faceKeyFor } from '../../src/view/spriteKey';
import { initialState } from '../../src/core/petState';

const s = (over: any) => ({ ...initialState(0), ...over });

test('egg/hatchling 阶段 body', () => {
  expect(bodyKeyFor(s({ stage: 'egg' }))).toBe('egg');
  expect(bodyKeyFor(s({ stage: 'hatchling' }))).toBe('hatchling');
});
test('branched body = 分支名', () => {
  expect(bodyKeyFor(s({ stage: 'branched', branch: 'builder' }))).toBe('builder');
  expect(bodyKeyFor(s({ stage: 'branched', branch: 'debugger' }))).toBe('debugger');
  expect(bodyKeyFor(s({ stage: 'branched', branch: 'scholar' }))).toBe('scholar');
  expect(bodyKeyFor(s({ stage: 'branched', branch: 'balanced' }))).toBe('balanced');
});
test('branched 但 branch 异常 → 兜底 balanced', () => {
  expect(bodyKeyFor(s({ stage: 'branched', branch: null }))).toBe('balanced');
});
test('faceKeyFor 返回当前 mood', () => {
  expect(faceKeyFor(s({ mood: 'working' }))).toBe('working');
});
