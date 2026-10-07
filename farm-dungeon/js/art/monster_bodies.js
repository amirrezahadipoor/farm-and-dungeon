// monster_bodies.js — بدنه‌ی ۷ هیولا (اسلایم/خفاش/گرگ/اسکلت/گولم/عنکبوت/روح) — جداسازی از monsters.js (ن۳۴)
// هر بدنه: (r, f) با f={state,t,ph,face,time} — فقط هندسه/انیمیشن؛ rim/outline/سایه در monsters.js
import { ik, ease } from '../skeleton.js';
import { MC, MOY, lm, wind } from './monster_parts.js';

const sin = Math.sin, cos = Math.cos, PI = Math.PI; // نام‌کوتاه‌های محلی

// ---------- اسلایم: بدن فنری squash/stretch ----------
function dSlime(r, f) {
  const g = lm(r, f.face);
  let w = 26, h = 20, xOff = 0, yOff = 0, dead = 0;
  const br = sin(f.time * 2.2);
  if (f.state === 'idle') { w += br; h -= br * 0.7; }
  else if (f.state === 'move') {
    const ph = f.ph % 1, hop = Math.abs(sin(PI * ph));
    yOff = -hop * 11;
    const sq = ph < 0.14 || ph > 0.92 ? 1.28 : (ph > 0.25 && ph < 0.7 ? 0.82 : 1);
    w *= sq; h /= sq; xOff = ph * 14 - 7;
  } else if (f.state === 'attack') {
    if (f.t < 0.45) { const e = wind(f.t, 0.45); w *= 1 + 0.32 * e; h *= 1 + 0.32 * e; }       // باد کردن
    else if (f.t < 0.7) { const e = (f.t - 0.45) / 0.25; w *= 1.35 - 0.25 * e; h *= 0.68; xOff = 4 + e * 14; } // پرش
    else { w *= 1.12; h *= 0.9; xOff = 16 * (1 - (f.t - 0.7) / 0.3 * 0.4); }
  } else if (f.state === 'die') { dead = ease.outCubic(f.t); h = 20 * (1 - dead) + 3 * dead; w = 26 + 14 * dead; }
  const cy = MOY - h / 2 - yOff;
  g.ellipse(xOff, cy, w / 2, h / 2, MC.slime);
  g.ellipse(xOff, cy - h * 0.18, w * 0.3, h * 0.26, MC.slimeHi);
  g.ellipse(xOff, MOY - h * 0.18 - yOff, w * 0.4, h * 0.3, MC.slimeSh);
  if (dead < 0.7) { // چشم‌های جدا
    for (const ex of [xOff - 4, xOff + 4]) {
      g.rect(ex - 1, cy - 4, 3, 3, MC.dark);
      if (f.state === 'die' && dead > 0.35) { g.px(ex - 2, cy - 5, MC.dark); g.px(ex + 1, cy - 2, MC.dark); }
      else g.px(ex, cy - 4, MC.white);
    }
    g.rect(xOff - 1, cy + 2, 3, 1, MC.dark); // دهان
  }
}

// ---------- خفاش: بال ۴ فریم + پرواز موجی ----------
function dBat(r, f) {
  const g = lm(r, f.face);
  let yOff = -46, flap = 0, fold = 0, limp = 0, tilt = 0;
  if (f.state === 'idle') { yOff += sin(f.time * 2) * 3; flap = sin(f.time * 5) * 0.5; }
  else if (f.state === 'move') { yOff += sin(f.time * 3.2) * 7; flap = sin(f.ph * PI * 4); }
  else if (f.state === 'attack') {
    if (f.t < 0.45) { const e = wind(f.t, 0.45); yOff -= e * 12; fold = e; }                     // بالا رفتن
    else if (f.t < 0.65) { const e = (f.t - 0.4) / 0.25; yOff += e * 22; tilt = e * 0.5; }     // شیرجه
    else { yOff += 8; }
  } else if (f.state === 'die') {
    const e = f.t;
    yOff = -46 + e * e * 40; limp = 1; tilt = sin(e * 9) * 0.4 * (1 - e);
  }
  const bx = 0, by = MOY + yOff;
  const wing = (sgn) => {
    const tipY = by - 8 - flap * 9 - fold * 5 + limp * 8;
    const midY = by - 3 - flap * 4 - fold * 8 + limp * 6;
    g.lineW(bx + sgn * 3, by - 3, bx + sgn * 15, tipY, 2, MC.batSh);
    g.lineW(bx + sgn * 3, by - 3, bx + sgn * 10, midY, 2, MC.batSh);
    g.lineW(bx + sgn * 15, tipY, bx + sgn * 10, midY, 1, MC.bat);
    g.lineW(bx + sgn * 3, by - 1, bx + sgn * 9, by - 3 - flap * 2, 1, MC.bat); // غشای داخلی
  };
  wing(1); wing(-1);
  g.rect(bx - 4, by - 5, 9, 9, MC.bat);          // بدن
  g.rect(bx - 3, by - 5, 7, 2, MC.batHi);
  g.px(bx - 4, by - 7, MC.bat); g.px(bx + 4, by - 7, MC.bat); // گوش‌ها
  if (f.state !== 'die') {
    g.px(bx - 2, by - 2, MC.eyeRed); g.px(bx + 2, by - 2, MC.eyeRed);
    if (f.state === 'attack' && f.t > 0.4 && f.t < 0.7) { g.px(bx, by + 3, MC.fang); g.px(bx - 2, by + 3, MC.fang); }
  } else { g.px(bx - 2, by - 2, MC.batSh); g.px(bx + 2, by - 2, MC.batSh); }
}

// ---------- گرگ: چهارپا با تات (گام مورب) ----------
function dWolf(r, f) {
  const g = lm(r, f.face);
  let bob = 0, crouch = 0, lunge = 0, jaw = 0, dead = 0;
  if (f.state === 'idle') { bob = sin(f.time * 2) * 0.8; }
  else if (f.state === 'move') { bob = Math.abs(sin(f.ph * PI * 2)) * -1.6; }
  else if (f.state === 'attack') {
    if (f.t < 0.55) { crouch = wind(f.t, 0.55); }                                              // نشستن عقب
    else if (f.t < 0.78) { const e = (f.t - 0.55) / 0.23; lunge = e; jaw = 1; }                  // گاز
    else { lunge = 1 - (f.t - 0.78) / 0.22; jaw = (f.t - 0.78) / 0.22 < 0.4 ? 1 : 0; }
  } else if (f.state === 'die') { dead = ease.outCubic(f.t); }
  const back = crouch * -5 + lunge * 12;
  const bodyY = MOY - 17 + bob + crouch * 3 + dead * 12;
  // دم
  g.lineW(back - 12, bodyY - 2, back - 17, bodyY - 7 - dead * -5 + (f.state === 'move' ? sin(f.ph * PI * 4) * 2 : 0), 2, MC.wolfSh);
  // پاها: جفت‌های مورب (FL+BR سپس FR+BL)
  const hips = [[-10, 0], [-7, 0.5], [8, 0.5], [11, 0]];
  for (const [hx, off] of hips) {
    let fx = hx + back, fy = MOY;
    if (f.state === 'move' && !dead) {
      const ph = (f.ph + off) % 1;
      const sw = sin(ph * PI * 2) * 5;
      const lift = ph < 0.5 ? sin(ph * PI * 2) * 3 : 0;
      fx = hx + sw; fy = MOY - lift;
    } else if (dead) { fx = hx + back; fy = MOY - 2; }
    else { fx = hx + back + (hx > 0 ? 2 : -2); }
    g.lineW(hx + back, bodyY + 3, fx, fy - 1, 3, MC.wolfSh);
    g.px(fx + 1, fy - 1, MC.wolfDark);
  }
  // بدن
  g.lineW(back - 11, bodyY, back + 9, bodyY, 8, MC.wolf);
  g.lineW(back - 10, bodyY - 3, back + 8, bodyY - 3, 2, MC.wolfHi);
  g.lineW(back - 8, bodyY + 3, back + 7, bodyY + 3, 2, MC.wolfSh);
  // سر + پوزه
  const hx = back + 11, hy = bodyY - 4 - crouch * 1 + lunge * 1;
  g.rect(hx, hy - 5, 9, 7, MC.wolf);
  g.rect(hx + 8, hy - 2, 5, 3, MC.wolfHi);                     // پوزه
  g.rect(hx + 12, hy - 1 + jaw, 2, 1, MC.dark);                // بینی/دهان باز
  if (jaw) { g.rect(hx + 8, hy + 1, 5, 2, MC.wolfDark); g.px(hx + 9, hy + 1, MC.white); g.px(hx + 12, hy + 1, MC.white); }
  g.rect(hx + 1, hy - 8, 2, 4, MC.wolf); g.px(hx + 4, hy - 7, MC.wolfSh); // گوش‌ها
  if (dead > 0.4) { g.px(hx + 4, hy - 3, MC.dark); g.px(hx + 6, hy - 1, MC.dark); } // چشم ×
  else g.px(hx + 4, hy - 3, f.state === 'attack' && jaw ? MC.eyeRed : MC.dark);
}

// ---------- اسکلت: مفصل‌بندی کامل + شمشیر زنگ‌زده ----------
function dSkeleton(r, f) {
  const g = lm(r, f.face);
  let step = 0, swordA = 2.2, fall = 0, bob = sin(f.time * 1.8) * 0.8;
  if (f.state === 'move') { step = f.ph; bob = Math.abs(sin(f.ph * PI * 2)) * -1.2; }
  else if (f.state === 'attack') {
    if (f.t < 0.5) swordA = 2.2 + wind(f.t, 0.5) * 1.1;                    // بالا بردن
    else if (f.t < 0.72) swordA = 3.3 - ((f.t - 0.5) / 0.22) * 4.2;        // برش
    else swordA = -0.9 + (f.t - 0.72) / 0.28 * 3.1;
  } else if (f.state === 'die') { fall = f.t; }
  const pelY = MOY - 15 + bob + fall * 12;
  const shake = f.state === 'die' ? sin(fall * 12) * 2 * (1 - fall) : 0;
  const cx = shake;
  // پاها
  for (const [off, sgn] of [[0, -1], [0.5, 1]]) {
    const ph = (step + off) % 1;
    const sw = f.state === 'move' ? sin(ph * PI * 2) * 4 : (sgn < 0 ? -2 : 2);
    const lift = f.state === 'move' && ph < 0.5 ? sin(ph * PI * 2) * 3 : 0;
    const hy2 = pelY + 3 + fall * 4;
    g.lineW(cx + sgn * 2, hy2, cx + sgn * 2 + sw, MOY - lift - fall * 8, 2, MC.bone);
    g.px(cx + sgn * 2 + sw + 1, MOY - lift - fall * 8, MC.boneSh);
  }
  // ستون فقرات + لگن + دنده‌ها
  g.lineW(cx, pelY, cx, pelY - 11, 2, MC.bone);
  g.rect(cx - 3, pelY - 1, 7, 2, MC.bone);
  const ribGap = 3 + fall * 2;
  for (let i = 0; i < 3; i++) g.lineW(cx - 5 + fall * i, pelY - 4 - i * ribGap, cx + 5 - fall * i, pelY - 4 - i * ribGap, 1, MC.bone);
  // جمجمه
  const skullY = pelY - 15 - fall * (fall > 0.4 ? (fall - 0.4) * 26 : 0);
  g.rect(cx - 3, skullY - 4, 8, 8, MC.bone);
  g.rect(cx - 3, skullY - 4, 8, 1, MC.boneHi);
  g.px(cx - 1, skullY - 1, MC.dark); g.px(cx + 2, skullY - 1, MC.dark);
  g.rect(cx, skullY + 2, 2, 1, MC.dark);
  // بازوها: دور آزاد + نزدیک با شمشیر
  const shY = pelY - 9;
  g.lineW(cx - 1, shY, cx - 6 + (f.state === 'move' ? sin((step + 0.5) * PI * 2) * 3 : 0), shY + 8, 2, MC.bone);
  const hand = [cx + 7 * cos(0.6), shY + 7 * sin(0.6)];
  if (f.state === 'attack') { hand[0] = cx + 8 * cos(swordA - 1.2); hand[1] = shY + 8 * sin(swordA - 1.2); }
  g.lineW(cx + 1, shY, hand[0], hand[1], 2, MC.bone);
  // شمشیر (مبدأ دست، تیغه به بیرون)
  const ang = f.state === 'attack' ? swordA : 0.9;
  const T = (x2, y2) => [hand[0] + x2 * cos(ang) - y2 * sin(ang), hand[1] + x2 * sin(ang) + y2 * cos(ang)];
  const t1 = T(2, 0), t2 = T(13, 0);
  r.lineW(g.m(hand[0]), hand[1], g.m(t1[0]), t1[1], 2, MC.rust);
  r.lineW(g.m(t1[0]), t1[1], g.m(t2[0]), t2[1], 3, MC.boneSh);
  r.lineW(g.m(t1[0]), t1[1] - 1, g.m(t2[0]), t2[1] - 1, 1, MC.boneHi);
}

// ---------- گولم سنگی: سنگین و کند + تکان زمین ----------
function dGolem(r, f) {
  const g = lm(r, f.face);
  let bob = sin(f.time * 1.1) * 1, lean = 0, armUp = 0, shake = 0, crack = 0, xOff = 0;
  if (f.state === 'move') { const st = Math.abs(sin(f.ph * PI)); bob = -st * 2; lean = sin(f.ph * PI * 2) * 0.05; xOff = 0; }
  else if (f.state === 'attack') {
    if (f.t < 0.55) { const e = wind(f.t, 0.55); armUp = e; lean = -e * 0.12; }               // بالا کشیدن
    else if (f.t < 0.72) { armUp = 1 - (f.t - 0.55) / 0.17; lean = 0.14; shake = 2; }          // کوبیدن
    else { lean = 0.1 * (1 - (f.t - 0.72) / 0.28); }
  } else if (f.state === 'die') { crack = f.t; }
  const gy = MOY + bob + (crack > 0.6 ? (crack - 0.6) * 14 : 0);
  const sx = xOff + shake * (f.t > 0.55 && f.t < 0.72 ? (Math.floor(f.t * 40) % 2 ? 1 : -1) : 0);
  // پاها
  g.rect(sx - 12, gy - 14, 9, 14, MC.golemSh); g.rect(sx + 3, gy - 14, 9, 14, MC.golemSh);
  g.rect(sx - 12, gy - 14, 9, 2, MC.golem); g.rect(sx + 3, gy - 14, 9, 2, MC.golem);
  // بدن (بلوک‌های سنگی)
  const ty = gy - 44;
  g.rect(sx - 15, ty, 30, 30, MC.golem);
  g.rect(sx - 15, ty, 30, 3, MC.golemHi); g.rect(sx - 15, ty + 27, 30, 3, MC.golemSh);
  g.line(sx - 6, ty + 4, sx - 6, ty + 26, MC.golemSh); g.line(sx + 7, ty + 4, sx + 7, ty + 26, MC.golemSh);
  g.px(sx - 11, ty + 8, MC.moss); g.px(sx - 10, ty + 9, MC.moss); g.px(sx + 12, ty + 20, MC.moss);
  // بازوها (بالا/پایین بسته به armUp)
  for (const sgn of [-1, 1]) {
    const ay = ty + 4 - armUp * 16;
    g.rect(sx + sgn * 19 - 4, ay, 8, 16, MC.golem);
    g.rect(sx + sgn * 19 - 4, ay + (armUp > 0.3 ? -6 : 12), 9, 9, MC.golemSh); // مشت
  }
  // سر + چشم
  const hy = ty - 11 + armUp * -2;
  g.rect(sx - 6, hy, 12, 11, MC.golem);
  g.rect(sx - 6, hy, 12, 2, MC.golemHi);
  g.rect(sx - 3, hy + 4, 7, 2, f.state === 'attack' && f.t < 0.72 ? MC.ember : MC.golemSh);
  // ترک‌های مرگ
  if (crack > 0) {
    const c = MC.golemOut;
    g.line(sx - 8, ty + 2, sx - 2, ty + 12 * crack + 4, c); g.line(sx + 6, ty + 26, sx + 2, ty + 26 - 16 * crack, c);
    if (crack > 0.5) { g.line(sx - 14, gy - 30, sx + 13, gy - 34, c); g.rect(sx - 15, ty + 13, 8, 6, MC.golemOut); g.rect(sx + 6, ty + 18, 9, 7, MC.golemOut); }
  }
  // گرد و غبار کوبش
  if (f.state === 'attack' && f.t >= 0.6 && f.t < 0.8) { for (const [dx, dy] of [[-20, -3], [22, -3], [-26, -6], [27, -7]]) g.px(sx + dx, MOY + dy, MC.dust); }
}

// ---------- عنکبوت: ۸ پا با گام موجی ----------
function dSpider(r, f) {
  const g = lm(r, f.face);
  let rear = 0, lunge = 0, curl = 0, bob = sin(f.time * 2.5) * 0.8;
  if (f.state === 'attack') {
    if (f.t < 0.5) { rear = wind(f.t, 0.5); }
    else if (f.t < 0.72) { const e = (f.t - 0.5) / 0.22; lunge = e; rear = 1 - e; }
    else { lunge = 1 - (f.t - 0.72) / 0.28; }
  } else if (f.state === 'die') { curl = f.t; }
  const cx = lunge * 12 - rear * 5;
  const bodyY = MOY - 13 + bob + rear * -3 + curl * 9;
  // پاها: ۴ جلو (این‌دست‌آن‌دست) + ۴ عقب
  for (let i = 0; i < 8; i++) {
    const front = i < 4;
    const side = i % 2 === 0 ? 1 : -1;              // بالا/پایین تصویر
    const baseA = front ? (-0.5 - (i >> 1) * 0.35) : (2.1 + (i & 1) * 0.3 + ((i - 4) >> 1) * 0.25);
    const anchor = [cx + (front ? 6 : -5) + (side < 0 ? 0.5 : 0), bodyY - 2];
    const reach = 13 + (i % 3);
    let foot = [anchor[0] + cos(baseA) * reach, MOY - 1];
    if (f.state === 'move' && !curl) {              // گام موجی: جفت‌های یک‌درمیان
      const ph = (f.ph + (i % 2) * 0.5 + (front ? 0.25 : 0)) % 1;
      const lift = ph < 0.5 ? sin(ph * PI * 2) * 4 : 0;
      foot = [anchor[0] + cos(baseA) * (reach + sin(ph * PI * 2) * 2), MOY - 1 - lift];
    }
    if (front && (rear || lunge)) foot[1] -= rear * 7 + lunge * 3;  // جلو بالا در wind-up
    if (curl) foot = [anchor[0] + (foot[0] - anchor[0]) * (1 - curl) * 0.9 + (front ? 4 : -4) * curl, bodyY - 6 - curl * 4 + (i % 3)]; // جمع‌شدن
    const { mid } = ik([g.m(anchor[0]), anchor[1]], [g.m(foot[0]), foot[1]], 9, 9, side);
    r.lineW(g.m(anchor[0]), anchor[1], mid[0], mid[1], 2, MC.spider);
    r.lineW(mid[0], mid[1], g.m(foot[0]), foot[1], 2, MC.spiderSh);
    r.px(g.m(foot[0]), foot[1], MC.spiderOut);
  }
  // بدن: شکم + سر
  g.ellipse(cx - 6, bodyY, 8, 6, MC.spider);
  g.ellipse(cx - 7, bodyY - 2, 5, 3, MC.spiderHi);
  g.rect(cx + 2, bodyY - 4, 7, 6, MC.spiderSh);
  if (!curl) {
    for (const [ex, ey] of [[5, -2], [7, -2], [4, 0], [7, 0]]) g.px(cx + ex, bodyY + ey, MC.eyeRed);
    if (f.state === 'attack' && f.t > 0.5 && f.t < 0.75) { g.px(cx + 9, bodyY + 1, MC.fang); g.px(cx + 8, bodyY + 2, MC.fang); }
  } else { g.px(cx + 5, bodyY - 2, MC.spiderOut); g.px(cx + 7, bodyY - 2, MC.spiderOut); }
}

// ---------- روح: شفاف، شناور، محو ----------
function dGhost(r, f) {
  const g = lm(r, f.face);
  let yOff = sin(f.time * 2) * 3, wob = 0, rage = 0, fade = 1, dash = 0;
  if (f.state === 'idle') { yOff += sin(f.time * 0.7) * 2; }
  else if (f.state === 'move') { yOff = sin(f.time * 3) * 4; wob = sin(f.time * 6) * 1.5; }
  else if (f.state === 'attack') {
    if (f.t < 0.55) { const e = wind(f.t, 0.55); rage = e; wob = e * 2; }                    // لرزش + چشم روشن
    else if (f.t < 0.75) { dash = (f.t - 0.55) / 0.2; rage = 1; }
    else { rage = 1 - (f.t - 0.75) / 0.25; dash = 1 - rage; }
  } else if (f.state === 'die') { fade = 1 - f.t; yOff = -f.t * 18; }
  const a = (col) => [col[0], col[1], col[2], Math.round(col[3] * fade)];
  const cx = wob + dash * 14, cy = MOY - 34 + yOff - rage * 2;
  // بدنه: نیم‌بیضی بالا + دنباله‌ی موجی
  const body = MC.ghost, hi = MC.ghostHi, sh = MC.ghostSh;
  for (let dy = -14; dy <= 10; dy++) {
    let w2 = dy < 0 ? Math.round(10 * Math.sqrt(1 - (dy / 15) ** 2)) : Math.round(10 - dy * 0.35);
    if (dy > 4) { const k = (dy - 4) / 6; w2 = Math.round((10 - dy * 0.35) * (0.75 + 0.25 * Math.abs(sin(f.time * 4 + k * 6))) * (1 - k * 0.5)); }
    if (w2 < 1) continue;
    const row = a(dy < -6 ? hi : dy > 6 ? sh : body);
    for (let dx = -w2; dx <= w2; dx++) g.px(cx + dx, cy + dy, row);
  }
  // چشم‌ها + دهان
  const eyeC = rage > 0.4 ? a(MC.ghostHi) : [20, 26, 34, Math.round(200 * fade)];
  for (const ex of [-4, 3]) { g.rect(cx + ex, cy - 4, 3, 4, eyeC); }
  if (f.state === 'attack' && f.t > 0.55 && f.t < 0.8) g.rect(cx - 1, cy + 2, 4, 3 + rage * 2, [20, 26, 34, Math.round(200 * fade)]);
  else g.rect(cx - 1, cy + 2, 3, 1, [20, 26, 34, Math.round(160 * fade)]);
  // رشته‌های محوشدن در مرگ
  if (f.state === 'die') for (let i = 0; i < 4; i++) g.px(cx + (i - 2) * 4, cy - 16 - f.t * 10 - i * 3, a(hi));
}

// بدنه‌های کلاسیک (۷) — رجیستری ادغام در monster_registry.js (ن۴۷)
export const MBODY_A = { slime: dSlime, bat: dBat, wolf: dWolf, skeleton: dSkeleton, golem: dGolem, spider: dSpider, ghost: dGhost };
export const MOUT_A = { slime: MC.slimeOut, bat: MC.batOut, wolf: MC.wolfOut, skeleton: MC.boneOut, golem: MC.golemOut, spider: MC.spiderOut, ghost: null };
export const MSHW_A = { slime: [11, 4], bat: [8, 3], wolf: [14, 4], skeleton: [10, 3], golem: [16, 5], spider: [13, 4], ghost: [9, 3] };
