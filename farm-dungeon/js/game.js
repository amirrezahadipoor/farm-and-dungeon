// game.js — هسته‌ی بازی (بدون DOM): قهرمان + به‌روزرسانی + صف کار + ذرات/متن‌ها + رندر صحنه
// (اعمال ابزار/اقتصاد برداشت در game_apply.js — ن۳۴)
import { Farm, CROPS, WATER_TIME, FARM2_COST, SEED_TYPES } from './farm.js';
import { farmCommand } from './farm_command.js';
import { gameApply } from './game_apply.js';
import { Locomotion, GAITS } from './skeleton.js';
import { ACT_DUR } from './art/hero_pose.js';
import { E, TILE, WORLD_W, WORLD_H } from './tiles.js';
import { FX } from './fx.js';
import { DAY_LEN } from './night.js';
import { Fish } from './art/critters.js';
import { FarmWorker } from './farm_worker.js';
import { renderFarm, farmHeroSprite } from './farm_render.js';
import { isRaining } from './art/weather.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295; };


export class Game {
  constructor(wallet = null, landLevel = 5, toolLvls = null, bootsLvl = 0) {
    this.wallet = wallet || { coins: 60, inventory: { carrot: 0, wheat: 0, pumpkin: 0 }, selectedCrop: 'carrot' };
    if (!this.wallet.seeds) { this.wallet.seeds = {}; for (const t of SEED_TYPES) this.wallet.seeds[t] = 0; this.wallet.seeds.carrot = 6; }
    this.toolLvls = toolLvls || { hoe: 0, can: 0, sickle: 0, sword: 0 };
    this.onGate = null;
    this.farm = new Farm(landLevel, !!(wallet && wallet.upgrades && wallet.upgrades.farm2));
    this.hero = {
      x: 16.5 * TILE, y: 18.5 * TILE, dir: 'up', loco: new Locomotion(), // جلوی درِ خانه‌ی مزرعه
      tool: 'none', act: -1, actDur: 1, applied: false, path: [], work: null, run: false, pending: null,
    };
    this.cam = { x: 0, y: 0 };
    this.view = { w: 216, h: 150 };
    this.log = []; this.marker = null;
    this.time = (wallet && wallet.stats && wallet.stats.playT) || 0; // شمار روز پیوسته بین سشن‌ها (ن۳۴: سیب‌دار بعد از ریلود دوباره نمی‌دهد)
    this.fx = new FX();
    this.queue = [];          // صف کار (رنگ‌آمیزی با کشیدن انگشت)
    this.speedMul = 1 + 0.06 * bootsLvl;
    this.dayT = 0;            // چرخه‌ی روز/شب (DAY_LEN = ۱ ساعت)
    this.fish = new Fish(1); // ن۳۶: یک ماهی — رخداد نادرِ زنده‌بودن حوضچه
    this.workers = [new FarmWorker(15.5 * TILE, 12.5 * TILE, 0)]; // کارگران مزرعه (تا ۲ تا — با ارتقا فعال)
    this.worker = this.workers[0]; // سازگاری
    this.onEvent = null; // هوک مأموریت‌ها: (kind, n) — main_app وصل می‌کند
    this.onHouse = null; // تپ روی خانه → میز کار/منو (تخته‌ی مأموریت)
    this.sprCache = new Map();
    this.fertMul = 1; // ضریب رشد (کود گوهری) — main_app همگام می‌کند
    // دوربین از همان ابتدا روی قهرمان
    this.cam.x = clamp(this.hero.x - this.view.w / 2, 0, WORLD_W - this.view.w);
    this.cam.y = clamp(this.hero.y - this.view.h / 2, 0, WORLD_H - this.view.h);
  }

  // ---------- فرمان تپ: مسیریابی و کار خودکار (جداسازی: farm_command.js) ----------
  command(wx, wy) { farmCommand(this, wx, wy); }

  // ---------- به‌روزرسانی ----------
  update(dt, steer) {
    this.time += dt;
    if (this.fx.hitstop > 0) { this.fx.hitstop -= dt; this.fx.update(dt); return; }
    this.fx.update(dt);
    const h = this.hero;

    // حرکت مستقیم (لمسِ نگه‌داشته / کیبورد) مسیر و کار را قطع می‌کند
    if (steer && (steer.x || steer.y)) {
      if (h.act >= 0) { h.act = -1; h.tool = 'none'; }
      h.path = []; h.work = null; this.marker = null;
    }
    let vx = 0, vy = 0, wantRun = false;
    if (steer && (steer.x || steer.y)) { vx = steer.x; vy = steer.y; wantRun = steer.run; }
    else if (h.path.length) {
      const wp = h.path[0], tx = wp.x * TILE + 8, ty = wp.y * TILE + 8;
      const dx = tx - h.x, dy = ty - h.y, d = Math.hypot(dx, dy);
      const wpSpd = (h.run ? GAITS.run.speed : GAITS.walk.speed) * this.speedMul;
      if (d <= Math.max(1.4, wpSpd * dt)) { h.x = tx; h.y = ty; h.path.shift(); } // اسنپ: حتی با گام بلند (فریم‌ریت پایین) نوسان نمی‌گیرد
      else { vx = dx / d; vy = dy / d; wantRun = h.run; }
    }
    const speed = (vx || vy) ? (wantRun ? GAITS.run.speed : GAITS.walk.speed) * this.speedMul : 0;
    this.dayT = (this.dayT + dt) % DAY_LEN;
    if (speed) {
      h.x = clamp(h.x + vx * speed * dt, TILE + 6, WORLD_W - TILE - 6);
      h.y = clamp(h.y + vy * speed * dt, TILE + 10, WORLD_H - TILE - 2);
      h.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up');
    }
    h.loco.update(dt, speed, vx, vy, wantRun);
    if (wantRun && speed) {
      const ph = h.loco.mix < 0.5 ? h.loco.phW : h.loco.phR;
      if (this._lastStep !== undefined && Math.floor(ph * 2) !== this._lastStep) this.fx.dust(h.x, h.y + 2, 2, [110, 130, 90, 80]);
      this._lastStep = Math.floor(ph * 2);
    }

    // رسیدن به مقصد کار → شروع اکشن
    if (!h.path.length && h.work && h.act < 0) {
      const w = h.work;
      if (w.gate) { h.work = null; this.marker = null; this.onGate && this.onGate(); return; }
      if (w.house) { h.work = null; this.marker = null; this.onHouse && this.onHouse(); return; }
      if (w.tree) { // چیدن سیب — یک بار در روز از هر درخت
        const c = this.farm.cell(w.tx, w.ty);
        const day = Math.floor(this.time / DAY_LEN);
        h.work = null; this.marker = null;
        if (c && c.kind === 'tree' && (c.variant & 1) && c.appleDay !== day) {
          c.appleDay = day;
          this.wallet.inventory.apple = (this.wallet.inventory.apple || 0) + 1;
          const cx = w.tx * TILE + 8, cy = w.ty * TILE + 4;
          this.fx.burst(cx, cy - 10, [[226, 72, 90, 255], [255, 137, 146, 255], [110, 180, 90, 255]], 9, { sp: 26, up: 32, life: 0.5 });
          this.float(cx, cy - 16, '+1', 'gold');
          this.log.push({ k: 'appleGot' });
          if (this.onSfx) this.onSfx('apple');
          if (this.onEvent) this.onEvent('harvest', 1); // سیب هم کارِ مزرعه است
        } else this.log.push({ k: 'appleEmpty' });
        return;
      }
      if (w.sign) { // تابلوی فروش باغ شمالی
        h.work = null; this.marker = null;
        const wal = this.wallet;
        if (wal.upgrades && wal.upgrades.farm2) return;
        if (wal.coins >= FARM2_COST) {
          wal.coins -= FARM2_COST;
          if (wal.upgrades) wal.upgrades.farm2 = 1;
          this.farm.setFarm2(true);
          this.fx.burst(h.x, h.y - 10, [[140, 200, 120, 255], [230, 199, 74, 255], [255, 255, 255, 255]], 18, { sp: 46, up: 34, life: 0.6 });
          this.fx.shake(2, 0.15);
          this.log.push({ k: 'farm2Done' });
          if (this.onEvent) this.onEvent('farm2', 1);
        } else this.log.push({ k: 'farm2Need', n: FARM2_COST });
        return;
      }
      if (w.tool) {
        const cx = w.tx * TILE + 8, cy = w.ty * TILE + 8;
        const dx = cx - h.x, dy = cy - h.y;
        h.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        h.tool = w.tool; h.act = 0; h.actDur = ACT_DUR[w.tool]; h.applied = false;
      } else if (w.info) {
        const c = this.farm.cell(w.tx, w.ty);
        if (c && c.crop) {
          const pct = Math.min(99, Math.floor((c.crop.progress / CROPS[c.crop.type].grow) * 100));
          this.float(w.tx * TILE + 8, w.ty * TILE + 2, pct + '%', 'white');
        }
        h.work = null; this.marker = null;
      } else { h.work = null; this.marker = null; }
    }
    // خط زمانی اکشن: ضربه در نیمه‌ی انیمیشن اعمال می‌شود
    if (h.act >= 0) {
      h.act += dt / h.actDur;
      if (h.act >= 0.5 && !h.applied) { h.applied = true; gameApply(this); }
      if (h.act >= 1) {
        h.act = -1; h.tool = 'none';
        const p = h.pending; h.pending = null; h.work = null; this.marker = null;
        // صف: آیتم نامعتبر (مثلاً سکه‌ی بذر نبود) نباید زنجیره را بکشد — تا کارِ بعدی ادامه بده
        while (this.queue.length) {
          const q = this.queue.shift();
          this.command(q.tx * TILE + 8, q.ty * TILE + 8);
          if (h.path.length || h.act >= 0) return;
        }
        if (p) this.command(p[0], p[1]);
      }
    }

    this.farm.update(dt, this.fertMul);
    if (isRaining(this.dayT)) { // باران = آبیاری رایگان — کشت‌شده‌ها + خاکِ لختِ شخم‌خورده (ن۳۱) + نزدیک حوضچه بیشتر
      this._rainT = (this._rainT || 0) - dt;
      if (this._rainT <= 0) { // ن۳۴: پاسِ باران هر ۰٫۵ث کافی است — قبلاً هر فریم کل گرید اسکن می‌شد
        this._rainT = 0.5;
        const G = this.farm.grid;
        for (let i = 0; i < G.length; i++) { const c = G[i]; if (c.kind === 'soil') this.farm.soak(c, Math.max(Math.abs(c.x - 27), Math.abs(c.y - 16)) <= 4 ? 6 : 4); }
      }
    }
    const wn = Math.max(0, Math.min(2, this.toolLvls.worker | 0));
    while (this.workers.length < wn) this.workers.push(new FarmWorker(17.5 * TILE, 18.5 * TILE, this.workers.length)); // از خانه می‌آیند — حیاط جلویی
    if (this.workers.length > wn) this.workers.length = wn;
    this.worker = this.workers[0] || null;
    for (const wk of this.workers) wk.update(dt, this);
    if (this.marker) this.marker.t += dt;

    // دوربین نرم
    const txx = WORLD_W <= this.view.w ? (WORLD_W - this.view.w) / 2 : clamp(h.x - this.view.w / 2, 0, WORLD_W - this.view.w);
    const tyy = WORLD_H <= this.view.h ? (WORLD_H - this.view.h) / 2 : clamp(h.y - this.view.h / 2, 0, WORLD_H - this.view.h);
    const k = 1 - Math.exp(-10 * dt);
    this.cam.x += (txx - this.cam.x) * k;
    this.cam.y += (tyy - this.cam.y) * k;
  }

  float(x, y, txt, col) { this.fx.float(x, y, txt, col); }

  sellAll() {
    const inv = this.wallet.inventory;
    let total = 0, items = 0;
    for (const k in inv) { const n = inv[k]; if (n && CROPS[k]) { total += n * CROPS[k].sell; items += n; } } // سیب = غذای وعده، فروختنی نیست (ن۳۴: قبلاً CROPS.apple undefined → کرش!)
    if (!items) { this.log.push({ k: 'nothing' }); return 0; }
    for (const k in inv) if (CROPS[k]) inv[k] = 0; // فقط محصولات — سیب غذای وعده است (ن۳۴)
    this.wallet.coins += total;
    if (this.onSfx) this.onSfx('coin');
    if (this.onEvent) this.onEvent('sell', items);
    this.float(this.hero.x, this.hero.y - 44, '+' + total, 'gold');
    this.log.push({ k: 'sold', n: total });
    return total;
  }

  // ---------- اسپرایت قهرمان (کش‌شده) ----------
  _heroSprite() { return farmHeroSprite(this); }
  render(r) { renderFarm(this, r); }
}
