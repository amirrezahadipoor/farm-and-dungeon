// sfx/shoot.js — رهاکردن تیر کماندار: تیک زه + هیس کوتاه (ن۴۴ بی‌صدا بود)
import { pluck, noise } from './engine.js';
export function sfxShoot(ctx, out, t0) { pluck(ctx, out, 720, t0, 0.045, 0.05); noise(ctx, out, t0, 0.05, 1400, 0.028); }
