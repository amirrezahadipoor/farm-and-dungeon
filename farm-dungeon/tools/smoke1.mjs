// smoke1.mjs — اسموک گیم‌پلی روی مسیر GPU + تست افت/بازگشت کانتکست WebGL2
// اجرا: node tools/smoke1.mjs → shots/p1_smoke.json
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/home/user/qa-env/index.js');
const { chromium } = require('playwright');
const U = process.argv[2] || 'http://localhost:8080/game.html';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const rep = {};

// ---------- ۱) گیم‌پلی مزرعه روی مسیر GPU: فرمان واقعی → راه‌رفتن → کندن → کاشتن ----------
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGE ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('CON ' + m.text().slice(0, 160)); });
  await page.goto(U + '?gl=1', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__farm && window.__getFade, null, { timeout: 15000 });
  await page.waitForTimeout(1200);
  const start = await page.evaluate(() => {
    const f = window.__farm;
    f.wallet.cash = 900; try { f.wallet.seeds.carrot = 9; } catch (e) {}
    let pick = null;
    for (let y = 6; y < 14 && !pick; y++) for (let x = 6; x < 24 && !pick; x++) {
      const c = f.farm.cell(x, y);
      if (c && f.farm.farmable(x, y) && c.kind === 'grass') pick = { x, y };
    }
    if (!pick) return null;
    window.__cmd(pick.x, pick.y);
    return { pick, hero: [Math.round(f.hero.x), Math.round(f.hero.y)] };
  });
  const tilled = await page.waitForFunction((pk) => {
    const c = window.__farm.farm.cell(pk.x, pk.y);
    return !!(c && c.kind === 'soil');
  }, start.pick, { timeout: 25000 }).then(() => true).catch(() => false);
  await page.evaluate((pk) => window.__cmd(pk.x, pk.y), start.pick); // فرمان دوم = کاشتن
  const planted = await page.waitForFunction((pk) => {
    const c = window.__farm.farm.cell(pk.x, pk.y);
    return !!(c && c.crop);
  }, start.pick, { timeout: 15000 }).then(() => true).catch(() => false);
  const mid = await page.evaluate(() => {
    const f = window.__farm;
    let soils = 0, crops = 0;
    for (let y = 5; y < 15; y++) for (let x = 5; x < 25; x++) { const c = f.farm.cell(x, y); if (!c) continue; if (c.kind === 'soil') soils++; if (c.crop) crops++; }
    return { soils, crops, hero: [Math.round(f.hero.x), Math.round(f.hero.y)], time: +f.time.toFixed(1) };
  });
  await page.evaluate(() => { window.__farm.dayT = 430; });
  await page.waitForTimeout(1600);
  const rainDiag = await page.evaluate(() => window.__glDiag());
  await page.evaluate(() => { window.__farm.dayT = 1800; });
  await page.waitForTimeout(1200);
  const nightDiag = await page.evaluate(() => window.__glDiag());
  const moved = start ? Math.hypot(mid.hero[0] - start.hero[0], mid.hero[1] - start.hero[1]) : 0;
  rep.farm = { pick: start && start.pick, tilled, planted, soils: mid.soils, crops: mid.crops, movedPx: Math.round(moved), rainQuads: rainDiag.quads, nightQuads: nightDiag.quads, errs };
  rep.farm.ok = tilled && planted && moved > 60 && errs.length === 0;
  console.log('farm smoke:', JSON.stringify(rep.farm));
  await page.close();
}

// ---------- ۲) دانجن روی مسیر GPU: حرکت + مهارت + طبقه‌ی بعد، بدون خطا ----------
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGE ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('CON ' + m.text().slice(0, 160)); });
  await page.goto(U + '?gl=1', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__farm && window.__getFade, null, { timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => { window.__farm.dayT = 300; window.__farm.onGate(); });
  await page.waitForFunction(() => { const r = window.__getRun(); return r && window.__getFade() > 0.99; }, null, { timeout: 20000 });
  await page.waitForTimeout(600);
  const a = await page.evaluate(() => { const r = window.__getRun(), h = r.hero; return { hp: Math.round(h.hp), floor: r.floor, pos: [Math.round(h.x), Math.round(h.y)] }; });
  await page.evaluate(() => { const r = window.__getRun(); const b = r.dungeon.enemies.find((e) => !e.dead); if (b) r.moveTo(b.x - 40, b.y); });
  await page.waitForTimeout(3500);
  await page.evaluate(() => { const r = window.__getRun(); if (r.trySkill) r.trySkill(); });
  await page.waitForTimeout(2500);
  const b = await page.evaluate(() => { const r = window.__getRun(); r.loadFloor(2); return { floor: r.floor }; });
  await page.waitForTimeout(2500);
  const c = await page.evaluate(() => { const r = window.__getRun(); const h = r.hero; return { floor: r.floor, hp: Math.round(h.hp), moved: Math.hypot(h.x - 0, h.y - 0) > 0, diag: window.__glDiag() }; });
  rep.dungeon = { start: a, afterSkill: b, end: { floor: c.floor, hp: c.hp, quads: c.diag.quads, draws: c.diag.draws, lights: c.diag.lights }, errs };
  rep.dungeon.ok = c.floor === 2 && errs.length === 0;
  console.log('dungeon smoke:', JSON.stringify(rep.dungeon.end), 'ok=' + rep.dungeon.ok, 'errs=' + errs.length);
  await page.close();
}

// ---------- ۳) افت و بازگشت کانتکست WebGL2 (خودترمیمی: CPU ↔ GPU) ----------
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGE ' + e.message));
  await page.goto(U + '?gl=1', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__farm && window.__glDiag, null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  const before = await page.evaluate(() => window.__glDiag());
  const lost = await page.evaluate(() => {
    const c = document.getElementById('glLayer'); // بوم WebGL حالا این است
    const ext = c.getContext('webgl2').getExtension('WEBGL_lose_context');
    if (!ext) return 'no-ext';
    window.__loseExt = ext; // بعد از loss، getExtension دیگر پاسخ نمی‌دهد
    ext.loseContext();
    return 'lost';
  });
  await page.waitForTimeout(1200);
  const during = await page.evaluate(() => ({ glOK: window.__glOK, quads: window.__glDiag().quads, time: +window.__farm.time.toFixed(1) }));
  await page.evaluate(() => window.__loseExt && window.__loseExt.restoreContext());
  await page.waitForTimeout(2000);
  const after = await page.evaluate(() => window.__glDiag());
  rep.ctxLoss = { lost, before: { quads: before.quads, draws: before.draws }, during, after: { glOK: after.ok, quads: after.quads, draws: after.draws, bakes: after.bakes, glErr: after.glErr }, errs };
  rep.ctxLoss.ok = lost === 'lost' && during.glOK === false && after.ok === true && after.draws >= 1 && errs.length === 0;
  console.log('ctx-loss:', JSON.stringify(rep.ctxLoss));
  await page.close();
}
await browser.close();
rep.ok = !!(rep.farm.ok && rep.dungeon.ok && rep.ctxLoss.ok);
fs.writeFileSync(new URL('../shots/p1_smoke.json', import.meta.url).pathname, JSON.stringify(rep, null, 1));
console.log(rep.ok ? 'SMOKE1 PASS' : 'SMOKE1 FAIL');
process.exit(rep.ok ? 0 : 1);
