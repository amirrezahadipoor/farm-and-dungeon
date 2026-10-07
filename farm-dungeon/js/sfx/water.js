// sfx/water.js — آبپاشی: حباب بیس ۱۶۰→۶۵ + سُس نویز نرم
import { thud, noise } from './engine.js';
export function sfxWater(ctx, out, t0) { thud(ctx, out, 160, 65, t0, 0.1, 0.22); noise(ctx, out, t0, 0.3, 500, 0.045); }
