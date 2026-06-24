import { parseEventLine } from '../../src/core/events';

test('解析合法工具事件', () => {
  const e = parseEventLine('{"ts":1700000000000,"type":"tool_start","tool":"Edit"}');
  expect(e).toEqual({ ts: 1700000000000, type: 'tool_start', tool: 'Edit' });
});

test('解析 turn_end', () => {
  expect(parseEventLine('{"ts":1,"type":"turn_end"}')).toEqual({ ts: 1, type: 'turn_end' });
});

test('坏 JSON 返回 null', () => {
  expect(parseEventLine('not json')).toBeNull();
});

test('缺 type 返回 null', () => {
  expect(parseEventLine('{"ts":1}')).toBeNull();
});

test('未知 type 返回 null', () => {
  expect(parseEventLine('{"ts":1,"type":"wat"}')).toBeNull();
});
