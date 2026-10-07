// main_app.js — بوت و حلقه‌ی بازی نهایی: مزرعه ⇄ دانجن در یک صفحه
// (تعویض صحنه/پایان دور در main_scene.js — ن۳۴؛ چسب DOM رابط در app_ui.js؛ مسیریابی فرمان در farm_command.js)
import { t, faNum, getLang } from './i18n.js';
import { Input } from './input.js';
import { Game } from './game.js';
import { App } from './app.js';
import { ITEMS } from './items.js';
import { TILE } from './tiles.js';
import { loadSave, writeSave } from './save.js';
import { Raster } from './raster.js';
import { vignette } from './fx.js';
import { Q } from './art/quality.js';
import { $, toast, showBanner } from './ui.js';
import { playSfx, setAmbient, setRain, unlockAudio } from './sfx/sounds.js';
import { isRaining } from './art/weather.js';
import { questLabel } from './quests.js';
import { initAppUI } from './app_ui.js';
import { initScenes } from './main_scene.js';
import { GLR, glInit, glResize, glReadback, GLT } from './art/gl.js';
import { glScene, glInv, glProj, GCAM, GSTAT, glGroundRas } from './render_gl.js';
import { glBakeCount, glAtlas } from './art/glbake.js';

const canvas = document.getElementById('game');
// ---------- فاز ۱ HD-2D: مسیر GPU ----------
// یک بوم فقط یک نوع context می‌گیرد → #game همیشه 2D می‌ماند (مسیر CPU = fallback کامل، حتی اگر
// وسط بازی کانتکست WebGL2 بیفتد) و WebGL2 روی بومِ شفافِ دوم (#glLayer) بالای آن رندر می‌شود.
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
let glCv = null, GLon = false;
function bootGL() {
  const c = document.createElement('canvas');
  c.id = 'glLayer';
  c.style.cssText = 'position:fixed;inset:0;display:block;image-rendering:pixelated;touch-action:none;pointer-events:none;z-index:2';
  document.body.appendChild(c);
  if (!glInit(c)) { c.remove(); return false; }
  glCv = c;
  return true;
}
if (!/[?&]cpu/.test(location.search)) GLon = bootGL();
window.__glOK = GLon;
function glShow(v) { if (glCv) glCv.style.display = v ? 'block' : 'none'; } // افت کانتکست → مخفی کن
const _dbg = document.createElement('div');
_dbg.id = 'gldbg';
_dbg.style.cssText = 'position:fixed;top:6px;inset-inline-start:6px;z-index:70;font:11px ui-monospace,monospace;color:#aef;background:#000a;padding:4px 7px;border-radius:6px;white-space:pre;display:none;pointer-events:none;direction:ltr';
document.body.appendChild(_dbg);
addEventListener('keydown', (e) => { if (e.code === 'KeyG') _dbg.style.display = _dbg.style.display === 'none' ? 'block' : 'none'; });
if (/[?&]gldbg/.test(location.search)) _dbg.style.display = 'block';

// ---------- اپ + صحنه‌ها ----------
const app = new App(loadSave());
const farmScene = new Game(app.s, app.s.upgrades.land, app.s.upgrades, app.s.upgrades.boots);
app.hydrateFarm(farmScene);
window.__app = app; window.__farm = farmScene; // برای تست
let scale = 3, sc = null, offImg = null, _dockH = 0; // ارتفاع داک (ن۴۰) — برای پایش تغییر صحنه
const CAM = { scale: 3, camX: 0, camY: 0 }; // بازمصرف — بدون آبجکت جدید در هر فریم
let _emaMs = 8, _qFrames = 0, _glBad = 0; // پایش هزینه‌ی فریم برای کیفیت تطبیقی
const off = document.createElement('canvas');
const offCtx = off.getContext('2d');

// ---------- ذخیره‌ی خودکار ----------
function saveNow() {
  app.s.stats.playT = Math.round(farmScene.time); // شمار روز سیب‌دارها پیوسته می‌ماند (ن۳۴)
  app.s.farm = app.serializeFarm();
  app.s.lang = getLang();
  writeSave(app.s);
}
let UI = null;
const S = initScenes({ app, farmScene, saveNow, getView: () => ({ w: sc.w, h: sc.h }), getUI: () => UI });

function resize() {
  const dpr = window.devicePixelRatio || 1;
  if (innerWidth < 2 || innerHeight < 2) return; // ن۴۰: iframe با اندازه‌ی صفر (پیش‌نمایش سندباکس) — بعداً که سایز گرفت پایش دوره‌ای می‌گیردش
  canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr);
  canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px';
  const zoomCss = Math.max(2, Math.floor(Math.min(innerWidth, innerHeight) / 150));
  scale = Math.max(2, Math.round(zoomCss * dpr));
  // ن۴۰: ارتفاع داک از نما کسر می‌شود — زمین مزرعه/راهروی دانجن دیگر زیر داک پنهان نمی‌شود
  const dockEl = document.querySelector('body.inDungeon #dockDungeon') || document.getElementById('dockFarm');
  _dockH = dockEl ? Math.round(dockEl.offsetHeight) : 0;
  const vw = Math.ceil(canvas.width / scale), vh = Math.ceil(Math.max(64, canvas.height - _dockH * dpr) / scale);
  farmScene.view = { w: vw, h: vh };
  const r = S.getRun(); if (r) r.view = { w: vw, h: vh };
  offImg = offCtx.createImageData(vw, vh);
  sc = new Raster(vw, vh, offImg.data); // صفر-کپی: رندر مستقیم داخل ImageData
  off.width = vw; off.height = vh;
  ctx.imageSmoothingEnabled = false;
  if (glCv) { // بوم GPU هم‌اندازه‌ی #game
    glCv.width = canvas.width; glCv.height = canvas.height;
    glCv.style.width = innerWidth + 'px'; glCv.style.height = innerHeight + 'px';
    glResize(glCv.width, glCv.height);
  }
}
addEventListener('resize', resize);
resize();

// ---------- صدا: بیدار شدن با اولین لمس (سیاست autoplay موبایل) ----------
addEventListener('pointerdown', unlockAudio, { once: true });
addEventListener('keydown', unlockAudio, { once: true });

// ---------- ورودی ----------
const input = new Input(canvas, () => { const r = S.getRun(); const h = S.getScene() === 'farm' || !r ? farmScene.hero : r.hero; return { x: h.x, y: h.y }; });
input.onTapHero = null;
input.onTapGround = (x, y) => {
  if (S.getScene() === 'farm') farmScene.command(x, y);
  else { const r = S.getRun(); if (r && !r.hero.dead) r.moveTo(x, y); } // A* در دانجن
};
// رنگ‌آمیزی با کشیدن انگشت داخل زمین کشت
input.paintZone = (x, y) => S.getScene() === 'farm' && (farmScene.farm.insideFence(Math.floor(x / TILE), Math.floor(y / TILE)) || farmScene.farm.inFarm2(Math.floor(x / TILE), Math.floor(y / TILE)));
input.onDragTile = (tx, ty) => { if (S.getScene() === 'farm') farmScene.command(tx * TILE + 8, ty * TILE + 8); };
addEventListener('keydown', (e) => {
  if (S.getScene() === 'dungeon') {
    const r = S.getRun();
    if (!r) return;
    if (e.code === 'KeyJ') r.trySkill();
    if (e.code === 'KeyK') $('dash').dispatchEvent(new Event('click'));
  }
});

// ---------- رابط کاربری (app_ui.js): محراب/منو/بذرها/HUD/خوش‌آمد ----------
UI = initAppUI({ app, farmScene, saveNow, getRun: S.getRun, getScene: S.getScene, input });

farmScene.onSfx = (n) => playSfx(n);
farmScene.onGate = () => S.enterDungeon();
farmScene.onHouse = () => { $('menuBtn').click(); }; // خانه = میز کار: منوی مأموریت‌ها/ارتقاها
farmScene.onEvent = (k, n) => { // مأموریت‌ها: برداشت/فروش/طلایی
  const done = app.track(k, n);
  for (const q of done) { toast(t('questDone') + ' — ' + questLabel(q)); UI.buildMenuIfOpen(); UI.refreshHud(true); }
  if (done.length) playSfx('quest');
};

// ---------- حلقه ----------
let last = performance.now(), fps = 0, fpsT = 0, fpsN = 0, _szChk = 0, _glTry = 0;
let _ambScene = '', _ambRain = false; // آمبینت جاری
function loop(now) {
  const tA = performance.now(); // هزینه‌ی کار این فریم (بدون انتظار rAF)
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  const m = input.getMove();
  const scene = S.getScene(), run = S.getRun();
  let steer = null;
  if (scene === 'farm') {
    if (m.x || m.y) steer = m;
    farmScene.update(dt, steer);
    if (farmScene.log.length) for (const e of farmScene.log.splice(0)) {
      const snd = { sold: 'coin', appleGot: 'apple', golden: 'golden', farm2Done: 'upgrade' }[e.k];
      if (snd) playSfx(snd);
      if (e.k === 'farm2Need') toast(t('farm2Need').replace('{n}', faNum(e.n)));
      else toast(t(e.k) + (e.n != null ? ' +' + faNum(e.n) : '')); // توست‌های مزرعه (فروش/سکه/راه/طلایی)
      if (e.k === 'farm2Done') { UI.syncSeedButtons(); UI.refreshHud(true); UI.buildMenuIfOpen(); }
    }
  } else if (run) {
    if (m.x || m.y) steer = m; // کیبورد/درگ مستقیم — مسیر و هدف را در Run پاک می‌کند
    if (!UI.isShrineOpen()) run.update(dt, steer); // انتخاب برکت: دنیا می‌ایستد (مثل منو) — مسیر A*/فرمان داخل Run
    app.helperTick(dt); // دستیارها وقتی در دانجنی کار می‌کنند
    if (run.log.length) for (const e of run.log.splice(0)) {
      const snd = { bossIntro: 'boss', bossDown: 'boss', gotItem: 'chest', died: 'gate' }[e.k];
      if (snd) playSfx(snd);
      if (e.k === 'floor') toast(t('floor') + ' ' + faNum(e.n) + (e.boss ? ' — ' + t('bossFloor') + '!' : ''));
      else if (e.k === 'bossIntro') showBanner();
      else if (e.k === 'bossDown') { toast(t('bossDown')); showBanner(t('bossDown'), true); }
      else if (e.k === 'chest') toast(t('chest'));
      else if (e.k === 'gotItem') toast(t('gotItem') + ' ' + ((ITEMS[e.id] || {}).name ? ITEMS[e.id].name[getLang()] : e.id));
      else if (e.k === 'died') {
        app.s.stats.deaths++;
        S.bankRun(); // پایان دور: گوهر/آمار/مأموریت همین‌جا واریز می‌شود (ن۳۴)
        $('deadInfo').textContent = t('deadInfo').replace('{f}', faNum(e.floor)).replace('{k}', faNum(e.kills)).replace('{l}', faNum(e.lost));
        $('dead').classList.add('show');
      }
    }
  }
  CAM.scale = scale; // پیکسل دستگاه به‌ازای هر پیکسل نما (هر دو مسیر) — ورودی از این تقسیم می‌کند
  CAM.inv = GLon ? glInv : null; // مسیر GPU: معکوس دقیق دوربین پرسپکتیو (ورودی لمسی/درگ)
  if (GLon) { // مبدأ معادلِ پای قهرمان در فضای نما (پشتوانه‌ی خطی، اگر inv نبود)
    CAM.camX = Math.round(GCAM.cx - 0.5 * sc.w / GCAM.A);
    CAM.camY = Math.round(GCAM.cy - 0.5 * sc.h / (GCAM.S * GCAM.A));
  } else {
    CAM.camX = Math.round(scene === 'farm' ? farmScene.cam.x : run.cam.x);
    CAM.camY = Math.round(scene === 'farm' ? farmScene.cam.y : run.cam.y);
  }
  canvas._cam = CAM; // ورودی همیشه روی #game (بوم GL شفاف و pointer-events:none است)
  if (scene === 'dungeon' && run && run.dungeon.shrine) { // محراب: نزدیک = باز، دور = بسته
    const sh = run.dungeon.shrine;
    const dsh = Math.hypot(run.hero.x - sh.x, run.hero.y - sh.y);
    if (!sh.used && !UI.isShrineOpen() && dsh < 16 && !run.hero.dead) UI.openShrine(run);
    else if (UI.isShrineOpen() && (dsh > 30 || run.hero.dead)) UI.closeShrine();
  }
  if (farmScene.equipSig !== app._eqSig) UI.syncEquip(); // فقط بعد از تعویض تجهیز
  const spd = (1 + 0.06 * app.s.upgrades.boots) * (1 + app._eqStats.speed);
  if (scene === 'farm' && farmScene.speedMul !== spd) farmScene.speedMul = spd;
  if (scene === 'farm' && farmScene.fertMul !== 1 + 0.08 * app.s.upgrades.fert) farmScene.fertMul = 1 + 0.08 * app.s.upgrades.fert;
  // آمبینت پیوسته: پد مزرعه/دانجن + لایه‌ی باران — فقط وقتی عوض شود
  {
    const wantScene = scene === 'farm' ? 'farm' : 'dungeon';
    if (wantScene !== _ambScene) { _ambScene = wantScene; setAmbient(wantScene); }
    const raining = scene === 'farm' && isRaining(farmScene.dayT);
    if (raining !== _ambRain) { _ambRain = raining; setRain(raining); }
  }
  if (GLon !== GLR.ok) { // افت کانتکست WebGL2 (موبایل) → CPU؛ بازگشت → دوباره GPU
    GLon = GLR.ok; glShow(GLon); window.__glOK = GLon;
    if (GLon) resize();
  }
  // تلاش دوره‌ای برای احیا: بعضی مرورگرها رخداد webglcontextrestored را نمی‌دهند (headless/SwiftShader)
  if (!GLon && glCv && _emaMs >= 0 && now - _glTry > 2000) {
    _glTry = now;
    if (glInit(glCv)) { GLon = true; glShow(true); window.__glOK = true; resize(); }
  }
  const g0 = scene === 'farm' ? farmScene : run;
  if (GLon) { // مسیر GPU: زمین شیب‌دار + billboard + نور/تینت/محو در شیدر
    try {
      glScene(scene === 'farm' ? 'farm' : 'dungeon', farmScene, run, sc.w, sc.h, scale, S.getFade(), Q.level && scene !== 'farm' ? 1.35 : 0);
    } catch (e) { // نگهبان حلقه (ن۵۳): خطای یک فریم نباید بازی را قفل کند — افت به CPU
      if (!_glBad) { _glBad = 1; console.error('glScene:', e && e.message); }
      GLR.ok = false;
    }
    S.applyFade(sc, dt); // فقط پیشبرد وضعیت گذار مشکی (تصویر GPU جداست)
    if (window.__glCap) { window.__glCap = 0; window.__glShot = shotURL(); }
  } else {
    g0.render(sc);
    if (Q.level && scene === 'dungeon') vignette(sc.w, sc.h).apply(sc); // وینیت فقط دانجن — مزرعه روشن و تمیز (ن۳۶: سیاهیِ گوشه‌ها حذف شد)
    S.applyFade(sc, dt);
    offCtx.putImageData(offImg, 0, 0); // sc.d همان offImg.data است — بدون کپی ۶۰۰KB!
    ctx.drawImage(off, 0, 0, sc.w, sc.h, 0, 0, sc.w * scale, sc.h * scale);
    if (sc.h * scale < canvas.height) { // ن۴۰: باندِ زیر داک (نما کوتاه‌تر از بوم) — پاک تا فریم کهنه نماند
      ctx.fillStyle = '#141124';
      ctx.fillRect(0, sc.h * scale, canvas.width, canvas.height - sc.h * scale);
    }
  }
  UI.refreshHud(false);
  if (_dbg.style.display !== 'none') {
    _dbg.textContent = (GLon ? 'GL2 ' + GSTAT.quads + 'q ' + GSTAT.draws + 'd ' + GSTAT.lights + 'L' : 'CPU') +
      '\nf ' + _emaMs.toFixed(1) + 'ms ' + (scene === 'farm' ? 'farm' : 'dun ' + run.floor) +
      '\ncam ' + GCAM.cx.toFixed(1) + ',' + GCAM.cy.toFixed(1) + ' A' + GCAM.A + ' S' + GCAM.S + ' B' + GCAM.B +
      '\nbakes ' + glBakeCount() + ' atlas ' + GLT.cw + 'x' + GLT.ch;
  }
  fpsN++; fpsT += dt;
  if (fpsT >= 0.5) { fps = Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0; $('fps').textContent = `${faNum(fps)} ${t('fps')}`; }
  // ---- کیفیت تطبیقی: اگر کارِ فریم به‌طور پیوسته گران بود، افکت‌های غیرضروری خاموش شوند ----
  _emaMs = _emaMs * 0.93 + (performance.now() - tA) * 0.07;
  if (Q.level === 1 && ++_qFrames > 120 && _emaMs > 13) {
    Q.level = 0; // حداقل: بدون برگ/ابر، باران و غبار نصف — گیم‌پلی و نور دست‌نخورده
    _qFrames = 0;
  }
  // ن۴۰: پایش اندازه هر ~۰٫۵ث — iframeِ دیر-سایزگیر/بدون event-resize و تغییر ارتفاع داک بین صحنه‌ها
  if ((++_szChk & 31) === 0) {
    const dpr = window.devicePixelRatio || 1;
    const dockEl = document.querySelector('body.inDungeon #dockDungeon') || document.getElementById('dockFarm');
    const dh = dockEl ? Math.round(dockEl.offsetHeight) : 0;
    if (Math.round(innerWidth * dpr) !== canvas.width || Math.round(innerHeight * dpr) !== canvas.height || dh !== _dockH) resize();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------- قلاب‌های تست (Playwright): عکس مسیر GPU داخل تسک رسم ----------
function shotURL() {
  const rb = glReadback();
  const c = document.createElement('canvas');
  c.width = rb.w; c.height = rb.h;
  const c2 = c.getContext('2d');
  const im = c2.createImageData(rb.w, rb.h);
  im.data.set(rb.d);
  c2.putImageData(im, 0, 0);
  return c.toDataURL('image/png');
}
window.__cmd = (x, y) => farmScene.command(x * TILE + 8, y * TILE + 8); window.__glRas = glGroundRas;
window.__glStat = () => ({ quads: GSTAT.quads, draws: GSTAT.draws, lights: GSTAT.lights, decals: GSTAT.decals, sun: GSTAT.sun.map((v) => +v.toFixed(2)) }); window.__glInv = glInv; window.__glProj = glProj; window.__glInit = glInit; window.__GLR = GLR; window.__glScene = glScene; window.__glCam = GCAM; window.__glAtlas = glAtlas;
window.__glBakes = glBakeCount; window.__glCapture = () => { window.__glCap = 1; return true; };
window.__glPng = () => window.__glShot || '';
window.__glRest = () => ({ restores: GLR.restores, ok2: GLR.ok2, ok: GLR.ok, progs: !!GLR.progs, h: typeof (glCv && glCv.onwebglcontextrestored) });
window.__glProbe = () => { // مقادیر واقعی یونیفرم‌های برنامه‌ی زمین (اشکال‌زدایی)
  const gl = GLR.gl; if (!gl || !GLR.progs) return null;
  const pr = GLR.progs.g, g2 = (n) => { const v = gl.getUniform(pr.p, gl.getUniformLocation(pr.p, n)); return v && v.length ? Array.from(v) : v; };
  return { ax: g2('u_ax'), cam: g2('u_cam'), org: g2('u_org'), tsz: g2('u_tsize'), view: g2('u_view'), vp: g2('u_vp'), scale: g2('u_scale'), persp: g2('u_persp'), uscale: GLR.uscale };
};
window.__glDiag = () => ({ ok: GLon, gl2: !!(GLR.gl && GLR.ok), glErr: GLR.gl ? GLR.gl.getError() : -1, ok2: GLR.ok, quads: GSTAT.quads, draws: GSTAT.draws, lights: GSTAT.lights, bakes: glBakeCount(), cam: [GCAM.cx, GCAM.cy, GCAM.A, GCAM.S, GCAM.B], view: [sc && sc.w, sc && sc.h], scale, ms: _emaMs });

// ---------- ذخیره‌ی دوره‌ای ----------
setInterval(saveNow, 3000);
addEventListener('beforeunload', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
