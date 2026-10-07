// raster.js — بوم پیکسلی ۱۰۰٪ کدی (بدون asset). هسته‌ی بدون-DOM تا در Node هم همان خروجی را بدهد.
// همه‌ی مختصات صحیح (integer) هستند؛ ضددنده‌ای وجود ندارد.

export class Raster {
  constructor(w, h, buf = null) {
    this.w = w; this.h = h;
    // buf اختیاری: Raster مستقیم روی ImageData بنشیند → ارائه‌ی صفر-کپی
    this.d = buf || new Uint8ClampedArray(w * h * 4);
    this._u32 = null; // ن۳۹: نمای ۳۲-بیتی تنبل — کپی ردیفی بدون تخصیص subarray
  }
  u32() { return this._u32 || (this._u32 = new Uint32Array(this.d.buffer, 0, (this.d.length / 4) | 0)); }
  px(x, y, c) { // c = [r,g,b,a]
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4, d = this.d;
    if (c[3] >= 255) { d[i] = c[0]; d[i+1] = c[1]; d[i+2] = c[2]; d[i+3] = 255; return; }
    const a = c[3] / 255, ia = 1 - a;
    d[i]   = d[i]   * ia + c[0] * a;
    d[i+1] = d[i+1] * ia + c[1] * a;
    d[i+2] = d[i+2] * ia + c[2] * a;
    d[i+3] = Math.max(d[i+3], c[3]);
  }
  get(x, y) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    const i = (y * this.w + x) * 4, d = this.d;
    return [d[i], d[i+1], d[i+2], d[i+3]];
  }
  rect(x, y, w, h, c) {
    x = Math.round(x); y = Math.round(y);
    const w0 = Math.round(w), h0 = Math.round(h);
    // برش + حلقه‌ی داخلی بدون فراخوانی px (همان رفتار blend)
    let x0 = x < 0 ? -x : 0, y0 = y < 0 ? -y : 0;
    const x1 = Math.min(w0, this.w - x), y1 = Math.min(h0, this.h - y);
    if (x0 >= x1 || y0 >= y1) return;
    const d = this.d, a = c[3];
    if (a <= 0) return;
    if (a >= 255) {
      const r0 = c[0], g0 = c[1], b0 = c[2];
      for (let yy = y0; yy < y1; yy++) {
        let i = ((y + yy) * this.w + x + x0) * 4;
        for (let xx = x0; xx < x1; xx++, i += 4) { d[i] = r0; d[i + 1] = g0; d[i + 2] = b0; d[i + 3] = 255; }
      }
      return;
    }
    const t = a / 255, it = 1 - t, r0 = c[0] * t, g0 = c[1] * t, b0 = c[2] * t;
    for (let yy = y0; yy < y1; yy++) {
      let i = ((y + yy) * this.w + x + x0) * 4;
      for (let xx = x0; xx < x1; xx++, i += 4) {
        if (d[i + 3] === 0) { d[i] = r0; d[i + 1] = g0; d[i + 2] = b0; d[i + 3] = a; continue; }
        d[i] = d[i] * it + r0; d[i + 1] = d[i + 1] * it + g0; d[i + 2] = d[i + 2] * it + b0;
        d[i + 3] = Math.max(d[i + 3], a);
      }
    }
  }
  // خط برزنهام ۱ پیکسلی
  line(x0, y0, x1, y1, c) {
    if (!isFinite(x0) || !isFinite(y0) || !isFinite(x1) || !isFinite(y1)) return; // گارد NaN/Inf
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  // خط ضخیم: w خط موازی با آفست عمود بر جهت
  lineW(x0, y0, x1, y1, w, c) {
    w = Math.max(1, Math.round(w));
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const offs = [];
    for (let k = -(w - 1) / 2; k <= (w - 1) / 2; k += 1) offs.push(Math.round(k));
    for (const k of offs) this.line(x0 + nx * k, y0 + ny * k, x1 + nx * k, y1 + ny * k, c);
  }
  // قطعه‌ی اندام با سایه‌روشن ۳ پله‌ای (نور از بالا): بالا=روشن، پایین=تیره
  seg(x0, y0, x1, y1, w, cBase, cHi, cSh, light = true) {
    this.lineW(x0, y0, x1, y1, w, cBase);
    if (light && w >= 3) {
      const o = (w - 1) >> 1;
      this.line(x0, y0 - o, x1, y1 - o, cHi);
      this.line(x0, y0 + o, x1, y1 + o, cSh);
    } else if (w >= 2) {
      this.line(x0, y0 + (w >> 1) - (w % 2 === 0 ? 1 : 0) + 1, x1, y1 + (w >> 1), cSh);
    }
  }
  ellipse(cx, cy, rx, ry, c) {
    cx = Math.round(cx); cy = Math.round(cy);
    rx = Math.round(rx); ry = Math.round(ry);
    for (let dy = -ry; dy <= ry; dy++) {
      const t = 1 - (dy * dy) / (ry * ry);
      if (t < 0) continue;
      const dx = Math.floor(rx * Math.sqrt(t));
      for (let x = cx - dx; x <= cx + dx; x++) this.px(x, cy + dy, c);
    }
  }
  // پاس outline: هر پیکسل شفافِ مجاور (۴همسایه) پیکسل بدنه → رنگ outline
  outline(c) {
    const mask = new Uint8Array(this.w * this.h);
    for (let i = 0; i < this.w * this.h; i++) mask[i] = this.d[i * 4 + 3] > 200 ? 1 : 0;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (mask[y * this.w + x]) continue;
      if ((x > 0 && mask[y * this.w + x - 1]) || (x < this.w - 1 && mask[y * this.w + x + 1]) ||
          (y > 0 && mask[(y - 1) * this.w + x]) || (y < this.h - 1 && mask[(y + 1) * this.w + x]))
        this.px(x, y, c);
    }
  }
  // یک‌بار اسکن: اگر تمام پیکسل‌ها مات‌اند، over مسیر کپیِ ردیفی فوق‌سریع می‌گیرد
  markOpaque() {
    for (let i = 3; i < this.d.length; i += 4) if (this.d[i] !== 255) return this;
    this._opaque = true;
    return this;
  }
  // کشیدن this روی dst (سورس‌آور) — بدون هیچ تخصیص حافظه (قبلاً هر پیکسل یک آرایه می‌ساخت!)
  over(dst, ox = 0, oy = 0) {
    ox = Math.round(ox); oy = Math.round(oy);
    const sw = this.w, sh = this.h, sd = this.d, dd = dst.d, dw = dst.w, dh = dst.h;
    const x0 = ox < 0 ? -ox : 0, y0 = oy < 0 ? -oy : 0;
    const x1 = Math.min(sw, dw - ox), y1 = Math.min(sh, dh - oy);
    if (x0 >= x1 || y0 >= y1) return;
    if (this._opaque) { // تایل مات: ردیف کوتاه = حلقه‌ی u32 (بدون تخصیص)، ردیف بلند = memcpy (ن۳۹)
      const len = x1 - x0;
      if (len <= 24) {
        const su = this.u32(), du = dst.u32();
        for (let y = y0; y < y1; y++) {
          let si = y * sw + x0, di = (y + oy) * dw + ox + x0;
          for (let k = 0; k < len; k++) du[di + k] = su[si + k];
        }
      } else {
        const len4 = len * 4;
        for (let y = y0; y < y1; y++) {
          const si = (y * sw + x0) * 4, di = ((y + oy) * dw + ox + x0) * 4;
          dd.set(sd.subarray(si, si + len4), di);
        }
      }
      return;
    }
    for (let y = y0; y < y1; y++) {
      let si = (y * sw + x0) * 4, di = ((y + oy) * dw + ox + x0) * 4;
      for (let x = x0; x < x1; x++, si += 4, di += 4) {
        const a = sd[si + 3];
        if (a === 0) continue;
        if (a >= 255) { dd[di] = sd[si]; dd[di + 1] = sd[si + 1]; dd[di + 2] = sd[si + 2]; dd[di + 3] = 255; continue; }
        const t = a / 255, it = 1 - t;
        dd[di] = sd[si] * t + dd[di] * it;
        dd[di + 1] = sd[si + 1] * t + dd[di + 1] * it;
        dd[di + 2] = sd[si + 2] * t + dd[di + 2] * it;
        if (a > dd[di + 3]) dd[di + 3] = a;
      }
    }
  }
  clear() { this.d.fill(0); }
}

// تبدیل Raster به Canvas مرورگر (با createImageData کلاسیک — سازگار با همه‌ی محیط‌ها)
export function rasterToCanvas(r) {
  const c = document.createElement('canvas');
  c.width = r.w; c.height = r.h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(r.w, r.h);
  img.data.set(r.d);
  ctx.putImageData(img, 0, 0);
  return c;
}

// تبدیل مختصات محلی به چرخیده حول مبدا (برای ابزار در دست)
export function rot(x, y, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return [x * c - y * s, x * s + y * c];
}
