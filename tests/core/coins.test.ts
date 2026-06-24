import { coinsEarned, parseWallet, balance, effectActive, emptyWallet, COIN_PER_TURN, COIN_PER_TOOL } from '../../src/core/coins';
import { parseEventLine } from '../../src/core/events';

const ev = (type: string, n: number) => Array.from({length:n}, () => parseEventLine(JSON.stringify({type, ts:1}))!);

test('coinsEarned: turn/tool 按 CONFIG 常数(默认只 turn 产币)', () => {
  expect(coinsEarned([...ev('turn_end',3), ...ev('tool_start',4)])).toBe(3*COIN_PER_TURN + 4*COIN_PER_TOOL);
});
test('balance = 已赚 - 已花,不为负', () => {
  expect(balance(100, { ...emptyWallet(), spent: 30 })).toBe(70);
  expect(balance(10, { ...emptyWallet(), spent: 30 })).toBe(0);
});
test('parseWallet 容错', () => {
  const w = parseWallet({ owned:['straw'], equipped:'straw', spent:30 });
  expect(w.owned).toEqual(['straw']); expect(w.equipped).toBe('straw'); expect(w.spent).toBe(30);
  expect(parseWallet(null)).toEqual(emptyWallet());
});
test('effectActive 按 until 判定', () => {
  expect(effectActive({...emptyWallet(), effect:{id:'hearts',until:100}}, 50)?.id).toBe('hearts');
  expect(effectActive({...emptyWallet(), effect:{id:'hearts',until:100}}, 200)).toBeNull();
});
