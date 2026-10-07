// art/weather.js — آب‌وهوای مزرعه: باران + رعد و برق (ن۳۶: سایه‌ی ابرِ متحرک و برگِ همیشه‌ریزان حذف شدند — نویز/لکه‌ی تاریک)
import { Q } from './quality.js';
// باران دوره‌ایِ قطعی است: هر ۶۰۰ ثانیه، ۷۵ ثانیه باران — و محصول‌ها را رایگان آبیاری می‌کند!

export const RAIN_PERIOD = 600, RAIN_LEN = 75;
export const isRaining = (dayT) => { const rp = dayT % RAIN_PERIOD; return rp >= 400 && rp < 400 + RAIN_LEN; };

// ---- جدول از پیش‌محاسبه‌شده: صفر تخصیص در هر فریم ----
const N_DROP = 22; // ن۳۷: بارانِ نیمه‌سبک — ۴۶ قطره پرک شدید می‌ساخت
const DROPS = [];
for (let i = 0; i < N_DROP; i++) {
  const a = 66 + (i % 3) * 18; // ن۳۷: آلفای نرم‌تر
  DROPS.push({
    hx: ((i * 149 + 17) % 233) / 233,
    hy: ((i * 71 + 121) % 197) / 197,
    speed: 62 + (i % 4) * 16, // ن۳۷: سقوط ملایم‌تر
    c1: [174, 204, 236, a],
    c2: [148, 182, 222, Math.round(a * 0.8)],
    c3: [148, 182, 222, Math.round(a * 0.45)],
    c4: [200, 224, 246, Math.round(a * 0.6)],
    c5: [200, 224, 246, Math.round(a * 0.5)],
    splash: i % 8 === 0,
  });
}
const WR = (v, m) => ((v % m) + m) % m;

export function drawRain(r, time, n = -1) {
  if (n < 0) n = Q.level ? N_DROP : 12; // کیفیت تطبیقی
  for (let i = 0; i < n; i++) {
    const dr = DROPS[i];
    const px = Math.round(WR(dr.hx * r.w - time * 12, r.w)); // باد ملایم به چپ
    const py = Math.round(WR(dr.hy * r.h + time * dr.speed, r.h));
    r.px(px, py, dr.c1);
    r.px(px + 1, py - 1, dr.c2);
    r.px(px + 1, py - 2, dr.c3);
    if (dr.splash && py > r.h - 26) { r.px(px - 1, py + 2, dr.c4); r.px(px + 1, py + 2, dr.c5); }
  }
}

// ---- رعد و برق: در باران هر ~۹ ثانیه فلش دوتایی + صاعقه‌ی قطعی ----
export function lightningK(dayT, time) {
  if (!isRaining(dayT)) return 0;
  const ph = time % 9;
  if (ph < 0.07) return 0.8; // ن۳۷: تک‌فلاشِ نرم — استروبِ دوتایی حذف شد (پرک کل صفحه!)
  return 0;
}
// فلش: کل صحنه به سمت سفید می‌رود
export function flashTint(r, k) {
  const f = 0.26 * k; // ن۳۷: روشن‌شدگیِ ملایم به‌جای فلش سفید کامل
  for (let i = 0; i < r.d.length; i += 4) {
    if (r.d[i + 3] < 8) continue;
    r.d[i] += (255 - r.d[i]) * f;
    r.d[i + 1] += (255 - r.d[i + 1]) * f;
    r.d[i + 2] += (255 - r.d[i + 2]) * f;
  }
}
// صاعقه: زیگزاگ قطعی (هر فلش شکل خودش، بدون حالت)
export function drawLightning(r, time) {
  const seed = Math.floor(time / 9);
  const h = (n) => { const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return x - Math.floor(x); };
  let x = 30 + Math.floor(h(1) * (r.w - 60)), y = 0;
  const bottom = Math.floor(r.h * 0.55), segs = 8;
  for (let i = 0; i < segs; i++) {
    const nx = Math.max(6, Math.min(r.w - 6, x + Math.round((h(i + 2) - 0.5) * 30)));
    const ny = Math.floor(((i + 1) * bottom) / segs);
    r.lineW(x, y, nx, ny, 4, [150, 170, 255, 55]);  // هاله‌ی آبی
    r.lineW(x, y, nx, ny, 2, [244, 246, 255, 235]); // مغز سفید
    x = nx; y = ny;
  }
}

// موج‌های باران روی حوضچه — حلقه‌های ۸نقطه‌ای گسترنده و محوشونده (قطعی)
const _ripC = [200, 224, 246, 0];
export function drawPondRipples(r, time) {
  for (let i = 0; i < 4; i++) {
    const ph = (time * 0.8 + i * 0.31 + ((i * 17) % 5) / 9) % 1;
    const tx = 26 + ((i * 61 + 13) % 3), ty = 15 + ((i * 37 + 7) % 3);
    const sx = tx * 16 + 8, sy = ty * 16 + 8;
    if (sx < -6 || sy < -6 || sx > r.w + 6 || sy > r.h + 6) continue;
    const rr = 1 + ph * 4;
    _ripC[3] = Math.round((1 - ph) * 95);
    const a = _ripC[3];
    if (a < 10) continue;
    const rx = Math.round(rr), ry = Math.max(1, Math.round(rr * 0.5));
    r.px(sx - rx, sy, _ripC); r.px(sx + rx, sy, _ripC);
    r.px(sx, sy - ry, _ripC); r.px(sx, sy + ry, _ripC);
    const dx2 = Math.round(rx * 0.7), dy2 = Math.max(0, Math.round(ry * 0.7));
    r.px(sx - dx2, sy - dy2, _ripC); r.px(sx + dx2, sy - dy2, _ripC);
    r.px(sx - dx2, sy + dy2, _ripC); r.px(sx + dx2, sy + dy2, _ripC);
  }
}
