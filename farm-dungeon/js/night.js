// night.js — چرخه‌ی شب/روز: ضریب شب + تینت یکپارچه (شب×باران در یک گذر، نه دو حلقه)
// DAY_LEN = ۳۶۰۰ ثانیه (۱ ساعت واقعی)؛ رشد محصولات مستقل از شب است و سریع می‌ماند
export const DAY_LEN = 3600;

// 0 = ظهر کامل، 1 = نیمه‌شب کامل
export function nightFactor(dayT) {
  return (1 - Math.cos(2 * Math.PI * dayT / DAY_LEN)) / 2;
}

// یکجا: اعمال شب (+باران اختیاری) و شب‌تاب‌ها — یک حلقه با LUT (۱.۲۲x سریع‌تر از ضرب)
const _LR = new Uint8ClampedArray(256), _LG = new Uint8ClampedArray(256), _LB = new Uint8ClampedArray(256);
export function applyNight(r, dayT, raining = false) { // ن۳۶: شب‌تاب حذف — تینت خالص
  const n = nightFactor(dayT);
  const a = n > 0.45 ? (n - 0.45) / 0.55 * 0.5 : 0; // 0..0.5
  if (a > 0 || raining) {
    const kR = (1 - a) * (raining ? 0.82 : 1);
    const kG = (1 - a * 0.82) * (raining ? 0.86 : 1);
    const kB = (1 - a * 0.55) * (raining ? 0.96 : 1);
    for (let v = 0; v < 256; v++) { _LR[v] = v * kR; _LG[v] = v * kG; _LB[v] = v * kB; } // بازسازی LUT (۷۶۸ نوشتن — ناچیز)
    const d = r.d;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) continue;
      d[i] = _LR[d[i]]; d[i + 1] = _LG[d[i + 1]]; d[i + 2] = _LB[d[i + 2]];
    }
  }
}
