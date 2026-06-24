import { composeCanvas, dialogBox, dispWidth, wrapByWidth, renderScenePanel } from '../../src/view/scene';
import { DEFAULT_SKIN } from '../../src/view/skin';
import { PROPS } from '../../src/view/props';

const BW = DEFAULT_SKIN.debugger[0].length; // 默认皮肤角色宽

test('无道具时画布宽=角色宽+2(左右各留 1px 供 shake)', () => {
  expect(composeCanvas(DEFAULT_SKIN, 'debugger', null)[0].length).toBe(BW + 2);
});
test('有道具时画布更宽(角色+gap+道具+左右余量)', () => {
  expect(composeCanvas(DEFAULT_SKIN, 'debugger', PROPS.bug)[0].length).toBe(BW + 6 + PROPS.bug[0].length + 2);
});
test('shake:dx 两态角色左右抖(内容不同、不裁切)', () => {
  const l = composeCanvas(DEFAULT_SKIN, 'debugger', null, false, 0, -1);
  const r = composeCanvas(DEFAULT_SKIN, 'debugger', null, false, 0, 1);
  expect(JSON.stringify(l)).not.toBe(JSON.stringify(r));
  const count = (g: typeof l) => g.flat().filter(Boolean).length;
  expect(count(l)).toBe(count(r)); // 只是位置差,像素不丢
});
test('道具被合成进画布(出现宝箱金色)', () => {
  expect(composeCanvas(DEFAULT_SKIN, 'debugger', PROPS.chest).flat()).toContain('#d9a528');
});
test('dispWidth:CJK 算 2', () => {
  expect(dispWidth('出bug了')).toBe(7);
});
test('dialogBox:多行等宽、各行被框', () => {
  const box = dialogBox(['出bug了!', '侦探 · 50xp']);
  expect(box[0].length).toBe(box[box.length - 1].length);
  expect(box[0].startsWith('╭')).toBe(true);
  expect(box.some(l => l.includes('出bug了!'))).toBe(true);
  expect(box.some(l => l.includes('侦探 · 50xp'))).toBe(true);
});
test('dialogBox:dividerIdx 处插入 ├──┤ 分隔线', () => {
  const box = dialogBox(['台词', '状态'], 1);
  expect(box.some(l => l.startsWith('├') && l.endsWith('┤'))).toBe(true);
  const hr = box.findIndex(l => l.startsWith('├'));
  expect(box[hr - 1]).toContain('台词'); // 分隔线在状态行之前、台词行之后
  expect(box[hr + 1]).toContain('状态');
});
test('renderScenePanel:含台词+状态(对话框)+半块', () => {
  const out = renderScenePanel(DEFAULT_SKIN, 'scholar', 'cookie', 0, '好吃~', '学者 · 50xp');
  expect(out).toContain('好吃~');
  expect(out).toContain('学者 · 50xp');
  expect(out).toContain('╭');
  expect(out.includes('▀') || out.includes('▄')).toBe(true);
});
test('wrapByWidth:长中文按宽度折行,超 maxLines 截断省略', () => {
  const long = '哼谁谁开心了我只是你commit了三次都没报错我才勉强翘个嘴角而已啦';
  const lines = wrapByWidth(long, 12, 3);
  expect(lines.length).toBeLessThanOrEqual(3);
  for (const l of lines) expect(dispWidth(l)).toBeLessThanOrEqual(12 + 1);
  expect(lines.length).toBe(3);
  expect(lines[2].endsWith('…')).toBe(true); // 太长被截断
});
test('renderScenePanel:长台词折成多行进对话框', () => {
  const out = renderScenePanel(DEFAULT_SKIN, 'debugger', 'none', 0, '哼谁谁开心了我只是你commit了三次都没报错', '侦探·50xp');
  expect(out).toContain('哼谁谁开心了');
  expect(out).toContain('╭');
});
test('renderScenePanel:台词↔状态间有分隔线', () => {
  const out = renderScenePanel(DEFAULT_SKIN, 'scholar', 'cookie', 0, '好吃~', '学者 · 50xp');
  expect(out).toContain('├');
});
test('composeCanvas:bob 两态角色上下浮 1px(不裁切)', () => {
  const rest = composeCanvas(DEFAULT_SKIN, 'debugger', null, false, 0);
  const up = composeCanvas(DEFAULT_SKIN, 'debugger', null, false, 1);
  // 同尺寸画布,但角色行偏移 → 内容不同
  expect(rest.length).toBe(up.length);
  expect(JSON.stringify(rest)).not.toBe(JSON.stringify(up));
  // 不裁切:两态非空像素数相等(只是位置差 1px)
  const count = (g: typeof rest) => g.flat().filter(Boolean).length;
  expect(count(rest)).toBe(count(up));
});
test('renderScenePanel:battle 两帧不同(动画)', () => {
  const a = renderScenePanel(DEFAULT_SKIN, 'debugger', 'battle', 0, '看招', 's');
  const b = renderScenePanel(DEFAULT_SKIN, 'debugger', 'battle', 1, '看招', 's');
  expect(a).not.toBe(b);
});
