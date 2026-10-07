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

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ---------- اپ + صحنه‌ها ----------
const app = new App(loadSave());
const farmScene = new Game(app.s, app.s.upgrades.land, app.s.upgrades, app.s.upgrades.boots);
app.hydrateFarm(farmScene);
window.__app = app; window.__farm = farmScene; // برای تست
let scale = 3, sc = null, offImg = null, _dockH = 0; // ارتفاع داک (ن۴۰) — برای پایش تغییر صحنه
const CAM = { scale: 3, camX: 0, camY: 0 }; // بازمصرف — بدون آبجکت جدید در هر فریم
let _emaMs = 8, _qFrames = 0; // پایش هزینه‌ی فریم برای کیفیت تطبیقی
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
let last = performance.now(), fps = 0, fpsT = 0, fpsN = 0, _szChk = 0;
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
  CAM.scale = scale; CAM.camX = Math.round(scene === 'farm' ? farmScene.cam.x : run.cam.x); CAM.camY = Math.round(scene === 'farm' ? farmScene.cam.y : run.cam.y);
  canvas._cam = CAM;
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
  (scene === 'farm' ? farmScene : run).render(sc);
  if (Q.level && scene === 'dungeon') vignette(sc.w, sc.h).apply(sc); // وینیت فقط دانجن — مزرعه روشن و تمیز (ن۳۶: سیاهیِ گوشه‌ها حذف شد)
  S.applyFade(sc, dt);
  offCtx.putImageData(offImg, 0, 0); // sc.d همان offImg.data است — بدون کپی ۶۰۰KB!
  ctx.drawImage(off, 0, 0, sc.w, sc.h, 0, 0, sc.w * scale, sc.h * scale);
  if (sc.h * scale < canvas.height) { // ن۴۰: باندِ زیر داک (نما کوتاه‌تر از بوم) — پاک تا فریم کهنه نماند
    ctx.fillStyle = '#141124';
    ctx.fillRect(0, sc.h * scale, canvas.width, canvas.height - sc.h * scale);
  }
  UI.refreshHud(false);
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

// ---------- ذخیره‌ی دوره‌ای ----------
setInterval(saveNow, 3000);
addEventListener('beforeunload', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
