// art/crops.js — اسپرایت محصولات ۴ مرحله‌ای (هویج/گندم/کدو)
import { TILE, E, sprite } from './palette_env.js';
// ---------- محصولات (مرحله ۰..۳، ۳ = آماده‌ی برداشت) ----------
export function cropSprite(type, stage) {
  const key = `c|${type}|${stage}`;
  return sprite(key, (r) => {
    if (type === 'carrot') {
      if (stage === 0) { r.px(8, 12, E.sprout); r.px(8, 11, E.leafHi); }
      else if (stage === 1) {
        r.line(8, 12, 8, 10, E.leafHi); r.line(7, 12, 6, 11, E.leaf); r.line(9, 12, 10, 11, E.leaf); r.px(8, 9, E.leafHi);
      } else if (stage === 2) {
        r.line(8, 12, 8, 8, E.leafHi); r.line(7, 11, 5, 9, E.leaf); r.line(9, 11, 11, 9, E.leaf);
        r.line(6, 10, 5, 8, E.leafSh); r.px(8, 7, E.leafHi); r.px(5, 8, E.leafHi); r.px(11, 8, E.leafHi);
      } else {
        r.line(8, 13, 8, 8, E.leafHi); r.line(7, 12, 4, 10, E.leaf); r.line(9, 12, 12, 10, E.leaf);
        r.line(6, 11, 4, 9, E.leafSh); r.line(10, 11, 12, 9, E.leafSh);
        r.px(8, 7, E.leafHi); r.px(4, 9, E.leafHi); r.px(12, 9, E.leafHi);
        r.rect(7, 12, 3, 2, E.carrot); r.px(8, 12, E.carrotHi); // کلاهک نارنجی از خاک بیرون
      }
    } else if (type === 'wheat') {
      if (stage === 0) { r.px(8, 12, E.sprout); r.px(8, 11, E.leafHi); }
      else if (stage === 1) {
        r.line(7, 13, 7, 10, E.wheatG); r.line(9, 13, 9, 11, E.wheatG); r.px(7, 9, E.leafHi); r.px(9, 10, E.leafHi);
      } else if (stage === 2) {
        for (const x of [6, 8, 10]) r.line(x, 13, x, 8, E.wheatG);
        r.px(6, 7, E.leafHi); r.px(8, 6, E.leafHi); r.px(10, 7, E.leafHi);
        r.px(7, 12, E.leafSh); r.px(11, 12, E.leafSh);
      } else {
        r.rect(3, 12, 11, 2, E.leafSh); r.px(4, 11, E.leaf); r.px(12, 11, E.leaf); // برگ‌های پای بوته
        for (const [x, top] of [[5, 5], [8, 3], [11, 6]]) { // سه خوشه‌ی طلاییِ سنبله‌دار با ریشک
          r.line(x, 13, x, top + 4, E.wheatG);
          for (let y = top; y < top + 5; y++) { r.px(x - 1, y, (y & 1) ? E.wheat : E.wheatHi); r.px(x + 1, y, (y & 1) ? E.wheatHi : E.wheat); r.px(x, y, E.wheat); }
          r.px(x - 1, top + 4, E.wheatSh); r.px(x + 1, top + 4, E.wheatSh); r.px(x, top - 1, E.wheatHi); r.px(x, top - 2, E.wheatSh);
        }
      }
    } else if (type === 'pumpkin') {
      if (stage === 0) { r.px(8, 12, E.sprout); r.px(8, 11, E.leafHi); }
      else if (stage === 1) {
        for (const [x, y] of [[4, 13], [5, 12], [6, 12], [7, 11], [8, 11], [9, 10]]) r.px(x, y, E.stem);
        r.rect(3, 11, 2, 2, E.leafHi); r.rect(9, 9, 2, 2, E.leaf);
      } else if (stage === 2) {
        for (const [x, y] of [[3, 13], [4, 12], [5, 12], [6, 11], [7, 11], [8, 10], [9, 10], [10, 11], [11, 12], [12, 12]]) r.px(x, y, E.stem);
        r.rect(2, 10, 2, 2, E.leafHi); r.rect(11, 9, 2, 2, E.leaf);
        r.rect(8, 11, 4, 3, E.wheatG); r.px(9, 10, E.stem); // کدوی نارس سبز
      } else {
        r.rect(4, 7, 9, 8, E.leafSh);       // سایه‌ی دور کدو
        r.rect(5, 8, 7, 6, E.pumpkin);
        r.line(7, 8, 7, 13, E.pumpkinSh); r.line(9, 8, 9, 13, E.pumpkinSh);
        r.rect(6, 9, 1, 2, E.pumpkinHi); r.px(7, 9, E.pumpkinHi);
        r.rect(8, 6, 1, 2, E.stem); r.px(8, 5, E.stem);
        r.rect(2, 9, 3, 3, E.leaf); r.px(3, 9, E.leafHi);
        r.px(13, 10, E.flowerY); r.px(13, 11, E.flowerY);
      }
    } else if (type === 'apple') { // سیب — از درخت‌های کنار حوضچه؛ فقط آیکون وعده
      r.rect(5, 7, 7, 7, E.straw);
      r.rect(6, 6, 5, 8, E.straw);
      r.px(5, 8, E.strawSh); r.px(5, 10, E.strawSh); r.px(10, 11, E.strawSh);
      r.px(6, 7, E.strawHi); r.px(7, 7, E.strawHi); r.px(6, 9, E.strawHi);
      r.rect(8, 4, 1, 2, E.stem);
      r.rect(9, 4, 2, 1, E.leaf); r.px(10, 3, E.leafHi);
      r.px(10, 8, [255, 255, 255, 200]);
    } else if (type === 'strawberry') {
      if (stage === 0) { r.px(8, 12, E.sprout); r.px(8, 11, E.leafHi); }
      else if (stage === 1) {
        r.line(8, 13, 8, 11, E.leafHi); r.line(7, 13, 7, 12, E.leaf); r.line(9, 13, 9, 12, E.leaf);
        r.px(7, 11, E.leaf); r.px(9, 11, E.leaf);
      } else if (stage === 2) {
        r.rect(5, 10, 7, 4, E.leaf); r.rect(6, 9, 5, 2, E.leafHi);
        r.px(5, 9, E.leafSh); r.px(11, 9, E.leafSh);
        r.px(7, 12, E.strawSh); r.px(9, 12, E.strawSh); // غنچه‌های نارس
      } else {
        r.rect(5, 9, 7, 5, E.leaf); r.rect(6, 8, 5, 2, E.leafHi);
        r.px(4, 9, E.leafSh); r.px(12, 9, E.leafSh); // کنده‌های برگ کنار بوته
        // دو توت‌فرنگی رسیده با دانه‌های سفید
        r.rect(6, 11, 3, 3, E.straw); r.px(7, 10, E.strawSh);
        r.px(6, 11, E.strawHi); r.px(8, 12, E.strawHi); r.px(7, 13, E.white); r.px(7, 11, E.white);
        r.rect(10, 12, 3, 3, E.straw); r.px(11, 11, E.strawSh);
        r.px(10, 12, E.strawHi); r.px(12, 13, E.strawHi); r.px(11, 14, E.white);
        r.px(5, 8, E.flowerW); r.px(11, 8, E.flowerY); // گل‌های ریز روی بوته
      }
    } else if (type === 'eggplant') {
      if (stage === 0) { r.px(8, 12, E.sprout); r.px(8, 11, E.leafHi); }
      else if (stage === 1) {
        r.line(8, 13, 8, 9, E.stem); r.line(7, 10, 6, 10, E.leaf); r.line(9, 10, 10, 10, E.leaf); r.px(8, 8, E.leafHi);
        r.px(6, 9, E.leaf); r.px(10, 9, E.leaf);
      } else if (stage === 2) {
        r.line(8, 13, 8, 7, E.stem);
        r.line(7, 11, 5, 11, E.leaf); r.line(9, 11, 11, 11, E.leaf);
        r.line(7, 9, 6, 9, E.leafHi); r.line(9, 9, 10, 9, E.leafHi);
        r.px(6, 8, E.leafHi); r.px(10, 8, E.leafHi);
        r.rect(6, 11, 3, 3, E.eggplantSh); r.px(7, 10, E.stem); // میوه‌ی نارس
      } else {
        r.line(8, 13, 8, 6, E.stem);
        r.line(7, 9, 5, 9, E.leaf); r.line(9, 10, 11, 10, E.leaf);
        r.line(7, 7, 6, 7, E.leafHi); r.line(9, 7, 10, 7, E.leafHi);
        r.px(6, 6, E.leafHi); r.px(10, 6, E.leafHi); r.px(8, 5, E.leafHi);
        // دو بادمجان آویزان با کلاهک سبز و جلای بالا
        r.rect(5, 9, 3, 5, E.eggplant); r.px(5, 9, E.eggplantHi); r.px(6, 9, E.eggplantHi); r.px(5, 13, E.eggplantSh);
        r.rect(5, 8, 3, 1, E.leaf); r.px(6, 8, E.leafHi);
        r.rect(10, 11, 3, 4, E.eggplant); r.px(10, 11, E.eggplantHi); r.px(11, 11, E.eggplantHi); r.px(10, 14, E.eggplantSh);
        r.rect(10, 10, 3, 1, E.leaf); r.px(11, 10, E.leafHi);
      }
    } else if (type === 'corn') {
      if (stage === 0) { r.px(8, 12, E.sprout); r.px(8, 11, E.leafHi); }
      else if (stage === 1) {
        r.line(8, 13, 8, 8, E.wheatG); r.line(7, 12, 6, 12, E.leaf); r.line(9, 12, 10, 12, E.leaf);
        r.px(6, 11, E.leaf); r.px(10, 11, E.leaf); r.px(8, 7, E.leafHi);
      } else if (stage === 2) {
        r.line(8, 13, 8, 5, E.wheatG);
        r.line(7, 11, 5, 11, E.leaf); r.line(9, 11, 11, 11, E.leaf);
        r.line(7, 8, 6, 8, E.leafHi); r.line(9, 8, 10, 8, E.leafHi);
        r.px(6, 7, E.leafHi); r.px(10, 7, E.leafHi); r.px(8, 4, E.leafHi);
        r.px(7, 5, E.leafSh); r.px(9, 5, E.leafSh);
      } else {
        r.line(8, 13, 8, 3, E.wheatG); // ساقه‌ی بلند
        r.line(7, 12, 5, 12, E.leaf); r.line(9, 12, 11, 12, E.leaf);
        r.line(7, 8, 6, 8, E.leafHi); r.line(9, 9, 10, 9, E.leafHi);
        // خوشه‌ی ذرت با پوشش برگ
        r.rect(7, 6, 4, 6, E.corn); r.rect(8, 6, 2, 6, E.cornHi);
        r.px(7, 8, E.cornSh); r.px(7, 10, E.cornSh); r.px(10, 7, E.cornSh); r.px(10, 10, E.cornSh);
        r.px(8, 8, E.white); r.px(9, 9, E.white); r.px(8, 11, E.white); // دانه‌های درخشان
        r.line(6, 11, 6, 7, E.leaf); r.line(11, 11, 11, 7, E.leaf); // پوشش‌های برگ
        r.px(7, 5, E.leafHi); r.px(10, 5, E.leafHi);
        r.rect(8, 1, 2, 1, E.wheat); r.px(9, 2, E.wheatHi); // کاکل
      }
    }
  });
}
