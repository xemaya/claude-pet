import { PROPS, sceneFor, propForScene, PropKey } from '../../src/view/props';
import { initialState } from '../../src/core/petState';

const KEYS: PropKey[] = ['cookie', 'chest', 'bug', 'bugHit', 'brick', 'book'];
const s = (over: any) => ({ ...initialState(0), ...over });

test('每个道具网格矩形、cell 为 null 或 #rrggbb、非空', () => {
  for (const k of KEYS) {
    const g = PROPS[k];
    const w = g[0].length;
    for (const row of g) {
      expect(row.length, `${k} 行宽不一致`).toBe(w);
      for (const c of row) if (c !== null) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(g.flat().filter(Boolean).length, `${k} 太空`).toBeGreaterThan(15);
  }
});

test('sceneFor:转职/战斗/投食/搬砖/看书/打盹/无', () => {
  expect(sceneFor(s({ mood: 'evolving' }), false)).toBe('chest');
  expect(sceneFor(s({ mood: 'confused' }), false)).toBe('battle');
  expect(sceneFor(s({ mood: 'working' }), true)).toBe('cookie');
  expect(sceneFor(s({ mood: 'working', stage: 'branched', branch: 'builder' }), false)).toBe('build');
  expect(sceneFor(s({ mood: 'working', stage: 'branched', branch: 'scholar' }), false)).toBe('study');
  expect(sceneFor(s({ mood: 'working', stage: 'branched', branch: 'debugger' }), false)).toBe('battle');
  expect(sceneFor(s({ mood: 'idle' }), false)).toBe('sleep');
  expect(sceneFor(s({ mood: 'done' }), false)).toBe('none');
});

test('sceneFor 优先级:转职 > 战斗 > 投食', () => {
  expect(sceneFor(s({ mood: 'evolving' }), true)).toBe('chest');
  expect(sceneFor(s({ mood: 'confused' }), true)).toBe('battle');
});

test('propForScene:sleep→null,chest→宝箱,battle 两帧轮换', () => {
  expect(propForScene('sleep', 0)).toBeNull();
  expect(propForScene('none', 0)).toBeNull();
  expect(propForScene('chest', 0)).toBe(PROPS.chest);
  expect(propForScene('battle', 0)).toBe(PROPS.bug);
  expect(propForScene('battle', 1)).toBe(PROPS.bugHit);
});
