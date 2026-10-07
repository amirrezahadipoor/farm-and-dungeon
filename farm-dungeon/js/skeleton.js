// skeleton.js — IK دو‌استخوانی + پارامترهای گام + کنترلر حرکت
// قهرمان ۱۷ مفصل دارد: ریشه، لگن، ستون‌فقرات، گردن، سر + هر طرف: بازو، ساعد، دست، ران، ساق، پا

// ---------- IK دواستخوانی ----------
// a: مفصل ریشه (مثلاً لگن)، b: مفصل انتهایی (مثلاً مچ پا)، l1/l2: طول استخوان‌ها، bend: جهت خم (+1/-1)
export function ik(a, b, l1, l2, bend) {
  let dx = b[0] - a[0], dy = b[1] - a[1];
  let d = Math.hypot(dx, dy);
  const maxD = l1 + l2 - 0.001, minD = Math.abs(l1 - l2) + 0.001;
  if (d > maxD) { const k = maxD / d; b = [a[0] + dx * k, a[1] + dy * k]; d = maxD; }
  else if (d < minD) { const k = minD / (d || 1); b = [a[0] + dx * k, a[1] + dy * k]; d = minD; }
  dx = b[0] - a[0]; dy = b[1] - a[1];
  // قانون کسینوس برای مفصل میانی
  const a1 = Math.acos(Math.min(1, Math.max(-1, (d * d + l1 * l1 - l2 * l2) / (2 * d * l1))));
  const base = Math.atan2(dy, dx);
  const mid = [a[0] + l1 * Math.cos(base + bend * a1), a[1] + l1 * Math.sin(base + bend * a1)];
  return { mid, end: b };
}

// ---------- پارامترهای گام ----------
// L: مسافت طی‌شده در یک چرخه‌ی کامل (دو قدم) — فاز گام مستقیماً از مسافت می‌آید: phase += dist / L
// stance: کسر چرخه که پا روی زمین است | A = نصف جاروی پا = stance*L/2
export const GAITS = {
  walk: { L: 16, stance: 0.62, bob: 1.6, bobPk: 0.31, lift: 2.5, armAmp: 0.38, armBend: 0.35,
          lean: 0.04, pelRot: 1.6, sway: 1.2, speed: 42 },
  run:  { L: 23, stance: 0.38, bob: 3.2, bobPk: 0.94, lift: 5.0, armAmp: 0.85, armBend: 1.5,
          lean: 0.17, pelRot: 2.2, sway: 0.8, speed: 92 },
};

// مسیر پا (فرم بسته): آفست پا نسبت به بدن در محور جلو + بلندشدن از زمین
// در stance پا دقیقاً با سرعت بدن به‌عقب جارو می‌شود (بدون لغزش) چون فاز از مسافت واقعی می‌آید.
export function footPath(g, phase) {
  const ph = ((phase % 1) + 1) % 1;
  const A = (g.stance * g.L) / 2;
  let along, lift = 0, pitch = 0;
  if (ph < g.stance) { // تکیه‌گاه: از +A (جلو) تا -A (عقب)، بدون بلند شدن
    const s = ph / g.stance;
    along = A * (1 - 2 * s);
    pitch = s < 0.22 ? -(0.45) * (1 - s / 0.22)          // پاشنه‌فرود: پنجه بالا
          : s > 0.7 ? (0.8) * ((s - 0.7) / 0.3)          // جدا شدن: پاشنه بالا
          : 0;
  } else { // معلق: بازگشت نرم به جلو + قوس بلند شدن + خم زانو
    const s = (ph - g.stance) / (1 - g.stance);
    const e = s * s * (3 - 2 * s); // smoothstep
    along = A * (2 * e - 1);
    lift = g.lift * Math.sin(Math.PI * s);
    pitch = 0.5 * Math.sin(Math.PI * (s * 1.15)); // پنجه کمی آویزان وسط سوئینگ
    if (s > 0.85) pitch = -0.3 * ((s - 0.85) / 0.15); // آماده‌ی فرود دوباره
  }
  return { along, lift, pitch };
}

// نوسان عمودی بدن: بالاترین نقطه وسط تکیه‌گاه، پایین‌ترین در حمایت‌دوپا (walk) یا پرواز (run)
export function bodyBob(g, phase) {
  return g.bob * Math.cos(4 * Math.PI * (((phase % 1) + 1) % 1 - g.bobPk));
}

export const ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  inOut: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  smooth: (t) => t * t * (3 - 2 * t),
};

// ---------- کنترلر حرکت ----------
// فاز از مسافت واقعی: هر تغییر جهت یا سرعت، فاز را ریست نمی‌کند (بدون پرش).
export class Locomotion {
  constructor() {
    this.phW = 0; this.phR = 0;      // فاز مستقل walk/run — هر دو همیشه با مسافت جلو می‌روند
    this.mix = 0;                    // 0=walk 1=run
    this.moveW = 0;                  // وزن حرکت (blend شروع/توقف ~۱۰۰ms)
    this.fwd = { x: 1, y: 0 };       // جهت حرکت نرم‌شده (تا پاها هنگام تغییر جهت نپرند)
    this.t = 0;
    this.blink = 0;
  }
  update(dt, speed, dirX, dirY, wantRun) {
    this.t += dt;
    this.blink = (this.t % 3.7) < 0.13;
    // جهت نرم (چرخش حول بدن به‌جای پرش)
    if (speed > 4) {
      const k = 1 - Math.pow(0.001, dt); // ~نرم‌شدن ۱۲۰ms
      const l = Math.hypot(dirX, dirY) || 1;
      let fx = this.fwd.x + (dirX / l - this.fwd.x) * k;
      let fy = this.fwd.y + (dirY / l - this.fwd.y) * k;
      const fl = Math.hypot(fx, fy) || 1;
      this.fwd.x = fx / fl; this.fwd.y = fy / fl;
    }
    // فاز فقط از مسافت واقعی
    const dist = speed * dt;
    this.phW = (this.phW + dist / GAITS.walk.L) % 1;
    this.phR = (this.phR + dist / GAITS.run.L) % 1;
    // میکس walk/run با هیسترزیس
    const tgtMix = wantRun && speed > GAITS.walk.speed * 1.15 ? 1 : 0;
    const mk = 1 - Math.pow(0.0001, dt);
    this.mix += (tgtMix - this.mix) * Math.min(1, mk * 1.4);
    // blend شروع/توقف (۸۰-۱۲۰ms)
    const tgtMove = speed > 3 ? 1 : 0;
    const sk = 1 - Math.pow(0.00005, dt); // ~۱۰۰ms
    this.moveW += (tgtMove - this.moveW) * Math.min(1, sk);
    if (this.moveW < 0.001) this.moveW = 0;
    // پاکسازی مقادیر غیرمجاز (محافظ در برابر dt بیرونی از بازه)
    if (!isFinite(this.mix)) this.mix = 0;
    if (!isFinite(this.moveW)) this.moveW = 0;
    if (!isFinite(this.phW)) this.phW = 0;
    if (!isFinite(this.phR)) this.phR = 0;
    if (!isFinite(this.fwd.x) || !isFinite(this.fwd.y)) { this.fwd.x = 1; this.fwd.y = 0; }
    if (!isFinite(this.t)) this.t = 0;
  }
  // درون‌یابی دو گام برای blend
  gaitAt() {
    const g = {};
    for (const k of ['L', 'stance', 'bob', 'bobPk', 'lift', 'armAmp', 'armBend', 'lean', 'pelRot', 'sway', 'speed']) {
      const w = GAITS.walk[k], r = GAITS.run[k];
      g[k] = typeof w === 'number' ? w + (r - w) * this.mix : w;
    }
    // فاز مؤثر: فاز هر گام به‌نسبت وزنش
    g.phase = this.mix < 0.5 ? this.phW : this.phR;
    return g;
  }
}
