import { reduce } from '../../src/core/reducer';
import { initialState } from '../../src/core/petState';

const base = () => initialState(0);

test('prompt_submit → thinking', () => {
  expect(reduce(base(), { ts: 1, type: 'prompt_submit' }).mood).toBe('thinking');
});
test('tool_start → working', () => {
  expect(reduce(base(), { ts: 1, type: 'tool_start', tool: 'Edit' }).mood).toBe('working');
});
test('turn_end → done', () => {
  expect(reduce(base(), { ts: 1, type: 'turn_end' }).mood).toBe('done');
});
test('notification → confused', () => {
  expect(reduce(base(), { ts: 1, type: 'notification' }).mood).toBe('confused');
});
test('tool_end isError → confused', () => {
  expect(reduce(base(), { ts: 1, type: 'tool_end', tool: 'Bash', isError: true }).mood).toBe('confused');
});
test('reduce 不改原 state(纯函数)', () => {
  const s = base();
  reduce(s, { ts: 5, type: 'turn_end' });
  expect(s.mood).toBe('idle');
  expect(s.lastEventTs).toBe(0);
});
test('lastEventTs 更新为事件时间', () => {
  expect(reduce(base(), { ts: 42, type: 'prompt_submit' }).lastEventTs).toBe(42);
});
