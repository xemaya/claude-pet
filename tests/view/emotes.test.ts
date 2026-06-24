import { emoteFor } from '../../src/view/emotes';

test('各心情有对应情绪符号、idle 无', () => {
  for (const m of ['thinking','working','done','confused','evolving'] as const) {
    const g = emoteFor(m);
    expect(g).toBeTruthy();
    expect(g!.flat().some(Boolean)).toBe(true); // 网格非空
  }
  expect(emoteFor('idle')).toBeNull();
});
