import { propForScene, SceneKind } from './props';
import { BodyKey } from './spriteKey';
import { Skin, ExprKey, spriteFor } from './skin';
import { Grid, toHalfBlockRows } from './halfblock';

const GAP = 6;       // 角色与道具间距(像素列)
const MAX_H = 24;    // 画布高上限(像素)→ 半块后 ≤12 行;高于此只取上半身省垂直空间

// 成体加冠:小金冠,叠在头顶正中
const G = '#f7e36a', Y = '#fff3a0', O = '#8a6a10';
const CROWN: Grid = [
  [G, null, G, null, G, null, G],
  [O, G, G, G, G, G, O],
  [O, Y, Y, Y, Y, Y, O],
];

function blit(canvas: Grid, sprite: Grid, ox: number, oy: number): void {
  for (let y = 0; y < sprite.length; y++) {
    for (let x = 0; x < sprite[y].length; x++) {
      const c = sprite[y][x];
      if (!c) continue;
      const cy = oy + y;
      const cx = ox + x;
      if (cy >= 0 && cy < canvas.length && cx >= 0 && cx < canvas[0].length) canvas[cy][cx] = c;
    }
  }
}

/**
 * 像素画布:角色在左,道具(若有)在右侧近底;成体则头顶加冠。高度裁到 MAX_H(取上半身)。
 * bob ∈ {0,1}:idle 呼吸——角色整体上下浮 1px(上下各留 1px 余量,绝不裁切)。
 */
const PADX = 1;                          // 左右各留 1px,供 shake 水平抖动(dx∈{-1,0,1})
export function composeCanvas(
  skin: Skin, bodyKey: BodyKey, prop: Grid | null, adult = false, bob = 0, dx = 0,
  hat: Grid | null = null, effect: Grid | null = null, emote: Grid | null = null,
  expr: ExprKey = 'neutral',
): Grid {
  const body = spriteFor(skin, bodyKey, expr);
  const bodyW = body[0].length;
  const H = Math.min(body.length, MAX_H);
  const Hc = H + 2;                       // 上下各留 1px,供浮动
  const W = (prop ? bodyW + GAP + prop[0].length : bodyW) + PADX * 2;
  const canvas: Grid = Array.from({ length: Hc }, () => Array<string | null>(W).fill(null));
  const oy = Math.max(0, Math.min(2, bob)); // 垂直偏移 0=抬/1=常/2=沉(呼吸、点头多幅度)
  const ox = PADX + dx;                   // shake 时角色左右抖
  blit(canvas, body, ox, oy);
  // 头顶装备:戴了帽子用帽子,否则成体戴金冠
  const head = hat ?? (adult ? CROWN : null);
  if (head) blit(canvas, head, ox + Math.floor((bodyW - head[0].length) / 2), oy);
  // 情绪符号:漫画式飘在头部右上方(略高于头、偏右,贴着头不太远)
  if (emote) blit(canvas, emote, ox + Math.floor(bodyW / 2) + 2, Math.max(0, oy - 1));
  // 临时特效:头顶上方居中飘(随角色一起浮)
  if (effect) blit(canvas, effect, ox + Math.floor((bodyW - effect[0].length) / 2), Math.max(0, oy - 1));
  if (prop) blit(canvas, prop, PADX + bodyW + GAP, Hc - prop.length - 1); // 道具不抖
  return canvas;
}

// 终端显示宽度:CJK/全角算 2,其余 1
export function dispWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦　-〿]/.test(ch) ? 2 : 1;
  return w;
}

/** 按终端显示宽度折行(中文也折);超过 maxLines 行则截断 + 省略号。 */
export function wrapByWidth(text: string, max: number, maxLines = 3): string[] {
  const out: string[] = [];
  let cur = '', w = 0;
  for (const ch of text) {
    const cw = dispWidth(ch);
    if (w + cw > max && cur) { out.push(cur); cur = ''; w = 0; }
    cur += ch; w += cw;
  }
  if (cur) out.push(cur);
  if (out.length > maxLines) {
    const t = out.slice(0, maxLines);
    t[maxLines - 1] = t[maxLines - 1].replace(/.$/, '…');
    return t;
  }
  return out.length ? out : [''];
}

/**
 * 多行对话框;按显示宽度对齐,CJK 不错位。
 * dividerIdx:在该行之前插一条 ├──┤ 分隔线(用于把"台词区"与"状态区"分开)。
 */
export function dialogBox(lines: string[], dividerIdx?: number): string[] {
  const inner = Math.max(...lines.map(dispWidth));
  const bar = '─'.repeat(inner + 2);
  const out = [`╭${bar}╮`];
  for (let i = 0; i < lines.length; i++) {
    if (dividerIdx !== undefined && i === dividerIdx) out.push(`├${bar}┤`);
    out.push(`│ ${lines[i]}${' '.repeat(inner - dispWidth(lines[i]))} │`);
  }
  out.push(`╰${bar}╯`);
  return out;
}

/**
 * 完整漫画格:像素场景 + 头部右侧对话框(台词+状态)。
 * 每行加 ANSI 复位护栏(防 Claude 逐行 trim 把 sprite 削斜)。
 */
export function renderScenePanel(
  skin: Skin, bodyKey: BodyKey, kind: SceneKind, animFrame: number,
  caption: string, status: string, adult = false, bob = 0, dx = 0,
  hat: Grid | null = null, effect: Grid | null = null, emote: Grid | null = null,
  expr: ExprKey = 'neutral',
): string {
  const prop = propForScene(kind, animFrame);
  const canvas = composeCanvas(skin, bodyKey, prop, adult, bob, dx, hat, effect, emote, expr);
  const W = canvas[0].length;                                     // sprite 行的显示宽(用于补齐对话框比 sprite 高的行)
  const rows = toHalfBlockRows(canvas);
  const capLines = wrapByWidth(caption, 36, 3);                   // 对话区宽一倍(24→36)、最多 3 行
  const box = dialogBox([...capLines, status], capLines.length);  // 台词区 ├──┤ 状态区
  for (let i = 0; i < box.length; i++) {
    const r = 1 + i; // 贴在头部高度
    while (rows.length <= r) rows.push(' '.repeat(W)); // 对话框比 sprite 高时补空行,绝不丢掉底边框
    rows[r] = `${rows[r]}  ${box[i]}`;
  }
  rows.push(''); // 末尾留一空行:避免底边框被下方 UI 覆盖截断(用户要的"高一格")
  return rows.map(l => '\x1b[0m' + l).join('\n');
}
