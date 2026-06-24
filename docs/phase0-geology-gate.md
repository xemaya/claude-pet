# Phase 0 — 地基门结论

**日期**: 2026-06-24
**问题**: Claude Code 的 hooks 是否真的 fire?(决定整个"hook→宠物"方案成不成立)

## 验证方式

装上真实 hooks(`~/.claude/settings.json` 映射 6 个事件到 `pet-hook.sh`),不另跑探针——
真 hook 写入 `~/.claude-pet/events.jsonl` 的增长本身就是 fire 的证据。

## 结论

### 终端 / 本 session 上下文:✅ PASS
- 安装 hooks 后,**未手写任何事件**,`events.jsonl` 自行增长出真实工具事件:
  `"tool":"Bash"`、`"tool":"Edit"`、`mcp__plugin_playwright_*` 等,以及 `tool_end`。
- **tool_name 抽取成立**(I4 风险排除):真实 `PreToolUse` 的 stdin JSON 含 `.tool_name`,
  脚本里的 python3 提取在实测中正确产出 `"tool":"Edit"` 等字段。
- 端到端链路验证:喂事件流后宠物从 🥚 实时孵化→进化成工匠系 `🔨 + 表情`
  (见 `phase0-evidence.png`),且不同 poll 抓到不同表情(working / idle),证明在反应、未冻屏。
- 旁证:未归桶的工具名(playwright `mcp__...`)正确不计分;`Bash`→侦探系、`Edit`→工匠系。

### Claude desktop app 上下文:⏳ 待用户确认
- 本 session 无法切换到 desktop app 自验。
- 用户动作:在 desktop app 里跑一轮对话,`wc -l ~/.claude-pet/events.jsonl` 应增长。
  - 增长 → desktop app 也 PASS,方案完全成立。
  - 不增长 → desktop app 不走 settings.json hooks,需为该上下文另寻信号源(spec 所述"推倒重来"仅限 desktop 这一路)。

## 去/不去

**GO**(至少在终端/本 session 上下文已证实成立)。Phase 1 逻辑链 + 接线已跑通真实事件。
desktop app 一路待用户补一个 5 分钟确认。
