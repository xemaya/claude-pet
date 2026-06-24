import { captionFor } from '../../src/view/captions';
import { initialState } from '../../src/core/petState';

const s = (over: any) => ({ ...initialState(0), ...over });

test('返回非空字符串', () => {
  expect(captionFor(s({ stage: 'egg' }), 0).length).toBeGreaterThan(0);
});
test('确定性:同状态同 idx → 同台词', () => {
  const st = s({ stage: 'hatchling', mood: 'working' });
  expect(captionFor(st, 3)).toBe(captionFor(st, 3));
});
test('轮选:同状态不同 idx 至少能选到不同台词', () => {
  const st = s({ stage: 'branched', branch: 'debugger', mood: 'working' });
  const seen = new Set([0, 1, 2, 3].map(i => captionFor(st, i)));
  expect(seen.size).toBeGreaterThan(1);
});
test('分支 working 用专属池(debugger 含侦探梗)', () => {
  const st = s({ stage: 'branched', branch: 'debugger', mood: 'working' });
  const all = [0, 1, 2, 3].map(i => captionFor(st, i)).join(' ');
  expect(all).toMatch(/bug|可疑|堆栈|凶手|🔍/);
});
test('evolving 优先于一切', () => {
  const st = s({ stage: 'branched', branch: 'builder', mood: 'evolving' });
  expect(captionFor(st, 0)).toMatch(/转职|进化|脱胎|升级/);
});
test('负 idx 不崩', () => {
  expect(captionFor(s({ mood: 'idle' }), -1).length).toBeGreaterThan(0);
});
