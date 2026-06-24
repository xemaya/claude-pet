// 积分商城 CLI:node dist/shop.mjs "<用户原话>"
// 读 events.jsonl(算已赚)+ wallet.json,按意图 逛/买/戴/脱/零食,写回 wallet.json + say.json。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseNewLines } from '../io/eventLog';
import { coinsEarned, parseWallet, balance, Wallet } from '../core/coins';
import { SHOP_ITEMS, findItem, itemById } from '../view/shopItems';

const DIR = process.env.CLAUDE_PET_DIR ?? join(homedir(), '.claude-pet');
const now = process.env.CLAUDE_PET_NOW ? Number(process.env.CLAUDE_PET_NOW) : Date.now();

function read(p: string): string { try { return readFileSync(p, 'utf8'); } catch { return ''; } }
function loadWallet(): Wallet {
  try { return parseWallet(JSON.parse(read(join(DIR, 'wallet.json')))); } catch { return parseWallet(null); }
}
function saveWallet(w: Wallet): void { writeFileSync(join(DIR, 'wallet.json'), JSON.stringify(w) + '\n'); }
function say(text: string, react?: 'nod' | 'shake'): void {
  const o: Record<string, unknown> = { text, ts: now };
  if (react) o.react = react;
  writeFileSync(join(DIR, 'say.json'), JSON.stringify(o) + '\n');
}

function earned(): number {
  return coinsEarned(parseNewLines(read(join(DIR, 'events.jsonl')), 0).events);
}

function listLine(bal: number): string {
  const hats = SHOP_ITEMS.filter((i) => i.type === 'hat').map((i) => `${i.name}${i.price}`).join(' ');
  const eff = SHOP_ITEMS.filter((i) => i.type === 'effect').map((i) => `${i.name}${i.price}`).join(' ');
  return `🪙${bal} ┊ 帽:${hats} ┊ 零食:${eff} ┊ buy草帽/wear猫耳`;
}

function buy(w: Wallet, id: string): void {
  const it = itemById(id)!;
  const bal = balance(earned(), w);
  if (it.type === 'hat') {
    if (w.owned.includes(id)) { say(`「${it.name}」你早有啦~ /pet wear ${it.name} 戴上呀`); return; }
    if (bal < it.price) { say(`🪙不够呀,「${it.name}」要 ${it.price},你才 ${bal}…多写两行嘛 (>﹏<)`, 'shake'); return; }
    w.owned.push(id); w.spent += it.price; w.equipped = id; // 买了顺手戴上
    saveWallet(w); say(`买到「${it.name}」啦!顺手给你戴上~ 🪙剩 ${balance(earned(), w)} (๑˃̵ᴗ˂̵)`, 'nod');
  } else {
    if (bal < it.price) { say(`🪙不够买「${it.name}」(${it.price}),你才 ${bal} (>﹏<)`, 'shake'); return; }
    w.spent += it.price; w.effect = { id, until: now + (it.durationMs ?? 8000) };
    saveWallet(w); say(`「${it.name}」上线!✨`, 'nod');
  }
}

function wear(w: Wallet, id: string): void {
  const it = itemById(id)!;
  if (!w.owned.includes(id)) { say(`你还没有「${it.name}」呢,先 /pet buy ${it.name}`); return; }
  w.equipped = id; saveWallet(w); say(`戴上「${it.name}」啦 (๑•̀ㅂ•́)و`, 'nod');
}

function main(): void {
  const msg = process.argv.slice(2).join(' ').trim();
  const w = loadWallet();
  const bal = balance(earned(), w);

  // 脱帽
  if (/脱|摘|take ?off|unwear|卸/.test(msg)) {
    w.equipped = null; saveWallet(w); say('摘掉啦,素颜也好看 ✨'); return;
  }
  // 逛(显式关键词或空)
  if (!msg || /shop|商城|店|逛|看货|货架|有啥|有什么/.test(msg)) { say(listLine(bal)); return; }

  // 买:剥掉"买/buy"再找
  if (/买|buy|购/.test(msg)) {
    const it = findItem(msg.replace(/买|buy|购|个|顶|只/gi, ''));
    if (it) { buy(w, it.id); return; }
    say(listLine(bal)); return;
  }
  // 戴:剥掉"戴/穿/wear"再找
  if (/戴|穿|wear/.test(msg)) {
    const it = findItem(msg.replace(/戴|穿|wear|上/gi, ''));
    if (it) { wear(w, it.id); return; }
    say(listLine(bal)); return;
  }
  // 直接点名:帽子→已有则戴否则买;零食→触发
  const it = findItem(msg);
  if (it) {
    if (it.type === 'effect') buy(w, it.id);
    else if (w.owned.includes(it.id)) wear(w, it.id);
    else buy(w, it.id);
    return;
  }
  say(listLine(bal));
}

main();
