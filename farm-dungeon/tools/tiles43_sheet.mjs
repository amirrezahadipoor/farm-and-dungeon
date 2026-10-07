// tiles43_sheet.mjs — شیت مقایسه‌ی قبل/بعد تایل‌ست ن۴۳ (دیوار + کف) در ۴ تم
// «قبلی» = بازساخت کد قدیمی (درز هم‌راستا ۰/۸ + جلوی هاردکد + صلیب درز یکسان)
import { savePNG } from './png.mjs';
import { Raster } from '../js/raster.js';
import { groundSprite } from '../js/tiles.js';
import { DPAL } from '../js/art/ground.js';
import { h2 } from '../js/art/palette_env.js';
import { drawText } from '../js/art/font2.js';

// ---- بازساخت کد قدیمی دیوار (قبل از ن۴۳) ----
function oldWall(variant, P) {
  const r = new Raster(16, 16);
  const off = (variant % 2) * 8;
  r.rect(0, 0, 16, 16, P.brick);
  r.rect(0, 0, 16, 4, P.stone);
  r.rect(0, 0, 16, 1, P.stoneHi); r.rect(0, 1, 16, 1, P.cap);
  r.rect(0, 3, 16, 1, P.brickOut);
  for (let i = 0; i < 3; i++) r.px(2 + Math.floor(h2(variant * 3 + i, i) * 12), 1 + Math.floor(h2(i, variant) * 2), P.stoneSh);
  for (let row = 1; row < 4; row++) {
    const y = row * 4;
    r.rect(0, y, 16, 1, P.brickHi);
    r.rect(0, y + 3, 16, 1, P.brickOut);
    const shift = ((row + off) % 2) * 8; // ← باگ: هر دو حالت درز x=0,8
    for (let bx = -8 + shift; bx < 16; bx += 8) r.rect(bx, y, 1, 3, P.brickOut);
    r.px(((row * 5 + off) % 14) + 1, y + 1, [96, 90, 118, 255]); // ← هاردکد
  }
  r.px(2 + (off ? 5 : 0), 5, P.moss); r.px(3 + (off ? 5 : 0), 5, P.mossD);
  r.px(11 - (off ? 4 : 0), 13, P.moss);
  return r;
}
// ---- بازساخت کد قدیمی کف (صلیب درز یکسان) ----
function oldFloor(variant, P) {
  const r = new Raster(16, 16);
  const warm = variant % 2 ? P.warm : P.stone;
  r.rect(0, 0, 16, 16, warm);
  r.rect(0, 0, 16, 1, P.stoneHi); r.rect(0, 0, 1, 16, P.stoneHi);
  r.rect(15, 0, 1, 16, P.stoneSh); r.rect(0, 15, 16, 1, P.stoneSh);
  r.rect(0, 7, 16, 1, P.mortar); r.rect(7, 0, 1, 16, P.mortar); // ← صلیب یکسان
  r.px(7, 7, P.stoneHi);
  if (variant === 1) { r.rect(4, 5, 3, 2, P.stoneSh); r.rect(10, 10, 2, 2, P.stoneSh); }
  else if (variant === 2) { r.line(3, 12, 8, 12, P.stoneSh); r.line(9, 4, 13, 4, P.stoneSh); }
  return r;
}
// نصف/دوبرابر مقیاس
function scale2(src) {
  const r = new Raster(src.w * 2, src.h * 2);
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const c = src.get(x, y);
    r.rect(x * 2, y * 2, 2, 2, c);
  }
  return r;
}
// نوار ۴×۲ تایل از فهرست واریانت‌ها
function strip(getTile, variants, theme) {
  const P = DPAL(theme);
  const r = new Raster(64, 32);
  variants.forEach((v, i) => getTile(v, P).over(r, (i % 4) * 16, ((i / 4) | 0) * 16));
  return scale2(r); // 128×64
}

const THEME_NAMES = ['سنگ', 'خزه', 'گدازه', 'یخ'];
const W = 430, PAD = 10, LBLH = 16;
const rows = [];
rows.push({ h: 30, draw: (m, y) => drawText(m, 'تایل‌ست ن۴۳ — دیوار: درز رگه‌ای + جلوی تم‌دار + خرابی/خزه', 12, y + 8, [240, 233, 200, 255]) });
for (let t = 0; t < 4; t++) {
  rows.push({
    h: 64 + LBLH + 6,
    draw: (m, y) => {
      drawText(m, 'تم ' + THEME_NAMES[t], 12, y + 4, [200, 190, 230, 255]);
      drawText(m, 'قبلی', 148, y + 4, [220, 130, 130, 255]);
      drawText(m, 'جدید', 292, y + 4, [140, 220, 160, 255]);
      strip(oldWall, [0, 1, 0, 1, 1, 0, 1, 0], t).over(m, 92, y + LBLH);
      strip((v, P) => groundSprite('wall', v, false, 0, t), [0, 1, 0, 1, 1, 0, 1, 0], t).over(m, 240, y + LBLH);
    },
  });
}
rows.push({ h: 64 + LBLH + 6, draw: (m, y) => {
  drawText(m, 'کف: قبلی (صلیب یکسان)', 100, y + 4, [220, 130, 130, 255]);
  drawText(m, 'جدید (درز per-variant)', 300, y + 4, [140, 220, 160, 255]);
  strip(oldFloor, [0, 1, 2, 0, 1, 2, 0, 1], 0).over(m, 92, y + LBLH);
  strip((v, P) => groundSprite('dfloor', v), [0, 1, 2, 0, 1, 2, 0, 1], 0).over(m, 240, y + LBLH);
} });
rows.push({ h: 64 + LBLH + 10, draw: (m, y) => {
  drawText(m, 'واریانت‌های جدید دیوار (تم سنگ)', 200, y + 4, [200, 190, 230, 255]);
  const names = ['v0 سالم', 'v1 سالم', 'v2 خرابی', 'v3 خزه'];
  names.forEach((n, i) => {
    scale2(groundSprite('wall', i, false, 0, 0)).over(m, 92 + i * 84, y + LBLH);
    drawText(m, n, 92 + i * 84, y + 64 + LBLH - 9, [180, 175, 205, 255]);
  });
} });

const H = PAD + rows.reduce((a, r) => a + r.h, 0) + PAD;
const m = new Raster(W, H);
for (let i = 0; i < m.d.length; i += 4) { m.d[i] = 16; m.d[i + 1] = 15; m.d[i + 2] = 22; m.d[i + 3] = 255; }
let y = PAD;
for (const r of rows) { r.draw(m, y); y += r.h; }
savePNG('/home/user/farm-dungeon/shots/tiles43_sheet.png', m);
console.log('tiles43_sheet.png', m.w + 'x' + m.h);
