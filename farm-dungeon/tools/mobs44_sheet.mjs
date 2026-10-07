// mobs44_sheet.mjs — شیت ۷ هیولای ن۴۴: هر هیولا در ۴ حالت (idle/move/attack/die) + نام و نقشه
import { savePNG } from './png.mjs';
import { Raster } from '../js/raster.js';
import { drawMonsterFrame } from '../js/art/monsters.js';
import { drawText } from '../js/art/font2.js';

const MOBS = [
  ['mummy', 'مومیایی', 'مقبره‌ی پادشاهان · خزانه', 'تانکِ کند — سکه‌دار'],
  ['archer', 'کماندار', 'میدان تیر · زندان', 'تیراندازی از راه دور'],
  ['ram', 'قوچ', 'پل معلق · هشت‌ضلعی', 'یورش تلگراف‌شده'],
  ['yeti', 'یخ‌مرد', 'یخچال', 'ضربه = کندی قهرمان'],
  ['imp', 'آتش‌جان', 'آتشکده · کارگاه گدازه', 'گلوله‌ی آتش + انفجار مرگ'],
  ['bandit', 'دزد', 'کاروان‌سرا · زندان', 'سکه می‌دزدد و فرار می‌کند'],
  ['hare', 'خرگوش غول‌پیکر', 'باغ ایرانی · آزمایشگاه', 'جهش‌های غیرقابل‌پیش‌بینی'],
];
const STATES = ['idle', 'move', 'attack', 'die'];
const CW = 4 * 74 + 30, CH_ROW = 118, PAD = 12, HEAD = 40;

const m = new Raster(CW, HEAD + PAD + MOBS.length * CH_ROW + PAD);
for (let i = 0; i < m.d.length; i += 4) { m.d[i] = 16; m.d[i + 1] = 15; m.d[i + 2] = 22; m.d[i + 3] = 255; }
drawText(m, 'هیولاهای ن۴۴ — ۷ موجود جدید برای معماری‌های طبقات', 14, 13, [240, 233, 200, 255]);

let y = HEAD + PAD;
for (const [kind, fa, maps, mech] of MOBS) {
  // پس‌زمینه‌ی ردیف
  m.rect(10, y, CW - 20, CH_ROW - 8, [24, 22, 34, 255]);
  drawText(m, fa, 16, y + 6, [235, 226, 180, 255]);
  drawText(m, maps, 16, y + 24, [160, 180, 210, 255]);
  drawText(m, mech, 16, y + 40, [150, 200, 160, 255]);
  STATES.forEach((st, i) => {
    const sp = drawMonsterFrame(kind, { state: st, t: st === 'die' ? 0.7 : 0.5, ph: 0.35, face: 1, time: 1.7 });
    // فقط ناحیه‌ی مفید (128→72): برش حول MOX
    const view = new Raster(74, 74);
    for (let vy = 0; vy < 74; vy++) for (let vx = 0; vx < 74; vx++) {
      const c = sp.get(27 + vx, 30 + vy);
      if (c[3]) view.px(vx, vy, c);
    }
    view.over(m, 130 + i * 74, y + 32);
    drawText(m, st === 'idle' ? 'ساکن' : st === 'move' ? 'حرکت' : st === 'attack' ? 'حمله' : 'مرگ', 150 + i * 74, y + 6, [140, 135, 165, 255]);
  });
  y += CH_ROW;
}
savePNG('/home/user/farm-dungeon/shots/mobs44_sheet.png', m);
console.log('mobs44_sheet.png', m.w + 'x' + m.h);
