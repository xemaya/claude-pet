// src/cli/shop.ts
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// src/core/events.ts
var VALID = /* @__PURE__ */ new Set([
  "session_start",
  "prompt_submit",
  "tool_start",
  "tool_end",
  "turn_end",
  "notification"
]);
function parseEventLine(line) {
  let raw;
  try {
    raw = JSON.parse(line);
  } catch {
    return null;
  }
  if (!raw || typeof raw.type !== "string" || !VALID.has(raw.type)) return null;
  const e = { ts: typeof raw.ts === "number" ? raw.ts : 0, type: raw.type };
  if (typeof raw.tool === "string") e.tool = raw.tool;
  if (raw.isError === true) e.isError = true;
  return e;
}

// src/io/eventLog.ts
function parseNewLines(content, fromOffset) {
  const start = fromOffset > content.length ? 0 : fromOffset;
  const slice = content.slice(start);
  const lastNl = slice.lastIndexOf("\n");
  if (lastNl < 0) return { events: [], newOffset: start };
  const complete = slice.slice(0, lastNl + 1);
  const events = [];
  for (const line of complete.split("\n")) {
    if (!line.trim()) continue;
    const e = parseEventLine(line);
    if (e) events.push(e);
  }
  return { events, newOffset: start + complete.length };
}

// src/core/coins.ts
var COIN_PER_TURN = 1;
var COIN_PER_TOOL = 0;
function coinsEarned(events) {
  let c = 0;
  for (const e of events) {
    if (e.type === "turn_end") c += COIN_PER_TURN;
    else if (e.type === "tool_start") c += COIN_PER_TOOL;
  }
  return c;
}
function emptyWallet() {
  return { owned: [], equipped: null, spent: 0 };
}
function parseWallet(raw) {
  const w = emptyWallet();
  if (raw && typeof raw === "object") {
    const o = raw;
    if (Array.isArray(o.owned)) w.owned = o.owned.filter((x) => typeof x === "string");
    if (typeof o.equipped === "string") w.equipped = o.equipped;
    if (typeof o.spent === "number" && o.spent >= 0) w.spent = o.spent;
    if (o.effect && typeof o.effect === "object") {
      const e = o.effect;
      if (typeof e.id === "string" && typeof e.until === "number") w.effect = { id: e.id, until: e.until };
    }
  }
  return w;
}
function balance(earned2, wallet) {
  return Math.max(0, earned2 - wallet.spent);
}

// src/view/shopItems.ts
var P = {
  ".": null,
  k: "#241208",
  K: "#3a2410",
  // 黑/深棕(礼帽)
  n: "#7a4a1e",
  y: "#e6c45a",
  Y: "#fff0a0",
  // 草帽:棕边/麦黄/高光
  r: "#d6314a",
  R: "#ff5a72",
  e: "#fff7f0",
  // 红/亮红/白(圣诞、爱心)
  p: "#e58fb0",
  P: "#c46a90",
  // 粉(猫耳/蝴蝶结)
  g: "#5fd0c0",
  b: "#5aa0ff",
  o: "#ffb347"
  // 杂色(特效:青/蓝/橙星)
};
function exp(rows) {
  return rows.map((row) => [...row].map((ch) => P[ch] ?? null));
}
var HATS = [
  {
    id: "straw",
    name: "\u8349\u5E3D",
    price: 30,
    type: "hat",
    grid: exp([
      "...nnnnn...",
      "..nyYYYyn..",
      ".nyyyyyyyn.",
      "nnnnnnnnnnn"
    ])
  },
  {
    id: "catears",
    name: "\u732B\u8033",
    price: 40,
    type: "hat",
    grid: exp([
      "pp.......pp",
      "pPp.....pPp",
      ".Pp.....pP."
    ])
  },
  {
    id: "tophat",
    name: "\u793C\u5E3D",
    price: 50,
    type: "hat",
    grid: exp([
      "...kkkkk...",
      "...kkkkk...",
      "...kkkkk...",
      ".kkkkkkkkk.",
      "KKKKKKKKKKK"
    ])
  },
  {
    id: "santa",
    name: "\u5723\u8BDE\u5E3D",
    price: 60,
    type: "hat",
    grid: exp([
      "........ee.",
      ".....rree..",
      "..rrrrrr...",
      ".rrrrrr....",
      "eeeeeeeee.."
    ])
  },
  {
    id: "bow",
    name: "\u8774\u8776\u7ED3",
    price: 35,
    type: "hat",
    grid: exp([
      "pp..p..pp",
      "pPp.p.pPp",
      "pp..p..pp"
    ])
  }
];
var EFFECTS = [
  {
    id: "hearts",
    name: "\u7231\u5FC3",
    price: 20,
    type: "effect",
    durationMs: 8e3,
    grid: exp([
      ".r.....r.",
      "rRr...rRr",
      ".rRr.rRr.",
      "..rRrRr..",
      "...rRr..."
    ])
  },
  {
    id: "fireworks",
    name: "\u70DF\u82B1",
    price: 25,
    type: "effect",
    durationMs: 8e3,
    grid: exp([
      "b..o..g..",
      ".b.o.g...",
      "oogYYboo.",
      ".b.o.g...",
      "b..o..g.."
    ])
  }
];
var SHOP_ITEMS = [...HATS, ...EFFECTS];
function findItem(query) {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  for (const it of SHOP_ITEMS) {
    if (it.id === q || it.name === query.trim()) return it;
  }
  for (const it of SHOP_ITEMS) {
    if (query.includes(it.name) || q.includes(it.id)) return it;
  }
  return null;
}
function itemById(id) {
  return id ? SHOP_ITEMS.find((i) => i.id === id) ?? null : null;
}

// src/cli/shop.ts
var DIR = process.env.CLAUDE_PET_DIR ?? join(homedir(), ".claude-pet");
var now = process.env.CLAUDE_PET_NOW ? Number(process.env.CLAUDE_PET_NOW) : Date.now();
function read(p) {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
}
function loadWallet() {
  try {
    return parseWallet(JSON.parse(read(join(DIR, "wallet.json"))));
  } catch {
    return parseWallet(null);
  }
}
function saveWallet(w) {
  writeFileSync(join(DIR, "wallet.json"), JSON.stringify(w) + "\n");
}
function say(text, react) {
  const o = { text, ts: now };
  if (react) o.react = react;
  writeFileSync(join(DIR, "say.json"), JSON.stringify(o) + "\n");
}
function earned() {
  return coinsEarned(parseNewLines(read(join(DIR, "events.jsonl")), 0).events);
}
function listLine(bal) {
  const hats = SHOP_ITEMS.filter((i) => i.type === "hat").map((i) => `${i.name}${i.price}`).join(" ");
  const eff = SHOP_ITEMS.filter((i) => i.type === "effect").map((i) => `${i.name}${i.price}`).join(" ");
  return `\u{1FA99}${bal} \u250A \u5E3D:${hats} \u250A \u96F6\u98DF:${eff} \u250A buy\u8349\u5E3D/wear\u732B\u8033`;
}
function buy(w, id) {
  const it = itemById(id);
  const bal = balance(earned(), w);
  if (it.type === "hat") {
    if (w.owned.includes(id)) {
      say(`\u300C${it.name}\u300D\u4F60\u65E9\u6709\u5566~ /pet wear ${it.name} \u6234\u4E0A\u5440`);
      return;
    }
    if (bal < it.price) {
      say(`\u{1FA99}\u4E0D\u591F\u5440,\u300C${it.name}\u300D\u8981 ${it.price},\u4F60\u624D ${bal}\u2026\u591A\u5199\u4E24\u884C\u561B (>\uFE4F<)`, "shake");
      return;
    }
    w.owned.push(id);
    w.spent += it.price;
    w.equipped = id;
    saveWallet(w);
    say(`\u4E70\u5230\u300C${it.name}\u300D\u5566!\u987A\u624B\u7ED9\u4F60\u6234\u4E0A~ \u{1FA99}\u5269 ${balance(earned(), w)} (\u0E51\u02C3\u0335\u1D17\u02C2\u0335)`, "nod");
  } else {
    if (bal < it.price) {
      say(`\u{1FA99}\u4E0D\u591F\u4E70\u300C${it.name}\u300D(${it.price}),\u4F60\u624D ${bal} (>\uFE4F<)`, "shake");
      return;
    }
    w.spent += it.price;
    w.effect = { id, until: now + (it.durationMs ?? 8e3) };
    saveWallet(w);
    say(`\u300C${it.name}\u300D\u4E0A\u7EBF!\u2728`, "nod");
  }
}
function wear(w, id) {
  const it = itemById(id);
  if (!w.owned.includes(id)) {
    say(`\u4F60\u8FD8\u6CA1\u6709\u300C${it.name}\u300D\u5462,\u5148 /pet buy ${it.name}`);
    return;
  }
  w.equipped = id;
  saveWallet(w);
  say(`\u6234\u4E0A\u300C${it.name}\u300D\u5566 (\u0E51\u2022\u0300\u3142\u2022\u0301)\u0648`, "nod");
}
function main() {
  const msg = process.argv.slice(2).join(" ").trim();
  const w = loadWallet();
  const bal = balance(earned(), w);
  if (/脱|摘|take ?off|unwear|卸/.test(msg)) {
    w.equipped = null;
    saveWallet(w);
    say("\u6458\u6389\u5566,\u7D20\u989C\u4E5F\u597D\u770B \u2728");
    return;
  }
  if (!msg || /shop|商城|店|逛|看货|货架|有啥|有什么/.test(msg)) {
    say(listLine(bal));
    return;
  }
  if (/买|buy|购/.test(msg)) {
    const it2 = findItem(msg.replace(/买|buy|购|个|顶|只/gi, ""));
    if (it2) {
      buy(w, it2.id);
      return;
    }
    say(listLine(bal));
    return;
  }
  if (/戴|穿|wear/.test(msg)) {
    const it2 = findItem(msg.replace(/戴|穿|wear|上/gi, ""));
    if (it2) {
      wear(w, it2.id);
      return;
    }
    say(listLine(bal));
    return;
  }
  const it = findItem(msg);
  if (it) {
    if (it.type === "effect") buy(w, it.id);
    else if (w.owned.includes(it.id)) wear(w, it.id);
    else buy(w, it.id);
    return;
  }
  say(listLine(bal));
}
main();
