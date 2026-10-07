// render5.mjs — QA نهایی (ذخیره/migration/آفلاین/اقتصاد/حلقه کامل) + GIF ادغام‌شده‌ی مزرعه⇄دانجن
import fs from 'node:fs';
import { savePNG } from './png.mjs';
import { Game } from '../js/game.js';
import { Run } from '../js/run.js';
import { App, UPG, upgradeCost } from '../js/app.js';
import { defaultSave, loadSave, writeSave, resetSave, SCHEMA_VERSION } from '../js/save.js';
import { findPath } from '../js/astar.js';
import { TILE, WORLD_W, WORLD_H } from '../js/tiles.js';
import { Raster } from '../js/raster.js';

const OUT = '/tmp/qa5/'; // خروجی QA خارج از پروژه — فقط assert مهم است
fs.mkdirSync(OUT + 'gif5', { recursive: true });
const A = (c, msg, extra = '') => { if (!c) process.exitCode = 1; console.log((c ? 'PASS  ' : 'FAIL  ') + msg + (extra ? '  ' + extra : '')); };

// ---------- localStorage ماک ----------
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

// ---------- QA ذخیره ----------
{
  resetSave();
  let s = loadSave();
  A(s.v === SCHEMA_VERSION && s.coins === 60, 'save: پیش‌فرض تمیز');
  s.coins = 555; s.upgrades.sword = 2; s.farm = [{ i: 100, k: 'soil', w: 1, c: { t: 'wheat', p: 12 } }];
  A(writeSave(s) === true, 'save: نوشتن موفق');
  const s2 = loadSave();
  A(s2.coins === 555 && s2.upgrades.sword === 2 && s2.farm[0].c.p === 12, 'save: خواندن دقیق');
  // migration: v1 بدون upgrades/stats
  store.set('farmDungeon.save', JSON.stringify({ v: 1, coins: 123, inventory: { carrot: 2, wheat: 0, pumpkin: 0 } }));
  const m = loadSave();
  A(m.v === SCHEMA_VERSION && m.coins === 123 && m.upgrades.land === 1 && m.stats.kills === 0, 'save: migration v1→v2');
  resetSave();
  A(loadSave().coins === 60, 'save: ریست');
}
// ---------- QA اقتصاد ----------
{
  A(upgradeCost('worker', 0) === 200 && upgradeCost('worker', 1) === 500 && upgradeCost('sprinkler', 2) === Math.round(180 * 1.15 ** 2), 'اقتصاد: منحنی پایه×1.15^سطح + کارگر دوم ۵۰۰');
  const s = defaultSave(); s.coins = 10 ** 9; s.essence = 10 ** 6;
  const app = new App(s); const g = new Game(s, s.upgrades.land, s.upgrades);
  app.hydrateFarm(g);
  const before = app.farm.grid.filter((c) => c.farmable).length;
  while (s.upgrades.land < UPG.land.max) app.buy('land');
  const after = app.farm.grid.filter((c) => c.farmable).length;
  A(s.upgrades.land === UPG.land.max && after > before, `ارتقای زمین: ${before}→${after} تایل (سقف=L${UPG.land.max})`);
  A(app.buy('land') === false, 'ارتقا: سقف سطح رد می‌شود');
  const r1 = new Run(9, { swordLvl: 0 }), r5 = new Run(9, { swordLvl: 5 });
  A(r1.baseDmg === 12 && r5.baseDmg === 32, 'شمشیر: دمیج با سطح بالا می‌رود', r1.baseDmg + '→' + r5.baseDmg);
}
// ---------- QA آفلاین + دستیار ----------
{
  const s = defaultSave();
  s.upgrades = { land: 5, worker: 3, sprinkler: 3, basket: 3, hoe: 0, can: 0, sickle: 0, sword: 0 };
  s.coins = 300; s.lastSeen = Date.now() - 10 * 3600 * 1000; // ۱۰ ساعت غیبت
  const app = new App(s); const g = new Game(s, 5, s.upgrades);
  app.hydrateFarm(g);
  g.farm.cell(8, 8).kind = 'soil'; g.farm._addCrop(g.farm.cell(8, 8), 'carrot'); g.farm.cell(8, 8).wet = true;
  const rep = app.simulateOffline((Date.now() - s.lastSeen) / 1000);
  A(rep.sec === 8 * 3600, 'آفلاین: سقف ۸ ساعت اعمال شد', (rep.sec / 3600) + 'h');
  A(rep.earned > 0 && rep.harvested > 0, 'آفلاین: درآمد و برداشت', `+${rep.earned}💰 ${rep.harvested}🌾`);
  // بدون دستیار → آفلاین بی‌اثر
  const s2 = defaultSave(); s2.lastSeen = Date.now() - 5 * 3600 * 1000;
  const app2 = new App(s2); const g2 = new Game(s2, 1, s2.upgrades);
  app2.hydrateFarm(g2);
  const rep2 = app2.simulateOffline(5 * 3600);
  A(rep2.earned === 0, 'آفلاین: بدون دستیار درآمدی نیست');
}
// ---------- QA حلقه کامل: مزرعه→دانجن→گوهر→ارتقا ----------
{
  const s = defaultSave(); s.essence = 30;
  const app = new App(s); const g = new Game(s, 3, s.upgrades);
  app.hydrateFarm(g);
  let gate = false; g.onGate = () => gate = true;
  // تپ دروازه از نزدیکی
  g.hero.x = 25 * TILE + 8; g.hero.y = 9 * TILE + 8;
  g.command(26 * TILE + 8, 9 * TILE + 8);
  A(gate, 'دروازه: تپ از نزدیک → ورود به دانجن');
  // دور دانجن: ۵ گوهر + خروج
  const run = new Run(77, { swordLvl: 0 });
  run.essence = 5;
  const banked = app.bankEssence(run);
  A(banked === 5 && s.essence === 35 && run.essence === 0, 'خروج: گوهر به کیف پول واریز شد');
  A(app.buy('sword'), 'ارتقا: خرید شمشیر با گوهر دانجن', 'sword lvl=' + s.upgrades.sword);
}

// ---------- GIF حلقه‌ی کامل ----------
{
  const s = defaultSave();
  s.upgrades = { land: 3, worker: 1, sprinkler: 1, basket: 1, hoe: 3, can: 3, sickle: 2, sword: 1 };
  s.coins = 400; s.essence = 8;
  const app = new App(s); const g = new Game(s, 3, s.upgrades);
  app.hydrateFarm(g);
  g.view = { w: 216, h: 150 };
  const run2 = new Run(2026, { swordLvl: 1 });
  run2.view = { w: 216, h: 150 };
  const frames = [];
  const snapGame = () => { const r = new Raster(216, 150); g.render(r); return r; };
  const snapRun = () => { const r = new Raster(216, 150); run2.render(r); return r; };
  const drive = (world, dt, every) => { let left = dt, acc = 0; while (left > 0) { world.update(Math.min(1 / 60, left)); left -= 1 / 60; acc += 1 / 60; if (acc >= every) { acc = 0; frames.push(world === g ? snapGame() : snapRun()); } } };
  const goTo = (world, tx, ty) => {
    const hero = world.hero;
    const path = findPath(world.dungeon || world.farm, Math.floor(hero.x / TILE), Math.floor(hero.y / TILE), tx, ty);
    if (!path) return;
    for (const wp of path) {
      const wx = wp.x * TILE + 8, wy = wp.y * TILE + 8;
      for (let i = 0; i < 240; i++) {
        const dx = wx - hero.x, dy = wy - hero.y, d = Math.hypot(dx, dy);
        if (d < 3) break;
        world.update(1 / 60, { x: dx / d, y: dy / d, run: false });
      }
    }
  };
  const act = (x, y) => { g.command(x * TILE + 8, y * TILE + 8); let i = 0; while ((g.hero.path.length || g.hero.act >= 0 || g.hero.work) && i++ < 3000) g.update(1 / 60); };
  // ۱) مزرعه: شخم(+همسایه) → کاشت → آب — سپس دروازه
  drive(g, 0.5, 0.12);
  act(8, 8); act(8, 8); act(9, 8); act(8, 8);
  frames.push(snapGame());
  drive(g, 0.3, 0.12);
  goTo(g, 25, 9); drive(g, 0.5, 0.12);
  // ۲) دانجن: مبارزه + مهارت + پله
  drive(run2, 0.7, 0.12);
  for (let k = 0; k < 2 && run2.dungeon.enemies.length; k++) {
    let nearest = null, nd = 1e9;
    for (const e of run2.dungeon.enemies) { const d = Math.hypot(e.x - run2.hero.x, e.y - run2.hero.y); if (d < nd) { nd = d; nearest = e; } }
    if (!nearest) break;
    goTo(run2, Math.floor(nearest.x / TILE), Math.floor(nearest.y / TILE));
    drive(run2, 0.4, 0.12);
    if (run2.hero.skillCd <= 0) run2.trySkill();
    drive(run2, 1.8, 0.12);
  }
  // جمع‌کردن قطره‌ها
  drive(run2, 1.0, 0.12);
  const st = run2.dungeon.stairs;
  goTo(run2, st.x, st.y); drive(run2, 1.0, 0.12);
  // ۳) بازگشت به مزرعه + شناور گوهر
  app.s.essence += run2.essence;
  g.float(g.hero.x, g.hero.y - 40, '+' + (run2.essence + app.s.essence), 'white');
  drive(g, 1.2, 0.12);
  frames.forEach((f, i) => savePNG(OUT + 'gif5/f' + String(i).padStart(3, '0') + '.png', f));
  fs.writeFileSync(OUT + 'manifest5.json', JSON.stringify({ delay: 130, count: frames.length, essence: app.s.essence }));
  console.log('gif frames:', frames.length, '| wallet essence:', app.s.essence, '| run floor:', run2.floor, '| kills:', run2.kills);
  // اسکرین‌شات کامل: مزرعه با دروازه و بوته‌های زمین قفل + دانجن
  const full = (world, name, isRun) => {
    const sv = { cam: { ...world.cam }, view: { ...world.view } };
    world.cam.x = 0; world.cam.y = 0; world.view = { w: WORLD_W, h: WORLD_H };
    const r = new Raster(WORLD_W, WORLD_H);
    world.render(r);
    savePNG(OUT + name + '.png', r);
    world.cam = sv.cam; world.view = sv.view;
  };
  full(g, 'shot5_farm_gate', false);
  full(run2, 'shot5_dungeon', true);
}
console.log('DONE render5');
