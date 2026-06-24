export type Branch = 'builder' | 'debugger' | 'scholar' | 'balanced';
export type Stage = 'egg' | 'hatchling' | 'branched';
export type Mood = 'idle' | 'thinking' | 'working' | 'done' | 'confused' | 'evolving';

export interface ActivityPoints { builder: number; debugger: number; scholar: number; }

export interface PetState {
  version: number;
  bornAt: number;
  xp: number;
  stage: Stage;
  branch: Branch | null;
  activityPoints: ActivityPoints;
  totalTurns: number;
  mood: Mood;
  lastEventTs: number;
}

export function initialState(now: number): PetState {
  return {
    version: 1,
    bornAt: now,
    xp: 0,
    stage: 'egg',
    branch: null,
    activityPoints: { builder: 0, debugger: 0, scholar: 0 },
    totalTurns: 0,
    mood: 'idle',
    lastEventTs: now,
  };
}
