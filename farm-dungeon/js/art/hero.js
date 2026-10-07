// hero.js — رسم قهرمان: اسکلت ۱۷ مفصلی (ریاضی پوز در hero_pose.js) —
// ۴ جهت واقعی با پای نزدیک/دور و ترتیب لایه درست. همه‌چیز رویه‌ای روی Raster 128×۱۲۸.
import { C } from './palette_hero.js';
import { Raster, rot } from '../raster.js';
import { ik, GAITS } from '../skeleton.js';
import { SPR, OX, OY, DIRS, GEO, ACT, actionPose, gaitPose, poseLerp, mapPts } from './hero_pose.js';
import { drawEquipHat, drawEquipBody, drawEquipBoots, swordPal } from './equipment.js';

// ---------- قطعات ----------
const TRIP = {
  pantsN: [C.pants, C.pantsHi, C.pantsSh], pantsF: [C.pantsSh, C.pants, C.pantsSh],
  bootN: [C.boot, C.bootHi, C.bootSh], bootF: [C.bootSh, C.boot, C.bootSh],
  jacketN: [C.jacket, C.jacketHi, C.jacketSh], jacketF: [C.jacketSh, C.jacket, C.jacketSh],
};

function bootSide(r, an, pitch, trip) {
  const [cb, ch, cs] = trip;
  const rp = (x, y) => { const q = rot(x, y, pitch); return [an[0] + q[0], an[1] + q[1]]; };
  r.lineW(an[0], an[1], ...rp(0, -3.5), 4, cb);
  r.lineW(...rp(-2.5, 2.6), ...rp(3.5, 2.6), 3, cb);
  r.line(...rp(-2.5, 3.6), ...rp(3.5, 3.6), cs);
  r.line(...rp(1, 0.6), ...rp(3.5, 0.9), ch);
}
function bootFront(r, an, trip) {
  const [cb, ch, cs] = trip;
  const x = Math.round(an[0]) - 2, y = Math.round(an[1]) - 1;
  r.rect(x, y, 5, 5, cb);
  r.rect(x, y, 5, 1, ch); r.rect(x, y + 4, 5, 1, cs);
}
function drawLeg(r, dir, leg) {
  const [cp, ch, cs] = leg.trip;
  r.seg(leg.hip[0], leg.hip[1], leg.knee[0], leg.knee[1], 6, cp, ch, cs);
  r.seg(leg.knee[0], leg.knee[1], leg.ankle[0], leg.ankle[1] - 1, 5, cp, ch, cs);
  if (dir === 'left' || dir === 'right') bootSide(r, leg.ankle, leg.pitch * (dir === 'right' ? 1 : -1), leg.trip === TRIP.pantsN ? TRIP.bootN : TRIP.bootF);
  else bootFront(r, leg.ankle, leg.trip === TRIP.pantsN ? TRIP.bootN : TRIP.bootF);
}
function drawArm(r, dir, arm, near) {
  const [cj, ch, cs] = near ? TRIP.jacketN : TRIP.jacketF;
  r.seg(arm.shoulder[0], arm.shoulder[1], arm.elbow[0], arm.elbow[1], 5, cj, ch, cs);
  r.seg(arm.elbow[0], arm.elbow[1], arm.hand[0], arm.hand[1], 4, cj, ch, cs);
  const hx = Math.round(arm.hand[0]) - 1, hy = Math.round(arm.hand[1]) - 1;
  r.rect(hx, hy, 3, 3, near ? C.skin : C.skinSh);
  r.px(hx, hy + 3, near ? C.skinSh : C.skinSh);
}
// شال: از پشت گردن به سمت مخالف جهت نگاه، با موج سینوسی (شخصیت + حس حرکت)
function drawScarf(r, dir, P, opts) {
  const nx = P.neck[0], ny = P.neck[1] + 3;
  const wave = Math.sin((opts.phase ?? 0) * Math.PI * 4 + (opts.breath ?? 0) * 2.2);
  const run = opts.anim === 'run' ? 1 : opts.anim === 'walk' ? 0.5 : 0.2;
  if (dir === 'left' || dir === 'right') {
    const fx = dir === 'right' ? -1 : 1; // پشت سر
    let px2 = nx + fx * 3, py2 = ny;
    for (let i = 0; i < 3; i++) {
      const qx = px2 + fx * (2 + run * 1.2), qy = py2 - 1 + wave * (1 + i) * 0.8 + run * i * 0.6;
      r.lineW(px2, py2, qx, qy, 3 - (i > 1 ? 1 : 0), i === 0 ? C.scarf : C.scarfSh);
      r.px(qx, qy - 1, C.scarf);
      px2 = qx; py2 = qy;
    }
  } else {
    // نمای جلو/پشت: دو دنباله کوتاه به طرفین پایین
    r.lineW(nx - 2, ny, nx - 4 - wave * 0.7, ny + 4 + run * 2, 2, C.scarf);
    r.lineW(nx + 2, ny, nx + 4 + wave * 0.7, ny + 3 + run * 2, 2, C.scarfSh);
    r.rect(nx - 3, ny - 1, 7, 2, C.scarf); // گره
  }
}
function drawTorso(r, dir, p) {
  const [fx] = DIRS[dir];
  const side = fx !== 0;
  r.seg(p.pelvis[0], p.pelvis[1] + 1, p.neck[0], p.neck[1] + 1, side ? 9 : 10, C.jacket, C.jacketHi, C.jacketSh);
  const drag = side ? -fx * p.lean * 9 : 0;
  const hy = Math.round(p.pelvis[1]) - 1, cx = Math.round(p.pelvis[0]) + Math.round(drag);
  r.rect(cx - 5, hy, 11, 3, C.jacket);
  r.rect(cx - 5, hy + 2, 11, 1, C.jacketSh);
  const nx = Math.round(p.neck[0]), ny = Math.round(p.neck[1]);
  if (side) {
    r.line(nx + fx * 3, ny + 3, cx + fx * 3, hy + 1, C.jacketSh);
    r.rect(cx + fx * 3 - 1, hy - 4, 3, 2, C.jacketSh);
  } else if (dir === 'down') {
    r.rect(nx - 2, ny + 2, 5, 1, C.shirt);
    r.px(nx, ny + 5, C.out); r.px(nx, ny + 8, C.out);
    r.rect(nx - 1, ny + 12, 2, 1, C.shirtSh);
  } else {
    r.line(nx - 4, ny + 4, nx + 4, ny + 4, C.jacketSh);
    r.line(nx, ny + 4, nx, hy + 1, C.jacketSh);
  }
}
function drawHead(r, dir, hc, blink) {
  const hx = Math.round(hc[0]), hy = Math.round(hc[1]);
  if (dir === 'left' || dir === 'right') {
    const fx = dir === 'right' ? 1 : -1;
    r.rect(hx - 5, hy - 4, 10, 8, C.skin);
    r.px(hx + 3 * fx, hy + 4, C.skin);
    r.rect(hx - 5, hy - 5, 10, 2, C.hair);
    r.rect(fx > 0 ? hx - 7 : hx + 5, hy - 4, 2, 5, C.hair); // پشت سر
    r.px(fx > 0 ? hx - 7 : hx + 6, hy - 6, C.hair);         // تار موی نافرمانی
    r.rect(hx - fx, hy - 1, 2, 3, C.skinSh);                // گوش
    const ex = hx + 2 * fx;
    if (blink) r.rect(ex, hy, 2, 1, C.out); else r.rect(ex, hy, 1, 2, C.out);
    r.px(ex, hy - 2, C.hair);
    r.px(hx + 5 * fx, hy + 1, C.skin);                      // بینی
    r.px(hx + 3 * fx, hy + 3, C.skinSh);
  } else if (dir === 'down') {
    r.rect(hx - 5, hy - 4, 11, 9, C.skin);
    r.rect(hx - 5, hy - 5, 11, 2, C.hair);
    r.rect(hx - 5, hy - 3, 2, 2, C.hair); r.rect(hx + 4, hy - 3, 2, 2, C.hair);
    for (const ex of [hx - 3, hx + 2]) {
      if (blink) r.rect(ex, hy, 2, 1, C.out);
      else { r.rect(ex, hy, 2, 2, C.out); r.px(ex, hy, C.metalHi); }
      r.px(ex, hy - 2, C.hair);
    }
    r.rect(hx - 1, hy + 3, 3, 1, C.skinSh);
    r.px(hx - 4, hy + 2, C.skinSh); r.px(hx + 3, hy + 2, C.skinSh);
  } else {
    r.rect(hx - 5, hy - 4, 11, 9, C.hair);
    r.rect(hx - 5, hy + 4, 11, 1, C.hairSh);
    r.rect(hx - 2, hy - 5, 6, 1, C.hair);
    r.px(hx - 5, hy + 1, C.skin); r.px(hx + 5, hy + 1, C.skin);
  }
}
function drawHat(r, dir, hc) {
  const hx = Math.round(hc[0]), hy = Math.round(hc[1]);
  const fx = dir === 'right' ? 1 : dir === 'left' ? -1 : 0;
  r.rect(hx - 6, hy - 7, 13, 2, C.hat);   // لبه
  r.rect(hx - 6, hy - 6, 13, 1, C.hatSh);
  r.rect(hx - 3, hy - 11, 7, 4, C.hat);   // تاج
  r.rect(hx - 3, hy - 11, 7, 1, C.hatHi);
  r.rect(hx - 3, hy - 8, 7, 1, C.hatSh);  // نوار
  if (fx !== 0) { r.px(hx + 6 * fx, hy - 5, C.hat); r.px(hx + 7 * fx, hy - 4, C.hatSh); }
  else { r.px(hx - 6, hy - 5, C.hat); r.px(hx + 6, hy - 5, C.hat); }
}

// ---------- ابزارها (گریپ در مبدأ، سرِ کار در +x) ----------
export function drawTool(r, kind, gx, gy, ang, swordId) {
  const T = (x, y) => { const q = rot(x, y, ang); return [gx + q[0], gy + q[1]]; };
  const tl = (x1, y1, x2, y2, w, c) => { const a = T(x1, y1), b = T(x2, y2); r.lineW(a[0], a[1], b[0], b[1], w, c); };
  const sp = kind === 'sword' ? swordPal(swordId) : null;
  const wood = C.wood, met = sp ? sp.met : C.metal, metHi = sp ? sp.metHi : C.metalHi;
  if (kind === 'hoe') {
    tl(-6, 0, 10, 0, 2, wood);
    tl(10, -3, 12.5, 3, 3, met);
    tl(10, -3, 12, -2, 1, metHi);
  } else if (kind === 'can') {
    tl(2, -3.5, 2, 3.5, 8, met);
    tl(5, -2, 11, -5, 2, met);
    tl(0, -4.5, 4, -5.5, 1, metHi);
    r.px(...T(11.5, -6).map(Math.round), metHi);
  } else if (kind === 'sickle') {
    tl(-3, 0, 1, 0, 2, wood);
    const pts = [[1, 0], [5, -4], [9, -7], [12, -6.5]];
    for (let i = 0; i < pts.length - 1; i++) tl(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 2, met);
    tl(1, -1, 9, -8, 1, metHi);
  } else if (kind === 'sword') {
    tl(-4, 0, -1, 0, 2, C.bootSh);
    tl(-1, -3, -1, 3, 1, met);
    tl(0, 0, 12, 0, 2, met);
    tl(0, -1, 12, -1, 1, metHi);
    r.px(...T(13, 0).map(Math.round), metHi);
  }
}

// ---------- فریم نهایی ----------
// opts: {dir, anim:'idle'|'walk'|'run', phase, breath, moveW, tool, actP(-1..1), blink}
export function drawHeroFrame(opts) {
  const { dir, anim = 'idle', phase = 0, breath = 0, moveW = 1, tool = 'none', actP = -1, blink = false, equip = null } = opts;
  const g = GAITS[anim === 'idle' ? 'walk' : anim];
  const p = gaitPose(dir, g, phase, breath, anim === 'idle' ? 1 : 1 - moveW);
  const q = gaitPose(dir, GAITS.walk, 0, breath, 1);
  const pose = anim === 'idle' ? q : moveW >= 0.999 ? p : poseLerp(q, p, moveW);

  let toolAng = null;
  if (tool !== 'none') {
    if (actP >= 0) {
      const a = actionPose(tool, dir, actP);
      const [fx, fy] = DIRS[dir];
      const sh = pose.arms.near.shoulder;
      let hand;
      if (fx !== 0) hand = [sh[0] + a.hand[0] * fx, sh[1] - a.hand[1]];
      else hand = [sh[0] + a.hand[0] * 0.4, sh[1] - a.hand[1] + fy * a.hand[0] * 0.6];
      const bend = fx !== 0 ? (fx > 0 ? 1 : -1) : (sh[0] < 0 ? 1 : -1);
      const { mid } = ik(sh, hand, GEO.uarm, GEO.farm, bend);
      pose.arms.near.hand = hand; pose.arms.near.elbow = mid;
      toolAng = a.ang;
      const lg = a.lunge * 2.5;
      pose.legs.near.ankle = [pose.legs.near.ankle[0] + fx * lg, pose.legs.near.ankle[1] + fy * lg];
      const kb = fx !== 0 ? (fx > 0 ? -1 : 1) : (pose.legs.near.hip[0] < 0 ? 1 : -1);
      pose.legs.near.knee = ik(pose.legs.near.hip, pose.legs.near.ankle, GEO.thigh, GEO.shin, kb).mid;
    } else {
      let ang = ACT[tool].ang.rest;
      if (dir === 'left') ang = Math.PI - ang;
      toolAng = ang;
    }
  }

  const body = new Raster(SPR, SPR);
  const P = mapPts(pose);
  // ترتیب لایه: بازوی دور → پای دور → تنه → پای نزدیک → سر/کلاه → بازوی نزدیک → ابزار
  drawArm(body, dir, P.arms.far, false);
  drawLeg(body, dir, { ...P.legs.far, trip: TRIP.pantsF });
  body.lineW(P.neck[0], P.neck[1] + 2, P.headC[0], P.headC[1] + 4, 3, C.skin);
  drawTorso(body, dir, P);
  drawScarf(body, dir, P, opts);
  if (equip && equip.body) drawEquipBody(body, dir, P, equip.body); // زره روی تنه
  drawLeg(body, dir, { ...P.legs.near, trip: TRIP.pantsN });
  drawHead(body, dir, P.headC, blink);
  if (equip && equip.hat) drawEquipHat(body, dir, P.headC, equip.hat); // کلاه/خود جایگزین
  else drawHat(body, dir, P.headC);
  if (equip && equip.boots) drawEquipBoots(body, dir, P, equip.boots); // روی مچ پاها
  drawArm(body, dir, P.arms.near, true);
  if (tool !== 'none' && toolAng !== null)
    drawTool(body, tool, Math.round(P.arms.near.hand[0]), Math.round(P.arms.near.hand[1]) + 1, toolAng, equip && equip.sword);
  body.outline(C.out);

  const out = new Raster(SPR, SPR);          // سایه‌ی بیضی با اندازه‌ی ثابت
  out.ellipse(OX, OY + 2, 13, 4, [8, 6, 14, 80]);
  body.over(out);
  return out;
}

// نصف‌مقیاس ۲:۱ (ن۳۵): میانگین جعبه‌ای ۲×۲ — رنگ‌های تخت دست‌نخورده، لبه‌ها یکنواخت
export function halfSprite(s) {
  const t = new Raster(s.w >> 1, s.h >> 1);
  const td = t.d, sd = s.d, w2 = s.w;
  for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) {
    let r = 0, g = 0, b = 0, n = 0, al = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const i = ((y * 2 + dy) * w2 + x * 2 + dx) * 4;
      if (sd[i + 3] > 8) { r += sd[i]; g += sd[i + 1]; b += sd[i + 2]; if (sd[i + 3] > al) al = sd[i + 3]; n++; }
    }
    if (n) { const j = (y * t.w + x) * 4; td[j] = (r / n + 0.5) | 0; td[j + 1] = (g / n + 0.5) | 0; td[j + 2] = (b / n + 0.5) | 0; td[j + 3] = al; }
  }
  return t;
}

// کلید کش: ۸ فریم در چرخه؛ blend شروع/توقف به ۳ پله کوانت می‌شود
export function frameKey(o) {
  const f = Math.floor((((o.phase % 1) + 1) % 1 * 8) + 0.5) % 8;
  const mw = o.anim === 'idle' ? 1 : Math.min(2, Math.round((o.moveW ?? 1) * 2));
  const ap = o.actP == null || o.actP < 0 ? -1 : Math.min(7, Math.floor(o.actP * 8));
  return `h|${o.dir}|${o.anim}|${f}|${mw}|${o.tool}|${ap}|${o.blink ? 1 : 0}`;
}
export function framePhase(o) {
  return (Math.floor((((o.phase % 1) + 1) % 1) * 8 + 0.5) % 8 + 0.5) / 8;
}
