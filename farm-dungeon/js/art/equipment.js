// art/equipment.js — آیتم‌های پوشیدنی روی اسکلت قهرمان: همه در مختصات مفاصل (headC/ankle/shoulder)
// رسم بعد از قطعات بدن، قبل از outline — پس با بابِ راه‌رفتن و جهت‌ها جابه‌جا می‌شود
import { PAL } from './palette_hero.js';

const hx = (h, a = 255) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), a];
const M = hx(PAL.metal), MH = hx(PAL.metalHi), MS = hx(PAL.metalSh); // آهن
const LB = [138, 90, 51, 255], LBH = [170, 116, 70, 255], LBS = [100, 62, 34, 255]; // چرم
const GD = [230, 199, 74, 255], GDH = [255, 224, 130, 255]; // طلایی
const CR = [122, 208, 232, 255], CRH = [180, 240, 255, 255]; // بلوری

// ---------- کلاه/خود (جایگزین کلاه‌ی پیش‌فرض) ----------
export function drawEquipHat(r, dir, hc, id) {
  const hx = Math.round(hc[0]), hy = Math.round(hc[1]);
  const fx = dir === 'right' ? 1 : dir === 'left' ? -1 : 0;
  if (id === 'capStraw') {
    r.rect(hx - 7, hy - 7, 15, 2, [230, 190, 100, 255]);
    r.rect(hx - 7, hy - 6, 15, 1, [190, 150, 70, 255]);
    r.rect(hx - 4, hy - 10, 9, 3, [230, 190, 100, 255]);
    r.rect(hx - 4, hy - 10, 9, 1, [255, 220, 140, 255]);
    r.rect(hx - 1, hy - 8, 3, 1, [170, 60, 50, 255]); // نوار قرمز
  } else if (id === 'helmLeather') {
    r.rect(hx - 5, hy - 11, 11, 5, LB);
    r.rect(hx - 5, hy - 11, 11, 1, LBH);
    r.rect(hx - 5, hy - 7, 11, 1, LBS);
    r.rect(hx - 1, hy - 9, 3, 2, LBS); // درز
    if (fx !== 0) r.rect(hx + (fx > 0 ? 3 : -5), hy - 8, 2, 4, LBH); // گونه‌پوش
  } else if (id === 'helmIron') {
    r.rect(hx - 5, hy - 12, 11, 6, M);
    r.rect(hx - 5, hy - 12, 11, 1, MH);
    r.rect(hx - 5, hy - 7, 11, 1, MS);
    r.rect(hx - 1, hy - 10, 2, 6, MS); // تیغه‌ی میانی
    if (fx !== 0) { r.rect(hx + (fx > 0 ? 3 : -5), hy - 8, 2, 5, M); r.px(hx + (fx > 0 ? 4 : -4), hy - 8, MH); }
    else { r.px(hx - 5, hy - 6, MS); r.px(hx + 5, hy - 6, MS); }
    r.rect(hx - 2, hy - 13, 4, 1, GD); // نوک برنجی
  } else if (id === 'crownWar') {
    r.rect(hx - 5, hy - 10, 11, 3, GD);
    r.rect(hx - 5, hy - 8, 11, 1, [180, 150, 50, 255]);
    for (let i = 0; i < 3; i++) r.rect(hx - 4 + i * 4, hy - 13, 2, 3, GD);
    r.px(hx - 3, hy - 13, GDH); r.px(hx + 4, hy - 13, GDH);
    r.px(hx, hy - 9, CR); // جوهر مرکزی
  }
}

// ---------- زره (نوار سینه + شانه‌پوش روی مفاصل شانه) ----------
export function drawEquipBody(r, dir, P, id) {
  const nx = Math.round(P.neck[0]), ny = Math.round(P.neck[1]);
  const px2 = Math.round(P.pelvis[0]);
  if (id === 'vestLeather') {
    r.rect(nx - 4, ny + 3, 9, 8, LB);
    r.rect(nx - 4, ny + 3, 9, 1, LBH);
    r.rect(nx - 4, ny + 10, 9, 1, LBS);
    r.lineW(nx - 4, ny + 6, nx + 4, ny + 6, 1, LBS); // کمربند
  } else if (id === 'plateIron') {
    r.rect(nx - 4, ny + 3, 9, 9, M);
    r.rect(nx - 4, ny + 3, 9, 1, MH);
    r.rect(nx - 4, ny + 11, 9, 1, MS);
    r.lineW(nx - 1, ny + 4, nx - 1, ny + 10, 1, MS); // درز صفحات
    r.lineW(nx + 2, ny + 4, nx + 2, ny + 10, 1, MS);
    // شانه‌پوش‌ها روی شانه‌های واقعی اسکلت
    const s1 = P.arms.near.shoulder, s2 = P.arms.far.shoulder;
    r.rect(Math.round(s1[0]) - 2, Math.round(s1[1]) - 1, 5, 3, M);
    r.rect(Math.round(s1[0]) - 2, Math.round(s1[1]) - 1, 5, 1, MH);
    r.rect(Math.round(s2[0]) - 2, Math.round(s2[1]) - 1, 4, 2, MS);
  } else if (id === 'robeMage') {
    r.rect(nx - 4, ny + 3, 9, 7, [86, 60, 140, 255]); // بنفش
    r.rect(nx - 4, ny + 3, 9, 1, [120, 90, 180, 255]);
    r.rect(px2 - 5, ny + 10, 11, 4, [70, 48, 118, 255]); // دامن
    r.rect(px2 - 5, ny + 13, 11, 1, [50, 34, 88, 255]);
    r.px(nx - 2, ny + 5, CR); r.px(nx + 2, ny + 7, CR); // ستاره‌ها
  }
}

// ---------- چکمه (روی مچ پاهای واقعی) ----------
export function drawEquipBoots(r, dir, P, id) {
  const a1 = P.legs.near.ankle, a2 = P.legs.far.ankle;
  if (id === 'bootsSwift') {
    for (const a of [a1, a2]) {
      const ax = Math.round(a[0]), ay = Math.round(a[1]);
      r.rect(ax - 2, ay - 3, 5, 3, [230, 230, 240, 255]); // سفید
      r.rect(ax - 3, ay - 3, 1, 3, [180, 220, 255, 255]); // بال
      r.px(ax - 4, ay - 2, [140, 200, 255, 255]);
    }
  } else if (id === 'bootsWar') {
    for (const a of [a1, a2]) {
      const ax = Math.round(a[0]), ay = Math.round(a[1]);
      r.rect(ax - 2, ay - 4, 5, 4, M);
      r.rect(ax - 2, ay - 4, 5, 1, MH);
      r.px(ax + (dir === 'left' ? -3 : 3), ay - 3, GD); // خار
    }
  }
}

// ---------- رنگ‌های شمشیر تجهیزشده (برای drawTool) ----------
export function swordPal(id) {
  if (id === 'swordCopper') return { met: [196, 124, 70, 255], metHi: [235, 170, 110, 255] };
  if (id === 'swordIron') return { met: [150, 158, 172, 255], metHi: [220, 228, 240, 255] };
  if (id === 'swordCrystal') return { met: CR, metHi: CRH };
  return null;
}
