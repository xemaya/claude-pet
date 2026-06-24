import { Grid } from './halfblock';
import { Mood } from '../core/petState';

// 漫画情绪符号(头顶右上角飘)——不碰角色的脸,纯通用叠加,任何皮肤都能用。
const Y = '#ffe24a', R = '#ff5a5a', B = '#8fd0ff', P = '#ff8fc0', n = null;
const g = (rows: string[], map: Record<string, string | null>): Grid =>
  rows.map((r) => [...r].map((c) => (c === '.' ? null : map[c] ?? null)));

const SPARKLE = g(['.Y.', 'YYY', '.Y.'], { Y });            // ✨ 完成/进化(黄星)
const DOTS = g(['.....', 'B.B.B'], { B });                  // … 思考(三点)
const EXCLAIM = g(['RR', 'RR', '..', 'RR'], { R });         // ! 报错(红叹号)
const SWEAT = g(['.B', 'BB', 'BB'], { B });                 // 💧 干活冒汗

/** 按心情给一个情绪符号(无则 null)。脸是单帧贴图不能动,靠这个补表情。 */
export function emoteFor(mood: Mood): Grid | null {
  switch (mood) {
    case 'thinking': return DOTS;
    case 'working': return SWEAT;
    case 'done': return SPARKLE;
    case 'confused': return EXCLAIM;
    case 'evolving': return SPARKLE;
    default: return null; // idle 不冒符号(打盹靠台词 💤)
  }
}
