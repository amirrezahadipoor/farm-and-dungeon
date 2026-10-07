// run.js — دورِ دانجن: جنگ قوسی خودکار + کریتیک + ناک‌بک + hit-stop، دوج/مهارت،
// تاریکی/منابع نور، مینی‌مپ، باس هر ۱۰ طبقه با بنر، زره/چکمه، مقیاس سختی
// (غنیمت‌ها در run_loot.js — ن۳۰ · جنگ در run_combat.js — ن۳۴)
import { Dungeon, floor10, clamp } from './dungeon.js';
import { findPath } from './astar.js';
import { Locomotion, GAITS } from './skeleton.js';
import { ACT_DUR } from './art/hero_pose.js';
import { groundSprite, E, TILE, COLS, ROWS, WORLD_W, WORLD_H } from './tiles.js';
import { Raster } from './raster.js';
import { FX } from './fx.js';
import { spawnProj, updateProjs, PROJ } from './projectiles.js'; // ن۴۴: تیر/گلوله‌ی آتش
import { renderRun, heroSprite } from './run_render.js';
import { lootKill, lootUpdate, lootChests } from './run_loot.js';
import { runAttack, runSkillSpin, separateEnemies } from './run_combat.js';
import { equipStats, equipSig } from './items.js';

export class Run {
  constructor(seed, opts = {}) {
    this.seed = seed;
    this.swordLvl = opts.swordLvl || 0;
    const meal = opts.meal || null; // باف غذای سفر (مصرف‌شده هنگام ورود)
    const eq = equipStats(opts.equip); // آمار آیتم‌های پوشیدنی
    this.equip = opts.equip || null; this.equipSig = equipSig(opts.equip); // برای کش اسپرایت
    this.speedMul = (1 + 0.06 * (opts.bootsLvl || 0)) * (1 + eq.speed) * (meal ? (meal.speed ?? 1) : 1);
    this.baseDmg = Math.round((12 + 4 * this.swordLvl + eq.dmg) * (meal ? (meal.dmg ?? 1) : 1));
    this.skillDmg = Math.round((30 + 8 * this.swordLvl + eq.dmg) * (meal ? (meal.dmg ?? 1) : 1));
    this.maxHp = 100 + 20 * (opts.armorLvl || 0) + eq.hp + (meal ? (meal.hp ?? 0) : 0);
    this.essence = 0; this.kills = 0; this.deaths = 0; this.eliteKills = 0; this._maxCombo = 0;
    this.loot = { coins: 0, seeds: null, items: null }; // غنیمت این دور (بذر/آیتم/سکه) — با خروج واریز می‌شود
    this.critBonus = eq.crit; this.greedBonus = 0; this.rangeBonus = 0; // برکت‌های محراب + کریتِ تجهیز
    this.comboN = 0; this.comboT = 0; // کمبو کشتار: پنجره ۴ث، +۴٪/پله تا ۵ پله
    this.hero = {
      x: 0, y: 0, hp: this.maxHp, dir: 'down', loco: new Locomotion(),
      act: -1, actDur: 1, applied: false, atkTarget: null, atkCd: 0,
      skillT: 0, skillCd: 0, dashT: 0, dashCd: 0, iframe: 0, hurtT: 0, dead: false, chill: 0,
    };
    this.cam = { x: 0, y: 0 };
    this.view = { w: 216, h: 150 };
    // اشیای مشترک حلقه‌ی دشمن‌ها — یک‌بار ساخته می‌شوند (قبلاً هر دشمن در هر فریم یک آبجکت+دو کلوژر می‌ساخت!)
    this._tgt = { x: 0, y: 0 };
    this._hooks = {
      solid: (x, y) => !this.dungeon.walkable(Math.floor(x / TILE), Math.floor(y / TILE)),
      onShoot: (from, tx, ty) => { // ن۴۴: کماندار/آتش‌جان (ن۴۷: صدا هم دارد)
        if (this.onSfx) this.onSfx(from.kind === 'imp' ? 'fire' : 'shoot');
        spawnProj(this.projs, from.kind === 'imp' ? 'fire' : 'arrow', from.x, from.y - 12, tx, ty, from.dmg, from);
      },
      onHit: (from, dmg) => {
        const hh = this.hero;
        if (hh.iframe > 0 || hh.dead) return;
        hh.hp -= dmg; hh.hurtT = 0.18;
        if (from.kind === 'yeti') hh.chill = 1.6; // ن۴۴: ضربه‌ی یخ‌مرد = کندی موقت
        if (from.kind === 'bandit' && from.stole === undefined) { // ن۴۴: دزدی سکه سپس فرار
          const amt = Math.min(this.loot.coins, 3 + (this.floor >> 1));
          from.stole = amt > 0 ? amt : 0;
          if (amt > 0) { this.loot.coins -= amt; this.fx.float(hh.x, hh.y - 56, '-' + amt, 'gold'); }
        }
        if (this.onSfx) this.onSfx('hurt');
        this.comboN = 0; this.comboT = 0; // ضربه خوردن = قطع کمبو
        this.fx.float(hh.x, hh.y - 44, '-' + Math.round(dmg), 'dmg');
        this.fx.shake(3, 0.18);
        if (from.isBoss && from.atk === 'slam') this.fx.shake(4, 0.3);
        if (hh.hp <= 0) this._die();
      },
    };
    this.time = 0;
    this.log = [];
    this.fx = new FX();
    this.standT = 0;
    this.projs = []; // ن۴۴
    this.loadFloor(1);
  }
  loadFloor(f) {
    if (f > 1 && this.onSfx) this.onSfx('floor'); // موج پایین‌روی طبقه‌ی جدید
    this._floorCache = null; // رندر ایستای طبقه‌ی جدید در فریم بعد
    this._splash = { t0: this.time, n: f, boss: f % 10 === 0 }; // ن۴۱: اسپلش نام طبقه (this.floor هنوز قدیمی است — از f)
    const _after = () => { // پاف غبار ظهور برای هر هیولای جدید
      for (const e of this.dungeon.enemies) this.fx.burst(e.x, e.y - 8, [[150, 145, 165, 200], [90, 85, 105, 200]], 8, { sp: 30, up: 14, life: 0.5 });
    };
    this.floor = f;
    this.path = null; this.tgt = null; this._trail = null; this.standT = 0; this.projs.length = 0; // ن۴۴: پرتابه‌های طبقه‌ی قبل پاک
    this.hero.chill = 0; // ن۴۷: کندی یخ بین طبقات حمل نمی‌شود
    this.dungeon = new Dungeon(this.seed, f);
    _after();
    const h = this.hero;
    h.x = this.dungeon.spawn.x * TILE + 8; h.y = this.dungeon.spawn.y * TILE + 8;
    h.skillCd = 0; h.dashCd = 0;
    if (!floor10(f)) h.hp = Math.min(this.maxHp, h.hp + 25);
    this.log.push({ k: 'floor', n: f, boss: floor10(f) });
    if (floor10(f)) { this.log.push({ k: 'bossIntro' }); this.fx.shake(3, 0.5); }
  }
  get isBossFloor() { return floor10(this.floor); }
  stairsOpen() { return !this.isBossFloor || !this.dungeon.enemies.some((e) => e.isBoss && e.state !== 'die'); }

  // تپ/هدف: مسیریابی A* در دانجن (تپ مستقیم روی دیوار گیر نمی‌کند)
  moveTo(x, y) {
    const h = this.hero, D = this.dungeon;
    this.tgt = [x, y];
    let gx = Math.floor(x / TILE), gy = Math.floor(y / TILE);
    if (!D.walkable(gx, gy)) { // تپ روی دیوار → نزدیک‌ترین همسایه‌ی قابل‌رفت
      let best = null, bd = 1e9;
      for (let r = 1; r <= 3 && !best; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const nx = gx + dx, ny = gy + dy;
        if (!D.walkable(nx, ny)) continue;
        const d = Math.hypot(nx * TILE + 8 - x, ny * TILE + 8 - y);
        if (d < bd) { bd = d; best = [nx, ny]; }
      }
      if (best) { gx = best[0]; gy = best[1]; this.tgt = [gx * TILE + 8, gy * TILE + 8]; }
    }
    const path = findPath(D, Math.floor(h.x / TILE), Math.floor(h.y / TILE), gx, gy);
    this.path = path && path.length ? path : null; // اگر نایافتنی: فرمان مستقیم (رفتار قدیمی)
    this._stuckT = 0; this._lastPos = [h.x, h.y]; this._retried = false;
  }

  trySkill() {
    const h = this.hero;
    if (h.dead || h.skillCd > 0 || h.skillT > 0) return;
    h.skillT = 0.55; h.skillCd = 5; h.iframe = Math.max(h.iframe, 0.55);
    if (this.onSfx) this.onSfx('skill');
    this.log.push({ k: 'skill' });
  }
  tryDash(dx, dy) {
    const h = this.hero;
    if (h.dead || h.dashCd > 0) return;
    const l = Math.hypot(dx, dy) || 1;
    h.dashT = 0.22; h.dashCd = 2.2; h.iframe = Math.max(h.iframe, 0.4);
    h.dashX = dx / l; h.dashY = dy / l;
    this._trail = []; // رد شبح‌مانند
    this.fx.dust(h.x, h.y, 6);
  }

  update(dt, steer) {
    this.time += dt;
    if (this.fx.hitstop > 0) { this.fx.hitstop -= dt; this.fx.update(dt); return; } // فریز دنیا، افکت‌ها زنده
    this.fx.update(dt);
    const h = this.hero, D = this.dungeon;
    for (const k of ['skillCd', 'dashCd', 'iframe', 'hurtT', 'chill']) if (h[k] > 0) h[k] -= dt;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.comboN = 0; }
    if (this._wasCd > 0 && h.skillCd <= 0) this._skillPulse = 0.55; // پالس «مهارت آماده است»
    this._wasCd = h.skillCd;
    if (this._skillPulse > 0) this._skillPulse -= dt;
    if (h.dead) { h.deadT = (h.deadT || 0) + dt; return; }

    // ---- حرکت ----
    let vx = 0, vy = 0, run = steer ? steer.run : false;
    if (h.dashT > 0) { h.dashT -= dt; vx = h.dashX; vy = h.dashY; run = true; if (h.dashT <= 0) this.fx.dust(h.x, h.y, 5); }
    if (this._trail && this._trail.length) { for (const g of this._trail) g.t += dt; while (this._trail.length && this._trail[0].t > 0.3) this._trail.shift(); }
    if (h.dashT > 0 && this._trail) { this._trail.push({ x: h.x, y: h.y, t: 0 }); if (this._trail.length > 10) this._trail.shift(); }
    else if (steer && (steer.x || steer.y)) { this.tgt = null; this.path = null; vx = steer.x; vy = steer.y; }
    else if (this.path && this.path.length) {
      // پیگیری مسیر A* (تپ در دانجن)
      const wp = this.path[0], wx = wp.x * TILE + 8, wy = wp.y * TILE + 8;
      const dx = wx - h.x, dy = wy - h.y, d = Math.hypot(dx, dy);
      const wpSpd = GAITS[h.dashT > 0 ? 'run' : 'walk'].speed * this.speedMul * (h.dashT > 0 ? 3.1 : 1);
      if (d <= Math.max(2.5, wpSpd * dt)) { // اسنپ: مقاوم به فریم‌ریت پایین
        h.x = wx; h.y = wy;
        this.path.shift();
        if (!this.path.length) { this.tgt = null; }
      } else { vx = dx / d; vy = dy / d; run = this.path.length > 5 || d > 80; }
      // گیرکردن؟ (۲ ثانیه بدون پیشرفت → یک‌بار مسیر را نو کن، بعد رها کن)
      this._stuckT = (this._stuckT || 0) + dt;
      if (this._stuckT > 0.5) {
        if (Math.hypot(h.x - this._lastPos[0], h.y - this._lastPos[1]) < 2) {
          if (!this._retried && this.tgt) { this._retried = true; const t = this.tgt; this.moveTo(t[0], t[1]); }
          else { this.tgt = null; this.path = null; }
        }
        this._stuckT = 0; this._lastPos = [h.x, h.y];
      }
    }
    else if (this.tgt) { // فرمان مستقیم (پایان‌یافته یا نایافتنی)
      const dx = this.tgt[0] - h.x, dy = this.tgt[1] - h.y, d = Math.hypot(dx, dy);
      if (d < 3) this.tgt = null;
      else { vx = dx / d; vy = dy / d; run = d > 95; }
    }
    const spd = (vx || vy) ? (h.dashT > 0 ? GAITS.run.speed * 3.1 : (run ? GAITS.run.speed : GAITS.walk.speed)) * this.speedMul * (h.chill > 0 ? 0.55 : 1) : 0; // ن۴۴: کندی یخ
    if (spd) {
      const nx = h.x + vx * spd * dt, ny = h.y + vy * spd * dt;
      if (D.walkable(Math.floor(nx / TILE), Math.floor(h.y / TILE))) h.x = nx;
      if (D.walkable(Math.floor(h.x / TILE), Math.floor(ny / TILE))) h.y = ny;
      if (!(h.skillT > 0)) h.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up');
      // گرد و خبار دویدن
      const ph = h.loco.mix < 0.5 ? h.loco.phW : h.loco.phR;
      const st = Math.floor(ph * 2) !== Math.floor(((ph - spd * dt / (h.loco.mix < 0.5 ? 16 : 23)) % 1 + 1) % 1 * 2);
      if (run && st) this.fx.dust(h.x, h.y + 2, 2, [120, 110, 140, 90]);
    }
    h.loco.update(dt, spd, vx, vy, run);

    // ---- جنگ (run_combat.js): حمله‌ی خودکار + مهارت چرخش ----
    runAttack(this, dt);
    runSkillSpin(this, dt);

    // ---- دشمن‌ها ----
    this._tgt.x = h.x; this._tgt.y = h.y - 10; // بازنویسی همان شیء — صفر تخصیص
    for (let i = D.enemies.length - 1; i >= 0; i--) {
      const e = D.enemies[i];
      e.update(dt, this._tgt, this._hooks);
      if (e.dead) { D.enemies.splice(i, 1); lootKill(this, e); } // غنیمت/کمبو/ذرات در run_loot.js
    }
    separateEnemies(this);

    // ---- پرتابه‌های دشمن (ن۴۴): تیر/گلوله‌ی آتش ----
    updateProjs(this.projs, dt, this._hooks.solid, (p) => {
      if (Math.hypot(h.x - p.x, h.y - 10 - p.y) < PROJ[p.kind].r + 3) { this._hooks.onHit(p.owner, p.dmg); return true; }
      return false;
    });

    // ---- غنیمت‌ها (آهن‌ربا) + صندوق‌ها: run_loot.js ----
    lootUpdate(this, dt);
    lootChests(this);

    // ---- پله ----
    const sc = D.stairs;
    const onStairs = Math.floor(h.x / TILE) === sc.x && Math.floor(h.y / TILE) === sc.y;
    if (this.stairsOpen() && onStairs && this.standT > 0.4) { this.loadFloor(this.floor + 1); this.standT = 0; return; }
    this.standT = onStairs ? (this.standT || 0) + dt : 0;

    const tx = clamp(h.x - this.view.w / 2, 0, WORLD_W - this.view.w), ty = clamp(h.y - this.view.h / 2, 0, WORLD_H - this.view.h);
    const k = 1 - Math.exp(-9 * dt);
    this.cam.x += (tx - this.cam.x) * k; this.cam.y += (ty - this.cam.y) * k;
  }
  _die() {
    const h = this.hero;
    h.hp = 0; h.dead = true; h.deadT = 0;
    const lost = this.essence - Math.floor(this.essence / 2);
    this.essence = Math.floor(this.essence / 2);
    this.loot.coins = Math.floor(this.loot.coins / 2); // سکه/بذر نصف؛ آیتم‌های پوشیدنی می‌مانند
    if (this.loot.seeds) for (const k in this.loot.seeds) this.loot.seeds[k] = Math.floor(this.loot.seeds[k] / 2);
    this.fx.shake(4, 0.5);
    this.log.push({ k: 'died', lost, floor: this.floor, kills: this.kills });
  }
  // برکت محراب باستانی — فقط همین دور
  applyBoon(id) {
    const h = this.hero;
    if (id === 'dmg') { this.baseDmg = Math.round(this.baseDmg * 1.12); this.skillDmg = Math.round(this.skillDmg * 1.12); }
    else if (id === 'hp') h.hp = Math.min(this.maxHp, h.hp + Math.round(this.maxHp * 0.4));
    else if (id === 'speed') this.speedMul *= 1.08;
    else if (id === 'crit') this.critBonus += 0.08;
    else if (id === 'greed') this.greedBonus += 1;
    else if (id === 'range') this.rangeBonus += 6;
    this.fx.float(h.x, h.y - 52, '✦', 'skill');
  }
  restart() {
    this.essence = 0; this.kills = 0; this.eliteKills = 0; this._maxCombo = 0;
    this.critBonus = 0; this.greedBonus = 0; this.rangeBonus = 0; this.deaths++;
    this._banked = false; this.comboN = 0; this.comboT = 0; // دورِ نو: پایانِ دور قبلی واریز شد (ن۳۴)
    const h = this.hero;
    h.hp = this.maxHp; h.dead = false; h.deadT = 0;
    this.seed = (Date.now() % 100000) | 0;
    this.loadFloor(1);
  }
  float(x, y, txt, col) { this.fx.float(x, y, txt, col); }

  // ---------- رندر ----------
  render(r) { renderRun(this, r); }
  _heroSprite(hurt = false) { return heroSprite(this, hurt); }
}
