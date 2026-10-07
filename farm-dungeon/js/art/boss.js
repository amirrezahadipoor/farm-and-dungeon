// boss.js — «گولم‌لرد»: باس بزرگ (تا ۱۲۸px)، ۳ فاز رفتاری، ۳ حمله با تلگراف قرمز قبل از ضربه‌ی سنگین
import { Raster } from '../raster.js';
import { MC } from './monster_parts.js';
import { ease } from '../skeleton.js';

const BSPR = 128;
const OX = 64, OY = 112; // باس بزرگ است: مبدأ پایین‌تر تا داخل بوم جا شود
const sin = Math.sin, cos = Math.cos, PI = Math.PI;
const B = { body: MC.boss, hi: MC.bossHi, sh: MC.bossSh, out: MC.bossOut, red: MC.bossRed, gold: MC.bossGold, ember: MC.ember, dark: MC.dark, white: MC.white };

function lm(r, face) {
  const m = (v) => OX + v * face;
  return {
    px: (x, y, c) => r.px(m(x), y, c),
    line: (x1, y1, x2, y2, c) => r.line(m(x1), y1, m(x2), y2, c),
    lineW: (x1, y1, x2, y2, w, c) => r.lineW(m(x1), y1, m(x2), y2, w, c),
    rect: (x, y, w, h, c) => r.rect(face > 0 ? m(x) : m(x) - w, y, w, h, c),
    ellipse: (x, y, rx, ry, c) => r.ellipse(m(x), y, rx, ry, c),
    m,
  };
}

// opts: {state:'idle'|'move'|'attack'|'die', t, ph, time, face, atk:'slam'|'sweep'|'roar', phase:1..3, hit}
export function drawBossFrame(o) {
  const f = { state: o.state || 'idle', t: o.t ?? 0, ph: o.ph ?? 0, time: o.time ?? 0, face: o.face ?? 1 };
  const atk = o.atk || 'slam';
  const phase = o.phase || 1;
  const r = new Raster(BSPR, BSPR);
  const g = lm(r, f.face);

  let bob = sin(f.time * 0.9) * 1.5, lean = 0, armA = 0.45, shake = 0, warn = 0, dead = 0, jaw = 0, inhale = 0;
  const speed = phase === 3 ? 1.5 : phase === 2 ? 1.2 : 1; // فاز بالا‌تر = تندتر
  if (f.state === 'move') { bob = -Math.abs(sin(f.ph * PI)) * 3; lean = sin(f.ph * PI * 2) * 0.06; }
  else if (f.state === 'attack') {
    const wu = atk === 'slam' ? 0.5 : atk === 'sweep' ? 0.45 : 0.4; // سهم wind-up
    if (f.t < wu) {                                   // تلگراف: بازو بالا/عقب + برق قرمز
      const e = ease.outCubic(f.t / wu);
      warn = e;
      if (atk === 'slam') { armA = 0.45 - e * 2.2; lean = -e * 0.1; }
      else if (atk === 'sweep') { armA = 0.45 + e * 0.8; lean = -e * 0.14; }
      else { inhale = e; jaw = e; }
    } else if (f.t < wu + 0.2) {                      // ضربه
      const e = (f.t - wu) / 0.2;
      if (atk === 'slam') { armA = -1.75 + e * 2.6; lean = 0.16; shake = e < 0.5 ? 2 : 0; }
      else if (atk === 'sweep') { armA = 1.25 - e * 2.9; lean = 0.1; }
      else { jaw = 1; inhale = 1 - e; shake = e < 0.4 ? 1 : 0; }
    } else {                                          // ریکاوری
      const e = (f.t - wu - 0.2) / (1 - wu - 0.2);
      if (atk === 'slam') armA = 0.85 - e * 0.4;
      else if (atk === 'sweep') armA = -1.65 + e * 2.1;
      else { jaw = 1 - e; }
    }
  } else if (f.state === 'die') {
    dead = f.t;
    shake = dead < 0.3 ? 1 : 0;
  }
  const gy = OY + bob + (dead > 0.5 ? (dead - 0.5) * 20 : 0);
  const sx = shake ? (Math.floor(f.time * 40) % 2 ? 1.5 : -1.5) : 0;

  // --- پاها (ستون‌های سنگی) ---
  for (const dx of [-14, 5]) {
    g.rect(sx + dx, gy - 26, 11, 26, B.sh);
    g.rect(sx + dx, gy - 26, 11, 3, B.body);
    g.rect(sx + dx + 8, gy - 24, 3, 22, B.out);
    if (phase === 3) { g.rect(sx + dx + 2, gy - 20, 3, 1, B.red); g.rect(sx + dx + 4, gy - 12, 2, 1, B.ember); } // گداختگی
  }
  // --- تنه + شظايا (زره) ---
  const ty = gy - 66;
  g.rect(sx - 24, ty, 48, 40, B.body);
  g.rect(sx - 24, ty, 48, 4, B.hi); g.rect(sx - 24, ty + 36, 48, 4, B.sh);
  g.rect(sx - 8, ty + 6, 16, 22, B.sh);                       // صفحه‌ی سینه
  g.rect(sx - 7, ty + 7, 14, 3, B.hi);
  for (let i = 0; i < 4; i++) g.px(sx - 20 + i * 13, ty + 16, B.out); // پرچ‌های زره
  if (phase >= 2) { // فاز ۲: ترک‌های گداخته
    g.line(sx - 18, ty + 8, sx - 12, ty + 24, B.red); g.line(sx + 14, ty + 6, sx + 10, ty + 26, B.red);
    if (phase === 3) { // فاز ۳: خشم — ترک مرکزی + برق‌های گداخته
      g.line(sx - 4, ty + 4, sx + 2, ty + 30, B.red); g.px(sx, ty + 12, B.ember); g.px(sx - 2, ty + 20, B.ember);
      g.rect(sx - 12, ty + 28, 4, 2, B.ember); g.rect(sx + 9, ty + 10, 3, 2, B.ember);
    }
  }
  // --- بازوی دور ---
  g.lineW(sx - 20, ty + 8, sx - 26, ty + 30, 8, B.sh);
  // --- سر + کلاه‌تاج ---
  const hy = ty - 16 - inhale * 2;
  g.rect(sx - 9, hy, 18, 16, B.body);
  g.rect(sx - 9, hy, 18, 3, B.hi);
  g.rect(sx - 5, hy + 6, 11, 3, warn > 0.2 || jaw > 0.2 ? B.red : B.sh); // چشم
  for (let i = 0; i < 3; i++) g.rect(sx - 7 + i * 6, hy - 5, 3, 5, B.gold); // تاج
  if (jaw > 0.3) { g.rect(sx - 4, hy + 12, 9, 3 + Math.round(jaw * 3), B.dark); g.px(sx - 2, hy + 13, B.ember); } // غرش
  // --- بازوی نزدیک + چکش بزرگ ---
  const shx = sx + 20, shy = ty + 8;
  const hAng = f.state === 'attack' ? armA : 0.45 + sin(f.time * 0.8) * 0.05;
  const hx = shx + cos(hAng) * 20, hy2 = shy + sin(hAng) * 20;
  g.lineW(shx, shy, hx, hy2, 9, B.body);
  g.lineW(shx, shy - 3, hx, hy2 - 3, 2, B.hi);
  // چکش: دسته ادامه‌ی بازو + سر بزرگ
  const ex = hx + cos(hAng) * 14, ey = hy2 + sin(hAng) * 14;
  g.lineW(hx, hy2, ex, ey, 4, MC.wood ?? B.sh);
  const perp = hAng + PI / 2;
  const h1 = [ex + cos(perp) * 8, ey + sin(perp) * 8], h2 = [ex - cos(perp) * 8, ey - sin(perp) * 8];
  g.lineW(h1[0], h1[1], h2[0], h2[1], 12, B.body);
  g.lineW(h1[0], h1[1] - 5, h2[0], h2[1] - 5, 2, B.hi);
  // --- تلگراف زمین: مثلث قرمز چشمک‌زن زیر هدف ---
  if (f.state === 'attack' && f.t < (atk === 'slam' ? 0.5 : atk === 'sweep' ? 0.45 : 0.4)) {
    const blink = Math.floor(f.time * 12) % 2 === 0;
    const c = blink ? B.red : [MC.bossRed[0], MC.bossRed[1], MC.bossRed[2], 120];
    for (let i = 0; i < 4; i++) g.rect(sx + 22 - i * 2, OY - 1 - i * 3, i * 4 + 2, 2, c);
  }
  // --- موج ضربه (بعد از کوبش/غرش) ---
  if (f.state === 'attack' && f.t > 0.55 && f.t < 0.85) {
    const rr = Math.round((f.t - 0.55) * 40);
    for (let a = -1.4; a <= 1.4; a += 0.22) g.px(sx + cos(a) * rr, OY + 1 - Math.abs(sin(a)) * 3, B.ember);
  }
  // --- مرگ: ترک‌ها + فروپاشی + افتادن تاج ---
  if (dead > 0) {
    g.line(sx - 16, ty, sx - 4, ty + 20 * Math.min(1, dead * 2), B.out);
    g.line(sx + 14, ty + 30, sx + 6, ty + 30 - 24 * Math.min(1, dead * 2), B.out);
    if (dead > 0.35) g.rect(sx - 7, hy - 5, 18, 5, [0, 0, 0, 0]); // پاک کردن تاج از سر
    const fall = Math.min(1, Math.max(0, (dead - 0.35) * 2));
    g.rect(sx - 6 + fall * 8, hy - 5 + fall * 26, 3, 5, B.gold); g.rect(sx - 1 + fall * 10, hy - 5 + fall * 28, 3, 5, B.gold); g.rect(sx + 4 + fall * 6, hy - 5 + fall * 25, 3, 5, B.gold);
    if (dead > 0.6) { g.rect(sx - 20, gy - 20, 14, 8, B.out); g.rect(sx + 8, gy - 14, 12, 7, B.out); } // خرده‌سنگ
  }
  r.outline(B.out);
  if (o.hit) for (let y = 0; y < BSPR; y++) for (let x = 0; x < BSPR; x++) { const c = r.get(x, y); if (c && c[3] > 120) r.px(x, y, MC.white); }
  const out = new Raster(BSPR, BSPR);
  out.ellipse(OX, OY + 2, 20, 6, [8, 6, 14, 70]);
  r.over(out);
  return out;
}
