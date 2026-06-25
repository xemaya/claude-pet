import { matchEpisode, Ctx, Episode } from '../../src/view/episodes';

const base: Ctx = { deepNight: false, payday: false, boss: false, striking: false, swamped: false, idle: false };

const EPS: Episode[] = [
  { when: { boss: true }, say: 'boss' },
  { when: { deepNight: true }, say: 'night' },
  { when: { deepNight: true, swamped: true }, say: 'night+swamped' },
];

test('无匹配返回 null(走常规台词)', () => {
  expect(matchEpisode(EPS, base, 0)).toBeNull();
});

test('单标签匹配', () => {
  expect(matchEpisode(EPS, { ...base, boss: true }, 0)?.say).toBe('boss');
});

test('越具体越优先(深夜+堆成山 压过 纯深夜)', () => {
  const got = matchEpisode(EPS, { ...base, deepNight: true, swamped: true }, 0);
  expect(got?.say).toBe('night+swamped');
});

test('确定性:同 ctx 同 idx → 同结果', () => {
  const c = { ...base, boss: true };
  expect(matchEpisode(EPS, c, 3)?.say).toBe(matchEpisode(EPS, c, 3)?.say);
});
