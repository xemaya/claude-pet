import { captionForScene } from '../../src/view/captions';
import { initialState } from '../../src/core/petState';
test('sleep 场景每3拍穿插玩法提示', () => {
  const s = { ...initialState(0), mood: 'idle' as const, stage: 'branched' as const };
  const outs = [0,1,2,3,4,5].map(i => captionForScene(s, 'sleep', i));
  // idx%3===2 处应是 /pet 之类提示
  expect(outs[2].includes('/pet') || outs[2].includes('👍') || outs[2].includes('xp') || outs[2].includes('✦') || outs[2].includes('→')).toBe(true);
  expect(outs[0]).not.toBe(outs[2]); // 提示 ≠ 打盹词
});
