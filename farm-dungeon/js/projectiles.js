// projectiles.js — پرتابه‌های دشمن (ن۴۴): تیر کماندار (تند/مستقیم) + گلوله‌ی آتش آتش‌جان (کند/روشن)
// بدون تخصیص در حلقه — آرایه‌ی run.projs؛ برخورد با قهرمان/دیوار همان قواعد مبارزه
export const PROJ = {
  arrow: { sp: 155, life: 1.4, r: 7 },
  fire:  { sp: 78,  life: 2.1, r: 8 },
};

export function spawnProj(list, kind, x, y, tx, ty, dmg, owner) {
  const cfg = PROJ[kind];
  const d = Math.hypot(tx - x, ty - y) || 1;
  list.push({ kind, x, y, vx: (tx - x) / d * cfg.sp, vy: (ty - y) / d * cfg.sp, t: 0, life: cfg.life, dmg, owner });
}

// به‌روزرسانی: حرکت → دیوار (حذف) → قهرمان (آسیب + حذف) → عمر
export function updateProjs(list, dt, solid, onHero) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.t += dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.t > p.life || solid(p.x, p.y)) { list.splice(i, 1); continue; }
    if (onHero && onHero(p)) { list.splice(i, 1); }
  }
}

// رسم: تیر = میله‌ی چوبی با نوک استخوانی (میله به سمت سرعت) · آتش = گوی دوتنی + هسته
export function drawProjs(r, list, cx, cy) {
  for (const p of list) {
    const px = Math.round(p.x - cx), py = Math.round(p.y - cy);
    if (px < -12 || py < -12 || px > r.w + 12 || py > r.h + 12) continue;
    const d = Math.hypot(p.vx, p.vy) || 1;
    const ux = p.vx / d, uy = p.vy / d;
    if (p.kind === 'arrow') {
      r.lineW(px - ux * 5, py - uy * 5, px + ux * 3, py + uy * 3, 1, [138, 106, 58, 255]); // بدنه‌ی چوبی
      r.px(px + ux * 4, py + uy * 4, [242, 239, 228, 255]); // نوک
      r.px(px - ux * 6, py - uy * 6, [232, 231, 220, 140]); // پر
    } else { // گلوله‌ی آتش
      r.ellipse(px, py, 4, 4, [176, 84, 38, 255]);
      r.ellipse(px - ux, py - uy, 3, 3, [224, 138, 74, 255]);
      r.px(px, py, [255, 195, 106, 255]); // هسته
      r.px(px - ux * 5, py - uy * 5, [224, 138, 74, 120]); // ردِ محو
    }
  }
}
