// farm_layout.js — چیدمان دنیای مزرعه: پرچین، حوضچه، حصار+دروازه،
// مسیرِ عبرت (دروازه‌ی مزرعه → دروازه‌ی دانجن)، درخت‌ها و مناطق گلِ جذب‌شده به مسیر/آب.
// هر عنصر یک معنا دارد: مسیر = راهنمای چشم، درخت کنار آب = میوه، گل‌ها کنار مسیر و آب می‌رویند.
import { COLS, ROWS } from './tiles.js';

const hash2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295; };

// مسیر عبرت: جلوی در مزرعه → شرق → شمال → جلوی دروازه‌ی دانجن
const PATH_TILES = [
  [14, 15], [15, 15], // جلوی دروازه‌ی مزرعه
  [16, 15], [17, 15], [18, 15], [19, 15], [20, 15], [21, 15], [22, 15], [23, 15], [24, 15], [25, 15], // شرق
  [25, 14], [25, 13], [25, 12], [25, 11], [25, 10], [25, 9], // شمال (غرب دروازه‌ی دانجن)
  [17, 16], [17, 17], // سنباده‌ی حیاط خانه (مسیر → درِ جنوبی خانه)
];

// خانه‌ی مزرعه (۲×۲، در به جنوب) + مترسک — قبل از درخت‌ها مهر می‌شوند تا جنگل دورشان بماند
export const HOUSE = { x: 15, y: 16 };  // گوشه‌ی شمال‌غربی
export const SCARECROW = { x: 13, y: 16 }; // نگهبان پرنده‌ها — غرب خانه، رو به مزرعه

export function stampLayout(farm) {
  const grid = farm.grid;
  // پرچین دور دنیا + حوضچه + حصار با در ورودی
  for (const c of grid) {
    const { x, y } = c;
    if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) c.kind = 'hedge';
    if (x >= 26 && x <= 28 && y >= 15 && y <= 17) c.kind = 'water';
    const onFence = x >= 5 && x <= 24 && y >= 5 && y <= 14 && (x === 5 || x === 24 || y === 5 || y === 14);
    const opening = (x === 14 && y === 14) || (x === 15 && y === 14) || (y === 5 && (x === 14 || x === 15)); // در جنوبی + دهانه‌ی باغ شمالی
    if (onFence && !opening) c.kind = 'fence';
    const h = hash2(x, y);
    // واریانت چمن — دقیقاً مثل قبل: داخل حصار ۰/۱، بیرون ۰/۱/۲/۳ (۲و۳ = گل روی تایل)
    const farmable0 = c.kind === 'grass' && x >= 6 && x <= 23 && y >= 6 && y <= 13;
    c.variant = farmable0 ? (h < 0.5 ? 0 : 1) : (h < 0.55 ? 0 : h < 0.82 ? 1 : h < 0.91 ? 2 : 3);
  }
  // تابلوی «فروشی» باغ شمالی — کنار دهانه‌ی شمالی (با خرید برداشته می‌شود)
  if (!farm.farm2Owned) { const s = farm.cell(14, 5); if (s) s.kind = 'sign'; }
  // مسیر عبرت: خاک‌راه کوبیده
  for (const [px, py] of PATH_TILES) {
    const c = farm.cell(px, py);
    if (c && c.kind === 'grass') c.kind = 'path';
  }
  // خانه‌ی قهرمان + مترسک (قبل از درخت‌ها — مالکیت زمین)
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
    const c = farm.cell(HOUSE.x + dx, HOUSE.y + dy);
    if (c) { c.kind = 'house'; c.variant = dy * 2 + dx; } // variant = جای تایل در خانه
  }
  const sc = farm.cell(SCARECROW.x, SCARECROW.y);
  if (sc) sc.kind = 'scarecrow';
  // دروازه‌ی دانجن: ۲×۲ تایل سنگی در شرق حصار
  farm.gate = { x: 26, y: 8 };
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
    const c = farm.cell(26 + dx, 8 + dy);
    if (c && c.kind === 'grass') { c.kind = 'gate'; c.gL = dx === 0; }
  }
  // درخت‌ها: فقط بیرون حصار، دور از مسیر (دهلیز پاک)، ترجیح کنار حوضچه
  const nearPath = (x, y, d) => PATH_TILES.some(([px, py]) => Math.max(Math.abs(px - x), Math.abs(py - y)) <= d);
  for (const c of grid) {
    if (c.kind !== 'grass') continue;
    if (c.x >= 5 && c.x <= 24 && c.y >= 5 && c.y <= 14) continue; // داخل/روی حصار نه
    if (nearPath(c.x, c.y, 1)) continue; // دهلیز مسیر پاک بماند
    const nearWater = Math.max(Math.abs(c.x - 27), Math.abs(c.y - 16)) <= 3; // حلقه‌ی حوضچه
    const h = hash2(c.x * 13, c.y * 7);
    if (nearWater ? h < 0.30 : h < 0.07) { c.kind = 'tree'; c.variant = nearWater ? 1 : ((h * 100 | 0) % 2); } // کنار آب = سیب‌دار
  }
  // گل‌ها به مسیر و آب کشیده می‌شوند (decoR boost)
  for (const c of grid) {
    if (c.kind !== 'grass') continue;
    const nearWater = farm.cell(c.x, c.y) && ((Math.abs(c.x - 27) <= 1 && Math.abs(c.y - 16) <= 2));
    c.db = (nearPath(c.x, c.y, 1) || nearWater) ? 1 : 0;
  }
  // ریل حصار
  for (const c of grid) if (c.kind === 'fence') {
    const l = farm.cell(c.x - 1, c.y), rr = farm.cell(c.x + 1, c.y);
    c.fenceH = (l && l.kind === 'fence') || (rr && rr.kind === 'fence');
  }
}
