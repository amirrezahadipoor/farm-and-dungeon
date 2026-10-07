// art/farm_decor.js — دکور زنده‌ی مزرعه: گل‌های مرتع، چمن بلند، سنگ‌ریزه،
// اسپارکل محصول رسیده، گرداب جادویی دروازه، نیلوفر و نیزار آب
import { E } from './palette_env.js';

const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295; };

// گل/چمن‌بلند/سنگ روی چمنِ بیرون حصار — تصادفیِ قطعی بر اساس مختصات
export function drawMeadow(r, sx, sy, tx, ty) {
  const h0 = hash(tx, ty);
  if (h0 >= 0.061) return; // ن۳۶: چگالی ~۱۲٪ روی نقشه (hash سوگیریٔ پایینی دارد — آستانه کالیبره شد)
  const fxp = 2 + Math.floor(hash(tx * 3, ty * 7) * 12), fyp = 2 + Math.floor(hash(tx * 11, ty * 5) * 12);
  if (h0 < 0.028) { // دسته‌گل (~۴۶٪ از دکور)
    r.px(sx + fxp, sy + fyp, hash(tx, ty * 13) < 0.5 ? E.flowerY : E.flowerW);
    r.px(sx + fxp, sy + fyp + 1, E.grassBlade);
    if (hash(tx * 17, ty) < 0.4) r.px(sx + fxp + 3, sy + fyp + 2, hash(tx, ty * 19) < 0.5 ? E.berry : E.gold);
  } else if (h0 < 0.045) { // چمن بلند (~۲۸٪)
    r.px(sx + fxp, sy + fyp + 1, E.grassSh); // ن۳۸: استاتیک — تابِ بی‌هدف حذف
    r.px(sx + fxp, sy + fyp, E.grassBlade);
    r.px(sx + fxp + 2, sy + fyp + 1, E.grassBlade);
    r.px(sx + fxp + 1, sy + fyp + 2, E.grassSh);
  } else { // سنگ‌ریزه‌ی خاکستری
    r.px(sx + fxp, sy + fyp, E.stoneHi);
    r.px(sx + fxp + 1, sy + fyp, E.stone);
    r.px(sx + fxp, sy + fyp + 1, E.stoneSh);
  }
}

// اسپارکل چشمک‌زن روی محصول رسیده — از دور قابل‌دیدن
const _gC = [255, 210, 90, 0]; // اسپارکل طلایی — نفس‌کش
export function drawReadySparkle(r, sx, sy, tx, ty, time, golden = false) {
  if (golden) { // محصول طلایی: ستاره‌ی طلایی درشت همیشه‌روشن (آلفای نفس‌کش کوانتیزه)
    _gC[3] = 110 + 25 * Math.round((Math.sin(time * 1.1 + hash(tx, ty) * 6) + 1));
    const gx = sx + 4 + Math.floor(hash(tx * 5, ty * 3) * 8), gy = sy + 3;
    r.px(gx, gy, _gC); r.px(gx - 1, gy, _gC); r.px(gx + 1, gy, _gC); r.px(gx, gy - 1, _gC); r.px(gx, gy + 1, _gC); // نشانِ متقاطعِ کوچک
    return;
  }
  const ph = (time * 0.7 + hash(tx, ty) * 7) % 1; // ن۳۶: چشمکِ آرامِ تک‌رنگ (قبلش استروبِ دو رنگ ۳ هرتز!)
  if (ph >= 0.35) return;
  const px3 = sx + 4 + Math.floor(hash(tx * 5, ty * 3) * 8), py3 = sy + 2;
  r.px(px3, py3, E.white);
  if (ph > 0.08 && ph < 0.2) { r.px(px3 - 1, py3, E.white); r.px(px3 + 1, py3, E.white); }
}

// نیلوفر و نیزار روی آب — ثابت (تصادفیِ قطعی)
export function drawWaterLife(r, sx, sy, tx, ty, time = 0) {
  const h0 = hash(tx * 29, ty * 31);
  if (h0 < 0.30) { // نیلوفر آبی
    const lx = 3 + Math.floor(hash(tx * 7, ty * 13) * 9), ly = 3 + Math.floor(hash(tx * 5, ty * 17) * 9);
    r.px(sx + lx, sy + ly, E.leaf); r.px(sx + lx + 1, sy + ly, E.leafHi); r.px(sx + lx, sy + ly + 1, E.leafSh);
    r.px(sx + lx + 1, sy + ly + 1, E.leaf);
    if (h0 < 0.08) r.px(sx + lx, sy + ly - 1, E.berry); // شکوفه‌ی کوچک
  } else if (h0 < 0.42) { // نیزار (لبه)
    const rx = 2 + Math.floor(hash(tx * 3, ty * 23) * 12);
    r.px(sx + rx, sy + 13, E.grassSh); r.px(sx + rx, sy + 12, E.grassBlade); r.px(sx + rx, sy + 11, E.grassSh);
    r.px(sx + rx + 2, sy + 13, E.grassBlade); r.px(sx + rx + 2, sy + 12, E.grassSh);
  }
  // (ن۳۸: برق آب حذف — موج آرام خود تایل کافی است)
}


// تابلوی «فروشی» باغ شمالی: تیر چوبی + تخته با سکه (ن۳۶: پالس درخشش حذف — سکه کافی است)
export function drawSaleSign(r, sx, sy, time) {
  const bob = 0; // ن۳۸: تخته‌ی ثابت
  r.rect(sx + 7, sy + 9, 2, 6, E.woodSh);           // تیر
  r.rect(sx + 7, sy + 9, 1, 6, E.wood);
  r.rect(sx + 3, sy + 2 + bob, 10, 7, E.wood);      // تخته
  r.rect(sx + 3, sy + 2 + bob, 10, 1, E.woodHi);
  r.rect(sx + 3, sy + 8 + bob, 10, 1, E.woodSh);
  r.rect(sx + 4, sy + 3 + bob, 8, 5, E.soilSh);     // زمینه‌ی تیره‌ی تخته
  r.rect(sx + 6, sy + 4 + bob, 4, 3, E.gold);       // سکه
  r.px(sx + 6, sy + 4 + bob, E.white);
  r.px(sx + 9, sy + 6 + bob, E.wheatSh);
}

// حاشیه‌ی نرم خاک‌راه: هر ضلعی که همسایه‌اش راه/دروازه/خانه نیست با چمنِ دندانه‌دار + سایه‌ی لبه نرم می‌شود
const isP = (c) => !!c && (c.kind === 'path' || c.kind === 'gate' || c.kind === 'house');
export function drawPathEdge(r, sx, sy, tx, ty, f) {
  const U = !isP(f.cell(tx, ty - 1)), D = !isP(f.cell(tx, ty + 1)), L = !isP(f.cell(tx - 1, ty)), R = !isP(f.cell(tx + 1, ty));
  for (let i = 0; i < 16; i++) {
    const j = hash(tx * 16 + i, ty * 7) < 0.5 ? 1 : 2, k = (i + tx) & 1;
    if (U) { r.px(sx + i, sy, E.grass); if (k) r.px(sx + i, sy + 1, E.grass); if (j === 2 && k) r.px(sx + i, sy + 2, E.grassSh); }
    if (D) { r.px(sx + i, sy + 15, E.grass); if (!k) r.px(sx + i, sy + 14, E.grass); r.px(sx + i, sy + 13 + (k ? 0 : 1) * 0, E.soilSh); }
    const m = hash(tx * 5, ty * 16 + i) < 0.5 ? 1 : 2, n = (i + ty) & 1;
    if (L) { r.px(sx, sy + i, E.grass); if (n) r.px(sx + 1, sy + i, E.grass); if (m === 2 && n) r.px(sx + 2, sy + i, E.grassSh); }
    if (R) { r.px(sx + 15, sy + i, E.grass); if (!n) r.px(sx + 14, sy + i, E.grass); }
  }
  const hp = hash(tx * 13, ty * 29); // سنگ‌ریزه‌ی پراکنده، نه تکرار یکنواخت در هر تایل
  if (hp < 0.4) { const qx = 3 + Math.floor(hash(tx, ty * 3) * 9), qy = 3 + Math.floor(hash(tx * 3, ty) * 9); r.px(sx + qx, sy + qy, [140, 128, 118, 255]); r.px(sx + qx + 1, sy + qy + 1, [96, 84, 78, 255]); }
  if (U) for (let i = 0; i < 16; i += 5) r.px(sx + i + 1, sy, E.grassBlade);
  if (L) for (let i = 0; i < 16; i += 5) r.px(sx, sy + i + 1, E.grassBlade);
}
