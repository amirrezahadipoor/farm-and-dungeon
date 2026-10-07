// monster_bodies2.js — بدنه‌ی ۷ هیولای ن۴۴ (مومیایی/کماندار/قوچ/یخ‌مرد/آتش‌جان/دزد/خرگوش)
// همان قرارداد monster_bodies: (r, f) با f={state,t,ph,face,time} — فقط هندسه/انیمیشن
import { MC, MOY, lm, wind } from './monster_parts.js';

const sin = Math.sin, cos = Math.cos, PI = Math.PI;

// ---------- مومیایی: بدن پیچیده با باند، خزیدن کج ---------- 
function dMummy(r, f) {
  const g = lm(r, f.face);
  let lean = 0, yOff = 0, dead = 0, arm = 0;
  if (f.state === 'idle') { lean = sin(f.time * 1.1) * 2; yOff = sin(f.time * 2) * 1; }
  else if (f.state === 'move') { lean = 5 + sin(f.ph * PI * 2) * 3; yOff = -Math.abs(sin(f.ph * PI * 2)) * 2; }
  else if (f.state === 'attack') {
    if (f.t < 0.5) { const e = wind(f.t, 0.5); lean = -6 * e; arm = e; }     // عقب‌نشینی بازو
    else { const e = (f.t - 0.5) / 0.5; lean = 8 * (1 - e * 0.5); arm = 1 - e; } // کوبیدن
  } else if (f.state === 'die') { dead = f.t; lean = 6; }
  const bx = lean * 0.4, by = MOY - 15 + yOff;
  // بدن: ستون باند‌پیچ
  g.rect(bx - 7, by - 12, 14, 26, MC.mummy);
  g.rect(bx - 7, by - 12, 14, 2, MC.mummyHi);
  for (const y of [by - 8, by - 2, by + 4, by + 10]) g.rect(bx - 7, y, 14, 1, MC.mummySh); // باند افقی
  g.rect(bx + 4, by - 12, 3, 26, MC.mummySh); // نوار سایه کنار
  // سر: کلاه‌خود باند با چشم درخشان
  g.rect(bx - 5 + lean * 0.3, by - 19, 11, 8, MC.mummy);
  g.rect(bx - 5 + lean * 0.3, by - 19, 11, 2, MC.mummyHi);
  g.rect(bx - 4 + lean * 0.3, by - 16, 3, 2, MC.dark); g.rect(bx + 1 + lean * 0.3, by - 16, 3, 2, MC.dark);
  if (f.state !== 'die') { g.px(bx - 3 + lean * 0.3, by - 15, [255, 214, 92, 255]); g.px(bx + 2 + lean * 0.3, by - 15, [255, 214, 92, 255]); }
  // بازوهای باند‌پیچ (حمله: تاب رو به جلو)
  const ax = bx + 6, swing = f.state === 'attack' ? arm * 10 : 0;
  g.lineW(ax, by - 6, ax + 4 + swing, by + 2 - arm * 6, 3, MC.mummySh);
  g.lineW(bx - 6, by - 6, bx - 9, by + 2, 3, MC.mummySh);
  // پاها
  const st = f.state === 'move' ? sin(f.ph * PI * 2) * 3 : 0;
  g.rect(bx - 5, MOY - 3, 4, 3, MC.mummySh); g.rect(bx + 1, MOY - 3, 4, 3, MC.mummySh);
  if (st) g.px(bx - 5 + st, MOY, MC.mummyOut);
  // مرگ: باند‌ها باز می‌شوند
  if (dead > 0) {
    const e = dead;
    for (let i = 0; i < 4; i++) g.lineW(bx - 6 + i * 4, by - 14 + e * 20, bx - 10 + i * 5 + e * 12, by - 8 + e * 26, 1, [MC.mummyHi[0], MC.mummyHi[1], MC.mummyHi[2], Math.round(255 * (1 - e))]);
  }
}

// ---------- کماندار: اسکلت با کمان — کشیدن/رها کردن ---------- 
function dArcher(r, f) {
  const g = lm(r, f.face);
  let pull = 0, yOff = 0, dead = 0, recoil = 0;
  if (f.state === 'idle') yOff = sin(f.time * 2) * 1;
  else if (f.state === 'move') yOff = -Math.abs(sin(f.ph * PI * 2)) * 2;
  else if (f.state === 'attack') {
    if (f.t < 0.5) pull = wind(f.t, 0.5);          // کشیدن زه
    else { recoil = 1 - (f.t - 0.5) / 0.5; pull = 0; } // رها + لگد
  } else if (f.state === 'die') dead = f.t;
  const bx = 0, by = MOY - 16 + yOff;
  const fade = 1 - dead;
  const a = (c) => [c[0], c[1], c[2], Math.round(c[3] * fade)];
  // اسکلت (هم‌زبان dSkeleton): دنده + لگن + جمجمه
  g.rect(bx - 2, by + 8, 4, 4, a(MC.bone)); // لگن
  for (let i = 0; i < 3; i++) g.rect(bx - 4, by - 2 + i * 4, 8, 1, a(MC.bone)); // دنده
  g.lineW(bx, by + 9, bx + (f.state === 'move' ? sin(f.ph * PI * 2) * 3 : 0), MOY - 2, 1, a(MC.boneSh)); // پا
  g.rect(bx - 4, by - 10, 9, 8, a(MC.bone)); // جمجمه
  g.rect(bx - 4, by - 10, 9, 2, a(MC.boneHi));
  g.rect(bx - 2, by - 7, 2, 2, a(MC.dark)); g.rect(bx + 1, by - 7, 2, 2, a(MC.dark)); // چشم‌ها
  if (f.state === 'attack' && f.t > 0.42 && f.t < 0.62) { g.px(bx - 1, by - 3, a(MC.eyeRed)); g.px(bx + 2, by - 3, a(MC.eyeRed)); } // چشم قرمز هنگام شلیک
  // کمان: قوس عمودی جلو + زه + تیر (با کشش عقب می‌رود)
  const hx = bx + 8 - recoil * 2; // دست کمان
  const bowX = hx + 3 + pull * -2;
  g.lineW(bowX, by - 12, bowX, by + 4, 1, a(MC.archerBow)); // قوس ساده
  g.px(bowX - 1, by - 13, a(MC.archerBowHi)); g.px(bowX - 1, by + 5, a(MC.archerBowHi)); // نوک‌ها
  g.line(bowX, by - 12, bowX - pull * 5, by - 4, a(MC.boneOut)); g.line(bowX, by + 4, bowX - pull * 5, by - 4, a(MC.boneOut)); // زه
  if (pull > 0.1) g.lineW(bowX - pull * 5, by - 4, bowX + 4, by - 4, 1, a(MC.archerBowHi)); // تیر روی زه
  // بازوی کشیدن
  g.lineW(bx + 2, by - 2, bowX - pull * 5, by - 4, 1, a(MC.bone));
  if (dead > 0) { g.px(bx - 6 + dead * 4, by - 8 + dead * 14, a(MC.boneSh)); g.px(bx + 5 - dead * 3, by - 4 + dead * 12, a(MC.bone)); }
}

// ---------- قوچ: گوسفند پشمالو با شاخ حلزونی — یورتم و یورش ---------- 
function dRam(r, f) {
  const g = lm(r, f.face);
  let yOff = 0, crouch = 0, stretch = 0, dead = 0, headY = 0;
  if (f.state === 'idle') yOff = sin(f.time * 1.6) * 1;
  else if (f.state === 'move') yOff = -Math.abs(sin(f.ph * PI * 2)) * 2.5;
  else if (f.state === 'attack') {
    if (f.t < 0.5) { const e = wind(f.t, 0.5); crouch = e; }                   // یورتم: جمع شدن
    else if (f.t < 0.85) { stretch = 1; }                                       // یورش
    else { const e = (f.t - 0.85) / 0.15; crouch = -e * 0.4; stretch = 1 - e; } // ترمز
  } else if (f.state === 'die') dead = f.t;
  const bx = -2 + stretch * 6, by = MOY - 12 + yOff + crouch * 3;
  headY = by - 3 + crouch * 3;
  // بدن پشمالو: بیضی پرزدار
  for (let dy = -9; dy <= 7; dy++) {
    const w2 = Math.round(11 * Math.sqrt(Math.max(0, 1 - (dy / 10) ** 2)));
    if (w2 < 1) continue;
    for (let dx = -w2; dx <= w2; dx++) {
      const pz = ((dx * 7 + dy * 13 + 3) % 5 === 0) ? MC.ramSh : MC.ram;
      g.px(bx + dx, by + dy + (dx & 1 && f.state !== 'idle' ? 0 : 0), pz);
    }
  }
  g.ellipse(bx - 3, by - 6, 6, 4, MC.ramHi); // پشمالویی روشن بالا
  // پاها
  const st = f.state === 'move' ? sin(f.ph * PI * 2) * 3 : 0;
  g.rect(bx - 6 + st, MOY - 4, 3, 4, MC.ramSh); g.rect(bx + 3 - st, MOY - 4, 3, 4, MC.ramSh);
  // سر پایین‌آمده + شاخ حلزونی
  const hx = bx + 10 + stretch * 5, hy = headY + 2;
  g.rect(hx - 3, hy - 4, 8, 8, MC.ramSh);
  g.rect(hx - 3, hy - 4, 8, 2, MC.ram);
  g.rect(hx + 4, hy - 1, 2, 2, MC.ramOut); // پوزه
  g.px(hx + 2, hy - 2, MC.dark); // چشم
  // شاخ: قوس رو به جلو
  g.lineW(hx - 1, hy - 5, hx + 4, hy - 10, 2, MC.ramHorn);
  g.lineW(hx + 4, hy - 10, hx + 9, hy - 7, 2, MC.ramHorn);
  g.px(hx + 9, hy - 7, MC.ramHornSh); g.px(hx + 4, hy - 10, MC.ramHornSh);
  if (stretch) { g.px(hx + 12, hy - 2, [255, 255, 255, 90]); g.px(hx + 14, hy + 1, [255, 255, 255, 60]); } // بویرِ شارژ
  if (dead > 0) { // افتادن پهلو
    g.ellipse(bx, MOY - 4, 13 * (0.6 + dead * 0.4), 6, [MC.ram[0], MC.ram[1], MC.ram[2], Math.round(255 * (1 - dead * 0.8))]);
  }
}

// ---------- یخ‌مرد: میمون سفید حجیم با مشت دوتایی ---------- 
function dYeti(r, f) {
  const g = lm(r, f.face);
  let yOff = 0, rage = 0, dead = 0, slam = 0;
  if (f.state === 'idle') yOff = sin(f.time * 1.3) * 1.5;
  else if (f.state === 'move') yOff = -Math.abs(sin(f.ph * PI * 2)) * 3;
  else if (f.state === 'attack') {
    if (f.t < 0.5) { rage = wind(f.t, 0.5); yOff = -rage * 3; }   // بالا بردن مشت‌ها
    else { slam = 1 - (f.t - 0.5) / 0.5; rage = 1; yOff = slam * 2; } // کوبیدن
  } else if (f.state === 'die') dead = f.t;
  const bx = 0, by = MOY - 16 + yOff;
  const fade = 1 - dead * 0.9;
  const a = (c) => [c[0], c[1], c[2], Math.round(c[3] * fade)];
  // بدن حجیم
  g.ellipse(bx, by, 13, 15, a(MC.yeti));
  g.ellipse(bx - 3, by - 6, 7, 6, a(MC.white));        // پشتی روشن
  g.ellipse(bx, by + 8, 10, 5, a(MC.yetiSh));          // پایین تیره
  // سر کوچک بالا
  g.ellipse(bx + 2, by - 15, 7, 6, a(MC.yeti));
  g.ellipse(bx + 2, by - 17, 4, 3, a(MC.white));
  g.rect(bx, by - 16, 2, 2, a(MC.dark)); g.rect(bx + 4, by - 16, 2, 2, a(MC.dark)); // چشم‌ها
  g.rect(bx + 1, by - 12, 4, 1, a(MC.yetiSkin)); // بینی/دهان
  // بازوهای بلند + مشت‌ها (حمله: بالا سپس کوبش جلو)
  const ay = by - 4 - rage * 10 + slam * 12;
  g.lineW(bx - 10, by + 2, bx - 14, ay, 4, a(MC.yeti));
  g.lineW(bx + 10, by + 2, bx + 14, ay, 4, a(MC.yeti));
  g.ellipse(bx - 14, ay, 4, 4, a(MC.yetiSh)); g.ellipse(bx + 14, ay, 4, 4, a(MC.yetiSh)); // مشت‌ها
  // پاها
  g.rect(bx - 7, MOY - 5, 5, 5, a(MC.yetiSh)); g.rect(bx + 2, MOY - 5, 5, 5, a(MC.yetiSh));
  // خشم: نفس سرد (ذرات یخ ثابت هنگام باداُپ)
  if (rage > 0.5 && f.state === 'attack' && f.t < 0.5) { g.px(bx - 5, by - 20, [190, 230, 250, 180]); g.px(bx + 8, by - 22, [190, 230, 250, 140]); }
}

// ---------- آتش‌جان: روح شعله کوچک — تف‌کردن گلوله‌ی آتش ---------- 
function dImp(r, f) {
  const g = lm(r, f.face);
  let yOff = sin(f.time * 2.6) * 3, spit = 0, dead = 0, scowl = 0;
  if (f.state === 'move') yOff = -6 - Math.abs(sin(f.ph * PI * 2)) * 5;
  else if (f.state === 'attack') {
    if (f.t < 0.5) { const e = wind(f.t, 0.5); yOff -= e * 4; scowl = e; } // نفس‌کردن داخل
    else { spit = 1 - (f.t - 0.5) / 0.5; yOff += 2; scowl = 1; }           // تف
  } else if (f.state === 'die') dead = f.t;
  const bx = 0, by = MOY - 16 + yOff;
  const fade = 1 - dead;
  const a = (c) => [c[0], c[1], c[2], Math.round(c[3] * fade)];
  // بدن: قطره‌ی شعله (لبه تیره، داخل اصلی، هسته روشن)
  for (let dy = -14; dy <= 8; dy++) {
    const k = (dy + 14) / 22;
    const w2 = Math.round(9 * Math.sin(PI * Math.min(1, 0.15 + k * 0.92)));
    if (w2 < 1) continue;
    const col = dy < -8 ? a(MC.impSh) : dy > 4 ? a(MC.imp) : a(MC.impHi);
    for (let dx = -w2; dx <= w2; dx++) if ((dx * 5 + dy * 3) % 7 !== 0) g.px(bx + dx, by + dy, col); // سوراخ‌های شعله
  }
  // زبانه‌ی سر (موج آرام)
  const fl = sin(f.time * 3) * 2;
  g.px(bx, by - 16, a(MC.impSh)); g.px(bx - 1 + fl * 0.5, by - 18, a(MC.impHi)); g.px(bx + 1, by - 15, a(MC.imp));
  // چشم‌های شرور + دهان
  g.rect(bx - 5, by - 6, 3, 2, a(MC.dark)); g.rect(bx + 2, by - 6, 3, 2, a(MC.dark));
  if (scowl > 0.3) { g.px(bx - 4, by - 7, a(MC.dark)); g.px(bx + 3, by - 7, a(MC.dark)); }
  g.rect(bx - 2 + spit * 3, by - 1, 5, 2, a(MC.dark)); // دهان (هنگام تف جلو)
  // ذره‌ی آتش داخل (هسته)
  g.px(bx, by + 2, a(MC.impHi)); g.px(bx - 1, by + 3, a(MC.imp));
  if (dead > 0) { for (let i = 0; i < 3; i++) g.px(bx - 6 + i * 6, by - 10 - dead * 16 + i * 4, [MC.impHi[0], MC.impHi[1], MC.impHi[2], Math.round(200 * (1 - dead))]); }
}

// ---------- دزد: شنل кап‌دار + خنجر — دزدیدن و گریز ---------- 
function dBandit(r, f) {
  const g = lm(r, f.face);
  let lean = 3, yOff = 0, stab = 0, dead = 0;
  if (f.state === 'idle') { lean = sin(f.time * 1.4) * 2; yOff = sin(f.time * 2.4) * 1; }
  else if (f.state === 'move') { lean = 6 + Math.abs(sin(f.ph * PI)) * 2; yOff = -Math.abs(sin(f.ph * PI * 2)) * 3; }
  else if (f.state === 'attack') {
    if (f.t < 0.5) { const e = wind(f.t, 0.5); lean = -4 * e; stab = e; }
    else { stab = 1 - (f.t - 0.5) / 0.5; lean = 7; }
  } else if (f.state === 'die') dead = f.t;
  const bx = lean * 0.3, by = MOY - 14 + yOff;
  const fade = 1 - dead;
  const a = (c) => [c[0], c[1], c[2], Math.round(c[3] * fade)];
  // شنل: ذوزنقه با لبه‌ی موجی
  for (let dy = -10; dy <= 10; dy++) {
    const w2 = 6 + Math.floor((dy + 10) * 0.45);
    const wob = dy > 6 ? sin(f.time * 5 + dy) * 1 : 0;
    for (let dx = -w2; dx <= w2; dx++) g.px(bx + dx + wob, by + dy, a(dy < -6 ? MC.banditHi : (dx > w2 - 3 ? MC.banditSh : MC.bandit)));
  }
  // کلاه‌کپ
  g.ellipse(bx + 1, by - 11, 6, 5, a(MC.bandit));
  g.rect(bx - 3, by - 12, 8, 3, a(MC.banditSh));
  // صورت زیر کلاه: فقط چشم‌ها
  g.rect(bx + 1, by - 10, 2, 2, a(MC.white)); g.px(bx + 4, by - 10, a(MC.white));
  // خنجر (حمله: ضربه به جلو)
  const kx = bx + 8 + stab * 8;
  g.lineW(bx + 5, by + 2, kx, by - 1 + stab * 2, 1, a(MC.boneHi));
  g.px(kx + 1, by - 1 + stab * 2, a(MC.white));
  // کیسه‌ی دزدی (بعد از دزدیدن: برآمدگی طلایی) — bulge از فیلد a.f? از time نمی‌شود؛ از اینجا: کیسه همیشه، طلاییِ آن با نگاه دیده می‌شود
  g.ellipse(bx - 7, by + 4, 3, 3, a(MC.banditSh));
  g.px(bx - 7, by + 3, a(MC.bossGold));
  // پاها
  const st = f.state === 'move' ? sin(f.ph * PI * 2) * 4 : 0;
  g.rect(bx - 4 + st, MOY - 4, 3, 4, a(MC.banditSh)); g.rect(bx + 2 - st, MOY - 4, 3, 4, a(MC.banditSh));
  if (dead > 0.4) { // سکه‌های ریخته
    g.px(bx - 9, MOY - 2, a(MC.bossGold)); g.px(bx + 7, MOY - 3, a(MC.bossGold));
  }
}

// ---------- خرگوش غول‌پیکر: گوش‌های بلند، جهش فنری ---------- 
function dHare(r, f) {
  const g = lm(r, f.face);
  let w = 20, h = 16, yOff = 0, xOff = 0, earT = 0, dead = 0;
  if (f.state === 'idle') { const br2 = sin(f.time * 2.5); w += br2; h -= br2 * 0.6; earT = sin(f.time * 1.8) * 2; }
  else if (f.state === 'move') {
    const ph = f.ph % 1, hop = Math.abs(sin(PI * ph));
    yOff = -hop * 13;
    const sq = ph < 0.14 || ph > 0.92 ? 1.3 : (ph > 0.25 && ph < 0.7 ? 0.8 : 1);
    w *= sq; h /= sq; xOff = ph * 16 - 8;
    earT = -hop * 3;
  } else if (f.state === 'attack') {
    if (f.t < 0.45) { const e = wind(f.t, 0.45); w *= 1 + 0.25 * e; h *= 1 + 0.25 * e; earT = -4 * e; }
    else { const e = (f.t - 0.45) / 0.55; w *= 1.15 - e * 0.2; h *= 0.75; xOff = 10 * e; earT = 3; }
  } else if (f.state === 'die') { dead = f.t; h = 16 * (1 - dead) + 4 * dead; w = 20 + 10 * dead; earT = dead * 6; }
  const cx = xOff, cy = MOY - h / 2 - yOff;
  // بدن
  g.ellipse(cx, cy, w / 2, h / 2, MC.hare);
  g.ellipse(cx - w * 0.15, cy - h * 0.2, w * 0.28, h * 0.26, MC.hareHi);
  g.ellipse(cx + w * 0.2, cy + h * 0.15, w * 0.24, h * 0.2, MC.hareSh);
  // سر جلو
  const hx = cx + w * 0.38, hy = cy - h * 0.25;
  g.ellipse(hx, hy, 6, 5.5, MC.hare);
  g.ellipse(hx + 1, hy - 2, 3, 2.5, MC.hareHi);
  g.px(hx + 4, hy - 1, MC.dark); // چشم
  g.px(hx + 6, hy + 1, MC.hareIn); // بینی
  // گوش‌های بلند (عقب‌خم هنگام جهش)
  for (const ex of [hx - 3, hx + 1]) {
    g.lineW(ex, hy - 4, ex - 2 + earT * 0.4, hy - 20 + earT, 2, MC.hare);
    g.lineW(ex, hy - 4, ex - 2 + earT * 0.4, hy - 20 + earT, 1, MC.hareIn);
  }
  // پنجه‌ها (فشرده هنگام جهش)
  if (yOff < -4) { g.px(cx - 5, MOY - 2 + yOff * 0.4, MC.hareSh); g.px(cx + 4, MOY - 2 + yOff * 0.4, MC.hareSh); }
  if (dead > 0.5) { g.px(cx - 8, MOY - 2, [MC.hareSh[0], MC.hareSh[1], MC.hareSh[2], Math.round(255 * (1 - dead))]); }
}

// ---------- جدول‌ها (ن۴۴) ----------
export const MBODY2 = { mummy: dMummy, archer: dArcher, ram: dRam, yeti: dYeti, imp: dImp, bandit: dBandit, hare: dHare };
export const MOUT2 = { mummy: MC.mummyOut, archer: MC.boneOut, ram: MC.ramOut, yeti: MC.yetiOut, imp: MC.impOut, bandit: MC.banditOut, hare: MC.hareOut };
export const MSHW2 = { mummy: [10, 3], archer: [9, 3], ram: [14, 4], yeti: [16, 5], imp: [8, 3], bandit: [10, 3], hare: [11, 4] };
