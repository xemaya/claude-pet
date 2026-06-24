// 聊天记忆:从历史用户消息里挑一条做"回忆"台词,空闲时偶尔冒出来。纯函数、确定性(按 idx 选)。

const FRAMES: ((t: string) => string)[] = [
  (t) => `还记得你说「${t}」呢`,
  (t) => `你之前念叨过「${t}」吧?`,
  (t) => `「${t}」——这句我记着呢 (｡•̀ᴗ-)`,
];

/** 截断到显示友好长度(中文按字数粗略截,避免气泡过宽)。 */
function clip(s: string, max = 12): string {
  return [...s].length > max ? [...s].slice(0, max).join('') + '…' : s;
}

/** 从历史用户消息挑一条 + 一种说法,拼成回忆台词。无历史则 null。 */
export function recallCaption(userMsgs: string[], idx: number): string | null {
  if (!userMsgs.length) return null;
  const m = userMsgs[((idx % userMsgs.length) + userMsgs.length) % userMsgs.length];
  if (!m.trim()) return null;
  const frame = FRAMES[((idx % FRAMES.length) + FRAMES.length) % FRAMES.length];
  return frame(clip(m));
}
