// fx.js — آب نبات‌پاشی: ذرات، عددم‌های pop، لرزش دوربین، hit-stop، برش، گرد و غبار، وینیت
const SCRATCH = [0, 0, 0, 0]; // رنگِ بازنویسی‌شونده — صفر تخصیص در حلقه‌ی رندر
const FCOL_S = [0, 0, 0, 0], FS = [20, 16, 33, 0]; // متن شناور و سایه‌اش
const FCOL = { dmg: [235, 105, 105, 255], hit: [255, 232, 150, 255], crit: [255, 196, 60, 255], skill: [150, 225, 255, 255], heal: [135, 225, 135, 255], ess: [125, 210, 235, 255], gold: [230, 199, 74, 255], white: [242, 239, 228, 255] };
const OFF = [0, 0]; // آفست لرزش — مشترک
import { drawTextC, E } from './tiles.js';
import { Raster } from './raster.js';

export class FX {
  constructor() {
    this.parts = []; this.floats = []; this.slashes = [];
    this.shakeAmp = 0; this.shakeT = 0; this.hitstop = 0;
  }
  shake(amp, t) { this.shakeAmp = Math.max(this.shakeAmp, amp); this.shakeT = Math.max(this.shakeT, t); }
  stop(t) { this.hitstop = Math.max(this.hitstop, t); }
  burst(x, y, cols, n = 10, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = (o.ang != null ? o.ang + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2) : Math.random() * Math.PI * 2);
      const sp = (o.sp ?? 24) * (0.4 + Math.random() * 0.9);
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up ?? 22), g: o.g ?? 90,
        t: 0, life: (o.life ?? 0.4) * (0.7 + Math.random() * 0.6), col: cols[i % cols.length], s: o.s ?? (Math.random() < 0.35 ? 2 : 1) });
    }
  }
  dust(x, y, n = 4, col) {
    const c = col ?? [138, 128, 106, 120];
    for (let i = 0; i < n; i++) this.parts.push({ x: x + (Math.random() - 0.5) * 5, y: y + (Math.random() - 0.5) * 2,
      vx: (Math.random() - 0.5) * 14, vy: -6 - Math.random() * 12, g: -14, t: 0, life: 0.3 + Math.random() * 0.25, col: c, s: Math.random() < 0.5 ? 2 : 1 });
  }
  float(x, y, txt, col, o = {}) {
    this.floats.push({ x, y, txt, col, t: 0, life: o.life ?? 1, scale: o.scale ?? 1, arc: o.arc ?? 26, crit: !!o.crit });
  }
  slash(x, y, ang, r = 22) { this.slashes.push({ x, y, ang, r, t: 0 }); }

  update(dt) {
    if (this.shakeT > 0) { this.shakeT -= dt; if (this.shakeT <= 0) this.shakeAmp = 0; }
    // جمع‌کردن درجا (swap-pop) — بدون splice و بدون تخصیص
    let w = 0;
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i];
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
      if (p.t <= p.life) this.parts[w++] = p;
    }
    this.parts.length = w;
    w = 0;
    for (let i = 0; i < this.floats.length; i++) {
      const f = this.floats[i];
      f.t += dt; f.y -= (f.arc ?? 26) * dt * (f.t < 0.15 ? 2.2 : 0.5); // پرش اولیه سپس آرام
      if (f.t <= f.life) this.floats[w++] = f;
    }
    this.floats.length = w;
    w = 0;
    for (let i = 0; i < this.slashes.length; i++) { const sl = this.slashes[i]; sl.t += dt; if (sl.t <= 0.14) this.slashes[w++] = sl; }
    this.slashes.length = w;
  }
  // آفست لرزش دوربین (آرایه‌ی مشترک — بدون تخصیص)
  offset(time) {
    if (this.shakeT <= 0) { OFF[0] = 0; OFF[1] = 0; return OFF; }
    const k = this.shakeAmp;
    OFF[0] = Math.round(Math.sin(time * 89) * k); OFF[1] = Math.round(Math.cos(time * 71) * k);
    return OFF;
  }
  render(r, cx, cy) {
    const col = SCRATCH; // بدون تخصیص در هر ذره/فریم
    for (const p of this.parts) {
      col[0] = p.col[0]; col[1] = p.col[1]; col[2] = p.col[2];
      col[3] = p.t > p.life * 0.6 ? Math.min(Math.round(255 * (1 - p.t / p.life) / 0.4), p.col[3] ?? 255) : Math.min(255, p.col[3] ?? 255);
      const px = Math.round(p.x - cx), py = Math.round(p.y - cy);
      if (p.s > 1) r.rect(px, py, 2, 2, col); else r.px(px, py, col);
    }
    for (const s of this.slashes) { // هلال برش
      const k = 1 - s.t / 0.14, col = [255, 255, 255, Math.round(150 * k)];
      for (let i = -3; i <= 3; i++) {
        const a = s.ang + i * 0.16;
        r.px(s.x - cx + Math.cos(a) * s.r, s.y - cy + Math.sin(a) * s.r * 0.8, col);
        if (Math.abs(i) < 2) r.px(s.x - cx + Math.cos(a) * (s.r - 2), s.y - cy + Math.sin(a) * (s.r - 2) * 0.8, col);
      }
    }
    for (const f of this.floats) {
      const base = FCOL[f.col] ?? FCOL.white;
      const fade = f.t > f.life * 0.75 ? Math.round(255 * (1 - (f.t - f.life * 0.75) / (f.life * 0.25))) : 255;
      FCOL_S[0] = base[0]; FCOL_S[1] = base[1]; FCOL_S[2] = base[2]; FCOL_S[3] = fade;
      const pop = f.t < 0.12 ? 2 : 1; // مقیاس pop اولیه
      const sc = (f.scale ?? 1) * (f.crit ? 1.4 : 1) * pop;
      drawTextC(r, f.txt, Math.round(f.x - cx), Math.round(f.y - cy), FCOL_S, sc, { outline: true }); // ن۴۱: فونت جدید + outline — خوانا روی هر پس‌زمینه
    }
  }
}

// وینیت (یک‌بار ساخته می‌شود، به اندازه‌ی صحنه کش می‌شود)
// بهینه‌شده: ماسک آلفا + بازه‌ی هر سطر — فقط پیکسل‌های لبه دست می‌خورند (مرکز شفاف = span -1)
const vCache = new Map();
export function vignette(w, h) {
  const key = w + 'x' + h;
  let v = vCache.get(key);
  if (!v) {
    const cx = w / 2, cy = h / 2, maxD = Math.hypot(cx, cy);
    const mask = new Uint8Array(w * h), spans = new Int16Array(h * 2); // [x0,x1] هر سطر
    for (let y = 0; y < h; y++) {
      let x0 = -1, x1 = -1;
      for (let x = 0; x < w; x++) {
        const d = Math.hypot(x - cx, y - cy) / maxD;
        if (d > 0.74) { mask[y * w + x] = Math.min(40, Math.round((d - 0.74) * 190)); if (x0 < 0) x0 = x; x1 = x; } // وینیت ظریف
      }
      spans[y * 2] = x0; spans[y * 2 + 1] = x1;
    }
    v = {
      w, h, mask, spans,
      apply(r) { // بلندینگ عددی — بدون آبجکت/رشته، فقط ناحیه‌ی لبه
        const d = r.d, m = mask, sp = spans;
        for (let y = 0; y < h; y++) {
          const x0 = sp[y * 2], x1 = sp[y * 2 + 1];
          if (x0 < 0) continue;
          let i = (y * w + x0) * 4;
          for (let x = x0; x <= x1; x++, i += 4) {
            const a = m[y * w + x];
            if (!a) continue;
            d[i] += ((10 - d[i]) * a) >> 8;
            d[i + 1] += ((8 - d[i + 1]) * a) >> 8;
            d[i + 2] += ((24 - d[i + 2]) * a) >> 8;
            if (a > d[i + 3]) d[i + 3] = a;
          }
        }
      },
    };
    vCache.set(key, v);
    if (vCache.size > 6) vCache.delete(vCache.keys().next().value);
  }
  return v;
}
