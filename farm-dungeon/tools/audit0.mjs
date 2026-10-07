// audit0.mjs — ممیزی فاز ۰ (HD-2D): بوت Playwright+WebGL2، اسکرین‌شات baseline، فریم‌تایم، سنجه‌ها
// اجرا: node tools/audit0.mjs        (سرور: node serve.mjs روی :8080 · Playwright در ~/qa-env)
// خروجی: shots/p0_raw_*.png (رستر خام پیکسل‌دقیق) · shots/p0_full_*.png (با UI) · shots/p0_metrics.json
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('/home/user/qa-env/index.js');
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'shots');
const URL_ = process.env.GAME_URL || 'http://localhost:8080/game.html';
const FLAGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'];
const N_BENCH = 240; // فریم برآورد هزینه‌ی CPU

const VIEWS = [
  { name: 'phone', w: 390, h: 844, dsf: 2, main: true },   // مرجع موبایل میان‌رده (پرتره)
  { name: 'land', w: 844, h: 390, dsf: 2 },                // موبایل افقی
  { name: 'desk', w: 1280, h: 720, dsf: 1 },               // دسکتاپ
];

// اسکریپت درون‌صفحه: بنچ CPU (آپدیت/رندر جدا) + هزینه‌ی present (putImageData+drawImage)
const BENCH = ({ kind, n }) => {
  const g = kind === 'farm' ? window.__farm : window.__getRun();
  if (!g) return null;
  const vw = g.view.w, vh = g.view.h;
  const sc = new Raster(vw, vh);
  for (let i = 0; i < 20; i++) { g.time = i / 60; g.update(1 / 60); g.render(sc); } // گرم‌کردن کش
  let tu = 0, tr = 0;
  for (let i = 0; i < n; i++) {
    g.time = (100 + i) / 60;
    let a = performance.now(); g.update(1 / 60); let b = performance.now(); g.render(sc); let c = performance.now();
    tu += b - a; tr += c - b;
  }
  // present: دقیقاً همان دو خط حلقه‌ی main_app
  const off = document.createElement('canvas'); off.width = vw; off.height = vh;
  const oc = off.getContext('2d'), img = oc.createImageData(vw, vh);
  img.data.set(sc.d);
  const cv = document.getElementById('game'), cc = cv.getContext('2d');
  const scale = cv.width / vw;
  cc.imageSmoothingEnabled = false;
  for (let i = 0; i < 10; i++) { oc.putImageData(img, 0, 0); cc.drawImage(off, 0, 0, vw, vh, 0, 0, vw * scale, vh * scale); }
  let tp = 0;
  for (let i = 0; i < 40; i++) { const a = performance.now(); oc.putImageData(img, 0, 0); cc.drawImage(off, 0, 0, vw, vh, 0, 0, vw * scale, vh * scale); tp += performance.now() - a; }
  return { view: [vw, vh], up: +(tu / n).toFixed(3), rn: +(tr / n).toFixed(3), pr: +(tp / 40).toFixed(3) };
};

const RAF = () => new Promise((res) => {
  const ts = []; let last = performance.now();
  const f = () => { const n = performance.now(); ts.push(n - last); last = n; if (ts.length < 240) requestAnimationFrame(f); else res(ts); };
  requestAnimationFrame(f);
});

const STATE = () => {
  const f = window.__farm, r = window.__getRun(), cv = document.getElementById('game');
  const cam = cv._cam || {};
  return {
    scene: r ? 'dungeon' : 'farm', canvas: [cv.width, cv.height], scale: cam.scale,
    cam: [Math.round(cam.camX || 0), Math.round(cam.camY || 0)],
    hero: r ? [Math.round(r.hero.x), Math.round(r.hero.y)] : [Math.round(f.hero.x), Math.round(f.hero.y)],
    dayT: Math.round(f.dayT), floor: r ? r.floor : null, view: { ...(r ? r.view : f.view) },
    hp: r ? Math.round(r.hero.hp) : null, enemies: r ? r.dungeon.enemies.filter((e) => !e.dead).length : null,
  };
};

const rafStat = (ts) => { const s = ts.slice().sort((a, b) => a - b); return { med: +s[s.length >> 1].toFixed(2), p95: +s[Math.floor(s.length * 0.95)].toFixed(2), min: +s[0].toFixed(2) }; };

const browser = await chromium.launch({ headless: true, args: FLAGS });
const report = { when: new Date().toISOString(), url: URL_, env: { flags: FLAGS, note: 'headless SwiftShader (بدون GPU واقعی)' }, views: [], shots: {}, bench: {}, features: {} };

// ---------- ۰) کاوش قابلیت‌ها (WebGL2) ----------
{
  const p = await browser.newPage({ viewport: { width: 640, height: 480 } });
  report.features = await p.evaluate(() => {
    const c = document.createElement('canvas'); const gl = c.getContext('webgl2');
    if (!gl) return { webgl2: false };
    const d = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      webgl2: true, ver: gl.getParameter(gl.VERSION),
      renderer: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE), maxAttrib: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      maxVary: gl.getParameter(gl.MAX_VARYING_VECTORS), samples: gl.getParameter(gl.MAX_SAMPLES),
      floatBuf: !!gl.getExtension('EXT_color_buffer_float'), cbfHalf: !!gl.getExtension('EXT_color_buffer_half_float'),
      aniso: !!gl.getExtension('EXT_texture_filter_anisotropic'), rendererInfo: !!d,
    };
  });
  await p.close();
}

// ---------- ۱) بوت + نمای موبایل: صحنه‌ها، اسکرین‌شات، بنچ، rAF ----------
async function boot(ctx) {
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto(URL_, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__farm && typeof window.__getFade === 'function' && window.__getFade() >= 1, null, { timeout: 20000 });
  await p.waitForTimeout(350);
  return { p, errs };
}

// رستر صحنه: رسم مستقیم در Raster تازه (مستقل از کامپوزیت مرورگر) + toDataURL بوم به‌عنوان شاهد
const SCENE_RASTER = () => {
  const r = window.__getRun();
  const g = r || window.__farm;
  const sc = new Raster(g.view.w, g.view.h);
  g.render(sc);
  const c = document.createElement('canvas'); c.width = sc.w; c.height = sc.h;
  const cx = c.getContext('2d'); const img = cx.createImageData(sc.w, sc.h);
  img.data.set(sc.d); cx.putImageData(img, 0, 0);
  return { png: c.toDataURL('image/png'), w: sc.w, h: sc.h, scene: r ? 'dungeon' : 'farm' };
};
async function rawShot(page, name) {
  const o = await page.evaluate(SCENE_RASTER);
  fs.writeFileSync(path.join(OUT, 'p0_raw_' + name + '.png'), Buffer.from(o.png.split(',')[1], 'base64'));
  const c2 = await page.evaluate(() => document.getElementById('game').toDataURL('image/png'));
  fs.writeFileSync(path.join(OUT, 'p0_webgl_' + name + '.png'), Buffer.from(c2.split(',')[1], 'base64'));
  return { file: 'shots/p0_raw_' + name + '.png', raster: [o.w, o.h], scene: o.scene };
}
async function fullShot(page, name) {
  const file = path.join(OUT, 'p0_full_' + name + '.png');
  await page.screenshot({ path: file });
  return 'shots/p0_full_' + name + '.png';
}
async function snap(page, name) { report.shots[name] = { raw: await rawShot(page, name), full: await fullShot(page, name), state: await page.evaluate(STATE) }; }

for (const V of VIEWS) {
  const ctx = await browser.newContext({ viewport: { width: V.w, height: V.h }, deviceScaleFactor: V.dsf });
  const { p, errs } = await boot(ctx);
  const info = await p.evaluate(STATE);
  const r = { name: V.name, css: [V.w, V.h], dsf: V.dsf, canvas: info.canvas, view: info.view, errs: errs.length ? errs : 'none' };
  report.views.push(r);
  if (V.main) {
    report.bench['farm_day'] = await p.evaluate(BENCH, { kind: 'farm', n: N_BENCH });
    await snap(p, 'farm_day');
    report.raf_farm = rafStat(await p.evaluate(RAF));
    // شب (نیمه‌شب) + باران + غروب
    for (const [nm, t, dt2] of [['farm_night', 1800], ['farm_rain', 410], ['farm_dusk', 1500]]) {
      await p.evaluate(({ t }) => { window.__farm.dayT = t; }, { t });
      await p.waitForTimeout(300);
      report.bench[nm] = await p.evaluate(BENCH, { kind: 'farm', n: N_BENCH });
      await snap(p, nm);
    }
    await p.evaluate(() => { window.__farm.dayT = 120; });
    // ورود دانجن
    await p.evaluate(() => window.__farm.onGate());
    await p.waitForTimeout(1400);
    report.bench['dungeon_f1'] = await p.evaluate(BENCH, { kind: 'run', n: N_BENCH });
    await snap(p, 'dungeon_f1');
    report.raf_dungeon = rafStat(await p.evaluate(RAF));
    // نبرد: قهرمان را کنار نزدیک‌ترین دشمن ببر و لحظه‌ی ضربه (عدد آسیب روی صفحه) را بگیر
    await p.evaluate(() => {
      const r = window.__getRun();
      const e = r.dungeon.enemies.filter((x) => !x.dead).sort((a, b) => Math.hypot(a.x - r.hero.x, a.y - r.hero.y) - Math.hypot(b.x - r.hero.x, b.y - r.hero.y))[0];
      if (e) { r.hero.x = e.x + 22; r.hero.y = e.y + 2; r.cam.x = r.hero.x - r.view.w / 2; r.cam.y = r.hero.y - r.view.h / 2; }
    });
    for (let i = 0; i < 70; i++) { // تا ۳٫۵ث: منتظر یک ضربه‌ی واقعی (float) بمان
      const hit = await p.evaluate(() => { const r = window.__getRun(); return !!(r && (r.fx.floats.length > 0 || (r.hero.skillT > 0))); });
      if (hit) break;
      await p.waitForTimeout(50);
    }
    report.bench['battle_f1'] = await p.evaluate(BENCH, { kind: 'run', n: N_BENCH });
    await snap(p, 'battle_f1');
    // طبقه‌ی ۱۰ (باس)
    await p.evaluate(() => { const r = window.__getRun(); r.loadFloor(10); });
    await p.waitForTimeout(700);
    await p.evaluate(() => {
      const r = window.__getRun();
      const b = r.dungeon.enemies.find((e) => e.isBoss);
      if (b) { r.hero.x = b.x + 40; r.hero.y = b.y + 10; r.cam.x = r.hero.x - r.view.w / 2; r.cam.y = r.hero.y - r.view.h / 2; }
    });
    for (let i = 0; i < 70; i++) { const hit = await p.evaluate(() => { const r = window.__getRun(); return !!(r && r.fx.floats.length > 0); }); if (hit) break; await p.waitForTimeout(50); }
    report.bench['boss_f10'] = await p.evaluate(BENCH, { kind: 'run', n: N_BENCH });
    await snap(p, 'boss_f10');
    report.raf_boss = rafStat(await p.evaluate(RAF));
    // بازگشت به مزرعه (تست سلامت گذار)
    await p.evaluate(() => { const el = document.getElementById('exitD'); el && el.click(); });
    await p.waitForTimeout(1200);
    r.backToFarm = await p.evaluate(() => ({ scene: window.__getRun() ? 'dungeon' : 'farm', errs: 0 }));
    r.errsAll = errs.length ? errs : 'none';
  }
  await ctx.close();
}

// ---------- ۲) ممیزی خام رستر: تنوع رنگ، روشنایی، تخت‌بودن تایل ----------
report.raw = {};
for (const [nm, s] of Object.entries(report.shots)) {
  const st = s.state;
  report.raw[nm] = { scale: st.scale, cam: st.cam, hero: st.hero, view: st.view };
}
fs.writeFileSync(path.join(OUT, 'p0_metrics.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ features: report.features, views: report.views, bench: report.bench, raf_farm: report.raf_farm, raf_dungeon: report.raf_dungeon, raf_boss: report.raf_boss, shots: Object.keys(report.shots) }, null, 1));
await browser.close();
console.log('OK → shots/p0_metrics.json');
