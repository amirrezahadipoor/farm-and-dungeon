// sfx/till.js — شخم: برخورد بیس ۸۵→۴۲ + پف خاک
import { thud, noise } from './engine.js';
export function sfxTill(ctx, out, t0) { thud(ctx, out, 85, 42, t0, 0.2, 0.28); noise(ctx, out, t0, 0.12, 320, 0.05); }
