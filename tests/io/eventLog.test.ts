import { parseNewLines } from '../../src/io/eventLog';

const L1 = '{"ts":1,"type":"prompt_submit"}\n';
const L2 = '{"ts":2,"type":"tool_start","tool":"Edit"}\n';

test('从 0 读全部', () => {
  const r = parseNewLines(L1 + L2, 0);
  expect(r.events.map(e => e.type)).toEqual(['prompt_submit', 'tool_start']);
  expect(r.newOffset).toBe((L1 + L2).length);
});
test('从上次偏移只读新增', () => {
  const r = parseNewLines(L1 + L2, L1.length);
  expect(r.events.map(e => e.type)).toEqual(['tool_start']);
  expect(r.newOffset).toBe((L1 + L2).length);
});
test('坏行被跳过但偏移仍推进', () => {
  const content = L1 + 'garbage\n' + L2;
  const r = parseNewLines(content, 0);
  expect(r.events.map(e => e.type)).toEqual(['prompt_submit', 'tool_start']);
  expect(r.newOffset).toBe(content.length);
});
test('无完整新行时不前进(末尾半行留到下次)', () => {
  const content = L1 + '{"ts":3,"type":"turn';  // 半行
  const r = parseNewLines(content, 0);
  expect(r.events.map(e => e.type)).toEqual(['prompt_submit']);
  expect(r.newOffset).toBe(L1.length);  // 半行不消费
});
test('offset 超过内容长度(日志被截断)→ 从头重读', () => {
  const fresh = '{"ts":9,"type":"turn_end"}\n';
  const r = parseNewLines(fresh, 9999);          // 旧 offset 远超新内容
  expect(r.events.map(e => e.type)).toEqual(['turn_end']);
  expect(r.newOffset).toBe(fresh.length);
});
