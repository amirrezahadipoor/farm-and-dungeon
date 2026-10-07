// farm_worker.js — کارگر مزرعه‌ی «واقعی» روی نقشه: می‌خرد، قابلیت‌هایش را ارتقا می‌دهی،
// خودش راه می‌رود (A*)، کنار تایل می‌ایستد و با انیمیشن ابزار کار می‌کند.
// ظاهر: همان اسکلت قهرمان با پالت عوض‌شده (روپوش سبز + کلاه حصیری + دستمال کرم)
import { findPath } from './astar.js';
import { Locomotion, GAITS } from './skeleton.js';
import { drawHeroFrame, frameKey, framePhase, halfSprite } from './art/hero.js';
import { ACT_DUR, HOX, HOY } from './art/hero_pose.js';
import { TILE } from './tiles.js';
import { recolorWorker } from './art/recolor.js';
import { CROPS, WATER_TIME, pondK } from './farm.js';

// ---------- تعویض پالت قهرمان → کارگر ----------
const PRIO = { sickle: 0, can: 1, seed: 2, hoe: 3 }; // برداشت > آب > کاشت > شخم

export class FarmWorker {
  constructor(x, y, variant = 0) {
    this.x = x; this.y = y;
    this.variant = variant; // ۰ = روپوش سبز، ۱ = کاپشن حنایی (کارگر دوم)
    this.loco = new Locomotion();
    this.dir = 'down';
    this.path = [];
    this.task = null;               // { tool, tx, ty }
    this.act = -1; this.actDur = 1; this.applied = false;
    this.tool = 'none';
    this.thinkT = 0.6;
    this.wanderT = 6 + Math.random() * 4;
    this._cache = new Map();
    this._lastStep = 0;
  }

  // سرعت راه‌رفتن و کار با ارتقای wSpeed
  moveSpeed(up) { return GAITS.walk.speed * (0.8 + 0.08 * (up.wSpeed || 0)); }
  actMul(up) { return Math.pow(0.85, up.wSpeed || 0); }

  update(dt, game) {
    const up = game.toolLvls;
    if (!up.worker) return;
    const f = game.farm;

    // ---- در حال کار: انیمیشن ابزار ----
    if (this.act >= 0) {
      this.act += dt / this.actDur;
      if (this.act >= 0.5 && !this.applied) { this.applied = true; this._apply(game); }
      if (this.act >= 1) { this.act = -1; this.tool = 'none'; this.task = null; this.thinkT = 0.35; }
      this.loco.update(dt, 0, 0, 0, false);
      return;
    }

    // ---- در حال راه‌رفتن به تسک ----
    if (this.path.length) {
      const wp = this.path[0], wx = wp.x * TILE + 8, wy = wp.y * TILE + 8;
      const dx = wx - this.x, dy = wy - this.y, d = Math.hypot(dx, dy);
      if (d < 1.4) this.path.shift();
      else {
        const sp = this.moveSpeed(up);
        this.x += (dx / d) * sp * dt;
        this.y += (dy / d) * sp * dt;
        this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        this.loco.update(dt, sp, dx / d, dy / d, false);
        const ph = this.loco.phW; // گرد و خاک قدم
        if (Math.floor(ph * 2) !== this._lastStep) { this._lastStep = Math.floor(ph * 2); game.fx.dust(this.x, this.y + 2, 1, [110, 130, 90, 55]); }
        return;
      }
    }

    // ---- رسیدیم: شروع کار روی تایل ----
    if (this.task) {
      const { tx, ty, tool } = this.task;
      const cx = tx * TILE + 8, cy = ty * TILE + 8;
      const dx = cx - this.x, dy = cy - this.y;
      this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      this.tool = tool; this.act = 0; this.applied = false;
      this.actDur = ACT_DUR[tool] * this.actMul(up);
      return;
    }

    // ---- بیکار: دنبال کار بگرد؛ نبود؟ پرسه‌ی طبیعی داخل مزرعه ----
    this.loco.update(dt, 0, 0, 0, false);
    this.thinkT -= dt;
    if (this.thinkT <= 0) { this.thinkT = 0.8; this._findTask(game); }
    this.wanderT -= dt;
    if (this.wanderT <= 0) { this.wanderT = 7 + Math.random() * 5; this._wander(game); }
  }

  _findTask(game) {
    const up = game.toolLvls, f = game.farm, w = game.wallet;
    const canPlant = up.wPlant && (w.seeds ? w.seeds[w.selectedCrop] : 0) > 0;
    // تایل‌های در دستِ کارگر دیگر را نچین
    const claimed = new Set();
    for (const o of (game.workers || [])) if (o !== this && o.task) claimed.add(o.task.tx + ',' + o.task.ty);
    const cands = [];
    for (const c of f.grid) {
      if (claimed.has(c.x + ',' + c.y)) continue;
      if (c.kind === 'grass' && c.farmable && up.wTill) cands.push({ tool: 'hoe', tx: c.x, ty: c.y });
      else if (c.kind === 'soil') {
        if (!c.crop) { if (canPlant && f.canPlant(w.selectedCrop, c.x, c.y)) cands.push({ tool: 'seed', tx: c.x, ty: c.y }); }
        else {
          if (f.mature(c) && up.wHarvest) cands.push({ tool: 'sickle', tx: c.x, ty: c.y });
          else if (!c.wet && up.wWater) cands.push({ tool: 'can', tx: c.x, ty: c.y });
        }
      }
    }
    // اولویت نوع کار + نزدیک‌ترین تایل
    cands.sort((a, b) => (PRIO[a.tool] - PRIO[b.tool]) ||
      (Math.hypot(a.tx * TILE + 8 - this.x, a.ty * TILE + 8 - this.y) - Math.hypot(b.tx * TILE + 8 - this.x, b.ty * TILE + 8 - this.y)));
    for (const cand of cands.slice(0, 6)) {
      const path = this._pathTo(f, cand.tx, cand.ty);
      if (path && path.length) { this.task = cand; this.path = path; return; }
    }
    this.thinkT = 1.5; // فعلاً کاری نیست
  }

  _wander(game) { // آدم بیکار جایی می‌رود — فقط داخل زمین مزرعه/باغ
    if (this.task || this.path.length) return;
    const f = game.farm;
    const gx = Math.floor(this.x / TILE) + ((Math.random() * 7) | 0) - 3;
    const gy = Math.floor(this.y / TILE) + ((Math.random() * 7) | 0) - 3;
    if (!f.walkable(gx, gy) || (!f.insideFence(gx, gy) && !f.inFarm2(gx, gy))) return;
    const p = findPath(f, Math.floor(this.x / TILE), Math.floor(this.y / TILE), gx, gy);
    if (p && p.length) this.path = p;
  }

  // بایست کنار تایل کار (مثل قهرمان)
  _pathTo(f, tx, ty) {
    let best = null, bd = 1e9;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = tx + dx, ny = ty + dy;
      if (!f.walkable(nx, ny)) continue;
      const d = Math.hypot(nx * TILE + 8 - this.x, ny * TILE + 8 - this.y);
      if (d < bd) { bd = d; best = { x: nx, y: ny }; }
    }
    if (!best) return null;
    return findPath(f, Math.floor(this.x / TILE), Math.floor(this.y / TILE), best.x, best.y);
  }

  _apply(game) {
    const t = this.task;
    if (!t) return;
    const res = game.farm.applyTool(t.tool, t.tx, t.ty, game.wallet.selectedCrop);
    if (!res.ok) return;
    if (res.ev === 'water') { const c0 = game.farm.cell(t.tx, t.ty); if (c0) c0.wetT = WATER_TIME * (1 + 0.2 * game.toolLvls.can) * pondK(t.tx, t.ty); } // هم‌فرمول قهرمان (ن۳۴)
    if (res.ev === 'plant' && game.wallet.seeds) game.wallet.seeds[res.type]--; // بذر کارگر هم از موجودی
    const cx = t.tx * TILE + 8, cy = t.ty * TILE + 8;
    if (res.ev === 'till') {
      game.fx.burst(cx, cy, [[138, 110, 70, 255], [190, 160, 110, 255]], 7, { sp: 26, up: 20, life: 0.4 });
      game.fx.stop(0.025);
    } else if (res.ev === 'plant') {
      game.fx.burst(cx, cy, [[140, 200, 120, 255], [220, 240, 200, 255]], 6, { sp: 18, up: 26, life: 0.4 });
    } else if (res.ev === 'water') {
      game.fx.burst(cx, cy, [[110, 170, 230, 255], [220, 240, 255, 255]], 7, { sp: 22, up: 16, life: 0.35 });
    } else if (res.ev === 'harvest') {
      game.wallet.inventory[res.type] = (game.wallet.inventory[res.type] || 0) + res.count;
      game.float(cx, cy - 8, '+' + res.count, 'white');
      if (res.g) { // جکپات طلایی — کارگر هم می‌گیرد (ن۳۴: قبلاً بی‌صدا از دست می‌رفت)
        const bonus = CROPS[res.type].sell * 4 * res.count;
        game.wallet.coins += bonus;
        game.float(cx, cy - 18, '+' + bonus, 'crit', { scale: 1.2 });
        if (game.onEvent) game.onEvent('golden', 1);
      }
      game.fx.burst(cx, cy, [[240, 220, 130, 255], [255, 255, 255, 255]], 9, { sp: 30, up: 30, life: 0.45 });
      game.fx.stop(0.03);
      if (game.onEvent) game.onEvent('harvest', res.count); // مأموریتِ برداشت — کارگر هم می‌شمارد
    }
  }

  _frame(time) {
    const l = this.loco;
    const anim = this.act >= 0 || l.moveW < 0.02 ? 'idle' : 'walk';
    const phase = anim === 'idle' ? (l.t % 2.4) / 2.4 : l.phW;
    const o = { dir: this.dir, anim, phase, breath: l.t, moveW: anim === 'idle' ? 0 : l.moveW, tool: this.tool, actP: this.act, blink: l.blink };
    const key = frameKey({ ...o, phase: framePhase(o) }) + '#W' + this.variant;
    let s = this._cache.get(key);
    if (!s) {
      s = halfSprite(recolorWorker(drawHeroFrame({ ...o, phase: framePhase(o) }), this.variant)); // ن۳۵: رنگ‌سازی در اندازه‌ی کامل (نقشه‌ی پالت دقیق) بعد نصف‌شدن
      if (this._cache.size > 250) { const it = this._cache.keys(); for (let i = 0; i < 80; i++) { const k = it.next(); if (k.done) break; this._cache.delete(k.value); } }
      this._cache.set(key, s);
    }
    return s;
  }

  render(r, cx, cy, time) {
    this._frame(time).over(r, Math.round(this.x) - HOX - cx, Math.round(this.y) - HOY - cy);
  }
}
