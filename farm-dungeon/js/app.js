// app.js — اپ کامل: کیف پول + ارتقاها (هزینه = پایه × 1.15^سطح) + دستیارهای idle + شبیه‌سازی آفلاین (تا ۸ ساعت)
import { ensureQuests, trackQuests } from './quests.js';
import { CROPS, WATER_TIME, LAND_MAX, landRows, SEED_TYPES } from './farm.js';

const OFFLINE_CAP = 8 * 3600; // ۸ ساعت

// پایه‌ی هزینه‌ها + حداکثر سطح
export const UPG = {
  land:     { base: 150, max: LAND_MAX, cur: 'coins', name: { fa: 'زمین', en: 'Land' } },
  farm2:    { base: 450, max: 1, cur: 'coins', name: { fa: 'باغ شمالی', en: 'North orchard' } },
  worker:   { base: 200, max: 2, costs: [200, 500], cur: 'coins', name: { fa: 'کارگر مزرعه', en: 'Farm worker' } },
  wTill:    { base: 80, max: 1, cur: 'coins', name: { fa: 'شخم‌زنی کارگر', en: 'Worker: tilling' } },
  wPlant:   { base: 120, max: 1, cur: 'coins', name: { fa: 'کاشت کارگر', en: 'Worker: planting' } },
  wWater:   { base: 100, max: 1, cur: 'coins', name: { fa: 'آبیاری کارگر', en: 'Worker: watering' } },
  wHarvest: { base: 150, max: 1, cur: 'coins', name: { fa: 'برداشت کارگر', en: 'Worker: harvesting' } },
  wSpeed:   { base: 90, max: 5, cur: 'coins', name: { fa: 'سرعت کارگر', en: 'Worker speed' } },
  sprinkler:{ base: 180, max: 5, cur: 'coins', name: { fa: 'آبپاش خودکار', en: 'Auto sprinkler' } },
  basket:   { base: 220, max: 5, cur: 'coins', name: { fa: 'سبد جمع‌کن', en: 'Auto basket' } },
  hoe:      { base: 15, max: 5, cur: 'essence', name: { fa: 'بیل', en: 'Hoe' } },
  can:      { base: 15, max: 5, cur: 'essence', name: { fa: 'آبپاش', en: 'Watering can' } },
  sickle:   { base: 20, max: 5, cur: 'essence', name: { fa: 'داس', en: 'Sickle' } },
  sword:    { base: 25, max: 5, cur: 'essence', name: { fa: 'شمشیر', en: 'Sword' } },
  armor:    { base: 30, max: 5, cur: 'essence', name: { fa: 'زره', en: 'Armor' } },
  boots:    { base: 20, max: 5, cur: 'essence', name: { fa: 'چکمه', en: 'Boots' } },
  fert:     { base: 12, max: 5, cur: 'essence', name: { fa: 'کود گوهری', en: 'Gem fertilizer' } },
};
export const upgradeCost = (kind, level) => UPG[kind].costs ? UPG[kind].costs[level] : Math.round(UPG[kind].base * Math.pow(1.15, level));

// غذای سفر: محصول → باف دورِ بعدی دانجن (مصرف هنگام ورود به دروازه)
export const MEALS = {
  salad: { crop: 'carrot',  n: 4, buff: { speed: 1.08 }, name: { fa: 'سالاد هویج', en: 'Carrot salad' }, fx: 'fx_salad' },
  apple: { crop: 'apple',   n: 1, buff: { hp: 12 },      name: { fa: 'سیب تازه',  en: 'Fresh apple' },  fx: 'fx_apple' },
  bread: { crop: 'wheat',   n: 5, buff: { hp: 20 },      name: { fa: 'نان گندم',  en: 'Wheat bread' },  fx: 'fx_bread' },
  pie:   { crop: 'pumpkin', n: 2, buff: { dmg: 1.15 },   name: { fa: 'کیک کدو',   en: 'Pumpkin pie' },   fx: 'fx_pie' },
};
// نرخ دستیارها: هر سطح ۲۰٪ سریع‌تر
const helperInterval = (kind, lvl, wSpeed = 0) => (kind === 'worker' ? 9 * Math.pow(0.85, wSpeed) : { worker: 10, sprinkler: 8, basket: 12 }[kind] * Math.pow(0.8, lvl - 1));

export class App {
  constructor(saveData) {
    this.s = saveData;
    ensureQuests(this.s);
    this.farm = null;      // game.farm (بعد از attach)
    this.timers = { worker: 0, sprinkler: 0, basket: 0 };
    this.offlineReport = null;
  }
  get wallet() { return this.s; }

  cost(kind) { return upgradeCost(kind, this.s.upgrades[kind]); }
  canBuy(kind) {
    const u = UPG[kind];
    return this.s.upgrades[kind] < u.max && this.s[u.cur] >= this.cost(kind);
  }
  buy(kind) {
    if (!this.canBuy(kind)) return false;
    this.s[u_cur(kind)] -= this.cost(kind);
    this.s.upgrades[kind]++;
    if (kind === 'land' && this.farm) this.farm.recalcFarmable(this.s.upgrades.land);
    if (kind === 'farm2' && this.farm && this.farm.setFarm2) this.farm.setFarm2(true);
    return true;
  }
  track(kind, n = 1) { // پیشرفت مأموریت‌ها — خروجی: تکمیل‌شده‌ها
    return trackQuests(this, kind, n);
  }
  buyMeal(kind) { // محصول → باف مسلح برای دور بعد
    const m = MEALS[kind];
    if (!m || this.s.inventory[m.crop] < m.n) return false;
    this.s.inventory[m.crop] -= m.n;
    this.s.buff = kind;
    return true;
  }
  bankEssence(run) { // غنیمت دور → کیف پول
    const n = run.essence | 0;
    this.s.essence += n;
    run.essence = 0;
    return n;
  }
  bankLoot(run) { // سکه/بذر/آیتم دور → کیف پول (بذر فقط از دانجن می‌آید)
    const L = run.loot;
    const coins = L.coins || 0; let seedN = 0;
    if (coins) this.s.coins += coins;
    if (L.seeds) { if (!this.s.seeds) this.s.seeds = {}; for (const k in L.seeds) { this.s.seeds[k] = (this.s.seeds[k] || 0) + L.seeds[k]; seedN += L.seeds[k]; } }
    if (L.items) { if (!this.s.items) this.s.items = {}; for (const k in L.items) this.s.items[k] = (this.s.items[k] || 0) + L.items[k]; }
    const items = L.items; L.coins = 0; L.seeds = null; L.items = null;
    return { coins, seedN, items }; // ن۳۴: coins قبل از صفرشدن — قبلاً همیشه ۰ برمی‌گشت (توست «+۰»)
  }

  // ---------- دستیارها: فقط وقتی بازیکن در دانجن است یا آنلاین نیست ----------
  helperTick(dt) {
    if (!this.farm) return;
    const up = this.s.upgrades;
    for (const kind of ['worker', 'sprinkler', 'basket']) {
      if (!up[kind]) continue;
      this.timers[kind] += dt;
      const iv = helperInterval(kind, up[kind], up.wSpeed || 0) / (kind === 'worker' ? up.worker : 1); // دو کارگر = دو برابر
      while (this.timers[kind] >= iv) {
        this.timers[kind] -= iv;
        this._helperAct(kind);
      }
    }
    // رشد خاک (farm.update رشد را هندل می‌کند ولی صحنه‌ی فعال نیست)
    this.farm.update(dt);
  }
  _helperAct(kind) { // خروجی: نوع کار برای آمار ('planted'|'harvested'|...) یا null
    const f = this.farm, w = this.s;
    if (kind === 'worker') { // کارگر روی نقشه (شبیه‌سازی هنگام غیبت بازیکن در دانجن/آفلاین): فقط کارهای یادگرفته
      const up = this.s.upgrades;
      const L = f.crops;
      for (let i = 0; i < L.length; i++) { // ۱) برداشت رسیده
        const c = L[i];
        if (up.wHarvest && c.crop && f.mature(c)) {
          const ty = c.crop.type, gld = !!c.crop.g;
          w.inventory[ty] = (w.inventory[ty] || 0) + 1;
          if (gld) w.coins += CROPS[ty].sell * 4; // جکپات طلایی — دستیار هم می‌گیرد (ن۳۴)
          f._delCrop(c); c.crop = null; c.wet = false;
          return 'harvested';
        }
      }
      for (let i = 0; i < L.length; i++) { // ۲) آبیاری خشکِ دارای محصول
        const c = L[i];
        if (up.wWater && c.crop && !c.wet) { f.soak(c, WATER_TIME); return 'watered'; }
      }
      for (const c of f.grid) { // ۳) کاشت (اگر بذر در انبار باشد + زمینِ درست برای این بذر)
        if (up.wPlant && c.kind === 'soil' && !c.crop && f.canPlant(w.selectedCrop, c.x, c.y)) {
          if (!w.seeds || w.seeds[w.selectedCrop] <= 0) break;
          f._addCrop(c, w.selectedCrop);
          w.seeds[w.selectedCrop]--;
          return 'planted';
        }
      }
      for (const c of f.grid) { // ۴) شخم چمن
        if (up.wTill && c.farmable && c.kind === 'grass') { c.kind = 'soil'; c.wet = false; return 'tilled'; }
      }
      return null;
    } else if (kind === 'sprinkler') { // اولین خاکِ خشکِ دارای محصول → آبیاری
      for (const c of f.grid) if (c.kind === 'soil' && c.crop && !c.wet) { f.soak(c, WATER_TIME * (1 + 0.2 * this.s.upgrades.can)); return 'watered'; }
    } else if (kind === 'basket') { // اولین محصول رسیده → برداشت و فروش مستقیم
      const L = f.crops;
      for (let i = 0; i < L.length; i++) {
        const c = L[i];
        if (c.crop && f.mature(c)) {
          w.coins += CROPS[c.crop.type].sell * (c.crop.g ? 4 : 1); // طلایی ×۴ (ن۳۴)
          f._delCrop(c); c.crop = null; c.wet = false;
          return 'harvested';
        }
      }
      return null;
    }
  }

  // ---------- شبیه‌سازی آفلاین (تا سقف ۸ ساعت) ----------
  simulateOffline(seconds) {
    if (!this.farm) return null;
    const sec = Math.min(seconds, OFFLINE_CAP);
    if (sec < 60) return null;
    const before = { coins: this.s.coins, planted: 0, harvested: 0 };
    const up = this.s.upgrades;
    if (!(up.worker || up.sprinkler || up.basket)) return { sec, earned: 0, planted: 0, harvested: 0 }; // بدون دستیار، آفلاین بی‌اثر
    const tick = 1;
    const rates = { worker: up.worker ? helperInterval('worker', 1, up.wSpeed || 0) / up.worker : Infinity,
                    sprinkler: up.sprinkler ? helperInterval('sprinkler', up.sprinkler) : Infinity,
                    basket: up.basket ? helperInterval('basket', up.basket) : Infinity };
    const acc = { worker: 0, sprinkler: 0, basket: 0 };
    const countAct = (k, ev) => { if (ev === 'planted') before.planted++; else if (ev === 'harvested') before.harvested++; };
    for (let t = 0; t < sec; t += tick) {
      for (const k of ['worker', 'sprinkler', 'basket']) {
        if (rates[k] === Infinity) continue;
        acc[k] += tick;
        while (acc[k] >= rates[k]) { acc[k] -= rates[k]; countAct(k, this._helperAct(k)); }
      }
      this.farm.update(tick);
    }
    return { sec, earned: this.s.coins - before.coins, planted: before.planted, harvested: before.harvested };
  }

  // ---------- سریال‌سازی مزرعه ----------
  serializeFarm() {
    if (!this.farm) return this.s.farm;
    const out = [];
    for (const c of this.farm.grid) {
      if (c.kind === 'soil' || c.crop) out.push({ i: c.y * this.farm.cols + c.x, k: c.kind, w: c.wet ? 1 : 0, wt: c.wet ? Math.round(c.wetT) : 0, c: c.crop ? { t: c.crop.type, p: Math.round(c.crop.progress), g: c.crop.g ? 1 : 0 } : null }); // wt: رطوبتِ باقی‌مانده (ن۳۴ — قبلاً بعد از ریلود بی‌درنگ خشک می‌شد)
      else if (c.kind === 'tree' && (c.variant & 1) && c.appleDay != null) out.push({ i: c.y * this.farm.cols + c.x, k: 'tree', ad: c.appleDay }); // سیبِ امروزِ درخت (ن۳۴ — قبلاً بعد از ریلود دوباره می‌داد)
    }
    return out;
  }
  hydrateFarm(game) {
    this.farm = game.farm;
    if (!this.s.farm) { this.farm.rebuildCropList(); return; }
    for (const e of this.s.farm) {
      const c = this.farm.grid[e.i];
      if (!c) continue;
      if (e.k === 'tree') { if (c.kind === 'tree' && e.ad != null) c.appleDay = e.ad; continue; } // درخت سیب‌دار: روزِ چیده‌شده
      if (e.k === 'soil' && (c.kind === 'grass' || c.kind === 'soil')) c.kind = 'soil';
      c.crop = e.c ? { type: e.c.t, progress: e.c.p, g: !!e.c.g } : null;
      if (e.w) this.farm.soak(c, e.wt ?? WATER_TIME); else { c.wet = false; c.wetT = 0; } // ?? نه || — wt=0 یعنی «در آستانه‌ی خشک‌شدن» (ن۳۴)
    }
    this.farm.rebuildCropList(); // cropها مستقیم ست شدند — لیست کشت باید بازسازی شود
  }
}
const u_cur = (kind) => UPG[kind].cur;
export { landRows };
