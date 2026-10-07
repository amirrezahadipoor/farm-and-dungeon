// render_gl.js — مسیر رندر HD-2D (فاز ۱+۲): دوربین دیوراما، زمین روی صفحه‌ی شیب‌دار با نرمال رویه‌ای و AO
// از خودِ تکسچر، نورهای نقطه‌ای رنگی با N·L، خورشید/ماهِ چرخه‌ی روز، دکال‌های سایه/تماس، اسپرایت‌های
// emissive و لایه‌های صفحه‌ای (افکت/آب‌وهوا/اسپلش/مینی‌مپ). منطق/سیو/نقشه دست‌نخورده؛ CPU = fallback.
import { glFrame, glPush, glFlushSprites, glOverlay, glGround, glUi, glWx, glLayer, glLights, glSun, glRim, GLT, GLR } from './art/gl.js';
import { glAtlas } from './art/gl_batch.js';
import { BK, textRec, minimapRec } from './art/glbake.js';
import { Raster } from './raster.js';
import { TILE, COLS, ROWS, WORLD_W, WORLD_H } from './tiles.js';
import { textW } from './art/font2.js';
import { nightFactor } from './night.js';
import { isRaining, lightningK, drawRain, drawPondRipples, drawLightning } from './art/weather.js';
import { HOX, HOY } from './art/hero_pose.js';
import { MHEAD } from './art/monster_parts.js';
import { Q } from './art/quality.js';
import { t, faNum } from './i18n.js';

export const GCAM = { A: 1.28, S: 0.8594, B: 0.0006, cx: 240, cy: 160, W: 4, H: 4, x0: 0, y0: 0, gw: 0, gh: 0, scale: 1 };
const MAXL = 24, TOPY = 1e7, VW = 512, VH = 384, DAY_LEN = 3600;
export const GSTAT = { quads: 0, draws: 0, lights: 0, ents: 0, decals: 0, sun: [0, 0, 1, 0] };
export function glGroundRas() { return GR.ras; } // اشکال‌زدایی: فریم زمینِ همین فریم
const GR = {
  L: new Float32Array(MAXL * 4), LC: new Float32Array(MAXL * 4), nl: 0, ras: null, fx: null, wx: null,
  tint: new Float32Array([1, 1, 1, 0]), dark: new Float32Array([13 / 255, 11 / 255, 26 / 255]),
  cam: new Float32Array(2), view: new Float32Array(2), ax: new Float32Array(2), org: new Float32Array(2), tsz: new Float32Array(2),
};
const W4 = [1, 1, 1, 1], FT = [220 / 255, 80 / 255, 80 / 255], _p = [0, 0], ENT = [], DEC = [];
let en = 0, dn = 0, rkind = 0, shX = 0, shY = 0;
const RKEY = new WeakMap();

export function glProj(x, y, out) {
  const dx = x - GCAM.cx, dy = y - GCAM.cy, kz = 1 / (1 - dy * GCAM.B);
  out[0] = GCAM.W * 0.5 + dx * GCAM.A * kz;
  out[1] = GCAM.H * 0.5 + dy * GCAM.S * GCAM.A * kz;
  return kz;
}
export function glInv(lx, ly) { // صفحه → دنیا (معکوس دقیق kz) برای ورودی
  const sA = GCAM.S * GCAM.A, uy = ly - GCAM.H * 0.5, ux = lx - GCAM.W * 0.5;
  const dy = uy / (sA + uy * GCAM.B), kz = 1 / (1 - dy * GCAM.B);
  return { worldX: GCAM.cx + ux / (GCAM.A * kz), worldY: GCAM.cy + dy };
}
function pushE(rec, ax, ay, ox, oy, col, mode, y) {
  let e = ENT[en];
  if (!e) e = ENT[en] = {};
  e.rec = rec; e.ax = ax; e.ay = ay; e.ox = ox; e.oy = oy; e.col = col; e.mode = mode; e.y = y; e.i = en; en++;
  if (en >= 1200) flushE();
}
function pushR(ras, x, y, ox, oy, y2) { pushE(recOf(ras), x, y, ox, oy, W4, 0, y2 == null ? y : y2); }
function recOf(ras) { let k = RKEY.get(ras); if (!k) { k = 'r' + (++rkind); RKEY.set(ras, k); } return glAtlas(k, ras); }
// دکال روی صفحه‌ی زمین: سایه/تماس — مستقل از y-sort، بی‌نور، کشیده در جهت سایه
function pushDecal(w, h, k, wx, wy, objH, sc) {
  const t = BK.ao(w, h, k);
  const x = wx + shX * objH * sc, y = wy + shY * objH * sc;
  let d = DEC[dn];
  if (!d) d = DEC[dn] = {};
  d.rec = t; d.ax = x; d.ay = y; d.col = W4; dn++;
}
let dnStat = 0, scene_gl_farm = true;
// حوضه‌ی نور روی زمین (کارت lightmap، بدون نورپردازی مجدد — mode 3)
function pushPool(kind, cx, cy, r, peak) {
  if (dn >= 90) return;
  const rq = Math.max(8, Math.round(r / 8) * 8), pq = Math.max(5, Math.min(95, Math.round(peak * 100 / 5) * 5));
  const d = DEC[dn] || (DEC[dn] = {}); // الگوی ایمن مثل pushDecal (ن۵۳: بی‌آن، حلقه می‌مرد)
  d.rec = BK.pool(rq, kind, pq); d.ax = cx; d.ay = cy; d.col = W4; dn++;
}
function flushD() {
  dnStat = dn;
  for (let i = 0; i < dn; i++) { const d = DEC[i]; glPush(d.rec, d.ax, d.ay, d.rec.w * 0.5, d.rec.h * 0.5, d.col, 3); }
  dn = 0;
  glFlushSprites(); // پاس دکال (فقط اگر چیزی نبود هم بی‌هزینه است)
}
function flushE() {
  const list = ENT.slice(0, en).sort((a, b) => (a.y - b.y) || (a.i - b.i));
  for (let i = 0; i < list.length; i++) { const e = list[i]; glPush(e.rec, e.ax, e.ay, e.ox, e.oy, e.col, e.mode); }
  en = 0;
}
function addLight(x, y, rad, st, col, hh) {
  if (GR.nl >= MAXL) return; glProj(x, y, _p);
  if (_p[0] < -rad || _p[1] < -rad || _p[0] > GCAM.W + rad || _p[1] > GCAM.H + rad) return;
  const o = GR.nl * 4;
  GR.L[o] = _p[0]; GR.L[o + 1] = _p[1]; GR.L[o + 2] = rad; GR.L[o + 3] = st;
  GR.LC[o] = col[0]; GR.LC[o + 1] = col[1]; GR.LC[o + 2] = col[2]; GR.LC[o + 3] = hh ?? 8;
  GR.nl++;
}
// ---------- چرخه‌ی روز/شب: جهت و رنگ خورشید/ماه + محیط رنگی (فاز ۲) ----------
const SUN_D = [255, 214, 150], SUN_N = [255, 246, 226], MOON = [150, 175, 255];
export function cycle(dayT, raining) {
  const t01 = ((dayT % DAY_LEN) + DAY_LEN) % DAY_LEN / DAY_LEN; // 0 = ظهر
  const e = Math.cos(2 * Math.PI * t01);      // 1 ظهر → −1 نیمه‌شب
  const az = Math.sin(2 * Math.PI * t01);     // 0 ظهر/نیمه‌شب، ±1 سپیده/غروب
  const day = Math.max(0, e), night = Math.max(0, -e);
  const gold = Math.max(0, 1 - Math.abs(e) * 4); // ساعت طلایی نزدیک افق
  let sx = az * 0.85, sy = -(0.6 + 0.3 * day), sz = 0.45 + 0.55 * day;
  const isDay = day > 0.02;
  if (!isDay) { sx = -az * 0.6; sy = -0.75; sz = 0.3; } // شب: ماه از سمت مقابل، سرد و کم
  const col = [0, 0, 0];
  for (let i = 0; i < 3; i++) col[i] = (isDay ? SUN_D[i] * gold + SUN_N[i] * (1 - gold) : MOON[i]) / 255;
  // ظهر ≈ کم‌نور (روشنایی از تینت محیط)، ساعت طلایی/مایل = دراماتیک؛ باران نصف
  const k = (isDay ? 0.10 + 0.45 * (1 - day) : 0.08 * night) * (raining ? 0.5 : 1);
  const m = Math.hypot(sx, sy, sz) || 1, dir = [sx / m, sy / m, sz / m];
  glSun(dir, col, k); GSTAT.sun = [dir[0], dir[1], dir[2], k];
  // محیط: روز روشن، ساعت طلایی گرم، شب سرد — رنگ، نه فقط کم‌نور (فاز ۲)
  if (scene_gl_farm) {
    const nf = nightFactor(dayT);
    // شبِ واقعی (فاز ۲): تاریکیِ عمیقِ آبی‌فام — کنتراست با حوضه‌های گرمِ پنجره/مشعل
    const a = nf > 0.35 ? Math.min(0.74, (nf - 0.35) / 0.65 * 0.74) : 0, warm = gold * day;
    const rn = raining ? [0.82, 0.86, 0.96] : [1, 1, 1], kk = [1 - a, 1 - a * 0.90, 1 - a * 0.62], ww = [0.10, 0.16, 0.24];
    for (let i = 0; i < 3; i++) GR.tint[i] = kk[i] * rn[i] * (1 - ww[i] * warm);
    GR.tint[3] = 0;
  }
  // جهت سایه‌ی روی زمین: از خورشید دور می‌شود؛ بلندتر نزدیک افق
  const len = 0.42 * (1 - Math.max(0, e) * 0.55), n2 = Math.hypot(sx, sy) || 1;
  shX = (-sx / n2) * len; shY = (-sy / n2) * len * (GCAM.S * GCAM.A) / GCAM.A;
  return gold;
}
export function glTintDungeon() { GR.tint[0] = 1; GR.tint[1] = 1; GR.tint[2] = 1; GR.tint[3] = 142; } // تاریکی محیط عمیق (فاز ۲)
// ---------- مزرعه ----------
const HOUSE_WIN = [1, 0.76, 0.42];
function farmEnts(game, t, night, x0, y0, x1, y1) {
  const f = game.farm;
  const tx0 = Math.max(0, (x0 >> 4) - 1), tx1 = Math.min(COLS - 1, (x1 >> 4) + 1);
  const ty0 = Math.max(0, (y0 >> 4) - 2), ty1 = Math.min(ROWS - 1, (y1 >> 4) + 1);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const c = f.cell(tx, ty);
    if (!c) continue;
    if (c.kind === 'tree') {
      const v = c.variant & 1;
      pushDecal(22, 13, 0.55, tx * TILE + 8, ty * TILE + 13, 14, 1); // سایه‌ی تماس
      pushE(BK.tree(v, Math.round(Math.sin(t * 0.85 + tx * 0.9 + v * 2.1))), tx * TILE, ty * TILE, 8, 18, W4, 0, ty * TILE + TILE);
    } else if (c.kind === 'sign') { pushDecal(13, 8, 0.5, tx * TILE + 8, ty * TILE + 14, 5, 1); pushE(BK.sign(), tx * TILE, ty * TILE, 2, 4, W4, 0, ty * TILE + TILE); }
    else if (c.kind === 'scarecrow') { pushDecal(15, 9, 0.5, tx * TILE + 8, ty * TILE + 14, 9, 1); pushE(BK.scare(Math.floor(t * 1.4) & 1), tx * TILE, ty * TILE, 2, 4, W4, 0, ty * TILE + TILE); }
  }
  if (game.toolLvls.sprinkler) { pushDecal(12, 7, 0.45, 26 * TILE + 8, 14 * TILE + 15, 6, 1); pushE(BK.sprk(Math.floor(t * 1.2) & 3), 26 * TILE, 14 * TILE, 2, 2, W4, 0, 15 * TILE); }
  if (game.toolLvls.basket) { pushDecal(13, 8, 0.5, 18 * TILE + 8, 16 * TILE + 15, 6, 1); pushE(BK.crate(Math.floor(t * 2.5) & 1), 18 * TILE, 16 * TILE, 2, 4, W4, 0, 17 * TILE); }
  pushDecal(46, 22, 0.85, 15 * TILE + 16, 18 * TILE + 12, 20, 1); // خانه: سایه‌ی بزرگ روی صفحه‌ی زمین
  const ph = night > 0.45 ? 1 : 0;
  pushE(BK.house(ph + 2 * (Math.floor(t * 1.6) % 3)), 15 * TILE, 16 * TILE, 4, 12, W4, 0, 18 * TILE);
  if (night > 0.45 && Q.level) {
    pushE(BK.glow(Math.floor(t * 1.4) & 1), 15 * TILE, 16 * TILE, 4, 2, W4, 2, 18 * TILE + 1); // پنجره: emissive
    addLight(15 * TILE + 8, 18 * TILE + 4, 42, 0.5 * Math.min(1, (night - 0.45) / 0.4), HOUSE_WIN, 10);
    pushPool(5, 15 * TILE + 8, 18 * TILE + 22, 48, 0.46 * Math.min(1, (night - 0.45) / 0.4)); // حوضه‌ی نور پنجره
  }
  pushR(game._heroSprite(), game.hero.x, game.hero.y, HOX, HOY);
  if (Q.level) for (const wk of game.workers) if (wk.task || Math.hypot(wk.x - game.hero.x, wk.y - game.hero.y) < 330) pushR(wk._frame(t), wk.x, wk.y, HOX, HOY);
  if (game.marker) pushE(BK.corner(Math.floor(game.marker.t * 2) & 1), game.marker.x * TILE, game.marker.y * TILE, 0, 0, W4, 0, TOPY - 2);
}
// ---------- دانجن ----------
const C_TORCH = [1, 0.60, 0.28], C_HERO = [1, 0.84, 0.56], C_SHRINE = [0.45, 0.85, 1], C_STAIR = [0.85, 0.82, 1], C_ESS = [0.5, 0.85, 0.95];
function runEnts(run, t, x0, y0, x1, y1) {
  const D = run.dungeon, h = run.hero;
  for (const tt of D.torches) {
    const wx = tt.x * TILE, wy = tt.y * TILE;
    if (wx < x0 - 40 || wx > x1 + 40 || wy < y0 - 60 || wy > y1 + 40) continue;
    pushDecal(14, 9, 0.5, wx + 8, wy + 13, 6, 1);
    pushE(BK.torch(Math.floor(t * 6 + tt.x * 3.1 + tt.y * 2.7) % 6), wx, wy, 4, 8, W4, 2, wy + TILE - 1);
  }
  if (D.shrine && !D.shrine.used) { pushDecal(16, 10, 0.5, D.shrine.x, D.shrine.y + 4, 6, 1); pushE(BK.shrine(Math.floor(t * 2.4) & 3), D.shrine.x, D.shrine.y, 11, 14, W4, 2, D.shrine.y + 4); }
  for (const e of D.enemies) {
    if (e.dead) continue;
    if (e.x < x0 - 90 || e.x > x1 + 90 || e.y < y0 - 150 || e.y > y1 + 90) continue;
    pushR(e.sprite(), e.x, e.y, 64, e.isBoss ? 112 : 100);
    if (e.isElite) {
      pushE(BK.elite(Math.floor(t * 4) & 1), e.x, e.y, 18, 6, W4, 0, e.y + 0.5);
      pushE(BK.crown(), e.x, e.y - (e.isBoss ? 118 : (MHEAD[e.kind] ?? 76)), 4, 4, W4, 0, TOPY - 3);
    }
  }
  for (const p of run.projs) {
    const a = Math.atan2(p.vy, p.vx), d = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
    pushE(p.kind === 'arrow' ? BK.projArrow(d) : BK.projFire(d), p.x, p.y, 10, 6, W4, p.kind === 'arrow' ? 0 : 2, TOPY - 5);
  }
  if (h.chill > 0) pushE(BK.chill(), h.x, h.y, 4, 2, W4, 2, TOPY - 4);
  pushR(run._heroSprite(h.hurtT > 0 && Math.floor(h.hurtT * 30) % 2 === 0), h.x, h.y, HOX, HOY);
  if (run.comboN >= 2 && run.comboT > 0) {
    const txt = '×' + run.comboN, w = textW(txt, 1);
    pushE(textRec(txt, [230, 199, 74, 255], 'cb', 1), h.x - w * 0.5, h.y - 58, 2, 2, W4, 0, TOPY - 6);
  }
}
function rimRun(cx, cy) { // جهت نور لبه: از مرکز دوربین به‌سوی مرکز جرمِ نورهای صفحه‌ای
  let dx = 0, dy = 0, s = 0;
  for (let i = 0; i < GR.nl; i++) { const o = i * 4, w = GR.L[o + 3]; dx += (GR.L[o] - cx) * w; dy += (GR.L[o + 1] - cy) * w; s += w; }
  const m = Math.hypot(dx, dy) || 1, k = s > 0.05 ? (Q.level ? 0.30 * Math.min(1, s) : 0.14) : 0;
  glRim(k ? dx / m : 0.7, k ? dy / m : -0.7, k);
}
function lightsRun(run, t) {
  const D = run.dungeon;
  pushPool(1, run.hero.x, run.hero.y - 4, 88, 0.36); // هاله‌ی قهرمان روی زمین
  addLight(run.hero.x, run.hero.y - 14, 92, 1.0, C_HERO, 16);
  for (const tt of D.torches) { pushPool(0, tt.x * TILE + 8, tt.y * TILE + 10, 46 + 4 * Math.round(Math.sin(t * 6.5 + tt.x) * 2 + 2), 0.56); } // حوضه‌ی مشعل
  for (const tt of D.torches) addLight(tt.x * TILE + 8, tt.y * TILE + 6, 56, 0.98 + 0.02 * Math.round((Math.sin(t * 6.5 + tt.x * 2.1 + tt.y) + 1) * 2.5), C_TORCH, 9);
  for (const d of D.drops) if (d.kind === 'essence') { addLight(d.x, d.y, 12, 0.55, C_ESS, 4); pushPool(4, d.x, d.y + 3, 16, 0.30); }
  addLight(D.stairs.x * TILE + 8, D.stairs.y * TILE + 8, 26, 0.7, C_STAIR, 6); pushPool(3, D.stairs.x * TILE + 8, D.stairs.y * TILE + 10, 30, 0.26);
  if (D.shrine && !D.shrine.used) { addLight(D.shrine.x, D.shrine.y - 4, 24, 0.5 + 0.08 * Math.round(Math.sin(t * 2.4) + 1), C_SHRINE, 7); pushPool(2, D.shrine.x, D.shrine.y + 4, 26, 0.26 + 0.05 * Math.round(Math.sin(t * 2.4) + 1)); }
}
// ---------- لایه‌های صفحه‌ای ----------
function fxLayer(g, w, h) {
  const fx = g.fx;
  if (!fx.parts.length && !fx.slashes.length && !fx.floats.length) { GR.fxn = 0; return; }
  if (!GR.fx || GR.fx.w !== w || GR.fx.h !== h) GR.fx = new Raster(w, h); else GR.fx.clear();
  fx.render(GR.fx, GCAM.cx - GCAM.W * 0.5, GCAM.cy - GCAM.H * 0.5);
  glUi(GR.fx, w, h); GR.fxn = 1;
}
function wxLayer(g, W, H) {
  if (!isRaining(g.dayT)) { GR.wxn = 0; return; }
  if (!GR.wx || GR.wx.w !== W || GR.wx.h !== H) GR.wx = new Raster(W, H);
  else GR.wx.clear();
  drawRain(GR.wx, g.time);
  drawPondRipples(GR.wx, g.time);
  if (lightningK(g.dayT, g.time) > 0) drawLightning(GR.wx, g.time);
  glWx(GR.wx, W, H);
  GR.wxn = 1;
}
export function glScene(scene, farm, run, W, H, scale, fade, vig) {
  const g = scene === 'farm' ? farm : run;
  scene_gl_farm = scene === 'farm';
  GCAM.W = W; GCAM.H = H; GCAM.scale = scale;
  GLR.uscale = scale;
  const sA = GCAM.S * GCAM.A, hh = H * 0.5, dyT = -hh / (sA - hh * GCAM.B), dyB = hh / (sA + hh * GCAM.B);
  const kzT = 1 / (1 - dyT * GCAM.B), kzB = 1 / (1 + dyB * GCAM.B);
  const hw = Math.max(W * 0.5 / (GCAM.A * kzT), W * 0.5 / (GCAM.A * kzB)) + 1;
  const [shx, shy] = g.fx.offset(g.time), lox = hw, hix = WORLD_W - hw, loy = -dyT, hiy = WORLD_H - dyB;
  const cx = hix <= lox ? WORLD_W * 0.5 : Math.max(lox, Math.min(hix, g.cam.x + W * 0.5 + shx));
  const cy = hiy <= loy ? (loy + hiy) * 0.5 : Math.max(loy, Math.min(hiy, g.cam.y + hh + shy));
  const x0 = Math.max(0, Math.round(cx - hw)), gw = Math.min(VW, 2 * Math.ceil(hw) + 2);
  const y0 = Math.max(0, Math.round(cy + dyT)), gh = Math.min(VH, 2 * Math.ceil((dyB - dyT) * 0.5) + 2);
  GCAM.cx = x0 + gw * 0.5; GCAM.cy = y0 - dyT; GCAM.x0 = x0; GCAM.y0 = y0; GCAM.gw = gw; GCAM.gh = gh;
  if (!GR.ras || GR.ras.w !== gw || GR.ras.h !== gh) GR.ras = new Raster(gw, gh);
  const ocx = g.cam.x, ocy = g.cam.y, osh = g.fx.shakeT;
  g.cam.x = x0; g.cam.y = y0; g.fx.shakeT = 0; GR.ras.flatOnly = true;
  g.render(GR.ras);
  GR.ras.flatOnly = false; g.cam.x = ocx; g.cam.y = ocy; g.fx.shakeT = osh;
  glGround(GR.ras, gw, gh);
  GR.nl = 0; const t = g.time, rain = scene === 'farm' && isRaining(g.dayT);
  GLT.relief = Q.level ? 1 : 0; // گام پرسپکتیو/برجستگی فقط سطح کیفیت بالا
  if (scene === 'farm') {
    cycle(g.dayT, rain); const sd = Math.hypot(shX, shY) || 1; // نور لبه از سمت خورشید (شب خفیف‌تر)
    glRim(-shX / sd, -shY / sd, Q.level ? 0.30 * (0.45 + 0.55 * (1 - nightFactor(g.dayT))) : 0.12);
    GLR.flash = rain ? lightningK(g.dayT, t) * 0.26 : 0;
    farmEnts(g, t, nightFactor(g.dayT), x0, y0, x0 + gw, y0 + gh);
  } else {
    glSun([0, 0, 1], [0, 0, 0], 0); GSTAT.sun = [0, 0, 1, 0]; // داخل: خبری از خورشید نیست
    glTintDungeon(); GLR.flash = 0;
    lightsRun(run, t); rimRun(cx, cy); // چراغ‌ها + جهت نور لبه
    runEnts(run, t, x0, y0, x0 + gw, y0 + gh);
  }
  GR.cam[0] = GCAM.cx; GR.cam[1] = GCAM.cy; GR.view[0] = W; GR.view[1] = H; GR.ax[0] = GCAM.A; GR.ax[1] = sA;
  GR.org[0] = x0; GR.org[1] = y0; GR.tsz[0] = gw; GR.tsz[1] = gh;
  GLT.dark = GR.dark;
  glLights(GR.L, GR.LC, GR.nl);
  glFrame(GR.cam, GR.ax, GCAM.B, GR.view, GR.tint, GR.org, GR.tsz, Q.level ? 16 : 32);
  flushD(); // سایه/تماس روی زمین (زیر همه‌ی اشیا)
  flushE();
  glFlushSprites();
  const fw = Math.max(2, Math.round(W / GCAM.A)), fh = Math.max(2, Math.round(H / sA));
  fxLayer(g, fw, fh);
  if (GR.fxn) glLayer(0, W, H, fw / GLT.cw, fh / GLT.ch);
  if (scene === 'farm') wxLayer(g, W, H);
  if (GR.wxn) glLayer(1, W, H, W / GLT.cw, H / GLT.ch);
  if (scene !== 'farm') uiDungeon(run, W, H, cx - W * 0.5, cy - hh);
  GSTAT.quads = GLR.quads; GSTAT.draws = GLR.draws; GSTAT.lights = GR.nl; GSTAT.decals = dnStat;
  glOverlay(fade, vig);
}
function uiDungeon(run, W, H, ox, oy) {
  const h = run.hero, sp = run._splash, k = sp ? run.time - sp.t0 : -1;
  let any = false;
  if (sp && k >= 0 && k < 2.2) { // اسپلش طبقه (لایه‌ی UI مسیر GPU)
    const al = Math.min(1, k / 0.25, (2.2 - k) / 0.45), txt = t('floor') + ' ' + faNum(sp.n) + (sp.boss ? ' — ' + t('bossFloor') : '');
    const sc = 2, w = textW(txt, sc), col = sp.boss ? [226, 120, 120, 255] : [255, 224, 130, 255];
    pushE(textRec(txt, col, sp.boss ? 'bs' : 'fl', sc), W * 0.5 - w * 0.5 - 2 * sc, 30 - 2 * sc, 0, 0, [1, 1, 1, al], 1, TOPY);
    any = true;
  }
  const mini = run._mini;
  if (mini) {
    const hsx = Math.round(h.x) - ox, hsy = Math.round(h.y) - oy, my = 3, mx = hsx < COLS + 30 && hsy < ROWS + 30 ? W - COLS - 8 : 3;
    pushE(minimapRec(run, mini, t('floor') + ' ' + faNum(run.floor), [230, 199, 74, 255]), mx, my, 0, 0, W4, 1, TOPY + 1);
    if (Math.floor(run.time * 4) % 2 === 0) pushE(BK.white(), mx + Math.floor(h.x / TILE), my + Math.floor(h.y / TILE), 0, 1, W4, 1, TOPY + 2);
    const b = run.dungeon.enemies.find((e) => e.isBoss && !e.dead);
    if (b) pushE(BK.white(), mx + Math.floor(b.x / TILE), my + Math.floor(b.y / TILE), 0, 0.5, FT, 1, TOPY + 3);
    any = true;
  }
  if (any) { flushE(); glFlushSprites(); }
}
