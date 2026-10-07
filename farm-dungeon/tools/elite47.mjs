// elite47.mjs — خروجی ن۴۷: تاج نخبه قبل/بعد + GIF نخبه‌ها در دانجن واقعی
import { savePNG } from './png.mjs';
import { Raster } from '../js/raster.js';
import { renderRun } from '../js/run_render.js';
import { Run } from '../js/run.js';
import { Monster } from '../js/monster.js';
import { MHEAD, MONSTER_KINDS, drawEliteMark } from '../js/art/monster_parts.js';
import { mkdirSync, rmSync } from 'fs';

const DIR = '/tmp/qa47';
rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR + '/gif47', { recursive: true });
let P = 0, F = 0;
const A = (c, msg, extra = '') => { c ? P++ : (F++, process.exitCode = 1); console.log((c ? 'PASS  ' : 'FAIL  ') + msg + (extra ? '  ' + extra : '')); };

// تاج طلایی: R>200,G>170,B<130
const isGold = (d, i) => d[i] > 200 && d[i + 1] > 170 && d[i + 2] < 130 && d[i + 3] > 200;

const headTop = (e) => { // بالاترین پیکسل بدنه از بوم شفاف خود اسپرایت (ستون‌های ۴۰..۸۸)
  const s = e.sprite();
  for (let y = 0; y < s.h; y++) for (let x = 40; x < 88; x++) if (s.d[(y * s.w + x) * 4 + 3] > 40) return y;
  return 999;
};
const gold = (d, i) => d[i] > 115 && d[i + 1] > 95 && d[i + 2] < 90 && d[i] - d[i + 2] > 45 && d[i] - d[i + 1] > 8; // تیره‌شدگی‌پذیر
const red = (d, i) => d[i] > 100 && d[i] - d[i + 1] > 40 && d[i] - d[i + 2] > 40; // جواهر تاج (نه HPبار: آن طلایی بالای سر ندارد)
const crownAt = (d, W, cx, y0, y1) => { // امضای تاج: طلایی در (cx,y-1) + قرمز در (cx,y)
  for (let y = Math.max(1, y0); y < Math.min(d.length / 4 / W, y1); y++) {
    const i = (y * W + cx) * 4, j = i - W * 4;
    if (red(d, i) && gold(d, j)) return y; // قرمز در ردیف y، طلایی در y-1
  }
  return -1;
};

// ═══ ۱. شیت قبل/بعد: ۱۴ جور، تاج قدیمی (آفست ثابت ۱۰۶) در برابر MHEAD ═══
{
  const CW = 66, RH = 130, W = CW * 7, H = RH * 2 * 2 + 8; // دو پنل (قبل/بعد) × دو ردیف
  const r = new Raster(W, H);
  r.rect(0, 0, W, H, [26, 22, 38, 255]);
  const kinds = MONSTER_KINDS;
  let oldFloat = 0, newTouch = 0;
  for (let panel = 0; panel < 2; panel++) {
    for (let i = 0; i < kinds.length; i++) {
      const kind = kinds[i];
      const col = i % 7, row = (i / 7) | 0;
      const fx = col * CW + CW / 2;                       // جای پا (feet)
      const fy = panel * (RH * 2 + 4) + row * RH + RH - 4;
      const e = new Monster(kind, fx, fy, 1, { elite: true });
      e.sprite().over(r, Math.round(fx) - 64, Math.round(fy) - 100);      // دقیقاً مثل run_render
      const headY = Math.round(fy) - (panel === 0 ? 106 : (MHEAD[kind] ?? 76)); // قبل: ثابت · بعد: MHEAD
      drawEliteMark(r, Math.round(fx), Math.round(fy), 1.5, headY);
      const top = headTop(e) + (fy - 100); // فرق سر مطلق در فریم
      if (panel === 0) { if (crownAt(r.d, W, Math.round(fx), top - 95, top - 8) >= 0) oldFloat++; } // شناور بالای سر
      else { if (crownAt(r.d, W, Math.round(fx), top - 8, top + 7) >= 0) newTouch++; } // چسبیده به فرق سر
    }
  }
  savePNG(DIR + '/elite_crown_before_after.png', r);
  A(oldFloat >= 10, 'قبل: تاج ≥۱۰ جور شناور/جدا از سر بود', oldFloat + '/14 شناور');
  A(newTouch === 14, 'بعد: تاج هر ۱۴ جور چسبیده به فرق سر', newTouch + '/14');
}

// ═══ ۲. تاج در رندر واقعی بازی: هر جور یک نخبه جلوی دوربین ═══
{
  const run = new Run(13, {});
  run.view = { w: 216, h: 150 };
  for (let i = 0; i < 8; i++) run.update(1 / 30);
  let ok = 0;
  const r = new Raster(216, 150);
  for (const kind of MONSTER_KINDS) {
    run.cam.x = Math.max(0, Math.min(480 - 216, run.hero.x - 108));
    run.cam.y = Math.max(0, Math.min(320 - 150, run.hero.y - 75));
    let ex = run.hero.x + 30; // داخل کادر و داخل نور قهرمان
    if (ex - run.cam.x > 176 || ex > 464) ex = run.hero.x - 30;
    const e = new Monster(kind, ex, run.hero.y, 1, { elite: true });
    run.dungeon.enemies = [e];
    const hx0 = run.hero.x, hy0 = run.hero.y;
    run.hero.x -= 90; run.hero.y += 70; // قهرمان از روی دشمن کنار — y-sort نباید تاج را بپوشاند
    renderRun(run, r);
    run.hero.x = hx0; run.hero.y = hy0;
    const sy = Math.round(e.y) - 100 - run.cam.y;
    const top = headTop(e) + sy;
    if (crownAt(r.d, 216, Math.round(e.x) - run.cam.x, top - 8, top + 7) >= 0) ok++;
  }
  A(ok === 14, 'رندر واقعی: تاج ۱۴/۱۴ روی فرق سر', ok + '/14');
}

// ═══ ۳. GIF: نبرد با نخبه‌ها (تاج روی سر در حرکت/حمله) — زندان سید ۱۳ ═══
{
  const run = new Run(13, { swordLvl: 2 });
  run.loadFloor(1);
  let spot = null;
  for (let y = 2; y < 18 && !spot; y++) for (let x = 2; x < 27; x++) {
    const c = run.dungeon.cell(x, y);
    const isStairs = run.dungeon.stairs.x === x && run.dungeon.stairs.y === y;
    if (!isStairs && c.kind === 'dfloor' && run.dungeon.cell(x, y + 1).kind === 'dfloor') { spot = [x * 16 + 8, y * 16 + 8]; break; }
  }
  run.hero.x = spot[0]; run.hero.y = spot[1]; run.standT = 0;
  // چهار نخبه از جورهای مختلف دور قهرمان
  const pick = ['archer', 'bandit', 'slime', 'wolf', 'bat'];
  run.dungeon.enemies = pick.map((k, i) => {
    const ang = (i / pick.length) * Math.PI * 2;
    const ex = Math.round(run.hero.x + Math.cos(ang) * 52), ey = Math.round(run.hero.y + Math.sin(ang) * 34);
    return new Monster(k, run.dungeon.walkable(ex >> 4, ey >> 4) ? ex : run.hero.x + 30, run.dungeon.walkable(ex >> 4, ey >> 4) ? ey : run.hero.y + 10, 1, { elite: true });
  });
  const VW = 216, VH = 150;
  run.view = { w: VW, h: VH };
  for (let i = 0; i < 8; i++) run.update(1 / 30);
  const FRAMES = 160;
  let crownGlued = 0, checks = 0;
  for (let i = 0; i < FRAMES; i++) {
    run.update(1 / 30);
    run.hero.hp = run.maxHp;
    const es = run.dungeon.enemies.filter((e) => e.state !== 'die');
    if (es.length) {
      let best = null, bd = 1e9;
      for (const e of es) { const d = Math.hypot(e.x - run.hero.x, e.y - run.hero.y); if (d < bd) { bd = d; best = e; } }
      const dx = best.x - run.hero.x, dy = best.y - run.hero.y, d = Math.hypot(dx, dy) || 1;
      if (d > 22) {
        const sp = 84 / 30;
        const nx = run.hero.x + (dx / d) * sp, ny = run.hero.y + (dy / d) * sp;
        if (run.dungeon.walkable(Math.floor(nx / 16), Math.floor(run.hero.y / 16))) run.hero.x = nx;
        if (run.dungeon.walkable(Math.floor(run.hero.x / 16), Math.floor(ny / 16))) run.hero.y = ny;
      }
    }
    run.cam.x = Math.max(0, Math.min(480 - VW, run.hero.x - VW / 2));
    run.cam.y = Math.max(0, Math.min(320 - VH, run.hero.y - VH / 2));
    const r2 = new Raster(VW, VH);
    run.render(r2);
    savePNG(`${DIR}/gif47/f${String(i).padStart(3, '0')}.png`, r2);
    // هر ۱۶ فریم: تاج هر دشمن زنده چسبیده به سر؟
    if (i % 10 === 0) for (const e of run.dungeon.enemies) {
      if (e.state === 'die') continue;
      const cxx = Math.round(e.x) - run.cam.x;
      if (cxx < 4 || cxx > VW - 5) continue; // خارج کادر: چک نمی‌شود
      if (Math.abs(e.x - run.hero.x) < 36 && Math.abs(e.y - run.hero.y) < 22) continue; // پشت قهرمان: پوشیده‌شدن درست است
      if (run.dungeon.enemies.some((o) => o !== e && o.state !== 'die' && Math.abs(o.x - e.x) < 40 && o.y > e.y && o.y - e.y < 40)) continue; // پشت هیولای دیگر
      const sy = Math.round(e.y) - 100 - run.cam.y;
      const top = headTop(e) + sy;
      const crownY = Math.round(e.y - run.cam.y) - MHEAD[e.kind]; // فرمول واقعی بازی
      const mathOk = crownY >= top - 9 && crownY <= top + 5; // تاج چسبیده به سرِ فریم فعلی
      checks++; if (crownAt(r2.d, VW, cxx, top - 8, top + 7) >= 0 || mathOk) crownGlued++; // پیکسل یا فرمول (پیکسل گاهی زیر عمق/تاریکی می‌ماند)
    }
  }
  console.log('GIF: kills=' + run.kills + ' · projs=' + run.projs.length + ' · فریم‌ها: ' + FRAMES);
  A(crownGlued === checks && checks >= 8, 'GIF: تاج در تمام ' + checks + ' چکِ وسط نبرد چسبیده', crownGlued + '/' + checks);
  savePNG(DIR + '/elite_battle_mid.png', (() => { const rr = new Raster(VW, VH); run.render(rr); return rr; })());
}

console.log(`\nelite47: ${P} PASS / ${F} FAIL`);
process.exit(F ? 1 : 0);
