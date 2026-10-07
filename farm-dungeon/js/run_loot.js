// run_loot.js — غنیمت‌های جنگی دانجن (جداسازی از run.js — ن۳۰):
// کشتار→ذرات/کمبو/دراپ، آهن‌ربای جمع‌آوری، بازکردن صندوق — اقتصادِ میدان نبرد
import { DEATH_COLORS } from './art/monster_parts.js';
import { rollItemDrop, rollSeedDrop, rollCoinDrop } from './items.js';
import { TILE } from './tiles.js';

// مرگ دشمن: کمبو/هیت‌استاپ/ذرات + دراپ مستقیم (بذر=تنها منبع، سکه، آیتم نادر)
export function lootKill(run, e) {
  const D = run.dungeon, h = run.hero;
  if (run.onSfx) run.onSfx(e.isBoss ? 'boss' : 'kill');
  run.kills++;
  if (e.isElite) run.eliteKills++;
  run.comboN++; run.comboT = 4; if (run.comboN > run._maxCombo) run._maxCombo = run.comboN; // کمبو کشتار
  if (run.comboN >= 2) run.fx.float(h.x, h.y - 58, 'x' + run.comboN, 'gold', { scale: 1 });
  run.fx.stop(e.isBoss ? 0.12 : 0.035);
  run.fx.burst(e.x, e.y - 10, DEATH_COLORS[e.kind], e.isBoss ? 26 : 12, { sp: e.isBoss ? 60 : 34, up: 30, life: 0.55 });
  if (e.kind === 'imp') { // ن۴۴: اخگرِ مرگ — نزدیک نایستید
    run.fx.burst(e.x, e.y - 8, [[255, 195, 106, 255], [224, 138, 74, 255], [176, 84, 38, 255]], 12, { sp: 50, up: 22, life: 0.45 });
    const h2 = run.hero;
    if (h2.iframe <= 0 && !h2.dead && Math.hypot(h2.x - e.x, h2.y - 10 - e.y) < 34) run._hooks.onHit(e, Math.max(1, Math.round(e.dmg * 0.6)));
  }
  const mul = 1 + run.floor / 10;
  let n = e.isBoss ? Math.round(25 * mul) : Math.max(1, Math.round((1 + Math.random()) * mul)) + run.greedBonus;
  if (e.isElite) { n = Math.round(n * 2.2) + 2; D.drops.push({ x: e.x, y: e.y - 4, kind: 'heart', t: 0 }); } // نخبه: غنیمت×۲٫۲ + قلب تضمینی
  for (let j = 0; j < n; j++) D.drops.push({ x: e.x + (Math.random() - 0.5) * 12, y: e.y + (Math.random() - 0.5) * 12, kind: Math.random() < 0.1 ? 'heart' : 'essence', t: Math.random() * 6 });
  const seedN = e.isBoss ? 2 : 1;
  for (let j = 0; j < seedN; j++) {
    const st = rollSeedDrop(run.floor, e.isElite, e.isBoss);
    if (st) D.drops.push({ x: e.x + (Math.random() - 0.5) * 14, y: e.y + (Math.random() - 0.5) * 14, kind: 'seed', ty: st, t: Math.random() * 6 });
  }
  let cn = rollCoinDrop(run.floor, e.isElite, e.isBoss);
  if (e.kind === 'mummy') cn += 3 + Math.floor(run.floor / 3); // ن۴۴: مومیایی سکه‌دار مقبره
  if (e.stole) cn += e.stole; // ن۴۴: دزد — سکه‌های دزدی‌شده پس داده می‌شود
  if (cn > 0) D.drops.push({ x: e.x + (Math.random() - 0.5) * 10, y: e.y + (Math.random() - 0.5) * 10, kind: 'coin', n: cn, t: Math.random() * 6 });
  const it = rollItemDrop(run.floor, e.isElite, e.isBoss);
  if (it) D.drops.push({ x: e.x, y: e.y - 6, kind: 'item', id: it, t: 0 });
  if (e.isBoss) run.log.push({ k: 'bossDown' });
}

// آهن‌ربا: جذب قطره‌ها + برداشت (گوهر/قلب/سکه/بذر/آیتم → loot دور)
export function lootUpdate(run, dt) {
  const D = run.dungeon, h = run.hero;
  for (let i = D.drops.length - 1; i >= 0; i--) {
    const d = D.drops[i];
    d.t += dt;
    const dx = h.x - d.x, dy = h.y - 6 - d.y, dist = Math.hypot(dx, dy);
    if (dist < 44) { d.x += dx / dist * 130 * dt; d.y += dy / dist * 130 * dt; }
    if (dist < 10) {
      if (d.kind === 'heart') { h.hp = Math.min(run.maxHp, h.hp + 20); run.fx.float(h.x, h.y - 46, '+20', 'heal'); }
      else if (d.kind === 'essence') { run.essence++; run.fx.float(h.x, h.y - 46, '+1', 'ess'); }
      else if (d.kind === 'coin') { run.loot.coins += d.n; run.fx.float(h.x, h.y - 46, '+' + d.n, 'gold'); }
      else if (d.kind === 'seed') {
        if (!run.loot.seeds) run.loot.seeds = {};
        run.loot.seeds[d.ty] = (run.loot.seeds[d.ty] || 0) + 1;
        run.fx.float(h.x, h.y - 46, '+1', 'white');
      } else if (d.kind === 'item') {
        if (!run.loot.items) run.loot.items = {};
        run.loot.items[d.id] = (run.loot.items[d.id] || 0) + 1;
        run.log.push({ k: 'gotItem', id: d.id });
        run.fx.burst(h.x, h.y - 20, [[255, 224, 130, 255], [255, 255, 255, 255]], 14, { sp: 44, up: 30, life: 0.5 });
      }
      D.drops.splice(i, 1);
    }
  }
}

// صندوق‌ها: نزدیک شدی باز می‌شود — بذرِ طبقه+۲ و شانس آیتم
export function lootChests(run) {
  const D = run.dungeon, h = run.hero;
  for (const c of D.chests) {
    if (!c.open && Math.hypot(h.x - (c.x * TILE + 8), h.y - (c.y * TILE + 8)) < 16) {
      c.open = true;
      if (run.onSfx) run.onSfx('chest');
      run.fx.burst(c.x * TILE + 8, c.y * TILE + 6, [[230, 199, 74, 255], [255, 255, 255, 255]], 12, { sp: 40, up: 34, life: 0.5 });
      for (let j = 0; j < 6; j++) D.drops.push({ x: c.x * TILE + 8, y: c.y * TILE + 8, kind: Math.random() < 0.18 ? 'heart' : 'essence', t: Math.random() * 6 });
      const cst = rollSeedDrop(run.floor + 2, false, false); // صندوق: شانس بذر بهتر از کشتار معمولی
      if (cst) D.drops.push({ x: c.x * TILE + 8, y: c.y * TILE + 4, kind: 'seed', ty: cst, t: 0 });
      const cit = rollItemDrop(run.floor + 2, false, false);
      if (cit) D.drops.push({ x: c.x * TILE + 8, y: c.y * TILE - 2, kind: 'item', id: cit, t: 0 });
      run.log.push({ k: 'chest' });
    }
  }
}
