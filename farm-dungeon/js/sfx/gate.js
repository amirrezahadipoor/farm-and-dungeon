// sfx/gate.js — دروازه‌ی دانجن: سوئیپ عمیق ۱۸۰→۳۸ + دم نویز
import { thud, noise } from './engine.js';
export function sfxGate(ctx, out, t0) { thud(ctx, out, 180, 38, t0, 0.17, 1.1, 0.05); noise(ctx, out, t0, 0.9, 300, 0.05, false, 0.25); }
