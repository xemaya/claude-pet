import { parseEventLine, PetEvent } from '../core/events';

export function parseNewLines(
  content: string,
  fromOffset: number,
): { events: PetEvent[]; newOffset: number } {
  const start = fromOffset > content.length ? 0 : fromOffset;
  const slice = content.slice(start);
  const lastNl = slice.lastIndexOf('\n');
  if (lastNl < 0) return { events: [], newOffset: start };  // 无完整行
  const complete = slice.slice(0, lastNl + 1);
  const events: PetEvent[] = [];
  for (const line of complete.split('\n')) {
    if (!line.trim()) continue;
    const e = parseEventLine(line);
    if (e) events.push(e);
  }
  return { events, newOffset: start + complete.length };
}
