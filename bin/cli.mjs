#!/usr/bin/env node
// claude-pet 安装器:把 statusLine + hooks 合并进 ~/.claude/settings.json。
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = dirname(dirname(fileURLToPath(import.meta.url))); // 包根目录
const CLAUDE_DIR = join(homedir(), '.claude');
const SETTINGS = join(CLAUDE_DIR, 'settings.json');
const HOOK = join(PKG, 'hooks', 'pet-hook.sh');
const BUNDLE = join(PKG, 'dist', 'statusline.mjs');
const SHOP_BUNDLE = join(PKG, 'dist', 'shop.mjs');
const SAY = join(PKG, 'tools', 'pet-say.sh');
const RESET = join(PKG, 'tools', 'pet-reset.sh');
const HELP = join(PKG, 'tools', 'pet-help.sh');
const CMD_TEMPLATE = join(PKG, 'commands', 'pet.md');
const CMD_DEST = join(CLAUDE_DIR, 'commands', 'pet.md');
const CMD_DEST_OLD = join(CLAUDE_DIR, 'commands', 'claude-pet.md'); // 旧命令名,装/卸时清理
const NODE = process.execPath; // 当前 node 绝对路径(避开 nvm 的 PATH/ELOOP)
const EVENTS = {
  SessionStart: 'session_start', UserPromptSubmit: 'prompt_submit', PreToolUse: 'tool_start',
  PostToolUse: 'tool_end', Notification: 'notification', Stop: 'turn_end',
};
const STATUS_CMD = `"${NODE}" "${BUNDLE}"`;
const SHOP_CMD = `"${NODE}" "${SHOP_BUNDLE}"`; // 用绝对 node 路径,避开 nvm ELOOP
const hookCmd = (name) => `bash "${HOOK}" ${name}`;

function load() { try { return JSON.parse(readFileSync(SETTINGS, 'utf8')); } catch { return {}; } }
function save(s) { writeFileSync(SETTINGS, JSON.stringify(s, null, 2) + '\n'); }

function install() {
  if (!existsSync(BUNDLE)) { console.error('缺 dist/statusline.mjs,请先 npm run build'); process.exit(1); }
  if (!existsSync(SHOP_BUNDLE)) { console.error('缺 dist/shop.mjs,请先 npm run build'); process.exit(1); }
  mkdirSync(CLAUDE_DIR, { recursive: true });
  if (existsSync(SETTINGS)) copyFileSync(SETTINGS, SETTINGS + '.claude-pet-backup');
  const s = load();
  s.statusLine = { type: 'command', command: STATUS_CMD };
  s.hooks = s.hooks || {};
  for (const [ev, name] of Object.entries(EVENTS)) {
    s.hooks[ev] = s.hooks[ev] || [];
    const cmd = hookCmd(name);
    const dup = s.hooks[ev].some(g => (g.hooks || []).some(h => h.command === cmd));
    if (!dup) s.hooks[ev].push({ hooks: [{ type: 'command', command: cmd }] });
  }
  save(s);
  // 安装斜杠命令 /pet(把 say 脚本绝对路径填进模板)
  try {
    mkdirSync(join(CLAUDE_DIR, 'commands'), { recursive: true });
    const tpl = readFileSync(CMD_TEMPLATE, 'utf8').replaceAll('__SAY_CMD__', SAY).replaceAll('__RESET_CMD__', RESET).replaceAll('__HELP_CMD__', HELP).replaceAll('__SHOP_CMD__', SHOP_CMD);
    writeFileSync(CMD_DEST, tpl);
    if (existsSync(CMD_DEST_OLD)) rmSync(CMD_DEST_OLD); // 清掉旧 /claude-pet 命令
  } catch { /* 可选,失败不致命 */ }
  console.log('🐾 claude-pet 已安装 ✓');
  console.log('   备份: ' + SETTINGS + '.claude-pet-backup');
  console.log('   新开/刷新 Claude Code 即见;写代码喂它成长。');
  console.log('   跟她聊天: /pet 你好呀   ·   卸载: npx claude-pet uninstall');
}

function uninstall() {
  const s = load();
  if (s.statusLine?.command?.includes('statusline.mjs')) delete s.statusLine;
  if (s.hooks) for (const ev of Object.keys(EVENTS)) {
    if (Array.isArray(s.hooks[ev])) {
      s.hooks[ev] = s.hooks[ev].filter(g => !(g.hooks || []).some(h => (h.command || '').includes('pet-hook.sh')));
      if (s.hooks[ev].length === 0) delete s.hooks[ev];
    }
  }
  save(s);
  try { if (existsSync(CMD_DEST)) rmSync(CMD_DEST); if (existsSync(CMD_DEST_OLD)) rmSync(CMD_DEST_OLD); } catch { /* ignore */ }
  console.log('claude-pet 已卸载 ✓(成长存档 ~/.claude-pet 未删,如需清空可手动 rm)');
}

const cmd = process.argv[2];
if (cmd === 'install') install();
else if (cmd === 'uninstall') uninstall();
else console.log('用法: npx claude-pet install | uninstall');
