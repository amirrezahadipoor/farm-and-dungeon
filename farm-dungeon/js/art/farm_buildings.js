// art/farm_buildings.js — ساختمان‌ها و سازه‌های مزرعه: هر کدام دلیل دارند —
// خانه: جای زندگی قهرمان/کارگران + آشپزخانه‌ی وعده‌ها (پنجره شب روشن = کسی خانه است)
// مترسک: پرنده‌ها را از مزرعه دور می‌کند (محصول‌ها سالم می‌مانند)
// ستون آبپاش: از حوضچه آب می‌کشد و خاک را سیراب می‌کند (کنار حوضچه!)
// جعبه‌ی سبد: محصولِ جمع‌شده را کنار خانه می‌ریزد
import { E } from './palette_env.js';

const WALL = [214, 204, 182, 255], WALL_SH = [176, 164, 140, 255], WALL_HI = [234, 226, 206, 255];
const ROOF = [178, 74, 60, 255], ROOF_HI = [210, 102, 80, 255], ROOF_SH = [130, 52, 44, 255];
const WARM = [255, 214, 110, 255];

// خانه‌ی ۲×۲ تایل — پایه در (sx, sy) = گوشه‌ی بالا-چپ تایل شمالی‌غربی؛ در به سمت جنوب (رو به بازیکن)
// night = 0..1 عامل شب — پنجره روشن می‌شود و نور گرم می‌پاشد
export function drawFarmhouse(r, sx, sy, time, night) {
  // دیوار جنوبی (پایین) + دیوارهای کناری
  r.rect(sx + 2, sy + 14, 28, 17, WALL);            // بدنه‌ی دیوار
  r.rect(sx + 2, sy + 14, 28, 1, WALL_HI);          // لبه‌ی نور
  r.rect(sx + 2, sy + 30, 28, 1, WALL_SH);          // سایه‌ی پایین
  r.rect(sx + 2, sy + 14, 1, 17, WALL_SH);          // سایه‌ی چپ
  r.rect(sx + 29, sy + 14, 1, 17, WALL_SH);         // سایه‌ی راست
  // تیرک‌های چوبی (اسکلت خانه)
  r.rect(sx + 2, sy + 14, 2, 17, E.woodSh); r.rect(sx + 28, sy + 14, 2, 17, E.woodSh);
  r.rect(sx + 15, sy + 20, 2, 11, E.woodSh);        // تیر وسط
  // سقف شیروانی (دو شیب + لبه‌ی اریب پیکسلی)
  for (let i = 0; i < 6; i++) r.rect(sx + 2 + i * 2, sy + 12 - i * 2, 28 - i * 4, 2, i % 2 ? ROOF : ROOF_HI);
  r.rect(sx + 12, sy - 1, 8, 3, ROOF_HI);           // خط‌الرأس
  r.rect(sx + 2, sy + 12, 28, 1, ROOF_SH);          // سایه‌ی زیر سقف
  r.px(sx + 4, sy + 11, ROOF); r.px(sx + 27, sy + 11, ROOF); // گوشه‌های سقف
  // در (جنوب) — چوبی با دستگیره
  r.rect(sx + 13, sy + 21, 6, 10, E.wood);
  r.rect(sx + 13, sy + 21, 6, 1, E.woodHi);
  r.rect(sx + 13, sy + 30, 6, 1, E.woodSh);
  r.px(sx + 17, sy + 26, [60, 40, 22, 255]);        // دستگیره
  // پنجره — روز: آبی شیشه؛ شب: نور گرم + هاله
  const lit = night > 0.45;
  const glass = lit ? WARM : [150, 176, 200, 255];
  r.rect(sx + 6, sy + 19, 5, 5, [60, 44, 30, 255]); // قاب
  r.rect(sx + 7, sy + 20, 3, 3, glass);
  if (!lit) { r.px(sx + 8, sy + 21, [210, 228, 240, 255]); } // برق روز
  if (lit) {
    r.px(sx + 5, sy + 18, [255, 214, 110, 90]); r.px(sx + 12, sy + 25, [255, 214, 110, 90]);
    const fl = 30 + 25 * Math.round((Math.sin(time * 2.1) + 1)); // سوسوی شعله‌ی فتیله
    r.px(sx + 4, sy + 19, [255, 224, 130, fl]); r.px(sx + 12, sy + 18, [255, 224, 130, fl]);
  }
  // لوله‌ی کوره + دودِ قطعی (زنده بودن خانه — آشپزخانه برای وعده‌ها)
  r.rect(sx + 23, sy - 3, 3, 6, [120, 116, 130, 255]);
  r.rect(sx + 23, sy - 3, 3, 1, [150, 146, 160, 255]);
  const sm = (time * 0.6) % 1;
  r.px(sx + 24 + Math.round(Math.sin(time * 1.3) * 2), sy - 5 - Math.round(sm * 6), [190, 186, 196, Math.round(140 * (1 - sm))]);
  r.px(sx + 24 + Math.round(Math.sin(time * 1.3 + 2) * 2), sy - 4 - Math.round(((sm + 0.5) % 1) * 6), [170, 166, 178, 100]);
  // پلکان سنگی جلو در
  r.rect(sx + 12, sy + 31, 8, 1, E.stone); r.rect(sx + 13, sy + 31, 6, 1, E.stoneHi);
}

// مترسک — نگهبان مزرعه: پرنده‌ها از شعاع آن فرار می‌کنند
export function drawScarecrow(r, sx, sy, time) {
  const sway = Math.round(Math.sin(time * 1.1) * 1); // تاب آرام در باد
  r.rect(sx + 7, sy + 6, 2, 9, E.woodSh);            // پایه
  r.rect(sx + 7, sy + 6, 1, 9, E.wood);
  r.rect(sx + 3 + sway, sy + 9, 10, 1, E.wood);      // بازوهای افقی
  r.rect(sx + 4 + sway, sy + 8, 8, 1, E.woodHi);
  // تن‌پوش کاهی + دست‌وپای آویزان
  r.rect(sx + 6 + sway, sy + 9, 4, 4, [230, 190, 100, 255]);
  r.rect(sx + 6 + sway, sy + 12, 4, 1, [190, 150, 70, 255]);
  // سر: کیسه + کلاه حصیری پهن
  r.rect(sx + 6 + sway, sy + 4, 4, 3, [205, 178, 130, 255]);
  r.px(sx + 6 + sway, sy + 5, [60, 40, 22, 255]); r.px(sx + 9 + sway, sy + 5, [60, 40, 22, 255]); // چشم‌های دکمه‌ای
  r.rect(sx + 4 + sway, sy + 3, 8, 1, [230, 190, 100, 255]);
  r.rect(sx + 5 + sway, sy + 2, 6, 1, [255, 220, 140, 255]);
  // پرنده‌ی ناشناس که دیگر نمی‌آید: یک پرِ یادگار روی بازو
  r.px(sx + 3 + sway, sy + 8, [240, 240, 245, 200]);
}

// ستون آبپاش خودکار — کنار حوضچه می‌ایستد و از آن آب می‌کشد
const MET = [150, 158, 172, 255], METH = [200, 210, 225, 255], METS = [108, 114, 128, 255];
export function drawSprinkler(r, sx, sy, time) {
  r.rect(sx + 7, sy + 8, 2, 7, MET);                 // بدنه‌ی فلزی
  r.rect(sx + 7, sy + 8, 1, 7, METH);
  r.rect(sx + 5, sy + 14, 6, 1, METS);               // پایه
  const a = Math.floor(time * 1.2) % 4;              // چرخش کوانتیزه (بدون فلیکر مورب)
  const ARMS = [[9, 6, 3, 0], [11, 8, 0, 3], [9, 10, -3, 0], [6, 8, 0, -3]];
  const [ax, ay, dx, dy] = ARMS[a];
  r.rect(sx + ax, sy + ay, Math.max(1, Math.abs(dx)), Math.max(1, Math.abs(dy)), MET); // بازوی چرخان
  r.px(sx + ax + dx, sy + ay + dy, E.waterHi);       // قطره‌ی سرِ بازو
  r.px(sx + 8, sy + 7, E.essence);                   // نشانِ جادوی مهارشده‌ی آب
}

// نور پنجره‌ی خانه — بعد از تینت شب رسم می‌شود (منبع نور است، تاریکی را سوراخ می‌کند)
export function drawFarmhouseGlow(r, sx, sy, time, k) {
  if (k <= 0.45) return;
  const a = Math.round(Math.min(1, (k - 0.45) / 0.55) * 255);
  const fl = 0.85 + 0.15 * Math.round(Math.sin(time * 2.1) + 1); // سوسوی فتیله
  r.rect(sx + 7, sy + 20, 3, 3, [255, 214, 110, Math.round(a * fl)]); // خود شیشه
  r.px(sx + 6, sy + 19, [255, 224, 130, Math.round(a * 0.5 * fl)]); r.px(sx + 10, sy + 24, [255, 224, 130, Math.round(a * 0.5 * fl)]);
  r.px(sx + 5, sy + 18, [255, 234, 150, Math.round(a * 0.3)]); r.px(sx + 11, sy + 22, [255, 234, 150, Math.round(a * 0.3)]);
  r.px(sx + 8, sy + 25, [255, 234, 150, Math.round(a * 0.25)]); // نور روی زمینِ جلو در
}

// جعبه‌ی سبد جمع‌کن — محصولِ خودکار اینجا می‌ریزد (کنار خانه)
export function drawBasketCrate(r, sx, sy, time) {
  r.rect(sx + 3, sy + 8, 10, 7, [170, 128, 66, 255]); // بدنه‌ی حصیری
  r.rect(sx + 3, sy + 8, 10, 1, [200, 158, 92, 255]);
  r.rect(sx + 3, sy + 14, 10, 1, [130, 92, 44, 255]);
  for (let i = 0; i < 3; i++) r.rect(sx + 4 + i * 3, sy + 9, 1, 5, [140, 100, 50, 255]); // تارِ حصیر
  r.rect(sx + 2, sy + 7, 12, 1, E.woodSh);            // لبه‌ی چوبی
  // محصول‌های انباشته: نارنجی + سبز روی هم
  r.px(sx + 5, sy + 6, E.carrot); r.px(sx + 8, sy + 5, E.carrotHi); r.px(sx + 10, sy + 6, E.leaf);
  const bob = Math.round(Math.sin(time * 2.5));       // دانه‌ی تازه‌می‌افتد
  r.px(sx + 7, sy + 4 + bob, E.wheat);
}
