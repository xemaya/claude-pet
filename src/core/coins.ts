import { PetEvent } from './events';

// 金币:只在"完成一轮对话"(turn_end)才产 1 枚;工具调用不产币(否则随便跑跑就几百)。
// 花币不动 xp(成长纯净)。想调难度改这两个常数即可。
export const COIN_PER_TURN = 1;
export const COIN_PER_TOOL = 0;

/** 从事件流 fold 出"已赚金币"(确定性、无副作用)。 */
export function coinsEarned(events: PetEvent[]): number {
  let c = 0;
  for (const e of events) {
    if (e.type === 'turn_end') c += COIN_PER_TURN;
    else if (e.type === 'tool_start') c += COIN_PER_TOOL;
  }
  return c;
}

export interface ActiveEffect { id: string; until: number; }
export interface Wallet {
  owned: string[];               // 已购帽子/配饰 id
  equipped: string | null;       // 当前佩戴 id
  spent: number;                 // 累计已花(余额 = 已赚 − 已花)
  effect?: ActiveEffect;         // 临时特效(零食),到 until 失效
}

export function emptyWallet(): Wallet {
  return { owned: [], equipped: null, spent: 0 };
}

/** 容错解析 wallet(字段缺失时给安全默认)。 */
export function parseWallet(raw: unknown): Wallet {
  const w = emptyWallet();
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.owned)) w.owned = o.owned.filter((x): x is string => typeof x === 'string');
    if (typeof o.equipped === 'string') w.equipped = o.equipped;
    if (typeof o.spent === 'number' && o.spent >= 0) w.spent = o.spent;
    if (o.effect && typeof o.effect === 'object') {
      const e = o.effect as Record<string, unknown>;
      if (typeof e.id === 'string' && typeof e.until === 'number') w.effect = { id: e.id, until: e.until };
    }
  }
  return w;
}

/** 余额 = 已赚 − 已花(不为负)。 */
export function balance(earned: number, wallet: Wallet): number {
  return Math.max(0, earned - wallet.spent);
}

/** 特效是否仍在生效。 */
export function effectActive(wallet: Wallet, now: number): ActiveEffect | null {
  return wallet.effect && wallet.effect.until > now ? wallet.effect : null;
}
