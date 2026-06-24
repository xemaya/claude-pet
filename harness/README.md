# 反应性 harness(ship 门)

眼睛分不出"宠物在反应"vs"冻住"。本脚本驱动脚本事件流、截各状态 canvas、断言两两像素差 >2%。

跑法:
1. 另开一个终端 `npm run dev`
2. `npm run verify`

PASS = 各形态/情绪真的渲染不同;FAIL = 有状态没体现到画面(改 sprite/视图后必跑)。

注意:会覆盖 ~/.claude-pet/events.jsonl 与浏览器 localStorage(harness 自行重置)。
