// hero_pose.js — ریاضیِ پوز قهرمان (خالص، بدون رسم): هندسه‌ی مفاصل، گام،
// کی‌فریم ابزار، میکس پوز و نگاشت به بوم ۱۲۸ — جداسازی از hero.js (ن۳۰)
import { ik, GAITS, footPath, bodyBob, ease } from '../skeleton.js';

export const SPR = 128; // بوم مربعی اسپرایت قهرمان
export const OX = 64;
export const OY = 92; // مبدأ قهرمان (زمینِ بین پاها) داخل بوم ۱۲۸
// ن۳۵: بدنه‌ی ۶۲px در دنیای تایلِ ۱۶px غول‌پیکر بود (۳٫۹ تایل — از خانه بلندتر!)
// اسپرایت نهایی ۲:۱ نصف می‌شود → بدنه ≈۳۱px ≈ ۲ تایل؛ لنگرهای نصف‌شده:
export const HOX = OX >> 1;  // 32
export const HOY = OY >> 1;  // 46
const mixN = (a, b, t) => a + (b - a) * t;
const mixP = (a, b, t) => [mixN(a[0], b[0], t), mixN(a[1], b[1], t)];
export const DIRS = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
export const GEO = { hip: -22, torso: 14, thigh: 11, shin: 11, uarm: 8, farm: 8 };

// کدام سمتِ قهرمان «نزدیک» است: پای راست قهرمان همیشه نزدیک دوربین است (دست ابزار).
// در نمای رو‌به‌دوربین (down) راستِ قهرمان = چپِ صفحه؛ در نمای پشت (up) = راستِ صفحه.
const nearSign = (dir) => (dir === 'down' ? -1 : dir === 'up' ? 1 : 0);

// ---------- کی‌فریم اکشن ابزار: anticipation → strike → follow-through ----------
// دست نسبت به شانه در قابِ جهت: [f=جلو، u=بالا (مثبت=بالا)] + زاویه‌ی ابزار (رادیان از محور +x)
export const ACT = {
  hoe:    { dur: 0.62, side: { rest: [3, -12], up: [-5, 7], hit: [11, -6] },  front: { rest: [2, -12], up: [1, 13], hit: [0.5, -8] }, ang: { rest: 2.0, up: 2.9, hit: 0.45 } },
  can:    { dur: 0.70, side: { rest: [3, -12], up: [-4, 6], hit: [9, -3] },   front: { rest: [2, -12], up: [2, 12], hit: [1, -6] },  ang: { rest: 2.1, up: 2.6, hit: 0.9 } },
  sickle: { dur: 0.50, side: { rest: [3, -12], up: [-4, 5], hit: [10, -7] },  front: { rest: [2, -12], up: [1, 12], hit: [1, -8] },  ang: { rest: 1.9, up: 3.3, hit: 0.2 } },
  sword:  { dur: 0.46, side: { rest: [3, -12], up: [-5, 8], hit: [12, -8] },  front: { rest: [2, -12], up: [0, 14], hit: [1, -7] },  ang: { rest: 1.85, up: 3.5, hit: -0.15 } },
  seed:   { dur: 0.55, side: { rest: [3, -12], up: [-2, 3], hit: [8, -10] },  front: { rest: [2, -12], up: [0, 9], hit: [1, -8] },  ang: { rest: 2.2, up: 2.75, hit: 1.05 } },
};
export const ACT_DUR = Object.fromEntries(Object.entries(ACT).map(([k, v]) => [k, v.dur]));

export function actionPose(tool, dir, p) {
  const a = ACT[tool], front = dir === 'down' || dir === 'up';
  const K = front ? a.front : a.side;
  let hand, ang, lean = 0, lunge = 0;
  if (p < 0.34) { const e = ease.outCubic(p / 0.34); hand = mixP(K.rest, K.up, e); ang = mixN(a.ang.rest, a.ang.up, e); lean = -0.10 * e; }
  else if (p < 0.50) { const e = ease.inCubic((p - 0.34) / 0.16); hand = mixP(K.up, K.hit, e); ang = mixN(a.ang.up, a.ang.hit, e); lean = mixN(-0.10, 0.16, e); lunge = e; }
  else if (p < 0.68) { const e = (p - 0.5) / 0.18; hand = mixP(K.hit, mixP(K.hit, K.rest, 0.5), ease.outCubic(e) * 0.5); ang = mixN(a.ang.hit, mixN(a.ang.hit, a.ang.rest, 0.5), ease.outCubic(e) * 0.5); lean = 0.16 * (1 - e); lunge = 1 - e; }
  else { const e = ease.inOut((p - 0.68) / 0.32); const s = mixP(K.hit, K.rest, 0.5); hand = mixP(s, K.rest, e); ang = mixN(mixN(a.ang.hit, a.ang.rest, 0.5), a.ang.rest, e); }
  return { hand, ang, lean, lunge };
}

// ---------- پوز گام (تابع خالص: قابل کش کردن) ----------
export function gaitPose(dir, g, phase, breath, idleW) {
  const [fx, fy] = DIRS[dir];
  const side = fx !== 0;
  const ns = nearSign(dir);
  const breathY = Math.sin(2 * Math.PI * breath / 2.4);
  const mv = 1 - idleW;
  const bob = bodyBob(g, phase) * mv; // + در وسط تکیه‌گاه (walk) یا پرواز (run)
  const sway = side ? 0 : ns * g.sway * Math.cos(2 * Math.PI * (phase - 0.31)) * mv;
  const pelvis = [sway, GEO.hip - bob + idleW * breathY * 0.5];
  const lean = g.lean * mv;
  const neck = side
    ? [pelvis[0] + Math.sin(lean) * 14 * fx, pelvis[1] - Math.cos(lean) * 14]
    : [pelvis[0], pelvis[1] - GEO.torso];
  const headC = [neck[0] + (side ? lean * 4 * fx : -sway * 0.2), neck[1] - 7.5 + idleW * breathY * 0.5];

  // ---- پاها: تکیه‌گاه دقیقاً با سرعت بدن به عقب جارو می‌شود (فاز از مسافت واقعی) ----
  const legs = {};
  for (const s of ['near', 'far']) {
    const ph = phase + (s === 'far' ? 0.5 : 0);
    const f = footPath(g, ph);
    const idleAlong = side ? (s === 'near' ? 1.5 : -1.5) : 0;
    const along = mixN(idleAlong, f.along, mv);
    const lift = f.lift * mv;
    const sgn = s === 'near' ? ns : -ns; // علامت اسکرینی این پا (نمای جلو/پشت)
    let hip, ankle;
    if (side) {
      const off = g.pelRot * Math.cos(2 * Math.PI * ph) * mv * fx - (s === 'far' ? 0.8 * fx : 0);
      hip = [pelvis[0] + off, pelvis[1]];
      ankle = [along * fx - (s === 'far' ? 0.8 * fx : 0), -3 - lift];
    } else {
      hip = [pelvis[0] + sgn * 3.5, pelvis[1]];
      ankle = [sgn * 3.5, along * fy - 3 - lift];
    }
    const bend = side ? (fx > 0 ? -1 : 1) : (hip[0] < 0 ? 1 : -1); // زانو: جلو (نمای کنار) / به بیرون (نمای جلو)
    const { mid: knee } = ik(hip, ankle, GEO.thigh, GEO.shin, bend);
    legs[s] = { hip, knee, ankle, pitch: f.pitch * mv, lift };
  }

  // ---- بازوها: خلاف پا (بازوی نزدیک هم‌فاز پای دور)، شانه خلاف لگن ----
  const arms = {};
  const shOff = -g.pelRot * 0.8 * Math.cos(2 * Math.PI * phase) * mv * (side ? fx : 0);
  const A = (g.stance * g.L) / 2;
  for (const s of ['near', 'far']) {
    const phArm = phase + (s === 'near' ? 0.5 : 0); // بازوی نزدیک با پای دور جلو می‌رود
    const swingF = footPath(g, phArm).along / A;    // هم‌فازی دقیق با پای جفت (−1..1)
    const th = g.armAmp * swingF;
    const reachY = 15 - 4.2 * g.armBend, reachX = 13 - g.armBend;
    let shoulder, hand, bend;
    if (side) {
      shoulder = [neck[0] + shOff - (s === 'far' ? fx : 0), neck[1] + 2.5];
      const idleHand = [shoulder[0] + (s === 'near' ? 1 : -1) * 0.5 + idleW * 0.6 * Math.sin(2 * Math.PI * breath / 2.4), shoulder[1] + 15];
      const gaitHand = [shoulder[0] + Math.sin(th) * fx * reachX, shoulder[1] + Math.cos(th) * reachY];
      hand = mixP(idleHand, gaitHand, mv);
      bend = fx > 0 ? 1 : -1; // آرنج به عقب
    } else {
      const sn = s === 'near' ? ns : -ns;
      shoulder = [neck[0] + sn * 5 - sway * 0.5, neck[1] + 2.5];
      const yo = g.armAmp * 6 * swingF * fy * mv;
      const idleHand = [shoulder[0] + sn * 1.2, shoulder[1] + 14.5];
      hand = [idleHand[0] + sn * 0.4 * mv, idleHand[1] + yo];
      bend = shoulder[0] < 0 ? 1 : -1; // آرنج به بیرون
    }
    const { mid: elbow } = ik(shoulder, hand, GEO.uarm, GEO.farm, bend);
    arms[s] = { shoulder, elbow, hand };
  }
  return { pelvis, neck, headC, legs, arms, lean };
}

export function poseLerp(A, B, t) {
  const o = {};
  for (const k in A) {
    if (Array.isArray(A[k])) o[k] = mixP(A[k], B[k], t);
    else if (typeof A[k] === 'number') o[k] = mixN(A[k], B[k], t);
    else if (A[k] && typeof A[k] === 'object') o[k] = poseLerp(A[k], B[k], t);
  }
  return o;
}
export function mapPts(P) { // انتقال کل پوز از مختصات محلی به بوم ۱۲۸
  const m = (q) => [OX + q[0], OY + q[1]];
  return {
    pelvis: m(P.pelvis), neck: m(P.neck), headC: m(P.headC), lean: P.lean,
    legs: { near: { ...P.legs.near, hip: m(P.legs.near.hip), knee: m(P.legs.near.knee), ankle: m(P.legs.near.ankle) },
            far:  { ...P.legs.far,  hip: m(P.legs.far.hip),  knee: m(P.legs.far.knee),  ankle: m(P.legs.far.ankle) } },
    arms: { near: { ...P.arms.near, shoulder: m(P.arms.near.shoulder), elbow: m(P.arms.near.elbow), hand: m(P.arms.near.hand) },
            far:  { ...P.arms.far,  shoulder: m(P.arms.far.shoulder),  elbow: m(P.arms.far.elbow),  hand: m(P.arms.far.hand) } },
  };
}

