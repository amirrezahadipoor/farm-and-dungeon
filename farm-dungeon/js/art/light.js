// art/light.js — سیستم نور و تاریکی دانجن (جداشده از run_render.js)
// تاریکی پایه = مه آبی‌مه‌آلود (نه سیاهی مطلق)؛ نورها با «استامپ» از پیش‌محاسبه‌شده
import { Raster } from '../raster.js';

const DARK_R = 13, DARK_G = 11, DARK_B = 26, DARK_A = 118;

// استامپ نور: cut = strength×(1−d²) از پیش‌محاسبه‌شده — کلید: rad×1000+strength
const _lightSt = new Map();
function lightStamp(rad, strength) {
  const key = rad * 1000 + strength;
  let st = _lightSt.get(key);
  if (!st) {
    const n = rad * 2 + 1, cut = new Uint8Array(n * n), inv = 1 / (rad * rad);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dx = x - rad, dy = y - rad, d2 = (dx * dx + dy * dy) * inv;
      if (d2 < 1) cut[y * n + x] = Math.max(0, Math.round(strength * (1 - d2)));
    }
    st = { n, cut };
    _lightSt.set(key, st);
  }
  return st;
}

// ن۳۹: LUT بلند — out = src·(255−a)/255 + C·a/255 برای هر (a, src) از پیش محاسبه شده
// ۳×۶۴KB؛ حلقه‌ی بلند تبدیل به سه خواندنِ اندیس‌دار شد (~۳ برابر سریع‌تر)
const _LR = new Uint8Array(65536), _LG = new Uint8Array(65536), _LB = new Uint8Array(65536);
for (let a = 1; a < 256; a++) {
  const t = a / 255, it = 1 - t;
  for (let v = 0; v < 256; v++) {
    const q = (a << 8) | v;
    _LR[q] = Math.round(v * it + DARK_R * t);
    _LG[q] = Math.round(v * it + DARK_G * t);
    _LB[q] = Math.round(v * it + DARK_B * t);
  }
}

// flat = [x, y, rad, strength, ...] — لیست تختِ نورها (بدون تخصیص آبجکت)
export function applyDarkness(r, dk, flat) {
  const dd = dk.d;
  if (!dk._base || dk._base.length !== dd.length) {
    const b = dk._base = new Uint8ClampedArray(dd.length);
    for (let i = 0; i < b.length; i += 4) { b[i] = DARK_R; b[i + 1] = DARK_G; b[i + 2] = DARK_B; b[i + 3] = DARK_A; }
  }
  dd.set(dk._base); // کپی یک‌تکه‌ی پایه
  for (let li = 0; li < flat.length; li += 4) {
    const lx = flat[li], ly = flat[li + 1], rad = flat[li + 2], strength = flat[li + 3];
    const st = lightStamp(rad, strength), n = st.n, cut = st.cut;
    const cx0 = Math.round(lx), cy0 = Math.round(ly);
    const x0 = Math.max(0, cx0 - rad), x1 = Math.min(r.w - 1, cx0 + rad);
    const y0 = Math.max(0, cy0 - rad), y1 = Math.min(r.h - 1, cy0 + rad);
    for (let y = y0; y <= y1; y++) {
      const srow = (y - cy0 + rad) * n - cx0 + rad;
      let di = (y * r.w + x0) * 4 + 3;
      for (let x = x0; x <= x1; x++, di += 4) {
        const v = dd[di] - cut[srow + x];
        dd[di] = v > 0 ? v : 0;
      }
    }
  }
  // blend با LUT (ن۳۹) — بدون ضرب/تقسیم در حلقه
  const sd = r.d;
  for (let i = 0; i < dd.length; i += 4) {
    const a = dd[i + 3];
    if (a <= 0) continue;
    if (sd[i + 3] < 8) { sd[i] = DARK_R; sd[i + 1] = DARK_G; sd[i + 2] = DARK_B; sd[i + 3] = a; continue; }
    const q = a << 8;
    sd[i] = _LR[q | sd[i]]; sd[i + 1] = _LG[q | sd[i + 1]]; sd[i + 2] = _LB[q | sd[i + 2]];
  }
}
