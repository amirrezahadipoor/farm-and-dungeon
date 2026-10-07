// quests.js — مأموریت‌های چرخان: سه هدف همیشگی با پیشرفت و پاداش؛ با تکمیل، جایگزین می‌شود
import { t } from './i18n.js';

const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// الگوها: {kind, [min,max]، پاداش} — پاداش‌ها کوچک‌اند؛ انگیزه‌اند نه درآمد
const POOL = [
  { kind: 'harvest', n: [6, 14],   cur: 'coins',   rw: [40, 90] },
  { kind: 'kill',    n: [10, 24],  cur: 'essence', rw: [6, 12] },
  { kind: 'floor',   n: [4, 8],    cur: 'coins',   rw: [60, 120] },
  { kind: 'elite',   n: [2, 3],    cur: 'essence', rw: [10, 16] },
  { kind: 'combo',   n: [4, 5],    cur: 'coins',   rw: [50, 90] },
  { kind: 'sell',    n: [12, 30],  cur: 'coins',   rw: [35, 70] },
];

function rollQuest(excludeKinds = []) {
  let pool = POOL.filter((p) => !excludeKinds.includes(p.kind));
  if (!pool.length) pool = POOL;
  const tpl = pool[Math.floor(Math.random() * pool.length)];
  return { kind: tpl.kind, n: ri(tpl.n[0], tpl.n[1]), cur: 0, rcur: tpl.cur, rn: ri(tpl.rw[0], tpl.rw[1]) };
}

export function ensureQuests(s) {
  if (!Array.isArray(s.quests) || s.quests.length !== 3) {
    s.quests = [];
    for (let i = 0; i < 3; i++) s.quests.push(rollQuest(s.quests.map((q) => q.kind)));
  }
  return s.quests;
}

// ثبت پیشرفت؛ خروجی: لیست مأموریت‌های تازه‌تکمیل‌شده (برای توست)
// floor/combo = بیشینه؛ بقیه = جمع
export function trackQuests(app, kind, n = 1) {
  const done = [];
  const qs = app.s.quests || [];
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    if (q.kind !== kind) continue;
    q.cur = kind === 'floor' || kind === 'combo' ? Math.max(q.cur, n) : q.cur + n;
    if (q.cur >= q.n) {
      app.s[q.rcur] += q.rn;
      done.push(q);
      qs[i] = rollQuest(qs.filter((x) => x !== q).map((x) => x.kind));
    }
  }
  return done;
}

export function questLabel(q) {
  return t('q_' + q.kind).replace('{n}', q.n);
}
