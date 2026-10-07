// input.js — کیبورد (WASD/جهت‌نما + Shift دویدن + Space اکشن) + لمس (نگه‌داشتن = حرکت، تپ روی قهرمان = اکشن)
// بدون جوی‌استیک. همه‌ی هدف‌های لمسی ≥ ۴۸px CSS در CSS.
export class Input {
  constructor(canvas, heroPosFn) {
    this.canvas = canvas;
    this.heroPosFn = heroPosFn; // () => {x, y} موقعیت جهانی قهرمان
    this.keys = new Set();
    this.pointer = null;        // {x, y, worldX, worldY, down, moved, t0}
    this.onTapHero = null;
    this.onTapGround = null;

    this._rect = null; // کش rect بوم — فقط با resize باطل می‌شود (نه در هر pointermove!)
    addEventListener('resize', () => { this._rect = null; });
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'Space') { e.preventDefault(); this.onTapHero && this.onTapHero(); }
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      const w = this.toWorld(e);
      this.pointer = { ...w, down: true, moved: 0, t0: performance.now(), sx: e.clientX, sy: e.clientY };
      // رنگ‌آمیزی: اگر شروع روی منطقه‌ی کشت باشد، کشیدن انگشت = صف کار (نه حرکت مستقیم)
      this.painting = !!(this.paintZone && this.paintZone(w.worldX, w.worldY));
      this.lastPaintTile = null;
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.pointer || !this.pointer.down) return;
      const w = this.toWorld(e);
      this.pointer.moved += Math.hypot(e.clientX - this.pointer.sx, e.clientY - this.pointer.sy);
      this.pointer.sx = e.clientX; this.pointer.sy = e.clientY;
      this.pointer.worldX = w.worldX; this.pointer.worldY = w.worldY;
      if (this.painting) {
        const tx = Math.floor(w.worldX / 16), ty = Math.floor(w.worldY / 16);
        if (this.onDragTile && (tx !== this.lastPaintTile?.[0] || ty !== this.lastPaintTile?.[1])) {
          this.lastPaintTile = [tx, ty];
          this.onDragTile(tx, ty);
        }
      }
    });
    const up = (e) => {
      if (!this.pointer) return;
      const dt = performance.now() - this.pointer.t0;
      const h = this.heroPosFn();
      const d = Math.hypot(this.pointer.worldX - h.x, this.pointer.worldY - (h.y - 14));
      if (dt < 260 && this.pointer.moved < 12) {
        // فقط اگر هندلر «تپ روی قهرمان» فعال باشد شعاع ۴۰px او را می‌گیرد؛ وگرنه تپ = زمین
        if (this.onTapHero && d < 40) this.onTapHero();
        else this.onTapGround && this.onTapGround(this.pointer.worldX, this.pointer.worldY);
      }
      this.pointer = null; this.painting = false;
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', () => { this.pointer = null; this.painting = false; });
  }
  toWorld(e) {
    if (!this._rect) this._rect = this.canvas.getBoundingClientRect();
    const r = this._rect;
    const kx = this.canvas.width / r.width, ky = this.canvas.height / r.height; // CSS → device pixel
    const cx = (e.clientX - r.left) * kx, cy = (e.clientY - r.top) * ky;
    const s = this.canvas._cam; // {scale, camX, camY} که main ست می‌کند
    if (s.inv) return s.inv(cx / s.scale, cy / s.scale); // مسیر GPU: دوربین پرسپکتیو → معکوس دقیق
    return { worldX: cx / s.scale + s.camX, worldY: cy / s.scale + s.camY };
  }
  // بردار حرکت خواسته‌شده + پرچم دویدن
  getMove() {
    let x = 0, y = 0;
    const k = this.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    let wantRun = k.has('ShiftLeft') || k.has('ShiftRight');
    if (this.painting) return { x: 0, y: 0, run: false }; // در حال رنگ‌آمیزی، حرکت مستقیم ممنوع
    if (this.pointer && this.pointer.down) {
      const h = this.heroPosFn();
      const dx = this.pointer.worldX - h.x, dy = this.pointer.worldY - (h.y - 12);
      const d = Math.hypot(dx, dy);
      if (d > 6) { x = dx; y = dy; wantRun = d > 95; }
    }
    const l = Math.hypot(x, y);
    return l > 0 ? { x: x / l, y: y / l, run: wantRun } : { x: 0, y: 0, run: wantRun };
  }
}
