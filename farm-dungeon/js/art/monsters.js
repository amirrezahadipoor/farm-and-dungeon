// monsters.js — فریم نهایی هیولا: بدنه (monster_bodies) → rim-light → outline → فلش ضربه → سایه
// هر کدام ۴ حالت: idle / move / attack (با wind-up خوانا) / die + فلش سفید هنگام ضربه
// (اجزای مشترک در monster_parts.js — بدنه‌ها در monster_bodies.js)
import { Raster } from '../raster.js';
import { applyRim } from './rim.js';
import { MSPR, MOX, MOY, MC } from './monster_parts.js';
import { MBODY, MOUT, MSHW } from './monster_registry.js'; // ن۴۷: رجیستری ادغام

// فریم نهایی: بدنه → rim-light → outline → فلش سفید → سایه‌ی نرم
export function drawMonsterFrame(kind, o) {
  const f = { state: o.state || 'idle', t: o.t ?? 0, ph: o.ph ?? 0, face: o.face ?? 1, time: o.time ?? 0 };
  const body = new Raster(MSPR, MSPR);
  MBODY[kind](body, f);
  // rim-light مشترک (art/rim.js)
  const hiC = MC[kind + 'Hi'];
  if (hiC && f.state !== 'die' && !o.hit) applyRim(body, hiC, 0.62);
  const oc = MOUT[kind];
  if (oc && !o.hit) body.outline(oc);
  if (o.hit) for (let y = 0; y < MSPR; y++) for (let x = 0; x < MSPR; x++) { const c = body.get(x, y); if (c && c[3] > 120) body.px(x, y, MC.white); }
  const out = new Raster(MSPR, MSPR);
  const [sw, sh2] = MSHW[kind];
  out.ellipse(MOX, MOY + 3, sw + 3, sh2 + 1, [8, 6, 14, 46]); // هاله‌ی بیرونی نرم
  out.ellipse(MOX, MOY + 2, sw, sh2, [8, 6, 14, 92]);         // هسته‌ی سایه
  body.over(out);
  return out;
}
