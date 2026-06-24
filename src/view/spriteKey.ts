import { PetState, Mood } from '../core/petState';

export type BodyKey = 'egg' | 'hatchling' | 'builder' | 'debugger' | 'scholar' | 'balanced';

export function bodyKeyFor(state: PetState): BodyKey {
  if (state.stage === 'egg') return 'egg';
  if (state.stage === 'hatchling') return 'hatchling';
  switch (state.branch) {
    case 'builder': return 'builder';
    case 'debugger': return 'debugger';
    case 'scholar': return 'scholar';
    default: return 'balanced';
  }
}

export function faceKeyFor(state: PetState): Mood {
  return state.mood;
}
