// sfx/floor.js — طبقه‌ی جدید: موج پایین‌روی ۱۲۰→۴۸ + دم
import { thud, noise } from './engine.js';
export function sfxFloor(ctx, out, t0) { thud(ctx, out, 120, 48, t0, 0.15, 0.55, 0.03); noise(ctx, out, t0, 0.5, 260, 0.03, false, 0.15); }
