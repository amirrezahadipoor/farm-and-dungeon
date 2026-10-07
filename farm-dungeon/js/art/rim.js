// art/rim.js — جلای لبه‌ی بالا (rim-light) مشترک بین هیولاها/قهرمان — حجم و جلا
// hi = رنگ روشن هدف؛ اگر null بود فقط خود پیکسل روشن می‌شود
export function applyRim(body, hi, lift = 0.62, minA = 120) {
  // ن۳۹: دسترسی مستقیم به بافر — قبلاً هر پیکسل با get() دو آرایه می‌ساخت (منبع GC)
  const d = body.d, w = body.w, h = body.h, row = w * 4;
  const tr = hi ? hi[0] : 255, tg = hi ? hi[1] : 255, tb = hi ? hi[2] : 255;
  const k = hi ? lift : lift * 0.5;
  for (let x = 1; x < w - 1; x++) {
    for (let y = 1; y < h - 1; y++) {
      const i = y * row + x * 4, a = d[i + 3];
      if (a < minA) continue;
      if (d[i - row + 3] < 40) {
        const nr = Math.round(d[i] + (tr - d[i]) * k);
        const ng = Math.round(d[i + 1] + (tg - d[i + 1]) * k);
        const nb = Math.round(d[i + 2] + (tb - d[i + 2]) * k);
        if (a >= 255) { d[i] = nr; d[i + 1] = ng; d[i + 2] = nb; }
        else { const t = a / 255, it = 1 - t; d[i] = nr * t + d[i] * it; d[i + 1] = ng * t + d[i + 1] * it; d[i + 2] = nb * t + d[i + 2] * it; }
        break; // فقط لبه‌ی بیرونی هر ستون
      }
    }
  }
}
