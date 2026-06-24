import { PetEvent } from './events';
import { PetState, Mood } from './petState';
import { CONFIG } from './config';
import { computeBranch } from './branch';

const BUILDER = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const DEBUGGER = new Set(['Bash']);
const SCHOLAR = new Set(['Read', 'Grep', 'Glob']);

function moodFor(event: PetEvent): Mood | null {
  switch (event.type) {
    case 'prompt_submit': return 'thinking';
    case 'tool_start': return 'working';
    case 'turn_end': return 'done';
    case 'notification': return 'confused';
    case 'tool_end': return event.isError ? 'confused' : null;
    case 'session_start': return 'idle';
    default: return null;
  }
}

export function reduce(state: PetState, event: PetEvent): PetState {
  const next: PetState = { ...state, activityPoints: { ...state.activityPoints } };

  // 快线:mood
  const m = moodFor(event);
  if (m) next.mood = m;
  next.lastEventTs = event.ts;

  // 慢线:XP + 行为分
  if (event.type === 'turn_end') {
    next.xp += CONFIG.xpPerTurn;
    next.totalTurns += 1;
  } else if (event.type === 'tool_start') {
    next.xp += CONFIG.xpPerTool;
    const t = event.tool ?? '';
    if (BUILDER.has(t)) next.activityPoints.builder += 1;
    else if (DEBUGGER.has(t)) next.activityPoints.debugger += 1;
    else if (SCHOLAR.has(t)) next.activityPoints.scholar += 1;
  }

  // 进化(只前不退):egg → hatchling → branched
  // 两个 if 独立(非 else-if):允许一次事件连跨两级。当前 config 下 egg 阶段 XP 不可能直接破 300,
  // 但若 config 调大也按"只前不退"语义正确连进。
  if (next.stage === 'egg' && next.xp >= CONFIG.hatchXp) {
    next.stage = 'hatchling';
    next.mood = 'evolving';
  }
  if (next.stage === 'hatchling' && next.xp >= CONFIG.evolveXp) {
    next.stage = 'branched';
    next.branch = computeBranch(next.activityPoints, CONFIG.balancedThreshold);
    next.mood = 'evolving';
  }

  return next;
}
