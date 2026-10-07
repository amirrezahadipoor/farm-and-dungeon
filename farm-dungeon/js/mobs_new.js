// mobs_new.js — رفتارهای هیولاهای ن۴۴ (ن۳۴: هر رفتار تک‌وظیفه، بدون چرخه‌ی import)
// AI_EXT[kind](m, dt, target, hooks, s, spd) → true یعنی «این فریم را من مدیریت کردم»
// (می‌مومی از ماشین پایه استفاده می‌کند — فقط قوچ/کماندار/آتش‌جان/دزد/خرگوش اینجایند)

const TAU = Math.PI * 2;

// برچسب هیولاهای امضای هر معماری (ن۴۴) — dungeon.js مصرف می‌کند
export const MOB_TAGS = {
  'مقبره‌ی پادشاهان': ['mummy'], 'خزانه': ['mummy', 'bandit'],
  'میدان تیر': ['archer'], 'زندان': ['archer', 'bandit'],
  'هشت‌ضلعی': ['ram'], 'پل معلق': ['ram'],
  'باغ ایرانی': ['hare'], 'آزمایشگاه': ['hare', 'imp'],
  'آتشکده': ['imp'], 'کارگاه گدازه': ['imp'],
  'کاروان‌سرا': ['bandit'], 'یخچال': ['yeti'],
};

// حرکت با احترام به دیوار (جداشدن محورها — همان قرارداد پایه)
function move(m, dx, dy, dist, sp, dt, hooks) {
  const ox = m.x, oy = m.y;
  const mv = Math.min(dist, sp * dt);
  const nx = m.x + (dx / (dist || 1)) * mv, ny = m.y + (dy / (dist || 1)) * mv;
  const solid = hooks.solid || (() => false);
  if (!solid(nx, m.y)) m.x = nx;
  if (!solid(m.x, ny)) m.y = ny;
  return m.x !== ox || m.y !== oy; // واقعاً جابه‌جا شد؟
}
const blocked = (m, dx, dy, hooks) => {
  const solid = hooks.solid || (() => false);
  return solid(m.x + dx, m.y) && solid(m.x, m.y + dy);
};

// ---------- کماندار/آتش‌جان: تیرانداز — حفظ فاصله + شلیک ----------
// بازه‌ی مطلوب: [near, far] — نزدیک‌تر: عقب‌نشینی، دورتر: نزدیک‌شدن، در بازه: شلیک
function shooter(near, far, cool) {
  return (m, dt, target, hooks, s, spd) => {
    if (m.coolT > 0) m.coolT -= dt;
    if (!target) { m.state = 'idle'; m.t += dt; return true; }
    const dx = target.x - m.x, dy = target.y - m.y, d = Math.hypot(dx, dy);
    m.face = dx >= 0 ? 1 : -1;
    if (m.state === 'attack') {
      m.t += dt / 0.7;
      if (m.t >= 0.5 && !m.didHit) { m.didHit = true; hooks.onShoot && hooks.onShoot(m, target.x, target.y); }
      if (m.t >= 1) { m.coolT = cool; m._set('cool'); }
      return true;
    }
    if (m.coolT > 0) { // خنکی: جابه‌جایی آرام در بازه
      m.state = 'cool'; m.t += dt;
      if (d < near * 0.8) move(m, -dx, -dy, d, spd * 0.6, dt, hooks);
      return true;
    }
    if (d < near) { m.state = 'move'; m.t += dt; m.ph = (m.ph + spd * dt / s.stride) % 1; move(m, -dx, -dy, d, spd, dt, hooks); }
    else if (d > far) { m.state = 'move'; m.t += dt; m.ph = (m.ph + spd * dt / s.stride) % 1; move(m, dx, dy, d, spd, dt, hooks); }
    else { m._set('attack'); }
    return true;
  };
}

// ---------- قوچ: یورتم (قفل جهت) → یورش خطی → خستگی ----------
function dRamAI(m, dt, target, hooks, s, spd) {
  if (m.coolT > 0) m.coolT -= dt;
  if (!target) { m.state = 'idle'; m.t += dt; return true; }
  const dx = target.x - m.x, dy = target.y - m.y, d = Math.hypot(dx, dy);
  m.face = dx >= 0 ? 1 : -1;
  if (m.state === 'attack') {
    m.t += dt / 0.95; // کل چرخه ~۰٫۹۵ث
    if (m.t < 0.5) { // یورتم: جهت را قفل کن (خوانا — بدن جمع می‌شود)
      if (!m._dir) { const a = Math.atan2(dy, dx); m._dir = [Math.cos(a), Math.sin(a)]; }
    } else if (m.t < 0.85) { // یورش
      const sp = 175;
      const nx = m.x + m._dir[0] * sp * dt, ny = m.y + m._dir[1] * sp * dt;
      const solid = hooks.solid || (() => false);
      let hitWall = false;
      if (!solid(nx, m.y)) m.x = nx; else hitWall = true;
      if (!solid(m.x, ny)) m.y = ny; else hitWall = true;
      m.ph = (m.ph + sp * dt / 24) % 1;
      if (hitWall) { m.t = Math.max(m.t, 0.85); m._dir = null; m.coolT = 1.3; } // کوبیدن به دیوار = خستگی
      if (!m.didHit && d < 18) { m.didHit = true; hooks.onHit && hooks.onHit(m, m.dmg); } // برخورد در مسیر یورش
    } else if (m.t >= 1) { m._dir = null; if (!m.coolT || m.coolT < 1.1) m.coolT = 1.15; m._set('cool'); }
    return true;
  }
  if (m.coolT > 0) { m.state = 'cool'; m.t += dt; return true; }
  if (d > 26 && d < 130 && m.state !== 'attack') { m._set('attack'); return true; }
  // خیلی نزدیک/خیلی دور: راه رفتن عادی
  m.state = 'move'; m.t += dt; m.ph = (m.ph + spd * dt / s.stride) % 1;
  move(m, dx, dy, d, spd, dt, hooks);
  if (d <= s.range) { m._set('attack'); } // نزدیک: ضربه‌ی معمولی ( همان انیمیشن، برخورد تماسی)
  return true;
}

// ---------- دزد: دزدیدن سکه → فرار ----------
function dBanditAI(m, dt, target, hooks, s, spd) {
  if (!target) { m.state = 'idle'; m.t += dt; return true; }
  const dx = target.x - m.x, dy = target.y - m.y, d = Math.hypot(dx, dy);
  m.face = dx >= 0 ? 1 : -1;
  if (m.stole !== undefined) { // فرار! — جهتِ آزادِ بهینه با هیسترزیس ۰٫۴ث (راهرو + بدون نوسان)
    m.state = 'move'; m.t += dt; m.ph = (m.ph + spd * 1.35 * dt / s.stride) % 1;
    const solid = hooks.solid || (() => false);
    m._fdT = (m._fdT || 0) - dt;
    const stuck = !m._fd || solid(m.x + m._fd[0] * 10, m.y + m._fd[1] * 10);
    if (stuck || m._fdT <= 0) { // بازمحاسبه‌ی جهت — هر ۰٫۴ث یا وقتی دیوار آمد
      let bs = -1e9, bd = null;
      for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (solid(m.x + ddx * 8, m.y + ddy * 8)) continue;          // دیوار → این جهت نیست
        const sc = -(ddx * dx + ddy * dy) / (d || 1)                // مؤلفه‌ی دورشدن از قهرمان
          + Math.sin(m.time * 3.7 + ddx * 5 + ddy * 3) * 0.22;      // شکست تقارن (زیگزاگ طبیعی)
        if (sc > bs) { bs = sc; bd = [ddx, ddy]; }
      }
      m._fd = bd; m._fdT = 0.4;
    }
    if (m._fd) {
      const sp = spd * 1.35;
      const nx = m.x + m._fd[0] * sp * dt, ny = m.y + m._fd[1] * sp * dt;
      if (!solid(nx, m.y)) m.x = nx;
      if (!solid(m.x, ny)) m.y = ny;
      if (m._fd[0] !== 0) m.face = m._fd[0] > 0 ? 1 : -1;
    }
    return true; // گیر در گوشه: قهرمان می‌تواند بگیردش — منصفانه
  }
  if (m.state === 'attack') { // ضربه‌ی خنجر + دزدی (در onHit_run اعمال می‌شود)
    m.t += dt / 0.7;
    if (m.t >= 0.5 && !m.didHit) { m.didHit = true; hooks.onHit && hooks.onHit(m, m.dmg); }
    if (m.t >= 1) { m.coolT = s.cool; m._set('cool'); }
    return true;
  }
  if (m.coolT > 0) { m.coolT -= dt; m.state = 'cool'; m.t += dt; return true; }
  if (d <= s.range) { m._set('attack'); return true; }
  m.state = 'move'; m.t += dt; m.ph = (m.ph + spd * dt / s.stride) % 1;
  move(m, dx, dy, d, spd, dt, hooks);
  return true;
}

// ---------- خرگوش: چرخه‌ی جهش (مکث → جهش با انحراف تصادفی) ----------
function dHareAI(m, dt, target, hooks, s, spd) {
  if (!target) { m.state = 'idle'; m.t += dt; return true; }
  const dx = target.x - m.x, dy = target.y - m.y, d = Math.hypot(dx, dy);
  m.face = dx >= 0 ? 1 : -1;
  if (m.state === 'attack') {
    m.t += dt / 0.7;
    if (m.t >= 0.5 && !m.didHit) { m.didHit = true; hooks.onHit && hooks.onHit(m, m.dmg); }
    if (m.t >= 1) { m.coolT = s.cool; m._set('cool'); }
    return true;
  }
  if (d <= s.range && (m.coolT || 0) <= 0) { m._set('attack'); return true; }
  if (m.coolT > 0) m.coolT -= dt;
  // چرخه‌ی جهش: ۰٫۳۰ث جمع‌شدن → ۰٫۳۴ث پرش سریع
  m._hop = ((m._hop || 0) + dt) % 0.64;
  if (m._hop < 0.30) { m.state = 'idle'; m.t += dt; m.ph = 0.95; } // چمباتمه (فشرده)
  else {
    m.state = 'move'; m.t += dt;
    if (m._hop < 0.30 + 0.017 && !m._hopA) { // یک‌بار در شروع پرش: جهت با انحراف ±۰٫۶ رادیان
      const a = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.2;
      m._hopA = [Math.cos(a), Math.sin(a)];
    }
    if (m._hopA) { // حرکت مستقیم در جهت پرش (بردار واحد — نه قرارداد move)
      const sp = spd * 2.3, solid = hooks.solid || (() => false);
      const ox = m.x, oy = m.y;
      const nx = m.x + m._hopA[0] * sp * dt, ny = m.y + m._hopA[1] * sp * dt;
      if (!solid(nx, m.y)) m.x = nx;
      if (!solid(m.x, ny)) m.y = ny;
      m.ph = (m.ph + sp * dt / s.stride) % 1;
      if ((m.x === ox && m.y === oy) || blocked(m, m._hopA[0], m._hopA[1], hooks)) { m._hop = 0; m._hopA = null; } // دیوار: جهش بعدی
    }
  }
  if (m._hop >= 0.63) m._hopA = null;
  return true;
}

export const AI_EXT = {
  archer: shooter(44, 128, 1.7),
  imp: shooter(38, 105, 1.6),
  ram: dRamAI,
  bandit: dBanditAI,
  hare: dHareAI,
};
