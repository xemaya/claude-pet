export const CONFIG = {
  hatchXp: 150,      // 新人 → 见习(约 30 轮对话)
  evolveXp: 1200,    // 见习 → 转职定型
  adultXp: 6000,     // 转职 → 成体(大师,加冠)
  xpPerLevel: 100,   // 等级曲线分母:Lv=floor(log2(xp/100+1))+1
  xpPerTurn: 5,
  xpPerTool: 1,
  balancedThreshold: 0.15,
  idleMs: 30_000,
  milestones: [1500, 4000, 10000, 22000, 50000], // ✦ 里程碑(拉高,难很多)
} as const;
