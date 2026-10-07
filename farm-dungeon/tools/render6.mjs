// render6.mjs — QA مرحله ۶: پولیش ظاهر/انیمیشن/گیم‌پلی + GIF
import fs from 'node:fs';
import { savePNG } from './png.mjs';
import { Game } from '../js/game.js';
import { Run } from '../js/run.js';
import { runHit } from '../js/run_combat.js';
import { FX, vignette } from '../js/fx.js';
import { TILE } from '../js/tiles.js';
import { DAY_LEN } from '../js/night.js';
import { Raster } from '../js/raster.js';

const OUT = '/tmp/qa6/'; // فریم‌ها و شات‌ها خارج از پروژه؛ compose6 از همین‌جا می‌خواند
fs.mkdirSync(OUT + 'gif6', { recursive: true });
const A = (c, msg, extra = '') => { if (!c) process.exitCode = 1; console.log((c ? 'PASS  ' : 'FAIL  ') + msg + (extra ? '  ' + extra : '')); };
const bright = (r) => { let s = 0; for (let i = 0; i < r.d.length; i += 4) s += r.d[i] + r.d[i + 1] + r.d[i + 2]; return s; };
const W = { coins: 800, inventory: { carrot: 0, wheat: 0, pumpkin: 0 }, selectedCrop: 'carrot' };

// ===== ۱. چرخه‌ی شب/روز + شب‌تاب =====
{
  const g = new Game(W, 5, { hoe: 0, can: 0, sickle: 0, sword: 0 });
  g.view = { w: 240, h: 160 };
  g.dayT = 0; const rNoon = new Raster(240, 160); g.render(rNoon);
  g.dayT = DAY_LEN / 2;
  for (let i = 0; i < 20; i++) g.update(1 / 30); // زمان جلو می‌رود → سوسوی شب‌تاب
  const rNight = new Raster(240, 160); g.render(rNight);
  const bn = bright(rNoon), bt = bright(rNight);
  A(bt < bn * 0.72, 'شب: تینت تاریک آبی (چرخه ۱ ساعته)', Math.round(bt / bn * 100) + '% روشنی');
  // ن۳۶: شبِ آرام — شب‌تاب‌های چشمک‌زن حذف شدند؛ هیچ نقطه‌ی نورِ زرد-سبزِ شناوری نباید باشد
  let ff = 0;
  // فایرفلای سبزتر از قرمز است؛ نور پنجره‌ی گرمِ خانه (R>G) مجاز است
  for (let i = 0; i < rNight.d.length; i += 4) { const [R, G, B, Al] = [rNight.d[i], rNight.d[i+1], rNight.d[i+2], rNight.d[i+3]]; if (Al > 60 && R > 190 && G > 210 && B < 170 && G > R + 10) ff++; }
  A(ff === 0, 'شبِ آرام: صفر نقطه‌ی چشمک‌زنِ شناور (فایرفلای حذف)', ff + 'px');
  savePNG(OUT + 'shot6_night.png', rNight);
  savePNG(OUT + 'shot6_day.png', rNoon);
}
// ===== ۲. فوم آب و گرد و خاک =====
{
  const g = new Game(W, 5, { hoe: 0, can: 0, sickle: 0, sword: 0 });
  g.view = { w: 480, h: 300 };
  const r = new Raster(480, 300); g.render(r);
  let foam = 0;
  for (let y = 0; y < 300; y++) for (let x = 0; x < 480; x++) { const i = (y * 480 + x) * 4; const [R, G, B, Al] = [r.d[i], r.d[i+1], r.d[i+2], r.d[i+3]]; if (Al > 100 && B > 215 && R > 140 && G > 180) foam++; }
  A(foam > 10, 'فوم آب: لبه‌ی روشن حوضچه', foam + 'px');
}
// ===== ۳. صف رنگ‌آمیزی (کشیدن = چند فرمان) =====
{
  const g = new Game(W, 5, { hoe: 0, can: 0, sickle: 0, sword: 0 });
  g.command(8 * 16 + 8, 8 * 16 + 8); g.command(9 * 16 + 8, 8 * 16 + 8); g.command(10 * 16 + 8, 8 * 16 + 8);
  A(g.queue.length === 2, 'رنگ‌آمیزی: صف ۸تایی دو فرمان اضافه');
  let i = 0; while ((g.hero.path.length || g.hero.act >= 0 || g.hero.work || g.queue.length) && i++ < 20000) g.update(1 / 60);
  const soil = g.farm.grid.filter((c) => c.kind === 'soil').length;
  A(soil >= 3 && g.queue.length === 0, 'رنگ‌آمیزی: هر ۳ تایل شخم خورد', soil + ' soil');
}
// ===== ۴. FX: کریتیک بزرگ‌تر + وینیت =====
{
  const fx = new FX();
  fx.float(80, 60, '-22', 'crit', { crit: true, scale: 1.3 });
  fx.float(40, 60, '-12', 'hit');
  A(fx.floats.length === 2 && fx.floats[0].crit === true, 'FX: عددم کریتیک ثبت شد');
  const rc = new Raster(160, 120); fx.render(rc, 0, 0);
  let txt = 0;
  for (let i = 0; i < rc.d.length; i += 4) if (rc.d[i + 3] > 90) txt++;
  A(txt > 20, 'FX: عددم‌ها رندر شدند', txt + 'px');
  const v = vignette(160, 120);
  const wr = new Raster(160, 120); wr.d.fill(255); // بوم سفید مات → وینیت روی آن
  v.apply(wr);
  const cI = ((60 * 160) + 80) * 4, eI = (4 * 4) * 4;
  A(wr.d[eI] < wr.d[cI] - 15, 'FX: وینیت نرم گوشه تیره‌تر', wr.d[eI] + '<' + wr.d[cI]);
}
// ===== ۵. تاریکی دانجن + نور =====
{
  const run = new Run(7, { swordLvl: 2 });
  run.view = { w: 240, h: 160 };
  for (let i = 0; i < 40; i++) run.update(1 / 30); // cam روی قهرمان
  const r = new Raster(240, 160); run.render(r);
  // نزدیکی قهرمان روشن، دور تیره
  const hx = Math.round(run.hero.x) - run.cam.x, hy = Math.round(run.hero.y) - run.cam.y;
  const at = (x, y) => { const i = ((Math.max(0, Math.min(159, y | 0))) * 240 + (Math.max(0, Math.min(239, x | 0)))) * 4; return r.d[i] + r.d[i + 1] + r.d[i + 2]; };
  A(at(hx + 22, hy + 14) > at(hx + 70, hy + 40) + 60, 'تاریکی: نزدیک قهرمان روشن‌تر', at(hx + 22, hy + 14) + '>' + at(hx + 70, hy + 40));
}
// ===== ۶. ستون/دکور/گنج در چند سید =====
{
  let pillars = 0, decors = 0, chests = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const run = new Run(seed, {});
    for (const c of run.dungeon.grid) { if (c.kind === 'pillar') pillars++; if (c.kind === 'decor') decors++; }
    chests += run.dungeon.chests.length;
  }
  A(pillars / 40 >= 2.5, 'ستون: میانگین هر نقشه', (pillars / 40).toFixed(2));
  A(decors / 40 >= 4, 'دکور: استخوان/قارچ/ترک', (decors / 40).toFixed(1));
  A(chests > 0, 'گنج: اتاق صندوق وجود دارد', (chests / 40).toFixed(2) + '/نقشه');
}
// ===== ۷. مقیاس سختی + باس طبقه ۱۰ =====
{
  const r1 = new Run(3, {}), r5 = new Run(3, {});
  r5.loadFloor(5);
  // مقایسه‌ی هم‌نوع (انتخاب تصادفی kind در enemies[0] تست را شکننده می‌کرد)
  const k1 = r1.dungeon.enemies[0]?.kind ?? 'slime';
  const same5 = r5.dungeon.enemies.find((e) => e.kind === k1);
  const hp1 = r1.dungeon.enemies[0]?.maxHp ?? 0;
  const hp5 = same5?.maxHp ?? Math.max(0, ...r5.dungeon.enemies.map((e) => e.maxHp));
  A(hp5 > hp1, 'سختی: hp طبقه ۵ > طبقه ۱ (هم‌نوع)', hp1 + '→' + hp5 + ' (' + k1 + ')');
  const rb = new Run(3, {});
  while (!rb.isBossFloor) rb.loadFloor(rb.floor + 1);
  A(rb.floor === 10 && rb.dungeon.enemies.some((e) => e.isBoss), 'باس: طبقه ۱۰ گولم‌لرد', 'floor=' + rb.floor);
  A(rb.stairsOpen() === false, 'باس: پله تا مرگ باس قفل');
  rb.log.length = 0;
  rb.loadFloor(10);
  A(rb.log.some((e) => e.k === 'bossIntro'), 'باس: رویداد bossIntro (بنر)');
}
// ===== ۸. شفای بین طبقات =====
{
  const run = new Run(11, { armorLvl: 2 });
  run.hero.hp = 50;
  run.loadFloor(2);
  A(run.hero.hp === 75, 'شفا: +۲۵ بین طبقات', run.hero.hp);
}
// ===== ۹. دوج + iframe =====
{
  const run = new Run(13, {});
  // نقشه‌های دست‌چین: جای باز برای جهش پیدا کن (دیوار جلوی اسپاون ممکن است باشد)
  const Dd = run.dungeon;
  outer: for (let y = 1; y < 19; y++) for (let x = 1; x < 24; x++) {
    if (Dd.walkable(x, y) && Dd.walkable(x + 1, y) && Dd.walkable(x + 2, y) && Dd.walkable(x + 3, y) && Dd.walkable(x + 4, y)) { run.hero.x = x * 16 + 8; run.hero.y = y * 16 + 8; break outer; }
  }
  const x0 = run.hero.x, y0 = run.hero.y;
  run.tryDash(1, 0);
  A(run.hero.dashT > 0 && run.hero.iframe > 0.3, 'دوج: iframe فعال');
  for (let i = 0; i < 20; i++) run.update(1 / 60);
  A(run.hero.x > x0 + 25, 'دوج: جابه‌جایی سریع', Math.round(run.hero.x - x0) + 'px/0.33s');
}
// ===== ۱۰. کریتیک آماری =====
{
  const run = new Run(17, {});
  const e = run.dungeon.enemies.find((x) => !x.isBoss);
  let crits = 0, n = 300;
  const rr = Math.random;
  let seq = 0;
  Math.random = () => (seq = (seq + 1) % 25) / 25; // قطعی: 3/25=12% کریتیک
  for (let i = 0; i < n; i++) runHit(run, e, 1, 0, 10, false);
  Math.random = rr;
  const floats = run.fx.floats.filter((f) => f.crit).length;
  A(floats > 0, 'کریتیک: ۱۲٪ ضربه‌ها عددم بزرگ', floats + ' از ' + n);
}
// ===== ۱۱. ناک‌بک + ذرات مرگ =====
{
  const run = new Run(19, {});
  const e = run.dungeon.enemies.find((x) => !x.isBoss);
  const ex0 = e.x;
  runHit(run, e, 1, 0, 8, false);
  const kbApplied = e.kbx !== 0 || e.kby !== 0;
  for (let i = 0; i < 30; i++) run.update(1 / 60);
  A(kbApplied, 'ناک‌بک: هیولا پرتاب شد', Math.round(Math.abs(e.x - ex0)) + 'px');
  e.hp = 1; runHit(run, e, 0, 1, 99, false);
  let sawBoom = false; // نظرسنجی در طول انیمیشن — مقاوم به زمان‌بندی ایالت هیولا
  for (let i = 0; i < 130; i++) { run.update(1 / 60); if (run.fx.parts.length >= 8) sawBoom = true; }
  A(sawBoom, 'مرگ: ذرات انفجاری');
}
// ===== ۱۲. hurt flash =====
{
  const run = new Run(23, {});
  run.hero.hurtT = 0.15;
  const spr = run._heroSprite(true);
  let red = 0;
  for (let i = 0; i < spr.d.length; i += 4) if (spr.d[i + 3] > 200 && spr.d[i] > 240 && spr.d[i + 1] < 90) red++;
  A(red > 50, 'آسیب: فلاش قرمز اسپرایت', red + 'px');
}
// ===== ۱۳. زره/چکمه =====
{
  const run = new Run(29, { armorLvl: 2, bootsLvl: 3 });
  A(run.maxHp === 140 && Math.abs(run.speedMul - 1.18) < 1e-9, 'زره/چکمه: 140hp + 18٪ سرعت');
  const g = new Game({ coins: 1, inventory: {}, selectedCrop: 'carrot' }, 5, {}, 3);
  A(Math.abs(g.speedMul - 1.18) < 1e-9, 'چکمه: سرعت مزرعه هم');
}
// ===== ۱۴. hit-stop =====
{
  const run = new Run(31, {});
  const e = run.dungeon.enemies.find((x) => !x.isBoss);
  e.hp = 1; runHit(run, e, 1, 0, 99, false);
  A(run.fx.hitstop > 0, 'hit-stop: مکث ضربه‌ی مرگبار', run.fx.hitstop.toFixed(2) + 's');
  const bx = run.hero.x;
  run.update(1 / 60); // باید فریز باشد → حرکت صفر
  A(Math.abs(run.hero.x - bx) < 0.001, 'hit-stop: دنیا فریز شد');
}
console.log('--- GIF ---');
// ===== GIF: مزرعه روز→شب، رنگ‌آمیزی، سپس دانجن =====
{
  const frames = [];
  // الف) مزرعه: روز + راه رفتن + رنگ‌آمیزی ۳ تایل
  const g = new Game(W, 5, { hoe: 3, can: 3, sickle: 3, sword: 0, worker: 1, wTill: 1, wPlant: 1, wWater: 1, wHarvest: 1, wSpeed: 2 });
  g.view = { w: 240, h: 160 };
  g.command(8 * 16 + 8, 8 * 16 + 8); g.command(9 * 16 + 8, 8 * 16 + 8); g.command(10 * 16 + 8, 8 * 16 + 8);
  let step = 0;
  while ((g.hero.path.length || g.hero.act >= 0 || g.hero.work || g.queue.length) && step < 4000) {
    g.update(1 / 30); step++;
    if (step % 10 === 0) { const r = new Raster(240, 160); g.render(r); frames.push(r); }
  }
  // ب) غروب → شب با شب‌تاب (چرخه‌ی ۱ ساعته: نیمه‌شب = 1800)
  for (let k = 0; k <= 14; k++) {
    g.dayT = 1500 + k * 25; g.update(1 / 30);
    const r = new Raster(240, 160); g.render(r); frames.push(r);
  }
  // شب چند ثانیه
  g.dayT = DAY_LEN / 2;
  for (let i = 0; i < 40; i++) { g.update(1 / 30); if (i % 4 === 0) { const r = new Raster(240, 160); g.render(r); frames.push(r); } }
  // ج) دانجن: تاریکی + جنگ + کریتیک + دوج
  const run = new Run(7, { swordLvl: 2, armorLvl: 1, bootsLvl: 2 });
  run.view = { w: 240, h: 160 };
  const foe = run.dungeon.enemies.find((e) => !e.isBoss && Math.hypot(e.x - run.hero.x, e.y - run.hero.y) < 90)
    || run.dungeon.enemies.find((e) => !e.isBoss);
  run.tgt = [foe.x, foe.y];
  let fs2 = 0;
  while (!run.hero.dead && run.dungeon.enemies.some((e) => e.state !== 'die' && Math.hypot(e.x - foe.x, e.y - foe.y) < 400) && fs2 < 2200) {
    // هدف‌گیری مداوم دشمن نزدیک
    const near = run.dungeon.enemies.filter((e) => e.state !== 'die').sort((a, b) => Math.hypot(a.x - run.hero.x, a.y - run.hero.y) - Math.hypot(b.x - run.hero.x, b.y - run.hero.y))[0];
    if (near && (!run.tgt || Math.hypot(run.tgt[0] - near.x, run.tgt[1] - near.y) > 40)) run.moveTo(near.x, near.y);
    run.update(1 / 30); fs2++;
    if (fs2 % 7 === 0) { const r = new Raster(240, 160); run.render(r); frames.push(r); }
  }
  // دوج نمایشی
  run.tryDash(1, 0.3);
  for (let i = 0; i < 14; i++) { run.update(1 / 30); if (i % 2 === 0) { const r = new Raster(240, 160); run.render(r); frames.push(r); } }
  // د) طبقه باس ۱۰
  while (!run.isBossFloor) run.loadFloor(run.floor + 1);
  run.view = { w: 240, h: 160 };
  for (let i = 0; i < 30; i++) { run.update(1 / 30); if (i % 3 === 0) { const r = new Raster(240, 160); run.render(r); frames.push(r); } }
  for (let i = 0; i < frames.length; i++) savePNG(OUT + `gif6/f${String(i).padStart(3, '0')}.png`, frames[i]);
  console.log('gif frames:', frames.length, '| floor:', run.floor, '| boss:', run.dungeon.enemies.some((e) => e.isBoss));
  // شات‌های ثابت
  run.fx = run.fx; run.hero.hurtT = 0.15;
  const rB = new Raster(240, 160); run.render(rB); savePNG(OUT + 'shot6_boss.png', rB);
  const rM = new Run(37, {}); rM.view = { w: 240, h: 160 }; const rD = new Raster(240, 160); rD.render; rM.render(rD); savePNG(OUT + 'shot6_dungeon_dark.png', rD);
}
console.log('DONE render6');
