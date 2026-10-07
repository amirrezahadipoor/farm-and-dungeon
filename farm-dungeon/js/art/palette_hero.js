// art/palette_hero.js — پالت ثابت ۲۴ رنگه‌ی قهرمان/کارگر (از ریشه به art/ منتقل شد) (بدون هیچ رنگ محاسبه‌شده‌ی خارج از پالت)
export const PAL = {
  out:      '#141021', // outline تیره ۱ پیکسلی
  skinHi:   '#ffd9a3',
  skin:     '#efa477',
  skinSh:   '#b87852',
  hair:     '#5f3a28',
  hairSh:   '#3f2418',
  hatHi:    '#ffe082',
  hat:      '#e6b34d',
  hatSh:    '#a97b2c',
  jacketHi: '#6fa3d8',
  jacket:   '#3e6fae',
  jacketSh: '#26477b',
  shirt:    '#e9dfc6',
  shirtSh:  '#b9ac8c',
  pantsHi:  '#87975c',
  pants:    '#667441',
  pantsSh:  '#454f2c',
  bootHi:   '#b9854e',
  boot:     '#94643a',
  bootSh:   '#6b4527',
  metalHi:  '#eef2f7',
  metal:    '#aeb9c8',
  metalSh:  '#727e96',
  wood:     '#8a5a33',
  scarf:    '#c94f4f',
  scarfSh:  '#8a2f2f',
};

// تبدیل hex به [r,g,b,a] یک‌بار در بارگذاری
export const C = {};
for (const k of Object.keys(PAL)) {
  const h = PAL[k];
  C[k] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
}
