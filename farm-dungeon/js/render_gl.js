// render_gl.js — مسیر رندر HD-2D فاز ۱: دوربین diorama (شیب + پرسپکتیو ملایم)، زمین به‌صورت یک صفحه‌ی
// شیب‌دار از «فریم زمین»ی که همان مسیر CPU می‌سازد (render با flatOnly=true)، اشیای عمودی billboard با
// y-sort، افکت‌ها/آب‌وهوا به‌صورت لایه‌ی صفحه‌ای، نور و تینت و محو در شیدر. منطق/سیو/نقشه دست‌نخورده.
// اگر WebGL2 نباشد، main_app همان مسیر CPU را می‌راند (fallback کامل).
import { glFrame, glPush, glFlushSprites, glOverlay, glGround, glUi, glWx, glLayer, glLights, GLT, GLR } from './art/gl.js';
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
const MAXL = 24, TOPY = 1e7, VW = 512, VH = 384;
export const GSTAT = { quads: 0, draws: 0, lights: 0, ents: 0 };
export function glGroundRas() { return GR.ras; } // اشکال‌زدایی: فریم زمینِ همین فریم
const GR = {
  L: new Float32Array(MAXL * 4), nl: 0, ras: null, fx: null, wx: null,
  tint: new Float32Array([1, 1, 1, 0]), dark: new Float32Array([13 / 255, 11 / 255, 26 / 255]),
  cam: new Float32Array(2), view: new Float32Array(2), ax: new Float32Array(2), org: new Float32Array(2), tsz: new Float32Array(2),
};
const W4 = [1, 1, 1, 1], FT = [220 / 255, 80 / 255, 80 / 255], _p = [0, 0], ENT = [];
let en = 0, rkind = 0;
const RKEY = new WeakMap();

// نگاشت دنیا→صفحه (همان چیزی که شیدر می‌کند — برای نورها و برآورد فریم زمین)
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
function recOf(ras) {
  let k = RKEY.get(ras);
  if (!k) { k = 'r' + (++rkind); RKEY.set(ras, k); }
  return glAtlas(k, ras);
}
function flushE() {
  const list = ENT.slice(0, en);
  list.sort((a, b) => (a.y - b.y) || (a.i - b.i));
  for (let i = 0; i < list.length; i++) { const e = list[i]; glPush(e.rec, e.ax, e.ay, e.ox, e.oy, e.col, e.mode); }
  en = 0;
}
function addLight(x, y, rad, st) {
  if (GR.nl >= MAXL) return;
  glProj(x, y, _p);
  if (_p[0] < -rad || _p[1] < -rad || _p[0] > GCAM.W + rad || _p[1] > GCAM.H + rad) return;
  const o = GR.nl * 4;
  GR.L[o] = _p[0]; GR.L[o + 1] = _p[1]; GR.L[o + 2] = rad; GR.L[o + 3] = st;
  GR.nl++;
}
// تینت شب/باران مزرعه — همان فرمول applyNight، ولی روی GPU
export function glTintFarm(dayT, raining) {
  const n = nightFactor(dayT), a = n > 0.45 ? (n - 0.45) / 0.55 * 0.5 : 0;
  GR.tint[0] = (1 - a) * (raining ? 0.82 : 1);
  GR.tint[1] = (1 - a * 0.82) * (raining ? 0.86 : 1);
  GR.tint[2] = (1 - a * 0.55) * (raining ? 0.96 : 1);
  GR.tint[3] = 0;
}
// ---------- مزرعه: موجودات عمودی (billboard) ----------
function farmEnts(game, t, night, x0, y0, x1, y1) {
  const f = game.farm;
  const tx0 = Math.max(0, (x0 >> 4) - 1), tx1 = Math.min(COLS - 1, (x1 >> 4) + 1);
  const ty0 = Math.max(0, (y0 >> 4) - 2), ty1 = Math.min(ROWS - 1, (y1 >> 4) + 1);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const c = f.cell(tx, ty);
    if (!c) continue;
    if (c.kind === 'tree') {
      const v = c.variant & 1;
      pushE(BK.tree(v, Math.round(Math.sin(t * 0.85 + tx * 0.9 + v * 2.1))), tx * TILE, ty * TILE, 8, 18, W4, 0, ty * TILE + TILE);
    } else if (c.kind === 'sign') pushE(BK.sign(), tx * TILE, ty * TILE, 2, 4, W4, 0, ty * TILE + TILE);
    else if (c.kind === 'scarecrow') pushE(BK.scare(Math.floor(t * 1.4) & 1), tx * TILE, ty * TILE, 2, 4, W4, 0, ty * TILE + TILE);
  }
  if (game.toolLvls.sprinkler) pushE(BK.sprk(Math.floor(t * 1.2) & 3), 26 * TILE, 14 * TILE, 2, 2, W4, 0, 15 * TILE);
  if (game.toolLvls.basket) pushE(BK.crate(Math.floor(t * 2.5) & 1), 18 * TILE, 16 * TILE, 2, 4, W4, 0, 17 * TILE);
  const ph = night > 0.45 ? 1 : 0;
  pushE(BK.house(ph + 2 * (Math.floor(t * 1.6) % 3)), 15 * TILE, 16 * TILE, 4, 12, W4, 0, 18 * TILE);
  if (night > 0.45 && Q.level) pushE(BK.glow(Math.floor(t * 1.4) & 1), 15 * TILE, 16 * TILE, 4, 2, W4, 0, 18 * TILE + 1);
  pushR(game._heroSprite(), game.hero.x, game.hero.y, HOX, HOY);
  if (Q.level) for (const wk of game.workers) if (wk.task || Math.hypot(wk.x - game.hero.x, wk.y - game.hero.y) < 330) pushR(wk._frame(t), wk.x, wk.y, HOX, HOY);
  if (game.marker) pushE(BK.corner(Math.floor(game.marker.t * 2) & 1), game.marker.x * TILE, game.marker.y * TILE, 0, 0, W4, 0, TOPY - 2);
}
// ---------- دانجن: مشعل/محراب/هیولا/پرتابه ----------
function runEnts(run, t, x0, y0, x1, y1) {
  const D = run.dungeon, h = run.hero;
  for (const tt of D.torches) {
    const wx = tt.x * TILE, wy = tt.y * TILE;
    if (wx < x0 - 40 || wx > x1 + 40 || wy < y0 - 60 || wy > y1 + 40) continue;
    pushE(BK.torch(Math.floor(t * 6 + tt.x * 3.1 + tt.y * 2.7) % 6), wx, wy, 4, 8, W4, 0, wy + TILE - 1);
  }
  if (D.shrine && !D.shrine.used) pushE(BK.shrine(Math.floor(t * 2.4) & 3), D.shrine.x, D.shrine.y, 11, 14, W4, 0, D.shrine.y + 4);
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
    pushE(p.kind === 'arrow' ? BK.projArrow(d) : BK.projFire(d), p.x, p.y, 10, 6, W4, 0, TOPY - 5);
  }
  if (h.chill > 0) pushE(BK.chill(), h.x, h.y, 4, 2, W4, 0, TOPY - 4);
  pushR(run._heroSprite(h.hurtT > 0 && Math.floor(h.hurtT * 30) % 2 === 0), h.x, h.y, HOX, HOY);
  if (run.comboN >= 2 && run.comboT > 0) {
    const txt = '×' + run.comboN, w = textW(txt, 1);
    pushE(textRec(txt, [230, 199, 74, 255], 'cb', 1), h.x - w * 0.5, h.y - 58, 2, 2, W4, 0, TOPY - 6);
  }
}
function lightsRun(run, t) {
  const D = run.dungeon;
  addLight(run.hero.x, run.hero.y - 14, 78, 195);
  for (const tt of D.torches) addLight(tt.x * TILE + 8, tt.y * TILE + 6, 44, 157 + 3 * Math.round((Math.sin(t * 6.5 + tt.x * 2.1 + tt.y) + 1) * 2.5));
  for (const d of D.drops) if (d.kind === 'essence') addLight(d.x, d.y, 10, 100);
  addLight(D.stairs.x * TILE + 8, D.stairs.y * TILE + 8, 22, 135);
  if (D.shrine && !D.shrine.used) addLight(D.shrine.x, D.shrine.y, 20, 80 + 12 * Math.round(Math.sin(t * 2.4) + 1));
}
// ---------- لایه‌ی افکت‌ها: همان خروجی fx.render، یک کوآد صفحه‌ای (بدون نور، بالای همه) ----------
function fxLayer(g, w, h) {
  const fx = g.fx;
  if (!fx.parts.length && !fx.slashes.length && !fx.floats.length) { GR.fxn = 0; return; }
  if (!GR.fx || GR.fx.w !== w || GR.fx.h !== h) GR.fx = new Raster(w, h);
  else GR.fx.clear();
  fx.render(GR.fx, GCAM.cx - GCAM.W * 0.5, GCAM.cy - GCAM.H * 0.5);
  glUi(GR.fx, w, h);
  GR.fxn = 1;
}
// ---------- لایه‌ی آب‌وهوا: باران/موج حوضچه/رعد — صفحه‌ای ۱:۱ (روی زمینِ شیب‌دار خط نمی‌کشد) ----------
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
  GCAM.W = W; GCAM.H = H; GCAM.scale = scale;
  GLR.uscale = scale;
  const sA = GCAM.S * GCAM.A, hh = H * 0.5;
  const dyT = -hh / (sA - hh * GCAM.B), dyB = hh / (sA + hh * GCAM.B);
  const kzT = 1 / (1 - dyT * GCAM.B), kzB = 1 / (1 - dyB * GCAM.B);
  const hw = Math.max(W * 0.5 / (GCAM.A * kzT), W * 0.5 / (GCAM.A * kzB)) + 1;
  const [shx, shy] = g.fx.offset(g.time); // لرزش دوربین (در فریم زمین صفر می‌شود)
  const lox = hw, hix = WORLD_W - hw;
  const cx = hix <= lox ? WORLD_W * 0.5 : Math.max(lox, Math.min(hix, g.cam.x + W * 0.5 + shx));
  const loy = -dyT, hiy = WORLD_H - dyB;
  const cy = hiy <= loy ? (loy + hiy) * 0.5 : Math.max(loy, Math.min(hiy, g.cam.y + hh + shy));
  // فریم زمین: مبدأ صحیح (پیکسلی) تا تکسچر زمین و برجستگی‌ها دقیقاً هم‌تراز باشند
  const x0 = Math.max(0, Math.round(cx - hw)), gw = Math.min(VW, 2 * Math.ceil(hw) + 2);
  const y0 = Math.max(0, Math.round(cy + dyT)), gh = Math.min(VH, 2 * Math.ceil((dyB - dyT) * 0.5) + 2);
  GCAM.cx = x0 + gw * 0.5; GCAM.cy = y0 - dyT; GCAM.x0 = x0; GCAM.y0 = y0; GCAM.gw = gw; GCAM.gh = gh;
  if (!GR.ras || GR.ras.w !== gw || GR.ras.h !== gh) GR.ras = new Raster(gw, gh);
  const ocx = g.cam.x, ocy = g.cam.y, osh = g.fx.shakeT;
  g.cam.x = x0; g.cam.y = y0; g.fx.shakeT = 0; GR.ras.flatOnly = true;
  g.render(GR.ras); // فریم زمین: زمین + دکور سطحی + قطره‌ها (بدون اشیای عمودی/تاریکی/افکت‌ها)
  GR.ras.flatOnly = false;
  g.cam.x = ocx; g.cam.y = ocy; g.fx.shakeT = osh;
  glGround(GR.ras, gw, gh);
  GR.nl = 0;
  const t = g.time, rain = scene === 'farm' && isRaining(g.dayT);
  if (scene === 'farm') {
    glTintFarm(g.dayT, rain);
    GLR.flash = rain ? lightningK(g.dayT, t) * 0.26 : 0;
    farmEnts(g, t, nightFactor(g.dayT), x0, y0, x0 + gw, y0 + gh);
  } else {
    GR.tint[0] = 1; GR.tint[1] = 1; GR.tint[2] = 1; GR.tint[3] = 118;
    GLR.flash = 0;
    lightsRun(run, t);
    runEnts(run, t, x0, y0, x0 + gw, y0 + gh);
  }
  GR.cam[0] = GCAM.cx; GR.cam[1] = GCAM.cy; GR.view[0] = W; GR.view[1] = H;
  GR.ax[0] = GCAM.A; GR.ax[1] = sA; GR.org[0] = x0; GR.org[1] = y0; GR.tsz[0] = gw; GR.tsz[1] = gh;
  GLT.dark = GR.dark;
  glLights(GR.L, GR.nl);
  glFrame(GR.cam, GR.ax, GCAM.B, GR.view, GR.tint, GR.org, GR.tsz, Q.level ? 16 : 32);
  flushE();
  glFlushSprites();
  const fw = Math.max(2, Math.round(W / GCAM.A)), fh = Math.max(2, Math.round(H / sA));
  fxLayer(g, fw, fh); // افکت‌ها با مقیاس معکوس → در صفحه دقیقاً منطبق
  if (GR.fxn) glLayer(0, W, H, fw / GLT.cw, fh / GLT.ch);
  if (scene === 'farm') wxLayer(g, W, H);
  if (GR.wxn) glLayer(1, W, H, W / GLT.cw, H / GLT.ch);
  if (scene !== 'farm') uiDungeon(run, W, H, cx - W * 0.5, cy - hh);
  GSTAT.quads = GLR.quads; GSTAT.draws = GLR.draws; GSTAT.lights = GR.nl;
  glOverlay(fade, vig);
}
// متن طبقه + مینی‌مپ (بالای تاریکی، بدون نور)
function uiDungeon(run, W, H, ox, oy) {
  const h = run.hero, sp = run._splash, k = sp ? run.time - sp.t0 : -1;
  let any = false;
  if (sp && k >= 0 && k < 2.2) {
    const al = Math.min(1, k / 0.25, (2.2 - k) / 0.45);
    const txt = t('floor') + ' ' + faNum(sp.n) + (sp.boss ? ' — ' + t('bossFloor') : '');
    const sc = 2, w = textW(txt, sc), col = sp.boss ? [226, 120, 120, 255] : [255, 224, 130, 255];
    pushE(textRec(txt, col, sp.boss ? 'bs' : 'fl', sc), W * 0.5 - w * 0.5 - 2 * sc, 30 - 2 * sc, 0, 0, [1, 1, 1, al], 1, TOPY);
    any = true;
  }
  const mini = run._mini;
  if (mini) {
    const hsx = Math.round(h.x) - ox, hsy = Math.round(h.y) - oy, my = 3;
    const mx = (hsx < COLS + 30 && hsy < ROWS + 30) ? W - COLS - 8 : 3;
    pushE(minimapRec(run, mini, t('floor') + ' ' + faNum(run.floor), [230, 199, 74, 255]), mx, my, 0, 0, W4, 1, TOPY + 1);
    if (Math.floor(run.time * 4) % 2 === 0) pushE(BK.white(), mx + Math.floor(h.x / TILE), my + Math.floor(h.y / TILE), 0, 1, W4, 1, TOPY + 2);
    const b = run.dungeon.enemies.find((e) => e.isBoss && !e.dead);
    if (b) pushE(BK.white(), mx + Math.floor(b.x / TILE), my + Math.floor(b.y / TILE), 0, 0.5, FT, 1, TOPY + 3);
    any = true;
  }
  if (any) { flushE(); glFlushSprites(); }
}
