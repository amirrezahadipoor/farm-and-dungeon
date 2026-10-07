// run_combat.js — جنگِ دور دانجن (جداسازی از run.js — ن۳۴):
// هدف‌گیری/ضربه‌ی قوسی خودکار + کریتیک + ناک‌بک، مهارت چرخش، جدایی دشمن‌ها
// (حرکت/مسیر/طبقه در run.js؛ غنیمت در run_loot.js)
import { ACT_DUR } from './art/hero_pose.js';

// حمله‌ی خودکار قوسی به نزدیک‌ترین دشمن + خط زمانی ضربه (اعمال در ۰٫۴۵ انیمیشن)
export function runAttack(run, dt) {
  const h = run.hero, D = run.dungeon;
  if (h.act < 0 && h.skillT <= 0) {
    let best = null, bd = 36 + run.rangeBonus;
    for (const e of D.enemies) {
      if (e.state === 'die') continue;
      const d = Math.hypot(e.x - h.x, e.y - h.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (best && h.atkCd <= 0) {
      h.atkTarget = best;
      h.dir = Math.abs(best.x - h.x) > Math.abs(best.y - h.y) ? (best.x > h.x ? 'right' : 'left') : (best.y > h.y ? 'down' : 'up');
      h.act = 0; h.actDur = ACT_DUR.sword; h.applied = false;
    }
  }
  if (h.atkCd > 0) h.atkCd -= dt;
  if (h.act >= 0) {
    h.act += dt / h.actDur;
    if (h.act >= 0.45 && !h.applied) {
      h.applied = true;
      const [fx2, fy2] = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] }[h.dir];
      run.fx.slash(h.x + fx2 * 14, h.y - 12 + fy2 * 10, Math.atan2(fy2, fx2) + (Math.random() - 0.5) * 0.4, 20);
      for (let ei = 0; ei < D.enemies.length; ei++) { // بدون کپی آرایه (قبلاً [...D.enemies] در هر ضربه!)
        const e = D.enemies[ei];
        if (e.state === 'die') continue;
        const dx = e.x - h.x, dy = e.y - h.y, d = Math.hypot(dx, dy);
        if (d > 42 + run.rangeBonus) continue;
        if ((dx * fx2 + dy * fy2) / (d || 1) < 0.25) continue; // فقط جلوی قهرمان
        runHit(run, e, dx / (d || 1), dy / (d || 1));
      }
    }
    if (h.act >= 1) { h.act = -1; h.atkCd = 0.22; }
  }
}

// مهارت چرخش: چرخش جهت + ضربه‌ی یک‌باره به همه‌ی دشمنان در شعاع
export function runSkillSpin(run, dt) {
  const h = run.hero, D = run.dungeon;
  if (h.skillT > 0) {
    h.skillT -= dt;
    h.dir = ['right', 'down', 'left', 'up'][Math.floor((0.55 - h.skillT) * 8) % 4];
    if (!h.skillHit) {
      h.skillHit = true;
      run.fx.burst(h.x, h.y - 12, [[150, 225, 255, 255], [255, 255, 255, 255]], 14, { sp: 55, up: 10, life: 0.35 });
      run.fx.shake(2, 0.15);
      for (let ei = 0; ei < D.enemies.length; ei++) { // بدون کپی آرایه
        const e = D.enemies[ei];
        if (e.state === 'die' || Math.hypot(e.x - h.x, e.y - h.y) >= 46) continue;
        const dx = e.x - h.x, dy = e.y - h.y, d = Math.hypot(dx, dy) || 1;
        runHit(run, e, dx / d, dy / d, run.skillDmg, true);
      }
    }
  } else h.skillHit = false;
}

// جدایی دشمن‌ها از هم (نهم‌پوشانی) — solid مشترک
export function separateEnemies(run) {
  const D = run.dungeon;
  const solid = run._hooks.solid;
  for (let i = 0; i < D.enemies.length; i++) for (let j = i + 1; j < D.enemies.length; j++) {
    const a = D.enemies[i], b = D.enemies[j];
    if (a.state === 'die' || b.state === 'die') continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    const min = a.isBoss || b.isBoss ? 22 : 13;
    if (d > 0.01 && d < min) {
      const push = (min - d) / 2, ux = dx / d, uy = dy / d;
      if (!solid(a.x - ux * push, a.y)) a.x -= ux * push;
      if (!solid(a.x, a.y - uy * push)) a.y -= uy * push;
      if (!solid(b.x + ux * push, b.y)) b.x += ux * push;
      if (!solid(b.x, b.y + uy * push)) b.y += uy * push;
    }
  }
}

// ضربه‌ی قهرمان به دشمن: کریتیک/کمبو/شناور + ناک‌بک
export function runHit(run, e, ux, uy, dmg, skill) {
  if (run.onSfx) run.onSfx('hit'); // مات و نرم — نرخ‌محدود در engine
  const crit = !skill && Math.random() < 0.12 + run.critBonus;
  const d = Math.round((dmg ?? run.baseDmg) * (crit ? 1.8 : 1) * (1 + 0.04 * Math.min(run.comboN, 5)));
  e.hurt(d, ux * 130, uy * 130);
  run.fx.float(e.x, e.y - 46, '-' + d, crit ? 'crit' : skill ? 'skill' : 'hit', { crit, scale: crit ? 1.3 : 1 });
  if (crit) { run.fx.shake(2.5, 0.14); run.fx.burst(e.x, e.y - 12, [[255, 220, 120, 255], [255, 255, 255, 255]], 7, { sp: 46, life: 0.3 }); }
  run.fx.stop(skill ? 0.05 : 0.03);
}
