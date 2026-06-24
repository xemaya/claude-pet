import { ANIMAL_SPRITES } from '../../src/view/animalSprites';

const KEYS = ['egg', 'hatchling', 'builder', 'debugger', 'scholar', 'balanced'] as const;

test('每形态 16×16', () => {
  for (const k of KEYS) {
    const g = ANIMAL_SPRITES[k];
    expect(g.length, `${k} 行`).toBe(16);
    for (const r of g) expect(r.length, `${k} 列`).toBe(16);
  }
});
test('cell 为 null 或 #rrggbb', () => {
  for (const k of KEYS)
    for (const r of ANIMAL_SPRITES[k])
      for (const c of r) if (c !== null) expect(c).toMatch(/^#[0-9a-f]{6}$/);
});
test('六形态互异且非空(>30 非透明像素)', () => {
  const seen = new Set<string>();
  for (const k of KEYS) {
    const sig = JSON.stringify(ANIMAL_SPRITES[k]);
    expect(seen.has(sig), `${k} 与他者相同`).toBe(false);
    seen.add(sig);
    const n = ANIMAL_SPRITES[k].flat().filter(Boolean).length;
    expect(n, `${k} 非透明像素数`).toBeGreaterThan(30);
  }
});
