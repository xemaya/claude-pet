import { foodFor } from '../../src/view/food';

test('工匠系工具掉饼干', () => {
  for (const t of ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
    expect(foodFor({ ts: 1, type: 'tool_start', tool: t })).toBe('cookie');
});
test('Bash 掉螺丝豆', () => {
  expect(foodFor({ ts: 1, type: 'tool_start', tool: 'Bash' })).toBe('bolt');
});
test('学者系工具掉书页', () => {
  for (const t of ['Read', 'Grep', 'Glob'])
    expect(foodFor({ ts: 1, type: 'tool_start', tool: t })).toBe('page');
});
test('其它工具掉碎屑', () => {
  expect(foodFor({ ts: 1, type: 'tool_start', tool: 'WebFetch' })).toBe('crumb');
});
test('turn_end 是正餐', () => {
  expect(foodFor({ ts: 1, type: 'turn_end' })).toBe('meal');
});
test('notification/prompt_submit/session_start 不投食', () => {
  expect(foodFor({ ts: 1, type: 'notification' })).toBeNull();
  expect(foodFor({ ts: 1, type: 'prompt_submit' })).toBeNull();
  expect(foodFor({ ts: 1, type: 'session_start' })).toBeNull();
});
test('tool_end 不投食(投食只在 tool_start)', () => {
  expect(foodFor({ ts: 1, type: 'tool_end', tool: 'Edit' })).toBeNull();
});
