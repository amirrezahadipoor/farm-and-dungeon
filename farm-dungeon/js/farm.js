// farm.js — گرید مزرعه: چیدمان دنیا، قواعد ابزار (انتخاب خودکار)، رشد و خشک‌شدن، اقتصاد محصول
import { COLS, ROWS } from './tiles.js';
import { stampLayout } from './farm_layout.js';

export const CROPS = {
  carrot:  { grow: 30,  sell: 20 },
  wheat:   { grow: 55,  sell: 46 },
  pumpkin: { grow: 100, sell: 115 },
  // بذرهای باغ شمالی — فقط از دانجن دراپ می‌شوند؛ سود/ثانیه بالاتر + جکپات طلایی بزرگ‌تر
  strawberry: { grow: 80,  sell: 90,  farm2: true },
  eggplant:   { grow: 150, sell: 210, farm2: true },
  corn:       { grow: 220, sell: 340, farm2: true },
};
export const SEED_TYPES = Object.keys(CROPS);
export const WATER_TIME = 40; // ثانیه رطوبت پس از هر آبیاری
// ضریب ماندگاری رطوبت نزدیک حوضچه‌ی مرکزی (27,16) — آب یعنی حیات
export const pondK = (tx, ty) => { const pd = Math.max(Math.abs(tx - 27), Math.abs(ty - 16)); return pd <= 4 ? 1.5 : pd <= 6 ? 1.25 : 1; };

export const FARM2_COST = 450; // قیمت باغ شمالی
// باغ شمالی: باندِ شمالی حصار (بین پرچین و حصار) — متصل با دهانه‌ی حصار
const F2 = { x0: 6, y0: 1, x1: 23, y1: 4 };

export const LAND_MAX = 5;
export const landRows = (level) => 3 + (level - 1); // سطح ۱ = ۳ ردیف، سطح ۵ = ۷ ردیف

export class Farm {
  constructor(landLevel = LAND_MAX, farm2Owned = false) {
    this.cols = COLS; this.rows = ROWS;
    this.landLevel = landLevel;
    this.farm2Owned = farm2Owned;
    this.grid = [];
    this._crops = []; // کش تایل‌های کشت‌شده — update/باران فقط این‌ها را می‌گردند
    this._wetBare = []; // خاکِ لختِ خیس (بدون محصول) — این‌ها هم خشک می‌شوند (ن۳۴)
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      this.grid.push({ x, y, kind: 'grass', farmable: false, wet: false, wetT: 0, crop: null, variant: 0, fenceH: false });
    }
    stampLayout(this);
    if (farm2Owned) this.setFarm2(true);
    this.recalcFarmable(landLevel);
  }
  // خرید باغ شمالی: درخت‌های داخل باند پاک، تابلوی فروش برداشته، زمین قابل‌کشت
  setFarm2(on) {
    this.farm2Owned = !!on;
    if (!on) return;
    for (const c of this.grid) {
      if (c.x < F2.x0 || c.x > F2.x1 || c.y < F2.y0 || c.y > F2.y1) continue;
      if (c.kind === 'tree') { c.kind = 'grass'; c.variant &= 1; } // جنگل‌زدایی باغ
    }
    const sg = this.cell(14, 5); // تابلوی فروش روی ردیف حصار — بیرون باند
    if (sg && sg.kind === 'sign') sg.kind = 'grass';
    this.recalcFarmable(this.landLevel);
  }
  inFarm2(x, y) { return this.farm2Owned && x >= F2.x0 && x <= F2.x1 && y >= F2.y0 && y <= F2.y1; }
  // بذر باغ شمالی فقط در باغ شمالی می‌روید (بذرهای معمولی همه‌جا)
  canPlant(type, x, y) { return !CROPS[type].farm2 || this.inFarm2(x, y); }
  // سطح زمین: چند ردیف قابل‌کشت است (بوته‌ها مرز را نشان می‌دهند)
  recalcFarmable(level) {
    this.landLevel = Math.max(1, Math.min(LAND_MAX, level));
    const rows = landRows(this.landLevel);
    for (const c of this.grid) {
      const insideFence = c.x >= 6 && c.x <= 23 && c.y >= 6 && c.y <= 13;
      const soft = c.kind === 'grass' || c.kind === 'soil';
      c.farmable = soft && ((insideFence && (c.y - 6) < rows) || this.inFarm2(c.x, c.y));
    }
  }
  insideFence(x, y) { return x >= 6 && x <= 23 && y >= 6 && y <= 13; }
  cell(x, y) { return (x < 0 || y < 0 || x >= this.cols || y >= this.rows) ? null : this.grid[y * this.cols + x]; }
  walkable(x, y) { const c = this.cell(x, y); return !!c && (c.kind === 'grass' || c.kind === 'soil' || c.kind === 'path'); }
  isGate(x, y) { const c = this.cell(x, y); return !!c && c.kind === 'gate'; }
  farmable(x, y) { const c = this.cell(x, y); return !!c && c.farmable; }
  mature(c) { return !!c.crop && c.crop.progress >= CROPS[c.crop.type].grow; }
  stage(c) { return c.crop ? Math.min(3, Math.floor((c.crop.progress / CROPS[c.crop.type].grow) * 4)) : -1; }

  // انتخاب خودکار ابزار بر اساس وضعیت تایل
  autoTool(x, y) {
    const c = this.cell(x, y);
    if (!c || !c.farmable) return undefined;      // تایل مزرعه نیست
    if (c.kind === 'grass') return 'hoe';          // شخم
    if (!c.crop) return 'seed';                    // کاشت
    if (this.mature(c)) return 'sickle';           // برداشت
    if (!c.wet) return 'can';                      // آبیاری
    return null;                                   // در حال رشدِ آب‌خورده
  }

  // اعمال ابزار (بدون اقتصاد — سکه در game.js)
  applyTool(tool, x, y, cropType) {
    const c = this.cell(x, y);
    if (!c) return { ok: false };
    if (tool === 'hoe') {
      if (c.kind === 'grass' && c.farmable) { c.kind = 'soil'; c.wet = false; c.wetT = 0; return { ok: true, ev: 'till' }; }
    } else if (tool === 'seed') {
      if (c.kind === 'soil' && !c.crop && !this.canPlant(cropType, x, y)) return { ok: false, needFarm2: true }; // بذر باغ شمالی؟
      if (c.kind === 'soil' && !c.crop && this.canPlant(cropType, x, y)) { this._addCrop(c, cropType); return { ok: true, ev: 'plant', type: cropType }; } // بذر از موجودی — هزینه‌ای ندارد
    } else if (tool === 'can') {
      if (c.kind === 'soil' && !c.wet) { this.soak(c, WATER_TIME); return { ok: true, ev: 'water' }; }
    } else if (tool === 'sickle') {
      if (c.crop && this.mature(c)) {
        const t = c.crop.type, g = !!c.crop.g; // پرچم طلایی قبل از پاک‌شدن محصول
        const count = (t === 'pumpkin' || t === 'eggplant' || t === 'corn') ? 1 : (Math.random() < 0.3 ? 2 : 1);
        this._delCrop(c); c.crop = null; c.wet = false; c.wetT = 0;
        return { ok: true, ev: 'harvest', type: t, count, g };
      }
    }
    return { ok: false };
  }

  // رشد فقط در خاک مرطوب؛ خاک بعد از WATER_TIME خشک می‌شود — فقط روی لیست کشت‌شده‌ها (بهینه)
  update(dt, mul = 1) { // mul = ضریب کود گوهری
    const L = this._crops;
    for (let i = 0; i < L.length; i++) {
      const c = L[i];
      if (!c.wet) continue;
      c.wetT -= dt;
      c.crop.progress = Math.min(CROPS[c.crop.type].grow, c.crop.progress + dt * mul);
      if (c.wetT <= 0) { c.wet = false; c.wetT = 0; }
    }
    const B = this._wetBare; // خاک لختِ خیس هم خشک می‌شود (ن۳۴ — قبلاً همیشه خیس می‌ماند)
    for (let i = B.length - 1; i >= 0; i--) {
      const c = B[i];
      c.wetT -= dt;
      if (c.wetT <= 0 || c.crop || c.kind !== 'soil') { c.wet = false; c.wetT = 0; c._wb = 0; B[i] = B[B.length - 1]; B.pop(); }
    }
  }
  // خیس‌کردن تایل (با/بدون محصول) — خاک لخت به لیست خشک‌شدن می‌رود
  soak(c, t) {
    c.wet = true; c.wetT = Math.max(c.wetT, t);
    if (!c.crop && !c._wb) { c._wb = 1; this._wetBare.push(c); }
  }
  // لیست تایل‌های دارای محصول — نگهداری تغییرات اینجا
  _addCrop(c, type) { c.crop = { type, progress: 0, g: Math.random() < 0.08 }; this._crops.push(c); if (c._wb) { c._wb = 0; const i = this._wetBare.indexOf(c); if (i >= 0) { this._wetBare[i] = this._wetBare[this._wetBare.length - 1]; this._wetBare.pop(); } } }
  _delCrop(c) { const i = this._crops.indexOf(c); if (i >= 0) { this._crops[i] = this._crops[this._crops.length - 1]; this._crops.pop(); } }
  rebuildCropList() { this._crops.length = 0; for (const c of this.grid) if (c.crop) this._crops.push(c); return this._crops; }
  get crops() { return this._crops; }
}
