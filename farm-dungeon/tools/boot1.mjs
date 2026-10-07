// boot1.mjs — تست بوت فاز ۱ برای هر دو بیلد (مسیر GPU و مسیر CPU) در سه ویوپورت + تست ورودی لمسی
// اجرا: node tools/boot1.mjs   (نیازمند سرور :8080 و بازی ساخته‌شده)
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/home/user/qa-env/index.js');
const { chromium } = require('playwright');
const U = process.argv[2] || 'http://localhost:8080/game.html';
const VP = [['phone', 390, 844, 2], ['landscape', 844, 390, 2], ['desktop', 1280, 720, 1]];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const out = { url: U, results: [], ok: true };

for (const mode of ['gl', 'cpu']) {
  for (const [name, w, h, dpr] of VP) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
    const errs = [];
    page.on('pageerror', (e) => errs.push('PAGE ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('CON ' + m.text().slice(0, 200)); });
    await page.goto(U + (mode === 'gl' ? '?gl=1' : '?cpu=1'), { waitUntil: 'load' });
    await page.waitForFunction(() => window.__farm && window.__getFade, null, { timeout: 15000 });
    await page.waitForTimeout(1600);
    const r = await page.evaluate(() => {
      const g = window.__glDiag ? window.__glDiag() : {};
      const c = window.__glCam;
      return {
        gl: window.__glOK, view: g.view, scale: g.scale, quads: g.quads, draws: g.draws, glErr: g.glErr,
        hero: [Math.round(window.__farm.hero.x), Math.round(window.__farm.hero.y)],
        cam: c ? [Math.round(c.cx), Math.round(c.cy), c.A, c.S] : null,
        fade: +window.__getFade().toFixed(2), running: window.__farm.time > 0.2,
      };
    });
    // تست ورودی: نگاشت صفحه↔دنیا (رفت‌وبرگشت) + لمس یعنی «برو آن‌طرف» → قهرمان شرق حرکت کند
    const tap = await page.evaluate(async () => {
      const f = window.__farm, h = f.hero, cv = document.getElementById('game');
      const before = { x: h.x, y: h.y };
      const rect = cv.getBoundingClientRect();
      const lx = rect.width * 0.5 + 60, ly = rect.height * 0.62; // جلوتر و کمی پایینِ قهرمان
      cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: rect.left + lx, clientY: rect.top + ly, bubbles: true, pointerId: 1, isPrimary: true }));
      cv.dispatchEvent(new PointerEvent('pointerup', { clientX: rect.left + lx, clientY: rect.top + ly, bubbles: true, pointerId: 1, isPrimary: true }));
      await new Promise((res) => setTimeout(res, 1800));
      return { before, after: { x: Math.round(h.x), y: Math.round(h.y) }, dx: Math.round(h.x - before.x) };
    });
    const ok = errs.length === 0 && r.running && (!r.gl || r.gl) && (mode === 'cpu' || r.draws >= 1) && (mode === 'cpu' || r.glErr === 0) && tap.dx > 6;
    if (!ok) out.ok = false;
    out.results.push({ mode, vp: name, ...r, tap: { dx: tap.dx, before: tap.before, after: tap.after }, errs, ok });
    console.log(mode.padEnd(4), name.padEnd(10), 'ok=' + ok, 'gl=' + r.gl, 'draws=' + r.draws, 'quads=' + r.quads, 'glErr=' + r.glErr,
      'view=' + JSON.stringify(r.view), 'cam=' + JSON.stringify(r.cam), 'tapdx=' + tap.dx, errs.length ? 'ERRS ' + errs[0] : '');
    await page.close();
  }
}
// نگاشت معکوس دوربین (برای ورودی): فرافکنی(معکوس(L)) ≈ L در چند نقطه از نما
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto(U + '?gl=1', { waitUntil: 'load' });
await page.waitForFunction(() => window.__farm && window.__glCam && window.__glCam.cx > 1, null, { timeout: 15000 });
out.inv = await page.evaluate(() => {
  const c = window.__glCam, res = [];
  for (const [lx, ly] of [[10, 10], [97, 175], [185, 340], [60, 300], [180, 40]]) {
    const w = window.__glInv(lx, ly), p = [0, 0];
    window.__glProj(w.worldX, w.worldY, p);
    res.push({ lx, ly, wx: +w.worldX.toFixed(2), wy: +w.worldY.toFixed(2), px: +p[0].toFixed(2), py: +p[1].toFixed(2) });
  }
  return { cam: [c.cx, c.cy, c.A, c.S], res };
});
const worst = Math.max(...out.inv.res.map((r) => Math.hypot(r.px - r.lx, r.py - r.ly)));
out.inv.worstErr = +worst.toFixed(2);
if (worst > 1.5) out.ok = false;
console.log('inverse camera worst error (px):', out.inv.worstErr);
await browser.close();
fs.writeFileSync(new URL('../shots/p1_boot.json', import.meta.url).pathname, JSON.stringify(out, null, 1));
console.log(out.ok ? 'BOOT1 PASS' : 'BOOT1 FAIL');
process.exit(out.ok ? 0 : 1);
