// farm_render.js — رندر صحنه‌ی مزرعه: تایل‌ها، دکور زنده، نشانگر، قهرمان+کارگر،
// افکت‌ها، شب/شب‌تاب، پروانه/ماهی، آب‌وهوا (باران/ابر) — فقط رسم، هیچ منطقی
import { groundSprite, cropSprite, E, TILE, COLS, ROWS, WORLD_W, WORLD_H } from './tiles.js';
import { drawMeadow, drawReadySparkle, drawWaterLife, drawSaleSign, drawPathEdge } from './art/farm_decor.js';
import { drawTree } from './art/tree.js';
import { drawFarmhouse, drawFarmhouseGlow, drawScarecrow, drawSprinkler, drawBasketCrate } from './art/farm_buildings.js';
import { HOUSE, SCARECROW } from './farm_layout.js';
import { applyNight, nightFactor } from './night.js';
import { drawBirds } from './art/critters.js';
import { drawRain, isRaining, lightningK, flashTint, drawLightning, drawPondRipples } from './art/weather.js';
import { drawHeroFrame, frameKey, framePhase, halfSprite } from './art/hero.js';
import { HOX, HOY } from './art/hero_pose.js';
import { applyRim } from './art/rim.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const FENTS = []; // pool موجودات مزرعه
const _gP = [255, 210, 90, 0]; // درخشش طلایی — اسکرچ
const TREES = []; // درخت‌های مرئی — بازمصرف برای پرندگان // pool موجودات مزرعه (درخت/قهرمان/کارگر) — بازمصرف
const _sprCache = new Map(); // کش اسپرایت قهرمان مزرعه
const WF_SEQ = [0, 1, 2, 1]; // موج آب: ۳ فریم با سیکل نرم — ثابت، بدون تخصیص هر فریم
// اسکرچ گزینه‌های اسپرایت — بدون آبجکت/spread جدید در هر فریم (فقط خوانده می‌شود)
const _ho = { dir: 'down', anim: 'idle', phase: 0, breath: 0, moveW: 0, tool: 'none', actP: -1, blink: false, equip: null };

export function farmHeroSprite(game) {
  const h = game.hero, l = h.loco;
  const anim = h.act >= 0 || l.moveW < 0.02 ? 'idle' : l.mix < 0.5 ? 'walk' : 'run';
  const o = _ho;
  o.dir = h.dir; o.anim = anim;
  o.phase = anim === 'idle' ? (l.t % 2.4) / 2.4 : l.mix < 0.5 ? l.phW : l.phR;
  o.breath = l.t; o.moveW = anim === 'idle' ? 0 : l.moveW;
  o.tool = h.tool; o.actP = h.act; o.blink = l.blink; o.equip = game.equip;
  o.phase = framePhase(o); // کوانت‌شده — همان چیزی که drawHeroFrame می‌کشد
  const key = frameKey(o) + '#' + (game.equipSig || '');
  let s = game.sprCache.get(key);
  if (!s) {
  s = halfSprite(drawHeroFrame(o)); // ن۳۵: بدنه ۶۲px→۳۱px — نسبت درست به تایل/خانه/درخت
  applyRim(s, null, 0.3); // جلای ظریف لبه‌ی بالا (پس از نصف‌شدن = ۱px)
  if (game.sprCache.size > 260) { const it = game.sprCache.keys(); for (let i = 0; i < 80; i++) { const k = it.next(); if (k.done) break; game.sprCache.delete(k.value); } } // سقف حافظه: ۲۶۰×۶۴KB≈۱۶MB
  game.sprCache.set(key, s);
  }
  return s;
}

// رندر کامل صحنه‌ی مزرعه در Raster
export function renderFarm(game, r) {
    const flat = !!r.flatOnly; // فاز ۱ HD-2D: فریم زمین برای مسیر GPU — فقط لایه‌ی زمین/دکورِ سطحی
    const cx = Math.round(clamp(game.cam.x, Math.min(0, (WORLD_W - r.w) / 2), Math.max(0, WORLD_W - r.w)));
    const cy = Math.round(clamp(game.cam.y, Math.min(0, (WORLD_H - r.h) / 2), Math.max(0, WORLD_H - r.h)));
    const f = game.farm, wf = [0, 1, 2, 1][Math.floor(game.time * 0.9) % 4]; // موج آب: سیکل آرام ~۱٫۱ث/فریم (ن۳۷)
    const x0 = Math.max(0, Math.floor(cx / TILE)), x1 = Math.min(COLS - 1, Math.ceil((cx + r.w) / TILE));
    const y0 = Math.max(0, Math.floor(cy / TILE)), y1 = Math.min(ROWS - 1, Math.ceil((cy + r.h) / TILE));
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const c = f.cell(tx, ty);
      const sx = tx * TILE - cx, sy = ty * TILE - cy;
      let base;
      if (c.kind === 'grass') base = groundSprite('grass', c.variant);
      else if (c.kind === 'path') base = groundSprite('path', c.variant & 1);
      else if (c.kind === 'tree') base = groundSprite('grass', 0); // زیر درخت چمن است
      else if (c.kind === 'soil') base = groundSprite('soil', 0, c.wet);
      else if (c.kind === 'water') base = groundSprite('water', (tx * 5 + ty * 3) & 3, false, wf); // ن۳۸: فاز موج per-tile
      else if (c.kind === 'hedge') base = groundSprite('hedge');
      else if (c.kind === 'gate') base = groundSprite(c.gL ? 'gateL' : 'gateR', ty === f.gate.y ? 0 : 1); // پایه‌ی دروازه ثابت — جادوی متحرک در drawGateSwirl
      else if (c.kind === 'sign') base = groundSprite('grass', 0); // تابلوی فروش باغ شمالی — تخته در drawSaleSign
      else if (c.kind === 'house') base = groundSprite('grass', 0); // بدنه‌ی خانه در گذر موجودات (y-sort)
      else if (c.kind === 'scarecrow') base = groundSprite('grass', 0); // مترسک روی چمن
      else { groundSprite('grass', (tx * 5 + ty * 3) & 3).over(r, sx, sy); base = groundSprite(c.fenceH ? 'fence' : 'fencePost'); } // حصار روی چمن (قبلاً شفاف = سیاهی/ردّ فریم قبل)
      base.over(r, sx, sy);
      if (c.kind === 'path') drawPathEdge(r, sx, sy, tx, ty, f);
      if (c.kind === 'water') { // کرانه‌ی آب فقط روی مرز (ن۳۸) — داخل حوضچه یکدست، بی‌رگه
        if (!f.cell(tx, ty - 1) || f.cell(tx, ty - 1).kind !== 'water') r.rect(sx, sy, 16, 1, E.waterSh);
        if (!f.cell(tx, ty + 1) || f.cell(tx, ty + 1).kind !== 'water') { r.rect(sx, sy + 14, 16, 1, E.waterSh); r.rect(sx, sy + 15, 16, 1, E.waterSh); }
        if (!f.cell(tx - 1, ty) || f.cell(tx - 1, ty).kind !== 'water') r.rect(sx, sy, 1, 16, E.waterSh);
        if (!f.cell(tx + 1, ty) || f.cell(tx + 1, ty).kind !== 'water') r.rect(sx + 15, sy, 1, 16, E.waterSh);
      }
      if (c.crop) cropSprite(c.crop.type, f.stage(c)).over(r, sx, sy);
      if (c.crop && c.crop.g && !f.mature(c)) { // طلاییِ در حال رشد: درخشش ریز (کوانتیزه)
        _gP[3] = 55 + 25 * Math.round((Math.sin(game.time * 1.2 + tx) + 1)); // ن۳۶: پالس آرام‌تر — نشانِ طلایی، نه استروب
        r.px(sx + 3, sy + 4, _gP); r.px(sx + 12, sy + 11, _gP);
      }
      // بوته‌ی مرز روی زمین قفل‌شده (تایل زیرین آزاد است)
      if (c.kind === 'grass' && !c.farmable && f.insideFence(tx, ty)) {
        const below = f.cell(tx, ty + 1);
        if (below && below.farmable && below.kind === 'grass') groundSprite('bush').over(r, sx, sy);
      }
      // ---- دکور زنده‌ی مزرعه (آرت جدا در js/art/) ----
      if (!flat && c.kind === 'sign') drawSaleSign(r, sx, sy, game.time); // مسیر GPU: billboard جدا
      else if (!flat && c.kind === 'scarecrow') drawScarecrow(r, sx, sy, game.time); // نگهبان پرنده‌ها
      else if (c.kind === 'grass' && !f.insideFence(tx, ty)) drawMeadow(r, sx, sy, tx, ty, game.time, c.db); // db = نزدیکی مسیر/آب → گل بیشتر
      if (!flat && tx === 26 && ty === 14 && game.toolLvls.sprinkler) drawSprinkler(r, sx, sy, game.time); // آبپاش: بالای حوضچه، از آن آب می‌کشد
      if (!flat && tx === 18 && ty === 16 && game.toolLvls.basket) drawBasketCrate(r, sx, sy, game.time); // سبد: کنار خانه
      else if (c.kind === 'water') drawWaterLife(r, sx, sy, tx, ty, game.time);
      if (c.crop && f.mature(c)) drawReadySparkle(r, sx, sy, tx, ty, game.time, !!c.crop.g);
    }
    // نشانگر هدف (گوشه‌های چشمک‌زن) — در مسیر GPU به‌صورت billboard جدا رسم می‌شود
    if (!flat && game.marker) {
      const m = game.marker, sx = m.x * TILE - cx, sy = m.y * TILE - cy;
      const col = Math.floor(m.t * 2) % 2 ? E.gold : E.white; // ن۳۷: چشمک نشانگر آرام‌تر (۲Hz)
      const c3 = 3;
      r.rect(sx - 1, sy - 1, c3 + 1, 1, col); r.rect(sx - 1, sy, 1, c3, col);
      r.rect(sx + TILE - c3, sy - 1, c3 + 1, 1, col); r.rect(sx + TILE - 1, sy, 1, c3, col);
      r.rect(sx - 1, sy + TILE, c3 + 1, 1, col); r.rect(sx - 1, sy + TILE - c3, 1, c3, col);
      r.rect(sx + TILE - c3, sy + TILE, c3 + 1, 1, col); r.rect(sx + TILE - 1, sy + TILE - c3, 1, c3, col);
    }
    if (flat) game.fish.draw(r, cx, cy, game.time, f); // ماهی روی صفحه‌ی زمین (زیر موجودات) — مسیر GPU
    // درخت‌ها + قهرمان + کارگر — مرتب بر اساس y (pool بازمصرف، صفر تخصیص)
    if (!flat) {
    const h = game.hero;
    let fn = 0, tn = 0;
    for (let ty2 = y0; ty2 <= y1; ty2++) for (let tx2 = x0; tx2 <= x1; tx2++) {
      const c2 = f.cell(tx2, ty2);
      if (c2.kind !== 'tree') continue;
      let wt = FENTS[fn] || (FENTS[fn] = { y: 0, t: 0, sx: 0, sy: 0, v: 0 });
      wt.y = ty2 * TILE + TILE; wt.t = 0; wt.sx = tx2 * TILE - cx; wt.sy = ty2 * TILE - cy; wt.v = c2.variant & 1; fn++;
      if (Math.max(Math.abs(tx2 - SCARECROW.x), Math.abs(ty2 - SCARECROW.y)) > 6) { // مترسک اینجاست — پرنده نمی‌نشیند
        let tv = TREES[tn] || (TREES[tn] = { x: 0, y: 0 });
        tv.x = tx2; tv.y = ty2; tn++; // برای پرندگان
      }
    }
    { let wt = FENTS[fn] || (FENTS[fn] = { y: 0, t: 0, sx: 0, sy: 0, v: 0 }); wt.y = h.y; wt.t = 1; fn++; }
    { let wt = FENTS[fn] || (FENTS[fn] = { y: 0, t: 0, sx: 0, sy: 0, v: 0 }); wt.y = (HOUSE.y + 2) * TILE; wt.t = 3; fn++; } // خانه
    for (const wk of game.workers) { let wt = FENTS[fn] || (FENTS[fn] = { y: 0, t: 0, sx: 0, sy: 0, v: 0, w: null }); wt.y = wk.y; wt.t = 2; wt.w = wk; fn++; }
    for (let i = 0; i < fn; i++) for (let j = i + 1; j < fn; j++) if (FENTS[j].y < FENTS[i].y) { const tmp = FENTS[i]; FENTS[i] = FENTS[j]; FENTS[j] = tmp; }
    for (let i = 0; i < fn; i++) {
      const e = FENTS[i];
      if (e.t === 0) drawTree(r, e.sx, e.sy, e.v, game.time, e.sx >> 4);
      else if (e.t === 3) drawFarmhouse(r, HOUSE.x * TILE - cx, HOUSE.y * TILE - cy, game.time, nightFactor(game.dayT));
      else if (e.t === 1) {
        game._heroSprite().over(r, Math.round(h.x) - HOX - cx, Math.round(h.y) - HOY - cy); // سایه داخل اسپرایت پخته شده (ن۳۵: دوبل حذف شد)
      }
      else if (e.t === 2 && e.w) e.w.render(r, cx, cy, game.time);
    }
    if (tn) drawBirds(r, TREES, cx, cy, game.time, h.x, h.y, Math.min(2, tn)); // پرندگانِ نشسته روی درخت‌ها (ن۳۶: حداکثر ۲، بی‌حرکت تا فرار)
    // افکت‌ها (ذرات/متن‌ها/برش)
    game.fx.render(r, cx, cy);
    // ---- شب: تینت آبی + شب‌تاب‌ها ----
    const raining = isRaining(game.dayT);
    applyNight(r, game.dayT, raining); // تینت شب×باران در یک گذر (ن۳۶: بدون شب‌تاب)
    drawFarmhouseGlow(r, HOUSE.x * TILE - cx, HOUSE.y * TILE - cy, game.time, nightFactor(game.dayT)); // پنجره‌ی خانه: نور واقعی در تاریکی
    game.fish.draw(r, cx, cy, game.time, f);
    // ---- آب‌وهوا ----
    const nf = nightFactor(game.dayT);
    if (raining) {
      drawRain(r, game.time);
      drawPondRipples(r, game.time); // موج روی حوضچه
      const lk = lightningK(game.dayT, game.time); // رعد و برق — فقط باران
      if (lk > 0) { flashTint(r, lk); drawLightning(r, game.time); }
    }
    }
  }
