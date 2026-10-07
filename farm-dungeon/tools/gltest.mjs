// gltest.mjs — تست مسیر GPU فاز ۱: بوت، WebGL2، عکس از خودِ فریم GPU (readPixels داخل تسک رسم)،
// شب/باران/دانجن/نبرد + شمارش quad/draw/light/بازه‌ی فریم. اجرا: node tools/gltest.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/home/user/qa-env/index.js');
const { chromium } = require('playwright');
const OUT = new URL('../shots/', import.meta.url).pathname;
const MODE = process.argv[3] || 'gl';
const PFX = process.argv[4] || 'p1';
const URL_ = (process.argv[2] || 'http://localhost:8080/game.html') + (MODE === 'cpu' ? '?cpu=1' : '?gl=1');
const PNG = (b64, name) => fs.writeFileSync(OUT + name, Buffer.from(b64.split(',')[1], 'base64'));

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 300)); });
await page.goto(URL_, { waitUntil: 'load' });
await page.waitForFunction(() => window.__farm && window.__getRun && typeof window.__getFade === "function", null, { timeout: 20000 });
await page.waitForTimeout(900);
const rep = { url: URL_, errs, shots: [], diag: [] };

async function shot(tag, waitMs = 700) {
  await page.evaluate(() => window.__glCapture());
  await page.waitForTimeout(waitMs);
  const d = await page.evaluate(() => window.__glDiag());
  const png = await page.evaluate(() => window.__glPng());
  const T = MK();
  function MK() { return MODE === 'cpu' ? PFX + 'c_' : PFX + '_'; }
  if (png && png.length > 2000) { PNG(png, T + tag + (MODE === 'cpu' ? '_cpu.png' : '_gl.png')); rep.shots.push(T + tag + (MODE === 'cpu' ? '_cpu.png' : '_gl.png')); }
  await page.screenshot({ path: OUT + T + tag + '_dom.png' });
  rep.shots.push(T + tag + '_dom.png');
  rep.diag.push({ tag, ...d, pngBytes: png ? png.length : 0 });
  return d;
}
// ۱) مزرعه روز
await shot('farm_day');
// ۲) مزرعه شب (پنجره‌ی روشن + تینت شیدر)
await page.evaluate(() => { window.__farm.dayT = 1800; });
await page.waitForTimeout(400);
await shot('farm_night');
// ۳) باران (روز + باران)
await page.evaluate(() => { window.__farm.dayT = 430; });
await page.waitForTimeout(400);
await shot('farm_rain');
// ۴) دانجن
await page.evaluate(() => { window.__farm.dayT = 300; window.__farm.onGate(); });
await page.waitForFunction(() => { const r = window.__getRun(); return r && r.floor >= 1 && window.__getFade() > 0.99; }, null, { timeout: 20000 });
await page.waitForTimeout(600);
await shot('dungeon');
// ۵) نبرد: نزدیک‌ترین هیولا را هدف بگیر و مهارت بزن (متن شناور/پرتابه‌ها)
const battle = await page.evaluate(async () => {
  const r = window.__getRun(), h = r.hero;
  let best = null, bd = 1e9;
  for (const e of r.dungeon.enemies) if (!e.dead) { const d = Math.hypot(e.x - h.x, e.y - h.y); if (d < bd) { bd = d; best = e; } }
  if (!best) return null;
  h.x = best.x - 26; h.y = best.y + 6; r.cam.x = h.x - 60; r.cam.y = h.y - 60; h.dir = 'right';
  r.trySkill();
  return { kind: best.kind, x: best.x, y: best.y, hp: best.hp };
});
await page.waitForFunction(() => { const r = window.__getRun(); return r && (r.fx.floats.length > 0 || r.hero.skillT > 0); }, null, { timeout: 8000 }).catch(() => {});
await shot('battle', 500);
rep.battle = battle;
rep.fps = await page.evaluate(async () => { // بازه‌ی فریم روی مسیر GPU (محدودِ SwiftShader)
  const ts = []; let n = 0;
  await new Promise((res) => { const f = (t) => { ts.push(t); if (++n < 121) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  const d = []; for (let i = 1; i < ts.length; i++) d.push(ts[i] - ts[i - 1]);
  d.sort((a, b) => a - b);
  return { median: +d[Math.floor(d.length / 2)].toFixed(2), p90: +d[Math.floor(d.length * 0.9)].toFixed(2), min: +d[0].toFixed(2) };
});
rep.bakes = await page.evaluate(() => window.__glBakes());
rep.end = await page.evaluate(() => window.__glDiag());
await browser.close();
fs.writeFileSync(OUT + 'p1_gl_report.json', JSON.stringify(rep, null, 1));
console.log(JSON.stringify(rep, null, 1));
