export type PetEventType =
  | 'session_start' | 'prompt_submit' | 'tool_start'
  | 'tool_end' | 'turn_end' | 'notification';

const VALID: ReadonlySet<string> = new Set([
  'session_start', 'prompt_submit', 'tool_start', 'tool_end', 'turn_end', 'notification',
]);

export interface PetEvent {
  ts: number;
  type: PetEventType;
  tool?: string;
  isError?: boolean;
}

export function parseEventLine(line: string): PetEvent | null {
  let raw: any;
  try { raw = JSON.parse(line); } catch { return null; }
  if (!raw || typeof raw.type !== 'string' || !VALID.has(raw.type)) return null;
  const e: PetEvent = { ts: typeof raw.ts === 'number' ? raw.ts : 0, type: raw.type };
  if (typeof raw.tool === 'string') e.tool = raw.tool;
  if (raw.isError === true) e.isError = true;
  return e;
}
