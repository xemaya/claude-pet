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

// src/view/food.ts
var BUILDER2 = /* @__PURE__ */ new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
var SCHOLAR2 = /* @__PURE__ */ new Set(["Read", "Grep", "Glob"]);
function foodFor(event) {
  if (event.type === "turn_end") return "meal";
  if (event.type === "tool_start") {
    const t = event.tool ?? "";
    if (BUILDER2.has(t)) return "cookie";
    if (t === "Bash") return "bolt";
    if (SCHOLAR2.has(t)) return "page";
    return "crumb";
  }
  return null;
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
function recentlyAte(content, now, windowMs = 2e3) {
  const { events } = parseNewLines(content, 0);
  return events.some((e) => foodFor(e) !== null && e.ts <= now && now - e.ts < windowMs);
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
  // 宝箱
  n: "#5a3a22",
  c: "#cf9244",
  h: "#6e3f17",
  // 饼
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
        const [r, g, bl] = rgb(t);
        s += `\x1B[38;2;${r};${g};${bl}m\u2580\x1B[0m`;
      } else if (b) {
        const [r, g, bl] = rgb(b);
        s += `\x1B[38;2;${r};${g};${bl}m\u2584\x1B[0m`;
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
function composeCanvas(skin, bodyKey, prop, adult = false, bob = 0, dx = 0, hat = null, effect = null) {
  const body = skin[bodyKey];
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
function renderScenePanel(skin, bodyKey, kind, animFrame, caption, status, adult = false, bob = 0, dx = 0, hat = null, effect = null) {
  const prop = propForScene(kind, animFrame);
  const rows = toHalfBlockRows(composeCanvas(skin, bodyKey, prop, adult, bob, dx, hat, effect));
  const capLines = wrapByWidth(caption, 36, 3);
  const box = dialogBox([...capLines, status], capLines.length);
  for (let i = 0; i < box.length; i++) {
    const r = 1 + i;
    if (r < rows.length) rows[r] = `${rows[r]}  ${box[i]}`;
  }
  return rows.map((l) => "\x1B[0m" + l).join("\n");
}

// src/view/animalSprites.ts
var ANIMAL_SPRITES = {
  egg: [
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, "#feae34", "#feae34", "#feae34", null, null, null, null, null, null, null],
    [null, null, null, null, null, "#feae34", "#feae34", "#feae34", "#fee761", "#fee761", null, null, null, null, null, null],
    [null, null, null, null, null, "#feae34", "#feae34", "#feae34", "#fee761", "#fee761", "#feae34", null, null, null, null, null],
    [null, null, null, null, null, "#bd6c4a", "#fee761", "#feae34", "#feae34", "#feae34", "#feae34", null, null, null, null, null],
    [null, null, null, null, null, null, "#bd6c4a", "#feae34", "#feae34", "#feae34", "#bd6c4a", null, null, null, null, null],
    [null, null, null, null, null, null, null, "#feae34", "#feae34", "#bd6c4a", null, null, null, null, null, null],
    [null, null, null, null, null, null, null, "#feae34", "#fee761", "#bd6c4a", null, null, null, null, null, null],
    [null, null, null, null, null, null, "#feae34", "#feae34", "#feae34", "#feae34", null, null, null, null, null, null],
    [null, null, null, null, null, "#feae34", "#fee761", "#feae34", "#feae34", "#feae34", "#feae34", null, null, null, null, null],
    [null, null, null, null, "#bd6c4a", "#feae34", "#feae34", "#feae34", "#feae34", "#feae34", "#feae34", "#bd6c4a", null, null, null, null],
    [null, null, null, null, null, "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]
  ],
  hatchling: [
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, "#f7c282", "#f7c282", "#f7c282", "#f7c282", null, null, null, null, null, null],
    [null, null, null, null, null, "#f7c282", "#f7c282", "#f7c282", "#f7c282", "#f7c282", "#f7c282", null, null, null, null, null],
    [null, null, null, null, null, "#f7c282", "#262b44", "#e19a65", "#e19a65", "#262b44", "#f7c282", null, null, null, null, null],
    [null, null, null, null, null, "#e19a65", "#f7c282", "#f7c282", "#f7c282", "#f7c282", "#e19a65", null, null, null, null, null],
    [null, null, null, null, null, null, "#e19a65", "#e19a65", "#e19a65", "#e19a65", null, null, null, null, null, null],
    [null, null, null, null, null, "#f7c282", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#f7c282", null, null, null, null, null],
    [null, null, null, null, null, null, "#ffffff", "#ffffff", "#ffffff", "#ffffff", null, null, null, null, null, null],
    [null, null, null, null, null, null, "#f7c282", null, null, "#f7c282", null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]
  ],
  builder: [
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, "#bd6c4a", "#bd6c4a", null, null, null, null, "#bd6c4a", "#bd6c4a", null, null, null],
    [null, null, null, null, null, "#bd6c4a", "#763b36", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#763b36", "#bd6c4a", null, null, null],
    [null, null, null, null, null, "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", null, null],
    [null, null, null, null, "#bd6c4a", "#bd6c4a", "#bd6c4a", "#763b36", "#3f2631", "#e19a65", "#e19a65", "#3f2631", "#763b36", "#bd6c4a", null, null],
    [null, null, null, null, "#bd6c4a", "#bd6c4a", "#bd6c4a", "#763b36", "#763b36", "#e19a65", "#e19a65", "#e19a65", "#763b36", "#bd6c4a", null, null],
    [null, null, null, "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#e19a65", "#52607c", "#52607c", "#bd6c4a", "#bd6c4a", null, null],
    [null, null, "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#e19a65", "#52607c", "#52607c", "#bd6c4a", "#bd6c4a", null, null],
    [null, null, "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#763b36", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", null, null, null],
    [null, null, "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#763b36", "#763b36", "#763b36", "#763b36", "#763b36", "#763b36", null, null, null],
    [null, null, "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#763b36", "#763b36", "#763b36", "#763b36", "#bd6c4a", null, null, null],
    [null, null, "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#763b36", "#763b36", "#763b36", "#763b36", "#bd6c4a", null, null, null],
    [null, null, "#bd6c4a", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#763b36", "#bd6c4a", "#bd6c4a", "#763b36", "#763b36", "#bd6c4a", "#bd6c4a", null, null, null],
    [null, null, null, "#bd6c4a", "#bd6c4a", "#763b36", "#763b36", "#bd6c4a", "#bd6c4a", "#763b36", "#763b36", "#bd6c4a", "#bd6c4a", null, null, null],
    [null, null, null, "#bd6c4a", "#bd6c4a", null, null, "#bd6c4a", "#bd6c4a", "#763b36", null, "#bd6c4a", "#bd6c4a", null, null, null]
  ],
  debugger: [
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, "#ffffff", null, null, null, null, null, "#ffffff", null, null, null, null],
    [null, null, null, null, null, "#c0cbdc", "#ffffff", "#c0cbdc", "#8b9bb4", "#c0cbdc", "#ffffff", "#c0cbdc", null, null, null, null],
    [null, null, null, null, null, "#c0cbdc", "#3f2631", "#ffffff", "#ffffff", "#ffffff", "#3f2631", "#c0cbdc", null, null, null, null],
    [null, null, null, null, null, "#c0cbdc", "#3f2631", "#8b9bb4", "#feae34", "#8b9bb4", "#3f2631", "#c0cbdc", null, null, null, null],
    [null, null, null, null, "#8b9bb4", "#8b9bb4", "#c0cbdc", "#c0cbdc", "#feae34", "#c0cbdc", "#c0cbdc", "#8b9bb4", "#8b9bb4", null, null, null],
    [null, null, null, "#8b9bb4", "#8b9bb4", "#8b9bb4", "#8b9bb4", "#8b9bb4", "#8b9bb4", "#8b9bb4", "#8b9bb4", "#c0cbdc", "#8b9bb4", null, null, null],
    [null, null, null, "#c0cbdc", "#8b9bb4", "#8b9bb4", "#c0cbdc", "#8b9bb4", "#8b9bb4", "#c0cbdc", "#8b9bb4", "#c0cbdc", "#8b9bb4", null, null, null],
    [null, null, null, "#c0cbdc", "#c0cbdc", "#8b9bb4", "#feae34", "#52607c", null, "#feae34", "#c0cbdc", "#8b9bb4", "#8b9bb4", null, null, null],
    [null, null, null, null, "#c0cbdc", "#8b9bb4", null, null, null, null, "#c0cbdc", "#8b9bb4", null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]
  ],
  scholar: [
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, "#8b9bb4", null, null, null, null, null, null, null, "#8b9bb4", null, null, null],
    [null, null, null, null, "#c0cbdc", "#c0cbdc", "#8b9bb4", "#52607c", "#52607c", "#52607c", "#8b9bb4", "#8b9bb4", "#c0cbdc", null, null, null],
    [null, null, null, null, "#52607c", "#52607c", "#c0cbdc", "#8b9bb4", "#52607c", "#8b9bb4", "#c0cbdc", "#c0cbdc", "#52607c", null, null, null],
    [null, null, null, null, "#8b9bb4", "#52607c", "#3f2631", "#c0cbdc", "#c0cbdc", "#c0cbdc", "#3f2631", "#52607c", "#8b9bb4", null, null, null],
    [null, null, null, null, "#8b9bb4", "#52607c", "#3f2631", "#52607c", "#8b9bb4", "#52607c", "#3f2631", "#52607c", "#8b9bb4", null, null, null],
    [null, null, null, null, "#8b9bb4", "#52607c", "#52607c", "#52607c", "#feae34", "#52607c", "#52607c", "#52607c", "#8b9bb4", null, null, null],
    [null, null, null, null, "#52607c", "#8b9bb4", "#8b9bb4", "#8b9bb4", "#feae34", "#8b9bb4", "#8b9bb4", "#8b9bb4", "#52607c", null, null, null],
    [null, null, null, "#52607c", "#52607c", "#52607c", "#52607c", "#52607c", "#52607c", "#52607c", "#52607c", "#52607c", "#52607c", null, null, null],
    [null, null, null, "#52607c", "#52607c", "#8b9bb4", "#8b9bb4", "#c0cbdc", "#c0cbdc", "#c0cbdc", "#8b9bb4", "#52607c", "#52607c", null, null, null],
    [null, null, null, "#52607c", "#8b9bb4", "#8b9bb4", "#8b9bb4", "#c0cbdc", "#c0cbdc", "#c0cbdc", "#8b9bb4", "#8b9bb4", "#52607c", null, null, null],
    [null, null, "#52607c", "#52607c", "#8b9bb4", "#8b9bb4", "#52607c", "#c0cbdc", "#c0cbdc", "#52607c", "#8b9bb4", "#8b9bb4", "#52607c", "#52607c", null, null],
    [null, null, "#52607c", "#52607c", "#8b9bb4", "#8b9bb4", "#52607c", "#52607c", "#52607c", "#52607c", "#8b9bb4", "#8b9bb4", "#52607c", "#52607c", null, null],
    [null, null, "#8b9bb4", "#8b9bb4", "#52607c", "#8b9bb4", "#8b9bb4", "#52607c", "#52607c", "#8b9bb4", "#8b9bb4", "#52607c", "#8b9bb4", "#8b9bb4", null, null],
    [null, null, "#8b9bb4", "#8b9bb4", "#52607c", "#8b9bb4", "#8b9bb4", null, null, "#8b9bb4", "#8b9bb4", "#52607c", "#8b9bb4", "#8b9bb4", null, null]
  ],
  balanced: [
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, "#e19a65", "#e19a65", null, null, null, "#e19a65", "#e19a65", null, null, null],
    [null, null, null, null, null, null, "#ffffff", "#bd6c4a", "#e19a65", "#e19a65", "#e19a65", "#bd6c4a", "#ffffff", null, null, null],
    [null, null, null, null, null, null, "#bd6c4a", "#e19a65", "#e19a65", "#e19a65", "#e19a65", "#e19a65", "#bd6c4a", null, null, null],
    [null, null, null, "#ffffff", null, null, "#bd6c4a", "#3f2631", "#bd6c4a", "#bd6c4a", "#bd6c4a", "#3f2631", "#bd6c4a", null, null, null],
    [null, null, "#ffffff", "#ffffff", null, "#e19a65", "#e19a65", "#3f2631", "#e19a65", "#e19a65", "#e19a65", "#3f2631", "#e19a65", "#e19a65", null, null],
    [null, null, "#bd6c4a", "#bd6c4a", null, "#bd6c4a", "#bd6c4a", "#bd6c4a", "#e19a65", "#3f2631", "#3f2631", "#e19a65", "#bd6c4a", "#bd6c4a", null, null],
    [null, null, "#bd6c4a", "#bd6c4a", null, null, "#bd6c4a", "#e19a65", "#bd6c4a", "#3f2631", "#3f2631", "#bd6c4a", "#bd6c4a", null, null, null],
    [null, null, "#bd6c4a", "#bd6c4a", "#e19a65", "#e19a65", "#e19a65", "#e19a65", "#ffffff", "#bd6c4a", "#bd6c4a", "#ffffff", null, null, null, null],
    [null, null, null, "#e19a65", "#e19a65", "#e19a65", "#e19a65", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#e19a65", null, null, null, null],
    [null, null, null, "#e19a65", "#ffffff", "#ffffff", "#e19a65", "#e19a65", "#ffffff", "#ffffff", "#e19a65", null, null, null, null, null],
    [null, null, null, "#ffffff", null, "#bd6c4a", null, "#e19a65", null, null, "#e19a65", null, null, null, null, null],
    [null, null, null, null, null, null, null, "#ffffff", null, null, "#ffffff", null, null, null, null, null]
  ]
};

// src/view/skin.ts
var DEFAULT_SKIN = ANIMAL_SPRITES;

// src/view/captions.ts
var POOLS = {
  egg: [
    "\u65B0\u4EBA\u62A5\u5230!",
    "\u8FD8\u5728\u719F\u6089\u73AF\u5883\u2026",
    "\u8BF7\u591A\u6307\u6559~"
  ],
  idle: [
    "\u2026\u2026(\u6253\u76F9 \u{1F4A4})",
    "\u5728\u7B49\u4F60\u5F00\u5DE5",
    "\u65E0\u804A\u5730\u6570 token",
    "\u8981\u4E0D\u2026\u518D\u5199\u4E24\u884C?"
  ],
  thinking: [
    "\u8BA9\u6211\u60F3\u60F3\u2026",
    "\u8111\u5B50\u8F6C\u8D77\u6765\u4E86",
    "\u55EF\u2026\u2026\u8FD9\u9898\u6709\u70B9\u4E1C\u897F"
  ],
  working: [
    "\u5E72\u5C31\u5B8C\u4E86",
    "\u624B\u5728\u52A8\u4E86",
    "\u4E13\u6CE8.exe \u8FD0\u884C\u4E2D"
  ],
  done: [
    "\u641E\u5B9A!\u{1F389}",
    "\u8FD9\u8F6E\u6536\u5DE5",
    "\u53C8\u662F\u9AD8\u4EA7\u7684\u4E00\u5929",
    "\u2705 \u4E0B\u4E00\u4E2A"
  ],
  confused: [
    "\u54A6?\u51FA\u5C94\u5B50\u4E86",
    "\u7B49\u4E00\u4E0B\u2026\u8FD9\u4E0D\u5BF9",
    "\u6211\u770B\u770B\u54EA\u91CC\u7EA2\u4E86"
  ],
  evolving: [
    "\u6211\u8F6C\u804C\u5566!\u2728",
    "\u8131\u80CE\u6362\u9AA8!",
    "\u5347\u7EA7\u2014\u2014!"
  ],
  eat: [
    "\u597D\u5403~ \u{1F36A}",
    "\u80FD\u91CF+1",
    "\u8FB9\u5403\u8FB9\u5E72"
  ],
  battle: [
    "\u5403\u6211\u4E00\u51FB!",
    "\u8FD9 bug \u6211\u76EF\u4E0A\u4E86 \u{1F50D}",
    "\u54EA\u91CC\u8DD1!",
    "\u770B\u62DB\u2014\u2014"
  ],
  sleep: [
    "\u2026\u2026zzZ \u{1F4A4}",
    "\u6253\u4E2A\u76F9\u2026",
    "\u53EB\u6211\u5C31\u9192",
    "(\u53D1\u5446\u4E2D)"
  ],
  // 分支 × 干活 的专属吐槽
  builder_working: [
    "\u53EE\u53EE\u5F53\u5F53\u9020\u8D77\u6765 \u{1F528}",
    "\u53C8\u76D6\u4E86\u4E00\u95F4",
    "\u4EE3\u7801\u6DFB\u7816\u52A0\u74E6",
    "\u7ED3\u6784\u5728\u957F\u5927"
  ],
  debugger_working: [
    "\u8FD9 bug \u6211\u76EF\u4E0A\u4E86 \u{1F50D}",
    "\u53EF\u7591\u2026\u975E\u5E38\u53EF\u7591",
    "\u8BA9\u6211\u770B\u770B\u5806\u6808",
    "\u51F6\u624B\u5C31\u5728\u8FD9\u51E0\u884C\u91CC"
  ],
  scholar_working: [
    "\u7FFB\u4E66\u4E2D \u{1F4D6}",
    "\u8FD9\u6BB5\u6211\u8BFB\u8FC7\u2026",
    "\u77E5\u8BC6 +1",
    "\u8BA9\u6211\u67E5\u67E5\u6587\u6863"
  ]
};
var TIPS = [
  "\u{1F4AC} /pet \u8DDF\u6211\u5520\u4E24\u53E5~",
  "\u{1F44D} \u5938\u6211\u6211\u70B9\u5934,\u{1F44E} \u6211\u6447\u5934\u7ED9\u4F60\u770B",
  "\u270D\uFE0F \u591A\u5199\u4EE3\u7801\u5582\u6211,\u6512 xp \u80FD\u5347\u7EA7\u8F6C\u804C",
  "\u{1F528}Edit\u591A\u2192\u5DE5\u5320 \xB7 \u{1F50D}Bash\u591A\u2192\u4FA6\u63A2 \xB7 \u{1F4D6}Read\u591A\u2192\u5B66\u8005",
  "\u2726 \u6512\u591F\u91CC\u7A0B\u7891\u5934\u9876\u4F1A\u4EAE\u661F\u661F\u54E6"
];
function poolFor(state) {
  if (state.mood === "evolving") return POOLS.evolving;
  if (state.stage === "egg") return POOLS.egg;
  if (state.mood === "confused") return POOLS.confused;
  if (state.mood === "done") return POOLS.done;
  if (state.mood === "thinking") return POOLS.thinking;
  if (state.mood === "working") {
    if (state.branch === "builder") return POOLS.builder_working;
    if (state.branch === "debugger") return POOLS.debugger_working;
    if (state.branch === "scholar") return POOLS.scholar_working;
    return POOLS.working;
  }
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
function captionForScene(state, kind, idx) {
  switch (kind) {
    case "chest":
      return pick(POOLS.evolving, idx);
    case "cookie":
      return pick(POOLS.eat, idx);
    case "battle":
      return pick(POOLS.battle, idx);
    case "build":
      return pick(POOLS.builder_working, idx);
    case "study":
      return pick(POOLS.scholar_working, idx);
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

// src/view/progress.ts
var BRANCH_LABEL = {
  builder: "\u5DE5\u5320",
  debugger: "\u4FA6\u63A2",
  scholar: "\u5B66\u8005",
  balanced: "\u5168\u80FD"
};
function levelOf(xp) {
  return Math.floor(Math.log2(Math.max(0, xp) / CONFIG.xpPerLevel + 1)) + 1;
}
function isAdult(state) {
  return state.stage === "branched" && state.xp >= CONFIG.adultXp;
}
function titleFor(state) {
  if (state.stage === "egg") return "\u65B0\u4EBA";
  if (state.stage === "hatchling") return "\u89C1\u4E60";
  const base = state.branch ? BRANCH_LABEL[state.branch] : "\u5168\u80FD";
  return (isAdult(state) ? "\u5927" : "") + base;
}
function milestonesReached(xp) {
  return CONFIG.milestones.filter((m) => xp >= m).length;
}

// src/statusline/format.ts
function formatStatusLine(state, prestige = 0, coins) {
  const lv = levelOf(state.xp);
  const stars = milestonesReached(state.xp);
  const star = stars > 0 ? ` \u2726${stars}` : "";
  const pre = prestige > 0 ? `${prestige}\u5468\u76EE ` : "";
  const coin = typeof coins === "number" ? ` \xB7 \u{1FA99}${coins}` : "";
  return `${pre}Lv${lv} ${titleFor(state)}${star} \xB7 ${state.xp}xp${coin}`;
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
function balance(earned, wallet) {
  return Math.max(0, earned - wallet.spent);
}
function effectActive(wallet, now) {
  return wallet.effect && wallet.effect.until > now ? wallet.effect : null;
}

// src/view/shopItems.ts
var P2 = {
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
function exp2(rows) {
  return rows.map((row) => [...row].map((ch) => P2[ch] ?? null));
}
var HATS = [
  {
    id: "straw",
    name: "\u8349\u5E3D",
    price: 30,
    type: "hat",
    grid: exp2([
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
    grid: exp2([
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
    grid: exp2([
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
    grid: exp2([
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
    grid: exp2([
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
    grid: exp2([
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
    grid: exp2([
      "b..o..g..",
      ".b.o.g...",
      "oogYYboo.",
      ".b.o.g...",
      "b..o..g.."
    ])
  }
];
var SHOP_ITEMS = [...HATS, ...EFFECTS];
function itemById(id) {
  return id ? SHOP_ITEMS.find((i) => i.id === id) ?? null : null;
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
function readWallet(dir) {
  try {
    return parseWallet(JSON.parse(readFileSync(join(dir, "wallet.json"), "utf8")));
  } catch {
    return parseWallet(null);
  }
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
      if (!Array.isArray(s?.[k])) return DEFAULT_SKIN;
    }
    return s;
  } catch {
    return DEFAULT_SKIN;
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
  const state = projectState(content, now);
  const ate = recentlyAte(content, now);
  const say = readSay(dir, now);
  const kind = say ? "none" : sceneFor(state, ate);
  const idx = Math.floor(now / 3e3);
  const animFrame = Math.floor(now / 1500);
  const breathe = [1, 0, 1, 2][Math.floor(now / 700) % 4];
  const sway = [0, 0, 0, 1, 0, 0, 0, -1][Math.floor(now / 900) % 8];
  let caption = say?.text ?? captionForScene(state, kind, idx);
  if (!say && kind === "sleep") {
    if (idx % 5 === 4) {
      const recall = recallCaption(readUserMsgs(dir), Math.floor(idx / 5));
      if (recall) caption = recall;
    } else if (idx % 3 === 1) {
      const gen = readGenLines(dir);
      if (gen.length) caption = gen[Math.floor(idx / 3) % gen.length];
    }
  }
  let bob = breathe, dx = sway;
  if (say?.fresh && say.react === "nod") {
    bob = animFrame % 2 ? 2 : 0;
    dx = 0;
  } else if (say?.fresh && say.react === "shake") {
    bob = 1;
    dx = animFrame % 2 ? 1 : -1;
  }
  const prestige = readPrestige(dir);
  const adult = isAdult(state);
  const skin = loadSkin(dir);
  const wallet = readWallet(dir);
  const coins = balance(coinsEarned(parseNewLines(content, 0).events), wallet);
  const hat = itemById(wallet.equipped)?.grid ?? null;
  const eff = effectActive(wallet, now);
  const effectGrid = eff ? itemById(eff.id)?.grid ?? null : null;
  process.stdout.write(
    renderScenePanel(skin, bodyKeyFor(state), kind, animFrame, caption, formatStatusLine(state, prestige, coins), adult, bob, dx, hat, effectGrid) + "\n"
  );
}
main();
