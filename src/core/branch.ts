import { ActivityPoints, Branch } from './petState';

export function computeBranch(points: ActivityPoints, balancedThreshold: number): Branch {
  const entries: [Exclude<Branch, 'balanced'>, number][] = [
    ['builder', points.builder],
    ['debugger', points.debugger],
    ['scholar', points.scholar],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  const [top, second] = entries;
  if (top[1] === 0) return 'balanced';
  // 第二名落后不足 balancedThreshold 比例 → 视为势均力敌
  if ((top[1] - second[1]) / top[1] < balancedThreshold) return 'balanced';
  return top[0];
}
