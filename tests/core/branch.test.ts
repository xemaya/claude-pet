import { computeBranch } from '../../src/core/branch';

test('builder 明显领先 → builder', () => {
  expect(computeBranch({ builder: 100, debugger: 10, scholar: 5 }, 0.15)).toBe('builder');
});
test('debugger 领先 → debugger', () => {
  expect(computeBranch({ builder: 5, debugger: 80, scholar: 10 }, 0.15)).toBe('debugger');
});
test('scholar 领先 → scholar', () => {
  expect(computeBranch({ builder: 5, debugger: 10, scholar: 90 }, 0.15)).toBe('scholar');
});
test('前两名差距 <15% → balanced', () => {
  expect(computeBranch({ builder: 100, debugger: 95, scholar: 10 }, 0.15)).toBe('balanced');
});
test('全 0 → balanced', () => {
  expect(computeBranch({ builder: 0, debugger: 0, scholar: 0 }, 0.15)).toBe('balanced');
});
