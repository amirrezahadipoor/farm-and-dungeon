// sfx/plant.js — کاشت: تیک نرم + نت پایین کوتاه
import { pluck, noise } from './engine.js';
export function sfxPlant(ctx, out, t0) { pluck(ctx, out, 220, t0, 0.05, 0.18, 'sine'); noise(ctx, out, t0, 0.06, 420, 0.035); }
