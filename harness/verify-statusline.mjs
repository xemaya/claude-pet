// statusLine ship 门:对临时 CLAUDE_PET_DIR 喂事件、跑打包入口、断言输出反映状态推进。
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ENTRY = new URL('../dist/statusline.mjs', import.meta.url).pathname;
const now = Date.now();
const line = (type, tool) => JSON.stringify(tool ? { ts: now, type, tool } : { ts: now, type }) + '\n';

function run(dir, now) {
  const env = { ...process.env, CLAUDE_PET_DIR: dir };
  if (now !== undefined) env.CLAUDE_PET_NOW = String(now);
  return execFileSync(process.execPath, [ENTRY], { input: '', env }).toString().trim();
}

const cases = [
  { name: 'egg', events: '', expect: ['新人'] },
  { name: 'hatchling', events: Array.from({ length: 10 }, () => line('turn_end')).join(''), expect: ['见习'] },
  { name: 'builder',
    events: Array.from({ length: 60 }, () => line('tool_start', 'Edit')).join('') +
            Array.from({ length: 49 }, () => line('turn_end')).join('') + line('tool_start', 'Edit'),
    expect: ['工匠'] },
  { name: 'scholar',
    events: Array.from({ length: 60 }, () => line('tool_start', 'Read')).join('') +
            Array.from({ length: 49 }, () => line('turn_end')).join('') + line('tool_start', 'Read'),
    expect: ['学者'] },
];

let allPass = true;
for (const c of cases) {
  const dir = mkdtempSync(join(tmpdir(), 'pet-'));
  writeFileSync(join(dir, 'events.jsonl'), c.events);
  const out = run(dir);
  const ok = c.expect.every(s => out.includes(s));
  allPass = allPass && ok;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}: "${out}"  (需含 ${JSON.stringify(c.expect)})`);
}

// 台词门:漫画格应带一句「台词」,且不同相位能选到不同台词
{
  const dir = mkdtempSync(join(tmpdir(), 'pet-cap-'));
  writeFileSync(join(dir, 'events.jsonl'),
    Array.from({ length: 60 }, () => line('tool_start', 'Edit')).join('') +
    Array.from({ length: 49 }, () => line('turn_end')).join('') + line('tool_start', 'Edit'));
  const caps = [0, 1, 2, 3].map(k => run(dir, k * 3000 + 100));  // 跨 3s 相位
  const hasCaption = caps.every(o => o.includes('╭') && o.includes('╰')); // 对话气泡框
  const variesCaption = new Set(caps).size > 1;
  const capOk = hasCaption && variesCaption;
  allPass = allPass && capOk;
  console.log(`${capOk ? 'PASS' : 'FAIL'}  caption: ${hasCaption ? '有台词' : '缺台词'} / ${variesCaption ? '会轮换' : '不换'}`);
}

console.log(allPass ? '\nSTATUSLINE: PASS' : '\nSTATUSLINE: FAIL');
process.exit(allPass ? 0 : 1);
