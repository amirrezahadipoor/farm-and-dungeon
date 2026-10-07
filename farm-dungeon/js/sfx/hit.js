// sfx/hit.js — ضربه: تامپ کوتاه ۱۳۰→۶۲ (مات — نه ضربه‌ی تیز)
import { thud } from './engine.js';
export function sfxHit(ctx, out, t0) { thud(ctx, out, 130, 62, t0, 0.11, 0.13); }
