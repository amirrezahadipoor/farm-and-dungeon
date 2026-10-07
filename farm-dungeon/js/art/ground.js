// art/ground.js — تایل‌های زمین مزرعه: چمن/خاک/آب/پرچین/حصار/دروازه/بوته
import { TILE, E, sprite, h2 } from './palette_env.js';
// ---------- تایل‌های زمین ----------
// کش عددی — حلقه‌ی رندر ~۶۰۰ بار/فریم صدا می‌زند؛ کلید رشته‌ای = زبال‌ساز پنهان
const KIND_ID = { grass: 0, soil: 1, path: 2, hedge: 3, water: 4, fence: 5, dfloor: 6, wall: 7, stairs: 8, gateL: 9, gateR: 10, pillar: 11, decor: 12, bush: 13, fencePost: 14 };
const _gnum = new Array(15 * 32 * 4).fill(null); // ۴ تم دانجن (ن۳۲)

// تم رنگی دانجن (ن۳۲): هر ۵ طبقه عوض می‌شود — تم ۰ = رنگ‌های اصلی (پاریتی کامل)
const DP0 = { brick: E.brick, brickHi: E.brickHi, brickOut: E.brickOut, stone: E.stone, stoneHi: E.stoneHi, stoneSh: E.stoneSh, warm: [96, 90, 110, 255], mortar: [74, 70, 92, 255], cap: [110, 106, 132, 255], moss: [58, 106, 58, 255], mossD: [46, 86, 48, 255], stairs: E.stairs, stairsSh: E.stairsSh, glint: [96, 90, 118, 255] };
const DTHEME = [DP0,
  { brick: [70, 84, 74, 255], brickHi: [94, 112, 90, 255], brickOut: [32, 42, 34, 255], stone: [84, 96, 84, 255], stoneHi: [114, 130, 110, 255], stoneSh: [56, 66, 56, 255], warm: [88, 100, 86, 255], mortar: [62, 74, 62, 255], cap: [112, 126, 108, 255], moss: [88, 150, 74, 255], mossD: [58, 110, 56, 255], stairs: [96, 106, 92, 255], stairsSh: [64, 74, 62, 255], glint: [112, 130, 106, 255] }, // خزه
  { brick: [104, 74, 66, 255], brickHi: [134, 100, 80, 255], brickOut: [46, 30, 26, 255], stone: [112, 88, 74, 255], stoneHi: [146, 120, 98, 255], stoneSh: [78, 58, 46, 255], warm: [104, 82, 68, 255], mortar: [80, 58, 48, 255], cap: [142, 116, 94, 255], moss: [224, 138, 74, 255], mossD: [188, 106, 48, 255], stairs: [128, 100, 84, 255], stairsSh: [86, 64, 52, 255], glint: [150, 118, 94, 255] }, // گدازه
  { brick: [64, 76, 102, 255], brickHi: [88, 102, 130, 255], brickOut: [26, 32, 48, 255], stone: [80, 92, 118, 255], stoneHi: [112, 126, 154, 255], stoneSh: [52, 60, 82, 255], warm: [82, 92, 114,  255], mortar: [58, 68, 90, 255], cap: [110, 124, 150, 255], moss: [140, 220, 240, 255], mossD: [100, 170, 200, 255], stairs: [100, 112, 138, 255], stairsSh: [66, 76, 100, 255], glint: [106, 120, 148, 255] }, // یخ
];
export const DPAL = (t) => DTHEME[t] || DP0;

export function groundSprite(kind, variant = 0, wet = false, waterFrame = 0, theme = 0) {
  const nk = theme * 480 + KIND_ID[kind] * 32 + (variant & 3) * 8 + (wet ? 4 : 0) + (waterFrame & 3);
  let cached = _gnum[nk];
  if (cached) return cached;
  const P = DPAL(theme); // پالت سنگ دانجن — تم ۰ همان E است
  const key = `g|${kind}|${variant}|${wet ? 1 : 0}|${waterFrame}|${theme}`;
  return _gnum[nk] = sprite(key, (r) => {
    if (kind === 'grass') {
      r.rect(0, 0, 16, 16, E.grass);
      for (let i = 0; i < 7; i++) {
        const px = Math.floor(h2(variant * 31 + i, i * 17) * 16), py = Math.floor(h2(i * 13, variant * 7 + i) * 16);
        r.px(px, py, i % 3 === 0 ? E.grassSh : E.grass);
        if (i % 2 === 0) r.px(px, py - 1, E.grassBlade);
      }
      if (variant === 2) { r.rect(4, 5, 2, 2, E.flowerW); r.px(5, 6, E.flowerY); }
      if (variant === 3) { r.rect(10, 10, 2, 2, E.flowerY); r.px(11, 11, E.flowerW); }
    } else if (kind === 'soil') {
      const base = wet ? E.soilWet : E.soil, hi = wet ? E.soilWetHi : E.soilHi, sh = wet ? E.soilWetSh : E.soilSh;
      r.rect(0, 0, 16, 16, base);
      r.rect(0, 0, 16, 1, hi);
      for (const y of [4, 8, 12]) { r.rect(0, y, 16, 2, sh); r.rect(0, y, 16, 1, wet ? E.soilWetSh : E.furrow); }
      r.px(3, 2, hi); r.px(12, 6, hi); r.px(6, 10, hi); r.px(13, 14, hi);
      // دانه‌بندی ریز + سنگ‌ریزه (بافت خاک واقعی‌تر)
      for (let i = 0; i < 6; i++) {
        const px = Math.floor(h2(variant * 17 + i, i * 7) * 16), py = 2 + Math.floor(h2(i * 11, variant * 13 + i) * 14);
        r.px(px, py, sh);
      }
      r.px(2 + Math.floor(h2(variant, 3) * 10), 6 + Math.floor(h2(5, variant) * 8), P.stoneHi);
      if (wet) { r.px(4, 3, E.wet); r.px(11, 9, E.wet); r.px(7, 13, E.wet); r.px(14, 5, E.wet); r.px(2, 11, E.wet); }
    } else if (kind === 'path') { // خاک‌راه کوبیده — پر تا لبه تا تایل‌ها پیوسته شوند؛ حاشیه‌ی چمن per-همسایه در drawPathEdge
      r.rect(0, 0, 16, 16, E.soilHi);
      for (let i = 0; i < 22; i++) { // بافت خاک: لکه‌های تیره/روشن قطعی
        const px = Math.floor(h2(variant * 29 + i, i * 5) * 16), py = Math.floor(h2(i * 7, variant * 11 + i) * 16);
        r.px(px, py, i % 3 === 0 ? E.soil : (i % 3 === 1 ? E.soilHi : E.soilSh));
      }
      r.rect(3 + variant * 4, 7 + variant, 5, 1, E.furrow); // ردّ چرخ/پا
    } else if (kind === 'hedge') {
      r.rect(0, 0, 16, 16, E.hedgeSh);
      for (const [bx, by] of [[2, 3], [7, 2], [12, 4], [4, 8], [10, 9], [13, 12], [2, 12], [7, 12]]) {
        r.rect(bx, by, 3, 3, (bx + by) % 3 ? E.hedge : E.hedgeHi);
        r.px(bx + 1, by, E.hedgeHi);
        r.rect(bx, by + 2, 3, 1, E.hedgeSh);
      }
      // ن۳۸: ردیف‌های تختِ hedgeSh (y0,1,6,7,15) با dither روشن شکسته شدند — حذف نوار تیره‌ی هر-۱۶px در حصار عمودی
      for (let x = 0; x < 16; x++) {
        const m = x & 3;
        if (m === 1 || m === 3) r.px(x, 15, E.hedge);
        else if (m === 2) r.px(x, 15, E.hedgeHi);
        if (m === 0 || m === 2) r.px(x, 0, E.hedge);
        else if (m === 1) r.px(x, 0, E.hedgeHi);
        if (m === 0) { r.px(x, 1, E.hedge); r.px(x, 6, E.hedge); }
        else if (m === 2) { r.px(x, 1, E.hedgeHi); r.px(x, 7, E.hedgeHi); }
        else if (m === 3) r.px(x, 7, E.hedge);
      }
    } else if (kind === 'water') { // ۳ فریم موجی: سیکل 0→1→2→1 — یکدست (ن۳۸: نوارهای هر-تایلی حذف شدند؛ لبه‌ی کرانه در رندر صحنه بر اساس همسایه‌ها)
      r.rect(0, 0, 16, 16, E.water);
      // ن۳۸: فاز موج = فریم + واریانتِ مختصاتی → تایل‌های مجاور هم‌فاز نیستند، شبکه‌ی ۱۶px نامرئی
      const ph = (waterFrame + (variant & 3)) & 3;
      r.rect(2, 4 + ph, 5, 1, E.waterHi);
      r.rect(9, 9 - ph, 5, 1, E.waterHi);
      r.rect(4 + ph, 12, 4, 1, E.waterSh);
      r.px(12 + ph, 3, E.sparkle);
      r.px(3, 8 - waterFrame, E.sparkle);
    } else if (kind === 'fence') { // ریل در تمام عرض → اتصال به همسایه‌های چپ/راست
      r.rect(0, 5, 16, 2, E.wood); r.rect(0, 11, 16, 2, E.wood);
      r.rect(0, 5, 16, 1, E.woodHi); r.rect(0, 11, 16, 1, E.woodHi);
      r.rect(6, 2, 4, 12, E.wood); r.rect(6, 2, 1, 12, E.woodHi); r.rect(9, 2, 1, 12, E.woodSh);
      r.rect(6, 1, 4, 1, E.woodHi); r.rect(6, 13, 4, 1, E.woodSh);
    } else if (kind === 'dfloor') {
      // سنگ‌فرش با دو تُن متناوب + درز تیره + جزئیات
      const warm = variant % 2 ? P.warm : P.stone;
      r.rect(0, 0, 16, 16, warm);
      r.rect(0, 0, 16, 1, P.stoneHi);
      r.rect(0, 0, 1, 16, P.stoneHi);
      r.rect(15, 0, 1, 16, P.stoneSh); r.rect(0, 15, 16, 1, P.stoneSh);
      // درزها: چیدمان متفاوت per variant (ن۴۳) — قبلاً صلیبِ یکسان در x=7,y=7 همه‌ی تایل‌ها = شبکه‌ی مکانیکی ۸×۸
      if (variant === 1) { r.rect(0, 7, 16, 1, P.mortar); r.rect(7, 0, 1, 8, P.mortar); r.px(7, 7, P.stoneHi); }
      else if (variant === 2) { r.rect(0, 5, 16, 1, P.mortar); r.rect(0, 11, 16, 1, P.mortar); r.rect(7, 5, 1, 6, P.mortar); r.px(7, 5, P.stoneHi); r.px(7, 11, P.stoneHi); }
      else { r.rect(0, 7, 16, 1, P.mortar); r.rect(7, 0, 1, 16, P.mortar); r.px(7, 7, P.stoneHi); }
      if (variant === 1) { r.rect(4, 5, 3, 2, P.stoneSh); r.rect(10, 10, 2, 2, P.stoneSh); }
      else if (variant === 2) { r.line(3, 12, 8, 12, P.stoneSh); r.line(9, 4, 13, 4, P.stoneSh); }
    } else if (kind === 'wall') {
      // کلاهک سنگی روشن (پرسپکتیو بالا) + بدنه‌ی آجر با جلا و خزه
      const off = (variant % 2) * 8;
      r.rect(0, 0, 16, 16, P.brick);
      r.rect(0, 0, 16, 4, P.stone);            // کلاهک
      r.rect(0, 0, 16, 1, P.stoneHi); r.rect(0, 1, 16, 1, P.cap);
      r.rect(0, 3, 16, 1, P.brickOut);          // سایه‌ی لبه‌ی کلاهک
      for (let i = 0; i < 3; i++) r.px(2 + Math.floor(h2(variant * 3 + i, i) * 12), 1 + Math.floor(h2(i, variant) * 2), P.stoneSh);
      for (let row = 1; row < 4; row++) {
        const y = row * 4;
        r.rect(0, y, 16, 1, P.brickHi);
        r.rect(0, y + 3, 16, 1, P.brickOut);
        // ن۴۳: آجرچینی رگه‌ای واقعی — درز عمودی ردیف‌های زوج/فرد ۴px جابه‌جا
        // (قبلاً shift=۰/۸ هر دو درز x=۰,۸ می‌دادند → کانال عمودی پیوسته در کل دیوار)
        const shift = ((row + off) % 2) * 4;
        for (let bx = -8 + shift; bx < 16; bx += 8) r.rect(bx, y, 1, 3, P.brickOut);
        // جلای آجر: هایلایت کوتاه per تم (قبلاً بنفش هاردکد در همه‌ی تم‌ها)
        r.px(((row * 5 + off) % 14) + 1, y + 1, P.glint);
      }
      // خزه روی درزها
      r.px(2 + (off ? 5 : 0), 5, P.moss); r.px(3 + (off ? 5 : 0), 5, P.mossD);
      r.px(11 - (off ? 4 : 0), 13, P.moss);
      if (variant === 2) { // خرابی: آجر افتاده + ترک (ن۴۳: قبلاً کد مرده — v فقط ۰/۱ می‌شد)
        r.rect(3, 6, 3, 2, P.brickOut); r.rect(4, 7, 1, 1, P.stoneSh);
        r.rect(11, 10, 3, 2, P.brickOut);
        r.line(6, 9, 9, 14, P.brickOut); r.px(10, 14, P.stoneSh);
      } else if (variant === 3) { // خزه‌گرفته: رگه‌های خزه روی خط آجر (هم‌زبان با تم طبقه)
        r.rect(0, 4, 5, 1, P.moss); r.rect(11, 4, 5, 1, P.mossD);
        r.rect(6, 8, 4, 1, P.moss); r.rect(0, 12, 6, 1, P.mossD); r.rect(10, 12, 4, 1, P.moss);
        r.px(5, 6, P.mossD); r.px(12, 10, P.moss);
      }
    } else if (kind === 'stairs') {
      r.rect(0, 0, 16, 16, P.brickOut);
      for (let i = 0; i < 4; i++) {
        r.rect(2 + i, 2 + i * 3, 12 - i * 2, 3, i % 2 ? P.stairs : P.stairsSh);
        r.rect(2 + i, 2 + i * 3, 12 - i * 2, 1, P.stoneHi);
      }
    } else if (kind === 'gateL' || kind === 'gateR') { // دروازه‌ی دانجن ۲×۲: variant 0 = ردیف بالا (سردر)، 1 = ردیف پایین (آستانه) — یک طاق یکپارچه
      const L2 = kind === 'gateL', top = variant === 0;
      const ox = L2 ? 4 : 0, ow = 12; // دهانه‌ی بنفش (سمت داخلی هر نیمه)
      r.rect(0, 0, 16, 16, P.stone);
      r.rect(ox, top ? 4 : 0, ow, top ? 12 : 12, [26, 18, 46, 255]);
      r.rect(ox, top ? 4 : 0, ow, 1, [18, 12, 34, 255]);
      if (L2) { r.rect(0, 0, 5, 16, P.stone); r.rect(1, 0, 3, 16, P.stoneHi); r.rect(0, top ? 8 : 4, 5, 2, P.stoneSh); r.rect(4, 0, 1, 16, P.stoneSh); }
      else { r.rect(11, 0, 5, 16, P.stone); r.rect(12, 0, 3, 16, P.stoneHi); r.rect(11, top ? 8 : 4, 5, 2, P.stoneSh); r.rect(11, 0, 1, 16, P.stoneSh); }
      if (top) { // سردر: سنگ‌چین + کلید طاق
        r.rect(0, 0, 16, 4, P.brick); r.rect(0, 0, 16, 1, P.brickHi); r.rect(0, 3, 16, 1, P.brickOut);
        r.rect(L2 ? 12 : 0, 0, 4, 4, P.cap); r.rect(L2 ? 12 : 0, 0, 4, 1, P.brickHi);
        if (!L2) r.px(0, 1, P.brickHi); else r.px(15, 1, P.brickHi);
        r.px(L2 ? 14 : 1, 2, [122, 208, 232, 255]); // رون کلید طاق
      } else { // آستانه: پله‌ی سنگی روشن
        r.rect(0, 12, 16, 4, P.stairs); r.rect(0, 12, 16, 1, P.stoneHi); r.rect(0, 15, 16, 1, P.stairsSh);
        r.rect(ox, 11, ow, 1, [58, 40, 96, 255]);
      }
      if (L2) { r.px(7, top ? 8 : 4, E.essence); r.px(9, top ? 12 : 8, [154, 220, 240, 200]); }
      else { r.px(5, top ? 11 : 6, E.essence); r.px(8, top ? 7 : 2, [154, 220, 240, 200]); }
      r.px(L2 ? 2 : 13, top ? 6 : 2, [122, 208, 232, 255]); r.px(L2 ? 2 : 13, top ? 11 : 8, [154, 220, 240, 255]); // رون‌های ستون
    } else if (kind === 'pillar') { // ستون سنگی روی کف (مانع) — v1: ترک‌خورده
      if (variant === 1) {
        r.rect(0, 0, 16, 16, P.stone);
        r.rect(0, 15, 16, 1, P.stoneSh);
        r.rect(2, 8, 12, 8, P.stoneSh);
        r.rect(3, 4, 10, 11, P.brick);
        r.rect(3, 4, 3, 11, P.brickHi);
        r.rect(11, 4, 2, 11, P.brickOut);
        r.rect(1, 2, 14, 3, P.stone);
        r.rect(1, 2, 14, 1, P.stoneHi); r.rect(1, 4, 14, 1, P.brickOut);
        // ترک عمیق مورب + لبه‌های شکسته
        r.line(5, 4, 8, 10, P.brickOut); r.line(8, 10, 7, 14, P.brickOut);
        r.px(6, 6, P.brickOut); r.px(8, 12, P.brickOut); r.px(9, 8, P.stoneSh);
        r.rect(4, 3, 2, 1, P.brickOut); r.rect(10, 3, 3, 1, P.brickOut); // سرستون شکسته
      } else {
      r.rect(0, 0, 16, 16, P.stone);
      r.rect(0, 15, 16, 1, P.stoneSh);
      r.rect(2, 8, 12, 8, P.stoneSh);          // سایه پایه
      r.rect(3, 4, 10, 11, P.brick);           // بدنه ستون
      r.rect(3, 4, 3, 11, P.brickHi);
      r.rect(11, 4, 2, 11, P.brickOut);
      r.rect(1, 2, 14, 3, P.stone);            // سرستون
      r.rect(1, 2, 14, 1, P.stoneHi); r.rect(1, 4, 14, 1, P.brickOut);
      r.px(6, 8, P.brickOut); r.px(9, 12, P.brickOut); // ترک
      }
    } else if (kind === 'decor') { // دکور کف دانجن: variant 0=استخوان 1=قارچ 2=ترک 5=فرش (ن۳۲)
      if (variant === 5) { // فرش قرمز تالار تخت — لبه‌ی طلایی، بافت صلیبی
        r.rect(0, 0, 16, 16, [142, 38, 44, 255]);
        r.rect(0, 0, 16, 1, [186, 58, 58, 255]); r.rect(0, 0, 1, 16, [186, 58, 58, 255]);
        r.rect(15, 0, 1, 16, [94, 24, 30, 255]); r.rect(0, 15, 16, 1, [94, 24, 30, 255]);
        r.rect(3, 3, 10, 10, [120, 30, 38, 255]);
        r.rect(7, 2, 2, 12, [170, 52, 52, 255]); r.rect(2, 7, 12, 2, [170, 52, 52, 255]);
        r.px(4, 4, [230, 199, 74, 255]); r.px(11, 4, [230, 199, 74, 255]); r.px(4, 11, [230, 199, 74, 255]); r.px(11, 11, [230, 199, 74, 255]);
      } else {
      r.rect(0, 0, 16, 16, P.stone);
      r.rect(0, 0, 16, 1, P.stoneHi); r.rect(15, 0, 1, 16, P.stoneSh); r.rect(0, 15, 16, 1, P.stoneSh);
      if (variant === 0) { // استخوان‌ها
        r.lineW(4, 10, 10, 7, 2, E.bone ?? E.white);
        r.px(3, 9, E.white); r.px(3, 11, E.white); r.px(11, 6, E.white); r.px(11, 8, E.white);
        r.rect(7, 12, 4, 2, E.white); r.px(8, 12, P.stoneSh);
      } else if (variant === 1) { // قارچ‌های نورانی
        r.rect(4, 10, 2, 3, E.essenceSh ?? P.stoneSh); r.rect(9, 8, 2, 4, E.essenceSh ?? P.stoneSh);
        r.rect(3, 8, 4, 2, E.essence); r.rect(8, 6, 4, 2, E.essence);
        r.px(4, 8, [230, 250, 255, 255]); r.px(10, 6, [230, 250, 255, 255]);
      } else if (variant === 2) { // ترک زمین
        r.line(3, 3, 7, 8, P.brickOut); r.line(7, 8, 6, 13, P.brickOut); r.line(7, 8, 12, 10, P.brickOut);
        r.px(12, 10, P.brickOut); r.px(3, 3, P.stoneSh);
      } else if (variant === 3) { // کریستال درخشان
        r.px(4, 12, E.essenceSh); r.px(11, 11, E.essenceSh);
        r.lineW(7, 13, 7, 7, 2, E.essence);       // بلور اصلی
        r.px(6, 6, [230, 250, 255, 255]); r.px(8, 8, [230, 250, 255, 255]);
        r.px(5, 9, E.essenceSh); r.px(9, 11, E.essenceSh);
        r.lineW(11, 13, 11, 10, 1, E.essence);    // بلور کوچک
        r.px(11, 9, [230, 250, 255, 255]);
      } else if (variant === 4) { // تار عنکبوت (گوشه)
        r.px(1, 1, E.white); r.px(2, 2, E.white); r.px(3, 3, P.stoneHi);
        r.line(1, 1, 6, 1, E.white); r.line(1, 1, 1, 6, E.white);
        r.line(2, 2, 6, 2, P.stoneHi); r.line(2, 2, 2, 6, P.stoneHi);
        r.line(1, 4, 4, 1, P.stoneHi); r.px(4, 4, E.white); r.px(5, 3, P.stoneHi);
      }
      }
    } else if (kind === 'bush') { // بوته‌ی مرز زمین قفل‌شده (روی چمن)
      r.rect(4, 9, 8, 5, E.hedgeSh);
      r.rect(5, 7, 6, 4, E.hedge);
      r.rect(6, 6, 3, 2, E.hedgeHi);
      r.px(6, 9, E.berry); r.px(9, 10, E.berry);
    } else if (kind === 'fencePost') { // ستون + دنباله‌ی کوتاه ریل (برای حصار عمودی)
      r.rect(0, 5, 4, 2, E.wood); r.rect(12, 5, 4, 2, E.wood);
      r.rect(0, 11, 4, 2, E.wood); r.rect(12, 11, 4, 2, E.wood);
      r.rect(6, 2, 4, 12, E.wood); r.rect(6, 2, 1, 12, E.woodHi); r.rect(9, 2, 1, 12, E.woodSh);
      r.rect(6, 1, 4, 1, E.woodHi); r.rect(6, 13, 4, 1, E.woodSh);
    }
  });
}
