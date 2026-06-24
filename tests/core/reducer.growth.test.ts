import { reduce } from '../../src/core/reducer';
import { initialState, PetState } from '../../src/core/petState';
import { PetEvent } from '../../src/core/events';
import { CONFIG } from '../../src/core/config';

function feed(s: PetState, events: PetEvent[]): PetState {
  return events.reduce((acc, e) => reduce(acc, e), s);
}
const turn = (ts: number): PetEvent => ({ ts, type: 'turn_end' });
const tool = (ts: number, t: string): PetEvent => ({ ts, type: 'tool_start', tool: t });
const turnsFor = (xp: number) => Math.ceil(xp / CONFIG.xpPerTurn); // 凑够 xp 所需轮数

test('turn_end +5 XP 且 totalTurns+1', () => {
  const s = reduce(initialState(0), turn(1));
  expect(s.xp).toBe(CONFIG.xpPerTurn);
  expect(s.totalTurns).toBe(1);
});
test('tool_start +1 XP 且记对应行为分', () => {
  const s = reduce(initialState(0), tool(1, 'Edit'));
  expect(s.xp).toBe(CONFIG.xpPerTool);
  expect(s.activityPoints.builder).toBe(1);
});
test('Bash → debugger 分,Read → scholar 分,未知工具不计分', () => {
  let s = reduce(initialState(0), tool(1, 'Bash'));
  expect(s.activityPoints.debugger).toBe(1);
  s = reduce(s, tool(2, 'Read'));
  expect(s.activityPoints.scholar).toBe(1);
  s = reduce(s, tool(3, 'WebFetch'));
  expect(s.activityPoints).toEqual({ builder: 0, debugger: 1, scholar: 1 });
});
test('攒够 hatchXp 从 egg → hatchling 且 mood=evolving', () => {
  const n = turnsFor(CONFIG.hatchXp);
  const s = feed(initialState(0), Array.from({ length: n }, (_, i) => turn(i + 1)));
  expect(s.stage).toBe('hatchling');
  expect(s.mood).toBe('evolving');
});
test('攒够 evolveXp 从 hatchling → branched 并按行为分定型(builder)', () => {
  // 大量 Edit 攒满 builder 分,再用 turn 把 XP 推过 evolveXp
  const tools = Array.from({ length: 60 }, (_, i) => tool(i + 1, 'Edit')); // builder=60, +60xp
  const turns = Array.from({ length: turnsFor(CONFIG.evolveXp) }, (_, i) => turn(1000 + i));
  const s = feed(initialState(0), [...tools, ...turns]);
  expect(s.stage).toBe('branched');
  expect(s.branch).toBe('builder');
});
test('XP 与 stage 永不倒退(纯正向)', () => {
  const s = feed(initialState(0), [turn(1), turn(2), { ts: 3, type: 'notification' }]);
  expect(s.xp).toBe(2 * CONFIG.xpPerTurn);  // notification 不减 XP
  expect(s.stage).toBe('egg');              // 未倒退(2 轮 < hatchXp)
});
test('已进化的 stage 收到 notification 不倒退', () => {
  const n = turnsFor(CONFIG.hatchXp);
  let s = feed(initialState(0), Array.from({ length: n }, (_, i) => turn(i + 1)));
  expect(s.stage).toBe('hatchling');
  const xpBefore = s.xp;
  s = reduce(s, { ts: 999, type: 'notification' });
  expect(s.stage).toBe('hatchling');        // 不退回 egg
  expect(s.xp).toBe(xpBefore);              // notification 不减 XP
});
test('各系所有工具都计分', () => {
  const s = feed(initialState(0), [
    tool(1, 'Write'), tool(2, 'MultiEdit'), tool(3, 'NotebookEdit'),  // builder x3
    tool(4, 'Grep'), tool(5, 'Glob'),                                  // scholar x2
  ]);
  expect(s.activityPoints.builder).toBe(3);
  expect(s.activityPoints.scholar).toBe(2);
});
