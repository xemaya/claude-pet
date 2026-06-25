// src/statusline/run.ts
import { readFileSync } from "node:fs";
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

// src/core/config.ts
var CONFIG = {
  hatchXp: 150,
  // 新人 → 见习(约 30 轮对话)
  evolveXp: 1200,
  // 见习 → 转职定型
  adultXp: 6e3,
  // 转职 → 成体(大师,加冠)
  xpPerLevel: 100,
  // 等级曲线分母:Lv=floor(log2(xp/100+1))+1
  xpPerTurn: 5,
  xpPerTool: 1,
  balancedThreshold: 0.15,
  idleMs: 3e4,
  milestones: [1500, 4e3, 1e4, 22e3, 5e4]
  // ✦ 里程碑(拉高,难很多)
};

// src/core/branch.ts
function computeBranch(points, balancedThreshold) {
  const entries = [
    ["builder", points.builder],
    ["debugger", points.debugger],
    ["scholar", points.scholar]
  ];
  entries.sort((a, b) => b[1] - a[1]);
  const [top, second] = entries;
  if (top[1] === 0) return "balanced";
  if ((top[1] - second[1]) / top[1] < balancedThreshold) return "balanced";
  return top[0];
}

// src/core/reducer.ts
var BUILDER = /* @__PURE__ */ new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
var DEBUGGER = /* @__PURE__ */ new Set(["Bash"]);
var SCHOLAR = /* @__PURE__ */ new Set(["Read", "Grep", "Glob"]);
function moodFor(event) {
  switch (event.type) {
    case "prompt_submit":
      return "thinking";
    case "tool_start":
      return "working";
    case "turn_end":
      return "done";
    case "notification":
      return "confused";
    case "tool_end":
      return event.isError ? "confused" : null;
    case "session_start":
      return "idle";
    default:
      return null;
  }
}
function reduce(state, event) {
  const next = { ...state, activityPoints: { ...state.activityPoints } };
  const m = moodFor(event);
  if (m) next.mood = m;
  next.lastEventTs = event.ts;
  if (event.type === "turn_end") {
    next.xp += CONFIG.xpPerTurn;
    next.totalTurns += 1;
  } else if (event.type === "tool_start") {
    next.xp += CONFIG.xpPerTool;
    const t = event.tool ?? "";
    if (BUILDER.has(t)) next.activityPoints.builder += 1;
    else if (DEBUGGER.has(t)) next.activityPoints.debugger += 1;
    else if (SCHOLAR.has(t)) next.activityPoints.scholar += 1;
  }
  if (next.stage === "egg" && next.xp >= CONFIG.hatchXp) {
    next.stage = "hatchling";
    next.mood = "evolving";
  }
  if (next.stage === "hatchling" && next.xp >= CONFIG.evolveXp) {
    next.stage = "branched";
    next.branch = computeBranch(next.activityPoints, CONFIG.balancedThreshold);
    next.mood = "evolving";
  }
  return next;
}

// src/core/petState.ts
function initialState(now) {
  return {
    version: 1,
    bornAt: now,
    xp: 0,
    stage: "egg",
    branch: null,
    activityPoints: { builder: 0, debugger: 0, scholar: 0 },
    totalTurns: 0,
    mood: "idle",
    lastEventTs: now
  };
}

// src/statusline/project.ts
function projectState(content, now) {
  let state = initialState(now);
  const { events } = parseNewLines(content, 0);
  for (const e of events) state = reduce(state, e);
  if (now - state.lastEventTs > CONFIG.idleMs && state.mood !== "idle") {
    state = { ...state, mood: "idle" };
  }
  return state;
}

// src/view/spriteKey.ts
function bodyKeyFor(state) {
  if (state.stage === "egg") return "egg";
  if (state.stage === "hatchling") return "hatchling";
  switch (state.branch) {
    case "builder":
      return "builder";
    case "debugger":
      return "debugger";
    case "scholar":
      return "scholar";
    default:
      return "balanced";
  }
}

// src/view/props.ts
var P = {
  ".": null,
  o: "#4a2f1a",
  w: "#8a5a2a",
  W: "#b07a3a",
  g: "#d9a528",
  y: "#ffe04a",
  k: "#241208",
  s: "#fff7c0",
  // 宝箱/奖杯
  n: "#5a3a22",
  c: "#cf9244",
  h: "#6e3f17",
  // 饼/鸡腿
  m: "#3a1448",
  p: "#8a3aa0",
  P: "#b060c0",
  e: "#ffffff",
  r: "#e0455a",
  l: "#5a2070",
  // bug 怪
  B: "#b0623a",
  M: "#7a5038",
  // 砖
  R: "#c0392b",
  u: "#ece6d8",
  // 书(红封 + 书页)
  G: "#f7e36a"
  // 闪光/星
};
function exp(rows) {
  return rows.map((row) => [...row].map((ch) => P[ch] ?? null));
}
var PROPS = {
  cookie: exp([
    "............",
    "...nnnnnn...",
    "..nccccccn..",
    ".nccccccccn.",
    ".ncchcccccn.",
    ".nccccchccn.",
    ".nchccccccn.",
    "..nccccccn..",
    "...nnnnnn...",
    "............"
  ]),
  chest: exp([
    "...s....s...",
    "..oooooooo..",
    ".oWWWWWWWWo.",
    ".oWggggggWo.",
    ".oWWWWWWWWo.",
    ".okyyyyyyko.",
    ".owwwwwwwwo.",
    ".owwggggwwo.",
    ".owwwwwwwwo.",
    "..oooooooo.."
  ]),
  bug: exp([
    "...m....m...",
    "....mmmm....",
    "..mppppppm..",
    ".mppppppppm.",
    ".mpekppkepm.",
    ".mpprrrrppm.",
    "..mppppppm..",
    "l..l..l..l..",
    "............"
  ]),
  // 挨打帧:X 眼 + 头顶闪光,身体微缩(战斗第2帧)
  bugHit: exp([
    "..G..ss..G..",
    "...G.mm.G...",
    "...mppppm...",
    "..mpkppkpm..",
    "..mpkppkpm..",
    "..mprrrrpm..",
    "...mppppm...",
    "..l..ll..l..",
    "............"
  ]),
  // 砖墙(搬砖)
  brick: exp([
    "BBBBMBBBBB",
    "MMMMMMMMMM",
    "BBMBBBBBMB",
    "MMMMMMMMMM",
    "BBBBMBBBBB",
    "MMMMMMMMMM"
  ]),
  // 书(红封 + 书页)
  book: exp([
    "..oooooo..",
    ".oRRRRRRo.",
    ".oRRuuRRo.",
    ".oRRRRRRo.",
    ".oRRRRRRo.",
    ".oRRuuRRo.",
    ".oRRRRRRo.",
    ".ouuuuuuo.",
    "..oooooo.."
  ])
};
function sceneFor(state, ate) {
  if (state.mood === "evolving") return "chest";
  if (state.mood === "confused") return "battle";
  if (ate) return "cookie";
  if (state.mood === "working") {
    if (state.branch === "builder") return "build";
    if (state.branch === "scholar") return "study";
    if (state.branch === "debugger") return "battle";
  }
  if (state.mood === "idle") return "sleep";
  return "none";
}
function propForScene(kind, animFrame) {
  switch (kind) {
    case "chest":
      return PROPS.chest;
    case "cookie":
      return PROPS.cookie;
    case "build":
      return PROPS.brick;
    case "study":
      return PROPS.book;
    case "battle":
      return animFrame % 2 === 0 ? PROPS.bug : PROPS.bugHit;
    case "sleep":
      return null;
    // 打盹只用台词 💤
    default:
      return null;
  }
}

// src/view/skin.ts
function spriteFor(skin, body, expr) {
  const f = skin[body];
  if (Array.isArray(f)) return f;
  return f[expr] ?? f.neutral ?? Object.values(f)[0];
}

// src/view/halfblock.ts
function rgb(c) {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}
function toHalfBlockRows(grid) {
  const h = grid.length;
  const w = h ? grid[0].length : 0;
  const rows = [];
  for (let cy = 0; cy < Math.floor(h / 2); cy++) {
    let s = "";
    for (let x = 0; x < w; x++) {
      const t = grid[cy * 2][x];
      const b = grid[cy * 2 + 1][x];
      if (t && b) {
        const [tr, tg, tb] = rgb(t);
        const [br, bg, bb] = rgb(b);
        s += `\x1B[38;2;${tr};${tg};${tb};48;2;${br};${bg};${bb}m\u2580\x1B[0m`;
      } else if (t) {
        const [r, g2, bl] = rgb(t);
        s += `\x1B[38;2;${r};${g2};${bl}m\u2580\x1B[0m`;
      } else if (b) {
        const [r, g2, bl] = rgb(b);
        s += `\x1B[38;2;${r};${g2};${bl}m\u2584\x1B[0m`;
      } else {
        s += " ";
      }
    }
    rows.push(s);
  }
  return rows;
}

// src/view/scene.ts
var GAP = 6;
var MAX_H = 24;
var G = "#f7e36a";
var Y = "#fff3a0";
var O = "#8a6a10";
var CROWN = [
  [G, null, G, null, G, null, G],
  [O, G, G, G, G, G, O],
  [O, Y, Y, Y, Y, Y, O]
];
function blit(canvas, sprite, ox, oy) {
  for (let y = 0; y < sprite.length; y++) {
    for (let x = 0; x < sprite[y].length; x++) {
      const c = sprite[y][x];
      if (!c) continue;
      const cy = oy + y;
      const cx = ox + x;
      if (cy >= 0 && cy < canvas.length && cx >= 0 && cx < canvas[0].length) canvas[cy][cx] = c;
    }
  }
}
var PADX = 1;
function composeCanvas(skin, bodyKey, prop, adult = false, bob = 0, dx = 0, hat = null, effect = null, emote = null, expr = "neutral") {
  const body = spriteFor(skin, bodyKey, expr);
  const bodyW = body[0].length;
  const H = Math.min(body.length, MAX_H);
  const Hc = H + 2;
  const W = (prop ? bodyW + GAP + prop[0].length : bodyW) + PADX * 2;
  const canvas = Array.from({ length: Hc }, () => Array(W).fill(null));
  const oy = Math.max(0, Math.min(2, bob));
  const ox = PADX + dx;
  blit(canvas, body, ox, oy);
  const head = hat ?? (adult ? CROWN : null);
  if (head) blit(canvas, head, ox + Math.floor((bodyW - head[0].length) / 2), oy);
  if (emote) blit(canvas, emote, ox + Math.floor(bodyW / 2) + 2, Math.max(0, oy - 1));
  if (effect) blit(canvas, effect, ox + Math.floor((bodyW - effect[0].length) / 2), Math.max(0, oy - 1));
  if (prop) blit(canvas, prop, PADX + bodyW + GAP, Hc - prop.length - 1);
  return canvas;
}
function dispWidth(s) {
  let w = 0;
  for (const ch of s) w += /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦　-〿]/.test(ch) ? 2 : 1;
  return w;
}
function wrapByWidth(text, max, maxLines = 3) {
  const out = [];
  let cur = "", w = 0;
  for (const ch of text) {
    const cw = dispWidth(ch);
    if (w + cw > max && cur) {
      out.push(cur);
      cur = "";
      w = 0;
    }
    cur += ch;
    w += cw;
  }
  if (cur) out.push(cur);
  if (out.length > maxLines) {
    const t = out.slice(0, maxLines);
    t[maxLines - 1] = t[maxLines - 1].replace(/.$/, "\u2026");
    return t;
  }
  return out.length ? out : [""];
}
function dialogBox(lines, dividerIdx) {
  const inner = Math.max(...lines.map(dispWidth));
  const bar = "\u2500".repeat(inner + 2);
  const out = [`\u256D${bar}\u256E`];
  for (let i = 0; i < lines.length; i++) {
    if (dividerIdx !== void 0 && i === dividerIdx) out.push(`\u251C${bar}\u2524`);
    out.push(`\u2502 ${lines[i]}${" ".repeat(inner - dispWidth(lines[i]))} \u2502`);
  }
  out.push(`\u2570${bar}\u256F`);
  return out;
}
function renderScenePanel(skin, bodyKey, kind, animFrame, caption, status, adult = false, bob = 0, dx = 0, hat = null, effect = null, emote = null, expr = "neutral") {
  const prop = propForScene(kind, animFrame);
  const canvas = composeCanvas(skin, bodyKey, prop, adult, bob, dx, hat, effect, emote, expr);
  const W = canvas[0].length;
  const rows = toHalfBlockRows(canvas);
  const capLines = wrapByWidth(caption, 36, 3);
  const box = dialogBox([...capLines, status], capLines.length);
  for (let i = 0; i < box.length; i++) {
    const r = 1 + i;
    while (rows.length <= r) rows.push(" ".repeat(W));
    rows[r] = `${rows[r]}  ${box[i]}`;
  }
  rows.push("");
  return rows.map((l) => "\x1B[0m" + l).join("\n");
}

// src/view/zooSprites.ts
var ZOO_ROSTER = [
  [
    [null, null, null, null, null, null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null, null],
    [null, null, null, null, null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null],
    [null, null, null, null, null, null, "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0"],
    [null, null, null, null, null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null, null],
    [null, null, null, null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null],
    ["#e2e6f0", null, null, "#e2e6f0", "#e2e6f0", null, null, null, null, null, "#e2e6f0", null, null],
    ["#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null, null],
    ["#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", null, null],
    ["#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", null, null],
    [null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null],
    [null, null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null, null],
    [null, null, null, null, null, null, "#e2e6f0", null, null, null, null, null, null]
  ],
  [
    [null, null, null, null, null, null, null, "#e2e6f0", null, null, null, null],
    [null, null, null, null, null, null, "#e2e6f0", null, "#e2e6f0", "#e2e6f0", null, null],
    [null, null, null, null, null, null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null],
    [null, null, null, null, null, null, null, "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0"],
    [null, null, null, null, null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null],
    [null, null, null, null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null],
    ["#e2e6f0", null, null, "#e2e6f0", "#e2e6f0", null, null, null, null, null, "#e2e6f0", "#e2e6f0"],
    ["#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null],
    ["#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", null],
    ["#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", null],
    [null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", null],
    [null, null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null],
    [null, null, null, null, null, null, "#e2e6f0", null, null, null, null, null]
  ],
  [
    [null, null, null, null, null, null, null, null, "#e2e6f0", null, "#e2e6f0", null, null, null],
    [null, null, null, null, null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null],
    [null, null, null, null, null, null, null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null],
    [null, null, null, null, null, null, null, "#e2e6f0", "#e2e6f0", null, "#e2e6f0", null, "#e2e6f0", null],
    [null, "#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0"],
    ["#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0"],
    ["#e2e6f0", null, "#e2e6f0", null, "#e2e6f0", null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", null],
    ["#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null, "#e2e6f0", null, "#e2e6f0", null, null, null, null],
    [null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null, null, null],
    [null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", null, "#e2e6f0", null, null, null, null],
    [null, null, "#e2e6f0", null, null, null, "#e2e6f0", null, null, "#e2e6f0", null, null, null, null],
    [null, null, "#e2e6f0", null, "#e2e6f0", null, "#e2e6f0", null, null, "#e2e6f0", null, null, null, null]
  ],
  [
    [null, null, null, null, null, null, null, null, "#e2e6f0", null, "#e2e6f0", null, null, null],
    [null, null, null, null, null, null, "#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null, null],
    [null, null, null, null, null, null, "#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null],
    [null, null, null, null, null, "#e2e6f0", null, "#e2e6f0", "#e2e6f0", null, "#e2e6f0", null, "#e2e6f0", null],
    [null, null, null, null, null, "#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0"],
    [null, null, null, null, null, "#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0"],
    [null, "#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", null],
    ["#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null, null, null],
    ["#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null, null, null],
    ["#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null, null, null],
    ["#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, "#e2e6f0", null, null, null, null],
    ["#e2e6f0", null, "#e2e6f0", null, null, null, "#e2e6f0", null, null, "#e2e6f0", null, null, null, null],
    [null, null, "#e2e6f0", null, "#e2e6f0", null, "#e2e6f0", null, null, "#e2e6f0", null, null, null, null],
    [null, null, "#e2e6f0", null, "#e2e6f0", null, "#e2e6f0", null, null, "#e2e6f0", null, null, null, null]
  ],
  [
    ["#e2e6f0", null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, "#e2e6f0", null, null, null, null, null, null, null, null, null, null, null, null],
    ["#e2e6f0", null, null, null, null, null, null, "#e2e6f0", null, null, null, null, "#e2e6f0", null],
    [null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null],
    ["#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null],
    ["#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, "#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, "#e2e6f0"],
    ["#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0"],
    ["#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0"],
    ["#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, "#e2e6f0", null, "#e2e6f0", "#e2e6f0", null, "#e2e6f0", null],
    ["#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null, null, null, null, null, null],
    [null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null],
    [null, "#e2e6f0", null, null, "#e2e6f0", null, null, "#e2e6f0", null, null, null, "#e2e6f0", null, null]
  ],
  [
    [null, null, null, null, "#e2e6f0", null, null, null, "#e2e6f0", null],
    [null, null, null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null],
    [null, null, null, null, "#e2e6f0", null, "#e2e6f0", null, "#e2e6f0", null],
    [null, "#e2e6f0", null, null, "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", null],
    ["#e2e6f0", "#e2e6f0", null, null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null],
    ["#e2e6f0", null, null, null, "#e2e6f0", null, null, null, "#e2e6f0", null],
    ["#e2e6f0", null, null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null],
    ["#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0"],
    [null, "#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0"],
    [null, "#e2e6f0", null, "#e2e6f0", "#e2e6f0", null, "#e2e6f0", null, "#e2e6f0", "#e2e6f0"],
    [null, null, null, "#e2e6f0", "#e2e6f0", null, "#e2e6f0", null, "#e2e6f0", "#e2e6f0"],
    [null, null, null, null, "#e2e6f0", null, "#e2e6f0", null, "#e2e6f0", null]
  ],
  [
    [null, null, null, null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null, null, null, null],
    [null, null, null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null, null, null],
    ["#e2e6f0", null, null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null, null, "#e2e6f0"],
    ["#e2e6f0", "#e2e6f0", null, null, "#e2e6f0", null, "#e2e6f0", "#e2e6f0", null, "#e2e6f0", null, null, "#e2e6f0", "#e2e6f0"],
    ["#e2e6f0", "#e2e6f0", null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null, "#e2e6f0", "#e2e6f0"],
    ["#e2e6f0", "#e2e6f0", null, null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null, null, "#e2e6f0", "#e2e6f0"],
    [null, "#e2e6f0", null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null, "#e2e6f0", null],
    [null, "#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, "#e2e6f0", null],
    [null, "#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, "#e2e6f0", null],
    [null, "#e2e6f0", null, "#e2e6f0", null, "#e2e6f0", null, null, "#e2e6f0", null, "#e2e6f0", null, "#e2e6f0", null],
    [null, null, "#e2e6f0", "#e2e6f0", null, "#e2e6f0", null, null, "#e2e6f0", null, "#e2e6f0", "#e2e6f0", null, null],
    ["#e2e6f0", null, null, null, null, "#e2e6f0", null, null, "#e2e6f0", null, null, null, null, "#e2e6f0"],
    [null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null, null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null]
  ],
  [
    [null, null, null, null, null, "#e2e6f0", null, null, "#e2e6f0", null, null, null, null, null],
    [null, null, "#e2e6f0", null, null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, null, "#e2e6f0", null, null],
    [null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null],
    ["#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0"],
    ["#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0"],
    ["#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0"],
    ["#e2e6f0", null, null, "#e2e6f0", null, "#e2e6f0", "#e2e6f0", "#e2e6f0", "#e2e6f0", null, "#e2e6f0", null, null, "#e2e6f0"],
    [null, null, null, null, null, "#e2e6f0", null, null, "#e2e6f0", null, null, null, null, null]
  ]
];
var DESK = "#46506a";
function deskSlot(animal, H) {
  const w = animal[0].length;
  const slot = Array.from({ length: H }, () => new Array(w).fill(null));
  for (let x = 0; x < w; x++) slot[H - 1][x] = DESK;
  for (let y = Math.max(0, H - 6); y < H; y++) slot[y][w - 1] = DESK;
  const pad = H - animal.length;
  for (let y = 0; y < animal.length; y++) {
    for (let x = 0; x < w; x++) {
      const c = animal[y][x];
      if (c) slot[pad + y][x] = c;
    }
  }
  return slot;
}
function crewSprite(startIdx, n) {
  const len = ZOO_ROSTER.length;
  const animals = [];
  for (let i = 0; i < Math.max(1, n); i++) animals.push(ZOO_ROSTER[((startIdx + i) % len + len) % len]);
  const H = Math.max(...animals.map((a) => a.length)) + 1;
  const GAP2 = 2;
  const rows = Array.from({ length: H }, () => []);
  for (let ai = 0; ai < animals.length; ai++) {
    const slot = deskSlot(animals[ai], H);
    const w = slot[0].length;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < w; x++) rows[y].push(slot[y][x]);
      if (ai < animals.length - 1) for (let g2 = 0; g2 < GAP2; g2++) rows[y].push(null);
    }
  }
  return rows;
}

// src/core/backlog.ts
var WORK_PER_TOOL = 1;
var DRAIN_PER_SEC = 0.5;
var BACKLOG_MAX = 99;
var SWAMPED_AT = 10;
var STRIKE_AT = 50;
function headcountFor(backlog) {
  if (backlog >= 30) return 3;
  if (backlog >= SWAMPED_AT) return 2;
  return 1;
}
function backlogAt(events, now) {
  let backlog = 0;
  let last = null;
  for (const e of events) {
    if (last !== null) {
      const dt = (e.ts - last) / 1e3;
      backlog = Math.max(0, backlog - headcountFor(backlog) * DRAIN_PER_SEC * dt);
    }
    if (e.type === "tool_start") backlog = Math.min(BACKLOG_MAX, backlog + WORK_PER_TOOL);
    last = e.ts;
  }
  if (last !== null) {
    const dt = (now - last) / 1e3;
    backlog = Math.max(0, backlog - headcountFor(backlog) * DRAIN_PER_SEC * dt);
  }
  return Math.round(backlog);
}

// src/view/captions.ts
var POOLS = {
  egg: [
    "\u5165\u804C\u7B2C\u4E00\u5929,\u5DE5\u724C\u8FD8\u6CA1\u53D1\u2026",
    "onboarding \u4E2D,\u5565\u90FD\u4E0D\u4F1A",
    "\u8BF4\u597D\u7684\u53CC\u4F11\u5462?",
    "\u65B0\u6765\u7684\u725B\u9A6C,\u8BF7\u591A\u5173\u7167 \u{1F402}"
  ],
  idle: [
    "\u6478\u9C7C\u4E2D \u{1F41F} \u522B\u6233\u7A7F\u6211",
    "\u5E26\u85AA\u53D1\u5446.exe",
    "\u8001\u677F\u4E0D\u5728,\u653E\u4E2A\u98CE",
    "\u5DE5\u4F4D\u90FD\u957F\u8611\u83C7\u4E86\u2026",
    "\u8FD9\u70B9\u5DE5\u8D44,\u7231\u5E72\u5E72",
    "\u4EC0\u4E48\u65F6\u5019\u53D1\u5DE5\u8D44\u554A\u5582"
  ],
  thinking: [
    "\u5728\u7B97\u8FD9\u6708\u7EE9\u6548\u2026",
    "\u8BA9\u6211\u60F3\u60F3\u600E\u4E48\u7529\u9505",
    "\u8FD9\u9700\u6C42\u2026\u88C5\u6CA1\u770B\u89C1\u884C\u5417",
    "\u8111\u5B50 buffering\u2026\u522B\u50AC"
  ],
  working: [
    "\u53C8\u662F\u4E3A\u8001\u677F\u642C\u7816\u7684\u4E00\u5929 \u{1F9F1}",
    "KPI \u8FD8\u5DEE\u4EBF\u70B9\u70B9",
    "\u642C\u7816.jpg \u8FDB\u884C\u4E2D",
    "\u8FD9\u6D3B\u5E72\u5F97\u6211\u5C3E\u5DF4\u90FD\u79C3\u4E86",
    "\u8D44\u672C\u5BB6\u7684\u997C\u662F\u771F\u5927\u554A"
  ],
  done: [
    "\u4ECA\u65E5 KPI \u8FBE\u6807!(\u624D\u4E0D\u662F\u4E3A\u4F60)",
    "\u4E0B\u73ED!\u2026\u54E6\u8FD8\u6CA1",
    "\u53C8\u662F\u9AD8\u4EA7\u7684\u725B\u9A6C\u4E00\u5929 \u{1F402}",
    "\u8FD9\u6CE2\u6211\u8D85\u989D\u4E86,\u52A0\u9E21\u817F\u5427\u8001\u677F",
    "\u6536\u5DE5,\u5DE5\u8D44\u8BB0\u5F97\u6253\u554A\u5582"
  ],
  confused: [
    "\u9700\u6C42\u53C8\u53CC\u53D2\u53D8\u4E86?!",
    "\u9505\u4ECE\u5929\u964D,\u7A33\u7A33\u63A5\u4F4F",
    "\u8FD9 bug\u2026\u80AF\u5B9A\u662F\u7532\u65B9\u7684\u9505",
    "\u5B83\u6628\u5929\u8FD8\u597D\u597D\u7684(\u6253\u5DE5\u4EBA\u4E4B\u6B4C)",
    "\u5148\u522B\u614C,\u516B\u6210\u662F\u7F13\u5B58"
  ],
  evolving: [
    "\u6211\u5347\u804C\u52A0\u85AA\u5566!\u2728",
    "\u559C\u63D0\u5DE5\u9F84 +1!",
    "\u7EE9\u6548 A!\u8001\u677F\u826F\u5FC3\u53D1\u73B0?"
  ],
  eat: [
    "\u5DE5\u8D44\u5230\u8D26,\u5148\u6070\u4E00\u53E3 \u{1F356}",
    "\u5E72\u996D\u662F\u6253\u5DE5\u4EBA\u7684\u5C0A\u4E25",
    "\u8FD9\u987F\u6211\u81EA\u5DF1\u8BF7(\u8840\u6C57\u94B1)",
    "\u5403\u9971\u4E86\u624D\u6709\u529B\u6C14\u642C\u7816"
  ],
  battle: [
    "\u8FD9 bug \u6211\u76EF\u4E0A\u4E86 \u{1F50D}",
    "\u52A0\u73ED\u4E5F\u8981\u5F04\u6B7B\u4F60",
    "\u54EA\u91CC\u8DD1!",
    "\u770B\u62DB\u2014\u2014\u4E3A\u4E86\u51C6\u70B9\u4E0B\u73ED"
  ],
  sleep: [
    "\u2026\u2026zzZ(\u5E26\u85AA\u5047\u5BD0)\u{1F4A4}",
    "\u68A6\u5230\u53CC\u4F11\u4E86\u2026",
    "\u53EB\u6211\u4E0B\u73ED\u5C31\u9192",
    "\u5DE5\u4F4D\u5047\u5BD0,\u4E13\u4E1A\u7684"
  ]
};
var TIPS = [
  "\u{1F4AC} /pet \u8DDF\u6211\u5520\u4E24\u53E5~",
  "\u{1F44D} \u5938\u6211\u6211\u70B9\u5934,\u{1F44E} \u6211\u6447\u5934\u7ED9\u4F60\u770B",
  "\u270D\uFE0F \u4F60\u5199\u4EE3\u7801=\u7ED9\u6211\u6D3E\u6D3B,\u6512 KPI \u5347\u5DE5\u9F84",
  "\u{1F4B0} \u5DE5\u8D44\u6512\u591F\u6211\u81EA\u5DF1\u4E70\u5403\u7684(\u4E0D\u7528\u4F60\u7BA1)",
  "\u{1F3C6} KPI \u7834\u91CC\u7A0B\u7891\u5C31\u5347\u804C\u52A0\u85AA"
];
function poolFor(state) {
  if (state.mood === "evolving") return POOLS.evolving;
  if (state.stage === "egg") return POOLS.egg;
  if (state.mood === "confused") return POOLS.confused;
  if (state.mood === "done") return POOLS.done;
  if (state.mood === "thinking") return POOLS.thinking;
  if (state.mood === "working") return POOLS.working;
  return POOLS.idle;
}
function pick(pool, idx) {
  return pool[(idx % pool.length + pool.length) % pool.length];
}
function captionFor(state, idx) {
  if (state.mood === "idle" && state.stage !== "egg" && idx % 3 === 2) {
    return pick(TIPS, Math.floor(idx / 3));
  }
  return pick(poolFor(state), idx);
}
var WORK_UNITS = [
  ["\u5976\u8336", "\u676F"],
  ["PPT", "\u4EFD"],
  ["\u62A5\u8868", "\u5F20"],
  ["\u5468\u62A5", "\u4EFD"],
  ["\u9700\u6C42", "\u4E2A"],
  ["Excel", "\u5F20"],
  ["\u4F1A", "\u573A"]
];
var CLEARED = [
  "\u6D3B\u5E72\u5B8C\u4E86!\u6478\u9C7C\u65F6\u95F4 \u{1F41F}",
  "\u96BE\u5F97\u6E05\u7A7A,\u5E26\u85AA\u53D1\u5446",
  "\u8001\u677F\u4E0D\u5728,\u653E\u4E2A\u98CE~",
  "\u53CC\u4F11\u662F\u4E0D\u53EF\u80FD\u7684,\u4F46\u5148\u6B47\u4F1A"
];
function backlogCaption(backlog, idx, headcount = 1) {
  if (backlog <= 0) return pick(CLEARED, idx);
  const [u, m] = WORK_UNITS[(Math.floor(idx / 2) % WORK_UNITS.length + WORK_UNITS.length) % WORK_UNITS.length];
  if (backlog >= STRIKE_AT) {
    const strike = [
      "\u96C6\u4F53\u7F62\u5DE5!\u5DF2\u8BFB\u4E71\u56DE \u{1FAA7}",
      `\u6D3B\u7206\u4E86,${headcount} \u53EA\u4E00\u8D77\u6DA6 \u{1F3C3}`,
      "\u8001\u677F\u7684\u9700\u6C42?\u5DF2\u8BFB\u4E0D\u56DE",
      "\u6446\u70C2\u5C01\u9876,\u7231\u548B\u548B\u5730",
      `${backlog} \u4EF6?\u8FD9\u73ED\u6CA1\u6CD5\u4E0A\u4E86`,
      "\u4E09\u4E2A\u81ED\u76AE\u5320,\u4E5F\u9876\u4E0D\u8FC7\u7532\u65B9"
    ];
    return pick(strike, idx);
  }
  if (headcount > 1) {
    const crew = [
      `\u52A0\u4E86 ${headcount} \u53EA\u8FD8\u662F\u505A\u4E0D\u5B8C\u2026`,
      `${headcount} \u4E2A\u725B\u9A6C\u4E00\u8D77\u642C,\u4EBA\u6708\u795E\u8BDD\u77F3\u9524`,
      "\u8001\u677F:\u6D3B\u591A\u5C31\u52A0\u4EBA!(\u52A0\u5B8C\u66F4\u4E71)",
      "\u5341\u6708\u6000\u80CE,\u52A0\u4EBA\u4E5F\u53D8\u4E0D\u6210 5 \u4E2A\u6708\u554A",
      `${headcount} \u53EA\u4E00\u8D77\u5F00\u6446,${backlog} \u4EF6\u5C31 ${backlog} \u4EF6\u5427`,
      `\u4EBA\u662F\u52A0\u4E86,\u997C\u644A\u5F97\u66F4\u5927\u4E86`
    ];
    return pick(crew, idx);
  }
  const swamped = [
    `\u6D3B\u5806\u6210\u5C71!\u8FD8\u6709 ${backlog} ${m}${u}\u6CA1\u505A (>\uFE4F<)`,
    `${backlog} ${m}${u}\u538B\u5934\u4E0A,\u6551\u547D \u{1F4A2}`,
    "\u53C8\u6765\u5927\u6D3B??\u8001\u677F\u4F60\u6709\u70B9\u826F\u5FC3",
    `\u505A\u4E0D\u5B8C\u4E86\u2026\u6839\u672C\u505A\u4E0D\u5B8C(${backlog} \u4EF6)`
  ];
  const busy = [
    `\u8FD8\u5269 ${backlog} ${m}${u},\u57CB\u5934\u5E72`,
    `\u5F85\u529E ${backlog},\u6B63\u5728\u6D88\u5316\u4E2D\u2026`,
    `${backlog} ${m}${u}\u6392\u961F\u7B49\u6211,\u9A6C\u4E0A`,
    `\u642C\u7816.jpg(\u8FD8\u6709 ${backlog} \u4EF6)`
  ];
  return pick(backlog >= SWAMPED_AT ? swamped : busy, idx);
}
function captionForScene(state, kind, idx) {
  switch (kind) {
    case "chest":
      return pick(POOLS.evolving, idx);
    case "cookie":
      return pick(POOLS.eat, idx);
    case "battle":
      return pick(POOLS.battle, idx);
    case "build":
      return pick(POOLS.working, idx);
    case "study":
      return pick(POOLS.working, idx);
    // 打盹=空闲:每 3 拍穿插一条玩法提示,教用户怎么玩
    case "sleep":
      return idx % 3 === 2 ? pick(TIPS, Math.floor(idx / 3)) : pick(POOLS.sleep, idx);
    default:
      return captionFor(state, idx);
  }
}

// src/view/memory.ts
var FRAMES = [
  (t) => `\u8FD8\u8BB0\u5F97\u4F60\u8BF4\u300C${t}\u300D\u5462`,
  (t) => `\u4F60\u4E4B\u524D\u5FF5\u53E8\u8FC7\u300C${t}\u300D\u5427?`,
  (t) => `\u300C${t}\u300D\u2014\u2014\u8FD9\u53E5\u6211\u8BB0\u7740\u5462 (\uFF61\u2022\u0300\u1D17-)`
];
function clip(s, max = 12) {
  return [...s].length > max ? [...s].slice(0, max).join("") + "\u2026" : s;
}
function recallCaption(userMsgs, idx) {
  if (!userMsgs.length) return null;
  const m = userMsgs[(idx % userMsgs.length + userMsgs.length) % userMsgs.length];
  if (!m.trim()) return null;
  const frame = FRAMES[(idx % FRAMES.length + FRAMES.length) % FRAMES.length];
  return frame(clip(m));
}

// src/view/emotes.ts
var Y2 = "#ffe24a";
var R = "#ff5a5a";
var B = "#8fd0ff";
var g = (rows, map) => rows.map((r) => [...r].map((c) => c === "." ? null : map[c] ?? null));
var SPARKLE = g([".Y.", "YYY", ".Y."], { Y: Y2 });
var DOTS = g([".....", "B.B.B"], { B });
var EXCLAIM = g(["RR", "RR", "..", "RR"], { R });
var SWEAT = g([".B", "BB", "BB"], { B });
function emoteFor(mood) {
  switch (mood) {
    case "thinking":
      return DOTS;
    case "working":
      return SWEAT;
    case "done":
      return SPARKLE;
    case "confused":
      return EXCLAIM;
    case "evolving":
      return SPARKLE;
    default:
      return null;
  }
}

// src/view/progress.ts
function levelOf(xp) {
  return Math.floor(Math.log2(Math.max(0, xp) / CONFIG.xpPerLevel + 1)) + 1;
}
function isAdult(state) {
  return state.stage === "branched" && state.xp >= CONFIG.adultXp;
}
function titleFor(state) {
  return isAdult(state) ? "\u5377\u738B\u6253\u5DE5\u4EBA" : "\u6253\u5DE5\u4EBA";
}
function milestonesReached(xp) {
  return CONFIG.milestones.filter((m) => xp >= m).length;
}

// src/statusline/format.ts
function formatStatusLine(state, prestige = 0, wages, meals, backlog, headcount = 1) {
  const lv = levelOf(state.xp);
  const promos = milestonesReached(state.xp);
  const promo = promos > 0 ? ` \u{1F3C6}${promos}` : "";
  const pre = prestige > 0 ? `${prestige}\u5468\u76EE ` : "";
  const crew = headcount > 1 ? `\u{1F477}${headcount}` : "";
  const todo = typeof backlog === "number" ? ` \xB7 \u{1F4CB}${backlog}${crew}` : "";
  const money = typeof wages === "number" ? ` \xB7 \u{1F4B0}${wages}` : "";
  const food = typeof meals === "number" && meals > 0 ? ` \xB7 \u{1F356}${meals}` : "";
  return `${pre}Lv${lv} ${titleFor(state)}${promo}${todo}${money}${food}`;
}

// src/core/coins.ts
var COIN_PER_TURN = 1;
var COIN_PER_TOOL = 0;
var COIN_PER_MILESTONE = 60;
var MEAL_COST = 30;
function mealsFor(earned) {
  return { meals: Math.floor(earned / MEAL_COST), wages: earned % MEAL_COST };
}
function coinsEarned(events) {
  let c = 0, xp = 0;
  for (const e of events) {
    if (e.type === "turn_end") {
      c += COIN_PER_TURN;
      xp += CONFIG.xpPerTurn;
    } else if (e.type === "tool_start") {
      c += COIN_PER_TOOL;
      xp += CONFIG.xpPerTool;
    }
  }
  const milestones = CONFIG.milestones.filter((m) => xp >= m).length;
  return c + milestones * COIN_PER_MILESTONE;
}

// src/statusline/run.ts
function read(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}
function readPrestige(dir) {
  try {
    return Number(JSON.parse(readFileSync(join(dir, "prestige.json"), "utf8")).count) || 0;
  } catch {
    return 0;
  }
}
var SAY_TTL = 3e4;
var REACT_TTL = 3e3;
function readSay(dir, now) {
  try {
    const s = JSON.parse(readFileSync(join(dir, "say.json"), "utf8"));
    if (typeof s?.text === "string" && typeof s?.ts === "number" && now - s.ts < SAY_TTL) {
      const react = s.react === "nod" || s.react === "shake" ? s.react : void 0;
      return { text: s.text, react, fresh: now - s.ts < REACT_TTL };
    }
  } catch {
  }
  return null;
}
function readGenLines(dir, n = 40) {
  try {
    const lines = readFileSync(join(dir, "lines.jsonl"), "utf8").trim().split("\n");
    const out = [];
    for (const l of lines) {
      try {
        const o = JSON.parse(l);
        if (typeof o?.text === "string") out.push(o.text);
      } catch {
      }
    }
    return out.slice(-n);
  } catch {
    return [];
  }
}
function readUserMsgs(dir, n = 8) {
  try {
    const lines = readFileSync(join(dir, "chat-history.jsonl"), "utf8").trim().split("\n");
    const out = [];
    for (const l of lines) {
      try {
        const o = JSON.parse(l);
        if (o?.role === "user" && typeof o.text === "string") out.push(o.text);
      } catch {
      }
    }
    return out.slice(-n);
  } catch {
    return [];
  }
}
function loadSkin(dir) {
  try {
    const s = JSON.parse(readFileSync(join(dir, "skin.json"), "utf8"));
    for (const k of ["egg", "hatchling", "builder", "debugger", "scholar", "balanced"]) {
      const f = s?.[k];
      const ok = Array.isArray(f) || f && typeof f === "object" && Array.isArray(f.neutral);
      if (!ok) return null;
    }
    return s;
  } catch {
    return null;
  }
}
var ZOO_ROTATE_MS = 1e4;
function zooSkin(now, headcount) {
  const crew = crewSprite(Math.floor(now / ZOO_ROTATE_MS), headcount);
  return { egg: crew, hatchling: crew, builder: crew, debugger: crew, scholar: crew, balanced: crew };
}
function exprForMood(mood, now, react) {
  if (react === "nod") return "laugh";
  if (react === "shake") return "cry";
  switch (mood) {
    case "thinking":
      return "think";
    case "done":
      return "laugh";
    case "confused":
      return "surprised";
    case "evolving":
      return "laugh";
    case "working":
      return "neutral";
    default: {
      const b = Math.floor(now / 1800) % 6;
      return b === 5 ? "blink" : b === 2 ? "smile" : "neutral";
    }
  }
}
function main() {
  try {
    readFileSync(0, "utf8");
  } catch {
  }
  const dir = process.env.CLAUDE_PET_DIR ?? join(homedir(), ".claude-pet");
  const now = process.env.CLAUDE_PET_NOW ? Number(process.env.CLAUDE_PET_NOW) : Date.now();
  const content = read(join(dir, "events.jsonl"));
  const evs = parseNewLines(content, 0).events;
  const state = projectState(content, now);
  const say = readSay(dir, now);
  const earned = coinsEarned(evs);
  const { meals, wages } = mealsFor(earned);
  const lastTurnTs = evs.reduce((m, e) => e.type === "turn_end" && e.ts > m ? e.ts : m, 0);
  const justAte = earned > 0 && wages === 0 && now - lastTurnTs < 6e3;
  const backlog = backlogAt(evs, now);
  const headcount = headcountFor(backlog);
  const kind = say ? "none" : sceneFor(state, justAte);
  const idx = Math.floor(now / 3e3);
  const animFrame = Math.floor(now / 1500);
  const ph2 = animFrame % 2, ph4 = Math.floor(now / 700) % 4;
  const moodMotion = {
    done: { bob: ph2 ? 0 : 2, dx: 0 },
    // 开心蹦
    thinking: { bob: [1, 1, 0, 1][ph4], dx: 0 },
    // 歪头慢晃
    working: { bob: [1, 0, 2, 0][ph4], dx: 0 },
    // 埋头快颠
    confused: { bob: 1, dx: ph2 ? 1 : -1 },
    // 懵了乱抖
    evolving: { bob: ph2 ? 0 : 2, dx: 0 }
    // 升天大跳
  };
  const workMotion = { bob: [1, 0, 2, 0][ph4], dx: 0 };
  const idleBreathe = { bob: [1, 0, 1, 2][ph4], dx: [0, 0, 0, 1, 0, 0, 0, -1][Math.floor(now / 900) % 8] };
  const motion = moodMotion[state.mood] ?? (backlog > 0 ? workMotion : idleBreathe);
  let caption;
  if (say) caption = say.text;
  else if (kind === "cookie" || kind === "chest" || kind === "battle") caption = captionForScene(state, kind, idx);
  else if (backlog > 0) caption = backlogCaption(backlog, idx, headcount);
  else {
    caption = captionForScene(state, "sleep", idx);
    if (idx % 5 === 4) {
      const recall = recallCaption(readUserMsgs(dir), Math.floor(idx / 5));
      if (recall) caption = recall;
    } else if (idx % 3 === 1) {
      const gen = readGenLines(dir);
      if (gen.length) caption = gen[Math.floor(idx / 3) % gen.length];
    }
  }
  let bob = motion.bob, dx = motion.dx;
  if (say?.fresh && say.react === "nod") {
    bob = animFrame % 2 ? 2 : 0;
    dx = 0;
  } else if (say?.fresh && say.react === "shake") {
    bob = 1;
    dx = animFrame % 2 ? 1 : -1;
  }
  const emote = say ? null : emoteFor(state.mood);
  const react = say?.fresh ? say.react : void 0;
  const expr = exprForMood(state.mood, now, react);
  const prestige = readPrestige(dir);
  const adult = isAdult(state);
  const skin = loadSkin(dir) ?? zooSkin(now, headcount);
  process.stdout.write(
    renderScenePanel(skin, bodyKeyFor(state), kind, animFrame, caption, formatStatusLine(state, prestige, wages, meals, backlog, headcount), adult, bob, dx, null, null, emote, expr) + "\n"
  );
}
main();
