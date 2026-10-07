// art/glbake.js — پخت رویه‌ای اسپرایت‌های مسیر GPU: اشیای عمودی مزرعه/دانجن، متن‌ها و مینی‌مپ یک‌بار
// به اطلس می‌روند (فازِ نوسان کوانتیزه است تا تعداد bake ثابت بماند). کش = رستر؛ rec هر بار از glAtlas
// خوانده می‌شود تا بعد از سرریز/بازچینی اطلس هم معتبر بماند.
import { glAtlas } from './gl_batch.js';
import { TILE } from './palette_env.js';

const BC = new Map();
const POOL_C = [[255, 170, 92], [176, 214, 255], [140, 255, 196], [150, 186, 255], [150, 255, 170], [255, 198, 122]];
export function glBakeCount() { return BC.size; }
function bake(key, w, h, fn) {
  let ras = BC.get(key);
  if (!ras) { ras = new Raster(w, h); fn(ras); BC.set(key, ras); }
  return glAtlas(key, ras);
}

export const BK = {
  tree: (v, sway) => bake('tv' + v + sway, 36, 40, (r) => drawTree(r, 8, 18, v, swing(v, sway), 0)),
  // خانه: k = شب(۰/۱) + ۲×فازِ دود(۰..۲)
  house: (k) => bake('hk' + k, 44, 48, (r) => drawFarmhouse(r, 4, 12, ((k >> 1) * 0.5) % 1.2, k & 1)),
  glow: (ph) => bake('gw' + ph, 20, 32, (r) => drawFarmhouseGlow(r, 4, 2, ph * 0.4, 1)),
  scare: (ph) => bake('sc' + ph, 20, 20, (r) => drawScarecrow(r, 2, 4, ph * 1.2)),
  sign: () => bake('sg', 20, 20, (r) => drawSaleSign(r, 2, 4, 0)),
  sprk: (ph) => bake('sp' + ph, 20, 20, (r) => drawSprinkler(r, 2, 2, ph * 0.85)),
  crate: (ph) => bake('cr' + ph, 20, 20, (r) => drawBasketCrate(r, 2, 4, ph * 0.5)),
  torch: (ph) => bake('to' + ph, 22, 26, (r) => drawTorches(r, { torches: [{ x: 4 / TILE, y: 8 / TILE }] }, 0, 0, ph * 0.16)),
  shrine: (ph) => bake('sh' + ph, 22, 22, (r) => drawShrines(r, { shrine: { x: 11, y: 14, used: false } }, 0, 0, ph * 0.65)),
  elite: (ph) => bake('el' + ph, 36, 12, (r) => drawEliteMark(r, 18, 6, ph * 0.4, -20)), // فقط هاله (تاج جدا)
  crown: () => bake('cn', 8, 8, (r) => drawEliteMark(r, 4, 30, 0, 4)),
  projArrow: (d) => bake('pa' + d, 20, 12, (r) => drawProjs(r, [{ kind: 'arrow', x: 10, y: 6, vx: COS[d], vy: SIN[d] }], 0, 0)),
  projFire: (d) => bake('pf' + d, 20, 12, (r) => drawProjs(r, [{ kind: 'fire', x: 10, y: 6, vx: COS[d], vy: SIN[d] }], 0, 0)),
  chill: () => bake('ch', 8, 6, (r) => {
    r.px(0, 3, [170, 220, 250, 200]); r.px(8 - 4, 2, [190, 235, 255, 200]); r.px(4, 1, [150, 205, 245, 200]);
  }),
  corner: (ph) => bake('cg' + ph, 18, 18, (r) => {
    const c = ph ? [230, 199, 74, 255] : [242, 239, 228, 255];
    r.rect(0, 0, 4, 1, c); r.rect(0, 0, 1, 4, c); r.rect(17 - 3, 0, 4, 1, c); r.rect(17, 0, 1, 4, c);
    r.rect(0, 17, 4, 1, c); r.rect(0, 17 - 3, 1, 4, c); r.rect(17 - 3, 17, 4, 1, c); r.rect(17, 17 - 3, 1, 4, c);
  }),
  // دکال سایه/تماس (فاز ۲): بیضی نرم تیره — زیر اشیا روی صفحه‌ی زمین
  ao: (w, h, k) => bake('ao' + w + '_' + h + '_' + k, w, h, (r) => {
    const cx = (w - 1) / 2, cy = (h - 1) / 2, RX = w / 2, RY = h / 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x - cx) / RX, dy = (y - cy) / RY, d2 = dx * dx + dy * dy;
      if (d2 >= 1) continue;
      const a = Math.round(150 * k * Math.pow(1 - d2, 1.6));
      if (a > 3) r.px(x, y, [9, 8, 20, a]);
    }
  }),
  // کارت نور (lightmap رویه‌ای، فاز ۲): بیضی گرم/سرد با افت نرم — حوضه‌ی نور روی زمینِ تخت
  // kind: ۰ مشعل، ۱ قهرمان، ۲ shrine، ۳ پله، ۴ essence، ۵ پنجره‌ی خانه
  pool: (r0, kind, peak) => bake('lp' + r0 + '_' + kind + '_' + peak, r0 * 2, Math.round(r0 * 1.3), (ras) => {
    const col = POOL_C[kind] || POOL_C[0], w = ras.w, h = ras.h;
    const cx = (w - 1) / 2, cy = (h - 1) / 2, RX = w / 2, RY = h / 2, pk = peak / 100;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x - cx) / RX, dy = (y - cy) / RY, d2 = dx * dx + dy * dy;
      if (d2 >= 1) continue;
      const f = 1 - d2, a = Math.round(255 * pk * Math.pow(f, 2.0) * (0.97 + 0.06 * ((x * 7 + y * 13) % 5) / 5));
      if (a < 4) continue;
      const b = 0.70 + 0.30 * f + 0.35 * Math.pow(f, 3); // هسته‌ی روشن‌تر
      ras.px(x, y, [Math.min(255, col[0] * b) | 0, Math.min(255, col[1] * b) | 0, Math.min(255, col[2] * b) | 0, a]);
    }
  }),
  white: () => bake('w1', 2, 2, (r) => r.rect(0, 0, 2, 2, [255, 255, 255, 255])),
};
const COS = [1, 0.7, 0, -0.7, -1, -0.7, 0, 0.7], SIN = [0, 0.7, 1, 0.7, 0, -0.7, -1, -0.7];
function swing(v, target) { return (target === 0 ? 0 : target > 0 ? Math.PI / 2 : -Math.PI / 2) - v * 2.1; } // بک به فازِ متناظر

// ---- متن: هر رشته یک اسپرایت اطلس (RTL/outline از font2) ----
const TXT = new Map();
export function textRec(txt, col, key, sc = 1) {
  const k = 'x|' + key + '|' + sc + '|' + txt;
  let ras = TXT.get(k);
  if (!ras) {
    ras = new Raster(Math.max(2, textW(txt, sc) + 4 * sc + 2), 12 * sc + 4);
    drawText(ras, txt, 2 * sc, 2 * sc, col, sc, { outline: true });
    TXT.set(k, ras);
  }
  return glAtlas(k, ras);
}
// ---- مینی‌مپ: چارچوب + نقشه + برچسب طبقه (یک‌بار در هر طبقه) ----
export function minimapRec(run, mini, label, col) {
  const k = 'mm|' + run.floor + '|' + label;
  let ras = TXT.get(k);
  if (!ras) {
    ras = new Raster(mini.w + 2, mini.h + 14);
    ras.rect(0, 0, ras.w, ras.h, [12, 10, 24, 175]);
    mini.over(ras, 1, 1);
    drawText(ras, label, 2, mini.h + 3, col, 1, { outline: true });
    TXT.set(k, ras);
  }
  return glAtlas(k, ras);
}
