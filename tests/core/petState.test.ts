import { initialState } from '../../src/core/petState';

test('初始态是一颗蛋', () => {
  const s = initialState(1000);
  expect(s.stage).toBe('egg');
  expect(s.branch).toBeNull();
  expect(s.xp).toBe(0);
  expect(s.activityPoints).toEqual({ builder: 0, debugger: 0, scholar: 0 });
  expect(s.totalTurns).toBe(0);
  expect(s.mood).toBe('idle');
  expect(s.bornAt).toBe(1000);
  expect(s.lastEventTs).toBe(1000);
});
