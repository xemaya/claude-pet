import { PetEvent } from '../core/events';

export type FoodType = 'cookie' | 'bolt' | 'page' | 'crumb' | 'meal';

const BUILDER = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const SCHOLAR = new Set(['Read', 'Grep', 'Glob']);

export function foodFor(event: PetEvent): FoodType | null {
  if (event.type === 'turn_end') return 'meal';
  if (event.type === 'tool_start') {
    const t = event.tool ?? '';
    if (BUILDER.has(t)) return 'cookie';
    if (t === 'Bash') return 'bolt';
    if (SCHOLAR.has(t)) return 'page';
    return 'crumb';
  }
  return null;
}
