// art/tree.js — درخت‌های مزرعه: دو گونه (بلوط پهن / سیب‌دار میوه‌دار)
// تنه و ریشه ثابت؛ تاج با تابِ آهسته‌ی سینوسی ±۱px (دوره ~۷ث — قاعده‌ی نوبت ۱۸: بدون موج مربعی)
import { Raster } from '../raster.js';
import { applyRim } from './rim.js';

const _cache = [null, null];

function makeTree(variant) {
  // تنه + ریشه — بخش ثابت (کش می‌شود)
  const trunk = new Raster(28, 32);
  trunk.rect(12, 18, 4, 12, [102, 68, 38, 255]);
  trunk.rect(12, 18, 1, 12, [132, 94, 55, 255]); // لبه‌ی روشن (نور از چپ)
  trunk.rect(15, 19, 1, 11, [72, 46, 26, 255]); // سایه
  trunk.rect(11, 29, 6, 2, [72, 46, 26, 255]); // ریشه‌ی پهن
  trunk.px(13, 17, [132, 94, 55, 255]); trunk.px(14, 16, [102, 68, 38, 255]); // گرهای تنه
  // تاج — سه لایه + dither + rim؛ جدا از تنه تا تاب بخورد
  const canopy = new Raster(28, 20);
  canopy.ellipse(14, 11, 12, 8, [32, 74, 42, 255]); // پایه‌ی تیره
  canopy.ellipse(13, 9, 10, 7, [56, 112, 60, 255]); // میانی
  canopy.ellipse(11, 7, 7, 5, [88, 144, 78, 255]); // روشنی بالا-چپ
  for (let i = 0; i < 10; i++) { // dither قطعی: روشن بالا، تیره پایین
    const dx = 4 + ((i * 37) % 20), dy = 2 + ((i * 53) % 8);
    canopy.px(dx, dy, [112, 168, 92, 255]);
    const sx2 = 6 + ((i * 71) % 16), sy2 = 12 + ((i * 29) % 6);
    canopy.px(sx2, sy2, [40, 88, 50, 255]);
  }
  if (variant === 1) { // سیب‌دار: میوه‌های نارنجی (معنا: درختِ کنار آب میوه می‌دهد)
    canopy.px(8, 9, [232, 118, 66, 255]); canopy.px(17, 7, [232, 118, 66, 255]); canopy.px(13, 13, [232, 118, 66, 255]);
    canopy.px(8, 8, [255, 178, 120, 255]); canopy.px(17, 6, [255, 178, 120, 255]);
  }
  applyRim(canopy, null, 0.28); // جلای ظریف لبه‌ی بالای تاج
  return { trunk, canopy };
}

// ن۳۹: درخت کامل (تنه+تاج با sway ∈ {-1,0,1}) یک‌بار پخته می‌شود — هر فریم فقط یک over
const _full = [null, null];
function fullTree(variant, sway) {
  const t = _cache[variant] || (_cache[variant] = makeTree(variant));
  const f = new Raster(28, 32);
  t.trunk.over(f, 0, 0);
  t.canopy.over(f, sway, 0); // همان ترتیب/برشِ قبلی (ستون بیرونی در sway=±1 بریده می‌شود — مثل قبل)
  return f;
}

// sx, sy = مختصات تایل ۱۶×۱۶ روی نما؛ درخت از ۱۶px بالاتر شروع می‌شود
export function drawTree(r, sx, sy, variant, time, tx) {
  const sway = Math.round(Math.sin(time * 0.85 + tx * 0.9 + variant * 2.1)); // تابِ آهسته ±۱px
  let f = _full[variant];
  if (!f) f = _full[variant] = [null, null, null];
  if (!f[sway + 1]) f[sway + 1] = fullTree(variant, sway);
  r.ellipse(sx + 8, sy + 14, 8, 3, [8, 20, 12, 55]); // سایه‌ی زمین
  f[sway + 1].over(r, sx - 6, sy - 16);
}
