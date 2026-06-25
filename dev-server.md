# 接线与试玩说明

## 软链设置(一次性)

把运行时目录暴露给 vite 静态服务(dev 期):

```bash
mkdir -p claude-pet/public
ln -sfn ~/.claude-pet claude-pet/public/claude-pet
```

## 启动开发服务器

```bash
cd claude-pet && npm run dev
```

Vite 会打印本地开发地址(默认 http://localhost:5173)。

## 验收步骤

1. 浏览器开发地址,应该看到初始状态的蛋 🥚
2. 在 Claude Code(终端或 desktop app 均可)里跑几轮真实对话,产生 `prompt_submit` → `tool_start` → `tool_end` → `turn_end` 事件
3. 观察浏览器里的宠物:
   - 提交 prompt 时 → 颜文字从 idle 变成 thinking `(・_・?)`
   - tool 执行时 → working `(๑•̀ㅂ•́)و`
   - turn 结束时 → done `(づ｡◕‿‿◕｡)づ`
   - 久无事件后自动 → idle `(˘ω˘)`
4. 多跑几轮(目标 10 个 turn = 50 XP)后,应该看到 stage 从 egg 升级到 hatchling,宠物脸变成 evolving `✧(≖ ◡ ≖)✧`,然后稳定

## 注意

- `npm run dev` 只在开发时需要,Phase 3 迁移到 Tauri 后宠物会成为常驻浮窗
- localStorage 只在当前浏览器/页面持久化,换标签页或清缓存会重置
- Phase 1 验收标准:真实事件流驱动颜文字变化,stage 晋升正常进行
