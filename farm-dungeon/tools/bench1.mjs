// bench1.mjs — هزینه‌ی کارِ فریم (ema حلقه‌ی بازی، بدون انتظار rAF) برای هر صحنه در دو مسیر
// اجرا: node tools/bench1.mjs    → shots/p1_bench.json
// توجه: GL اینجا روی SwiftShader (نرم‌افزاری) است — عددها فقط نسبی‌اند، نه حقیقت دستگاه.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/home/user/qa-env/index.js');
const { chromium } = require('playwright');
const U = process.argv[2] || 'http://localhost:8080/game.html';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'] });
const out = { note: 'ema = game-loop work per frame (ms), sampled on a quiet stream (no capture readback)', scenes: {} };
for (const mode of ['cpu', 'gl']) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(U + (mode === 'gl' ? '?gl=1' : '?cpu=1'), { waitUntil: 'load' });
  await page.waitForFunction(() => window.__farm && window.__getFade, null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  const S = {};
  const quiet = async (name, setup) => {
    if (setup) await page.evaluate(setup);
    await page.waitForTimeout(2200); // پنجره‌ی آرام: bake/readback/گذار تمام شود
    await page.evaluate(() => { window.__b = []; const o = window.__glDiag; window.__t = setInterval(() => window.__b.push(window.__glDiag().ms), 40); });
    await page.waitForTimeout(1600);
    const b = await page.evaluate(() => { clearInterval(window.__t); const a = window.__b.slice().sort((x, y) => x - y); return { med: +a[a.length >> 1].toFixed(2), p90: +a[Math.floor(a.length * 0.9)].toFixed(2), n: a.length }; });
    S[name] = b;
  };
  await quiet('farm_day');
  await quiet('farm_night', () => { window.__farm.dayT = 1800; });
  await quiet('farm_rain', () => { window.__farm.dayT = 430; });
  await quiet('dungeon', () => { window.__farm.dayT = 300; window.__farm.onGate(); });
  await page.waitForFunction(() => { const r = window.__getRun(); return r && window.__getFade() > 0.99; }, null, { timeout: 20000 });
  await quiet('dungeon_f1');
  await page.evaluate(async () => { const r = window.__getRun(), h = r.hero; let b = null, bd = 1e9; for (const e of r.dungeon.enemies) if (!e.dead) { const d = Math.hypot(e.x - h.x, e.y - h.y); if (d < bd) { bd = d; b = e; } } if (b) { h.x = b.x - 26; h.y = b.y + 6; r.cam.x = h.x - 60; r.cam.y = h.y - 60; r.trySkill(); } });
  await quiet('battle');
  out.scenes[mode] = S;
  out[mode + '_errs'] = errs;
  console.log(mode, JSON.stringify(S, null, 0), errs.length ? 'ERRS ' + errs[0] : '');
  await page.close();
}
await browser.close();
fs.writeFileSync(new URL('../shots/p1_bench.json', import.meta.url).pathname, JSON.stringify(out, null, 1));
