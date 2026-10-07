// art/dungeon_props.js — اجزای صحنه‌ی دانجن: مشعل (با جرقه)، صندوق گنج، قطره‌های گوهر/قلب،
// ذرات غبار معلق در هوا — همه بدون حالت (تصادفیِ قطعی بر اساس زمان)
import { E, TILE } from './palette_env.js';

// مشعل: شعله‌ی سه‌لایه‌ی نرم (سینوسی، نه موج مربعی) + جرقه‌های بالارونده
const FLAME_D = [198, 84, 28, 255]; // لبه‌ی تیره‌ی شعله
export function drawTorches(r, D, cx, cy, time) {
  for (const t of D.torches) {
    const sx = t.x * TILE - cx, sy = t.y * TILE - cy;
    if (sx < -TILE || sy < -TILE || sx > r.w || sy > r.h) continue;
    // شعله: جای عمودی با سینوس نرم می‌نفسد (±۱px پیوسته، بدون جهش)
    const fy = Math.round(Math.sin(time * 3.1 + t.x * 2.1 + t.y) * 1); // ن۳۷: نفسِ کند شعله (قبلاً لرزش ۶٫۵rad/s)
    const fx = Math.round(Math.sin(time * 2.3 + t.y * 1.3) * 1);
    r.rect(sx + 7, sy + 6, 2, 6, E.wood);          // دسته
    r.px(sx + 6, sy + 12, E.woodSh); r.px(sx + 9, sy + 12, E.woodSh); // بست دیوار
    r.rect(sx + 6 + fx, sy + 3 + fy, 4, 3, E.torch);   // بدنه‌ی شعله
    r.rect(sx + 7 + fx, sy + 3 + fy, 2, 2, E.torchHi); // هسته‌ی داغ
    r.px(sx + 7 + fx, sy + 2 + fy, E.torchHi);         // نوک
    r.px(sx + 6 + fx, sy + 5 + fy, FLAME_D); r.px(sx + 9 + fx, sy + 5 + fy, FLAME_D); // لبه‌ی پایین تیره
    // جرقه‌ها: دو عدد، بالارونده با محوشدن
    for (let i = 0; i < 2; i++) {
      const e = (time * 0.55 + i * 0.53 + ((t.x * 7 + t.y * 13) % 10) / 10) % 1; // ن۳۷: جرقه‌ی آهسته
      const ex = sx + 8 + Math.round(Math.sin(e * 9 + i * 2 + t.x) * 2);
      const ey = sy + 2 - Math.round(e * 9);
      const a = Math.round((1 - e) * 150);
      if (a > 12) { _spC[0] = 255; _spC[1] = 207; _spC[2] = 122; _spC[3] = a; r.px(ex, ey, _spC); }
    }
  }
}

// صندوق گنج: بند فلزی + قفل طلایی — استاتیک (ن۳۸: هاله/توینکل حذف)
const IRON = [118, 124, 142, 255], IRON_HI = [158, 164, 182, 255];
const _spC = [0, 0, 0, 0]; // اسکرچ جرقه‌ی مشعل
export function drawChests(r, D, cx, cy, time) {
  for (const c of D.chests) {
    const sx = c.x * TILE - cx, sy = c.y * TILE - cy;
    if (sx < -TILE || sy < -TILE || sx > r.w || sy > r.h) continue;
    r.rect(sx + 3, sy + 6, 10, 7, c.open ? E.woodSh : E.wood); // ن۳۸: هاله حذف — صندوق استاتیک
    r.rect(sx + 3, sy + 6, 10, 3, c.open ? E.wood : E.woodHi);
    r.rect(sx + 3, sy + 9, 10, 1, IRON);              // بند فلزی
    r.px(sx + 3, sy + 9, IRON_HI); r.px(sx + 12, sy + 9, IRON_HI); // میخ‌ها
    r.rect(sx + 7, sy + 8, 2, 3, E.gold);
  }
}

// قطره‌ها: گوهر لوزی وجه‌دار + قلب — شناور با باب
import { ITEMS, tierCol, seedCol } from '../items.js';

export function drawDrops(r, D, cx, cy) {
  for (const d of D.drops) {
    const bob = Math.sin(d.t * 5) * 2;
    const px2 = Math.round(d.x - cx), py2 = Math.round(d.y - cy + bob);
    if (d.kind === 'seed') { // بذر: دانه‌ی دو‌رنگ کوچک با جوانه
      const c = seedCol(d.ty);
      r.rect(px2 - 1, py2 - 1, 3, 3, [c[0], c[1], c[2], 255]);
      r.px(px2 - 1, py2 - 1, [Math.min(255, c[0] + 40), Math.min(255, c[1] + 40), Math.min(255, c[2] + 40), 255]);
      r.px(px2, py2 - 3, [110, 180, 100, 255]); r.px(px2 + 1, py2 - 4, [140, 210, 120, 255]);
    } else if (d.kind === 'coin') { // کیسه‌ی سکه‌ی کوچک
      r.rect(px2 - 2, py2 - 2, 5, 4, [170, 130, 60, 255]);
      r.rect(px2 - 2, py2 - 3, 5, 1, [120, 90, 40, 255]);
      r.px(px2 - 1, py2 - 1, [255, 224, 130, 255]); r.px(px2 + 1, py2, [255, 224, 130, 255]);
    } else if (d.kind === 'item') { // جعبه‌ی درخشان با رنگ تیتر
      const t = ITEMS[d.id] ? ITEMS[d.id].tier : 1, tc = tierCol(t);
      const glow = 120 + 60 * Math.round(Math.sin(d.t * 4) + 1);
      r.rect(px2 - 3, py2 - 3, 7, 6, [60, 50, 80, 255]);
      r.rect(px2 - 3, py2 - 3, 7, 1, [tc[0], tc[1], tc[2], 255]);
      r.rect(px2 - 3, py2 + 2, 7, 1, [tc[0], tc[1], tc[2], 255]);
      r.rect(px2 - 3, py2 - 3, 1, 6, [tc[0], tc[1], tc[2], 255]);
      r.rect(px2 + 3, py2 - 3, 1, 6, [tc[0], tc[1], tc[2], 255]);
      r.px(px2, py2, [tc[0], tc[1], tc[2], glow]); r.px(px2 - 1, py2 - 1, [255, 255, 255, glow]);
      if (t === 3) { r.px(px2 - 4, py2 - 5, [255, 240, 160, glow]); r.px(px2 + 4, py2 - 4, [255, 240, 160, glow]); } // ستاره‌های تیتر۳
    } else if (d.kind === 'heart') {
      r.rect(px2 - 2, py2 - 2, 2, 2, E.heart); r.rect(px2 + 1, py2 - 2, 2, 2, E.heart);
      r.rect(px2 - 2, py2, 6, 2, E.heart); r.rect(px2 - 1, py2 + 2, 4, 1, E.heart);
      r.px(px2, py2 + 3, E.heart);
      r.px(px2 - 1, py2 - 2, [255, 190, 205, 255]); // براقیت
    } else { // گوهر لوزی با وجه‌ها
      r.px(px2, py2 - 3, [230, 250, 255, 255]);
      r.rect(px2 - 1, py2 - 2, 3, 1, E.essence); r.rect(px2 - 2, py2 - 1, 5, 1, E.essence);
      r.rect(px2 - 2, py2, 5, 1, E.essenceSh); r.rect(px2 - 1, py2 + 1, 3, 1, E.essenceSh);
      r.px(px2, py2 + 2, E.essenceSh);
      r.px(px2 - 1, py2 - 1, [230, 250, 255, 255]); r.px(px2 + 1, py2, [170, 220, 240, 255]);
    }
  }
}

// محراب باستانی: سکوی سنگی + گوی جادویی نفس‌کش (بعد از استفاده خاموش)
const _orbC = [140, 225, 255, 0], _orbD = [90, 170, 210, 0];
export function drawShrines(r, D, cx, cy, time) {
  const sh = D.shrine;
  if (!sh) return;
  const sx = Math.round(sh.x - cx), sy = Math.round(sh.y - cy);
  if (sx < -24 || sy < -24 || sx > r.w + 8 || sy > r.h + 8) return;
  r.rect(sx - 5, sy + 2, 10, 3, [74, 70, 92, 255]); // سکو
  r.rect(sx - 5, sy + 2, 10, 1, [104, 100, 124, 255]); // لبه‌ی روشن
  r.rect(sx - 3, sy - 1, 6, 3, [58, 54, 74, 255]); // پایه‌ی گوی
  if (!sh.used) {
    const b = Math.round((Math.sin(time * 2.4) + 1)); // 0..2 — نفس‌کش کوانتیزه
    _orbC[3] = 190 + 25 * b;
    _orbD[3] = 70 + 30 * b;
    r.rect(sx - 1, sy - 4, 2, 2, _orbC); // گوی
    r.px(sx - 2, sy - 3, _orbD); r.px(sx + 1, sy - 3, _orbD); // هاله
    r.px(sx - 1, sy - 5, _orbD); r.px(sx, sy - 5, _orbD);
    // مدار ذره‌ای نرم
    const oa = time * 1.6;
    r.px(sx + Math.round(Math.cos(oa) * 5), sy - 3 + Math.round(Math.sin(oa) * 3), _orbC);
    r.px(sx + Math.round(Math.cos(oa + 3.1) * 5), sy - 3 + Math.round(Math.sin(oa + 3.1) * 3), _orbD);
  } else {
    r.rect(sx - 1, sy - 4, 2, 2, [90, 88, 106, 255]); // گوی خاموش
  }
}
