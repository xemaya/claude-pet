export type Grid = (string | null)[][];

function rgb(c: string): [number, number, number] {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}

/** 颜色网格 → 半块字符行(每字符=上下两像素;▀ fg=上 bg=下,▄ fg=下,空=透明)。 */
export function toHalfBlockRows(grid: Grid): string[] {
  const h = grid.length;
  const w = h ? grid[0].length : 0;
  const rows: string[] = [];
  for (let cy = 0; cy < Math.floor(h / 2); cy++) {
    let s = '';
    for (let x = 0; x < w; x++) {
      const t = grid[cy * 2][x];
      const b = grid[cy * 2 + 1][x];
      if (t && b) {
        const [tr, tg, tb] = rgb(t);
        const [br, bg, bb] = rgb(b);
        s += `\x1b[38;2;${tr};${tg};${tb};48;2;${br};${bg};${bb}m▀\x1b[0m`;
      } else if (t) {
        const [r, g, bl] = rgb(t);
        s += `\x1b[38;2;${r};${g};${bl}m▀\x1b[0m`;
      } else if (b) {
        const [r, g, bl] = rgb(b);
        s += `\x1b[38;2;${r};${g};${bl}m▄\x1b[0m`;
      } else {
        s += ' ';
      }
    }
    rows.push(s);
  }
  return rows;
}
