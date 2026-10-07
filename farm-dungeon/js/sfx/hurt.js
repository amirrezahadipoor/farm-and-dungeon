// sfx/hurt.js — آسیب قهرمان: اوفِ نرم ۱۴۰→۶۵ (بی‌تیزی)
import { thud, noise } from './engine.js';
export function sfxHurt(ctx, out, t0) { thud(ctx, out, 140, 65, t0, 0.14, 0.24); noise(ctx, out, t0, 0.12, 380, 0.04); }
