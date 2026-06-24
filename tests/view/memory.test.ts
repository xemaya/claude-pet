import { recallCaption } from '../../src/view/memory';

test('无历史返回 null', () => {
  expect(recallCaption([], 0)).toBeNull();
});
test('有历史拼出回忆台词,含原话(截断)', () => {
  const out = recallCaption(['今天 commit 了三次都没报错'], 4);
  expect(out).toBeTruthy();
  expect(out).toContain('今天 commit');
});
test('确定性:同 idx 同输入同输出,不同 idx 选不同说法/消息', () => {
  const msgs = ['第一句很长很长很长很长很长', '第二句'];
  expect(recallCaption(msgs, 2)).toBe(recallCaption(msgs, 2));
  // 长句被截断带省略号
  expect(recallCaption(['一二三四五六七八九十十一十二十三'], 0)).toContain('…');
});
