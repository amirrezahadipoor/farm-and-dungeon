// art/critters.js — موجودات ریز مزرعه: ماهی پرنده‌ی حوضچه + پرندگان تاج درخت‌ها
// (ن۳۶: پروانه‌ها و ۱۶ شب‌تابِ چشمک‌زن حذف شدند — پرک/نورِ بی‌دلیل)
// ماهی پرنده از حوضچه‌ی مزرعه — بدون حالت: پرش‌های دوره‌ای با قوس و پاشش آب
// حوضچه: تایل‌های water (معمولاً x∈[26,28], y∈[15,17])
export class Fish {
  constructor(n = 2) {
    this.spots = Array.from({ length: n }, (_, i) => ({ period: 11 + i * 7, phase: i * 4.2, dir: i % 2 ? -1 : 1 }));
  }

  draw(r, cx, cy, time, farm) {
    const waters = [];
    for (const c of farm.grid) if (c.kind === 'water') waters.push(c);
    if (!waters.length) return;
    for (let i = 0; i < this.spots.length; i++) {
      const sp = this.spots[i];
      const cyc = (time + sp.phase) % sp.period;
      if (cyc > 1.15) continue; // فقط ~۱.۱۵ ثانیه از هر دوره
      const t = cyc / 1.15; // 0..1
      const base = waters[(i * 7 + 3) % waters.length];
      const x0 = base.x * 16 + 4, y0 = base.y * 16 + 10;
      const dx = sp.dir * (10 + i * 4);
      const px = Math.round(x0 + dx * t - cx);
      const py = Math.round(y0 - Math.sin(t * Math.PI) * 12 - cy);
      if (px < -4 || py < -4 || px >= r.w + 4 || py >= r.h + 4) continue;
      const body = [230, 140, 60, 255], hi = [255, 200, 130, 255];
      if (t < 0.12 || t > 0.88) { // پاشش آب
        r.px(px, py + 2, [200, 230, 255, 220]); r.px(px + sp.dir, py + 1, [230, 245, 255, 190]);
        r.px(px - sp.dir, py, [170, 210, 245, 160]);
      } else { // بدنه‌ی ماهی با دم
        r.rect(px - 2, py, 4, 2, body);
        r.px(px - 2 * sp.dir, py - 1, hi);
        r.px(px + 2 * sp.dir, py, [200, 110, 50, 255]); // دم
        r.px(px - sp.dir, py, hi);
      }
    }
  }
}

// پرندگان کوچک روی تاج درخت‌ها — جاخالی قطعی، بال‌زدن دوره‌ای؛
// قهرمان که نزدیک شود می‌پرند (بالا می‌روند و بال می‌زنند)
const B_BODY = [58, 48, 66, 255], B_BODY2 = [86, 72, 92, 255], B_BELLY = [44, 36, 52, 255];
const B_WING = [110, 96, 120, 255], B_WING2 = [96, 84, 108, 255], B_BEAK = [232, 180, 90, 255], B_EYE = [240, 240, 248, 255];
export function drawBirds(r, trees, cx, cy, time, heroX, heroY, n = 5) {
  const m = Math.min(n, trees.length);
  for (let i = 0; i < m; i++) {
    const t = trees[(i * 7 + 3) % trees.length]; // پخش قطعی روی درخت‌های مرئی
    let bx = t.x * 16 - cx + 2 + (i % 3) * 4;
    let by = t.y * 16 - cy - 12 + (i % 2) * 3; // روی شکم تاج
    const nearHero = Math.hypot(t.x * 16 + 8 - heroX, t.y * 16 + 8 - heroY) < 30;
    let flap = false; // ن۳۶: نشسته = بی‌حرکت؛ فقط هنگام فرار بال می‌زند
    if (nearHero) { // جنگل‌نشین‌ها می‌پرند! بالا + بالِ همیشه
      bx += Math.round(Math.sin(time * 9 + i) * 4);
      by -= 8 + Math.round(Math.sin(time * 7 + i * 1.3) * 3);
      flap = true;
    }
    bx = Math.round(bx); by = Math.round(by);
    if (bx < -8 || by < -8 || bx > r.w || by > r.h) continue;
    r.px(bx, by, B_BODY); r.px(bx + 1, by, B_BODY2);
    r.px(bx, by + 1, B_BODY); r.px(bx + 1, by + 1, B_BELLY);
    r.px(bx + 2, by, B_BODY2); r.px(bx + 3, by, B_BEAK); // سر + منقار
    r.px(bx + 2, by - 1, B_EYE); // چشم
    if (flap) { r.px(bx, by - 1, B_WING); r.px(bx + 1, by - 1, B_WING2); r.px(bx - 1, by, B_WING2); }
  }
}
