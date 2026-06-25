import { backlogAt, headcountFor, WORK_PER_TOOL, DRAIN_PER_SEC, SWAMPED_AT, BACKLOG_MAX } from '../../src/core/backlog';
import { PetEvent } from '../../src/core/events';

const tool = (ts: number): PetEvent => ({ ts, type: 'tool_start', tool: 'Edit' });

test('每个工具 +1 待办', () => {
  const evs = [tool(1000), tool(1000), tool(1000)];
  expect(backlogAt(evs, 1000)).toBe(3 * WORK_PER_TOOL);
});

test('随时间被消化(不为负)', () => {
  const evs = [tool(0)]; // 1 件活
  // 过 1 件活该消化掉的时间后 → 0
  const drainMs = (1 / DRAIN_PER_SEC) * 1000;
  expect(backlogAt(evs, drainMs)).toBe(0);
  expect(backlogAt(evs, drainMs * 100)).toBe(0); // 不会变负
});

test('猛干堆积、停手清空', () => {
  const burst = Array.from({ length: 20 }, (_, i) => tool(i * 100)); // 2s 内 20 件
  const right_after = backlogAt(burst, 2000);
  expect(right_after).toBeGreaterThan(10); // 堆成山
  const drainMs = (20 / DRAIN_PER_SEC) * 1000;
  expect(backlogAt(burst, 2000 + drainMs)).toBe(0); // 停手够久 → 清空
});

test('turn_end 不算派活', () => {
  const evs: PetEvent[] = [{ ts: 1000, type: 'turn_end' }];
  expect(backlogAt(evs, 1000)).toBe(0);
});

test('活多加人(headcount 随积压升)', () => {
  expect(headcountFor(0)).toBe(1);
  expect(headcountFor(SWAMPED_AT - 1)).toBe(1);
  expect(headcountFor(SWAMPED_AT)).toBe(2);
  expect(headcountFor(29)).toBe(2);
  expect(headcountFor(30)).toBe(3);
  expect(headcountFor(999)).toBe(3); // 封顶 3 只
});

test('待办封顶,不飙到上千', () => {
  const flood = Array.from({ length: 5000 }, (_, i) => tool(i)); // 5000 件活同一时刻附近
  expect(backlogAt(flood, 5000)).toBeLessThanOrEqual(BACKLOG_MAX);
});
