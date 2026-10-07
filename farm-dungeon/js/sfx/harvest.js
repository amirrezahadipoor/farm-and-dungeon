// sfx/harvest.js — برداشت: آرپ پنتاتونیک پایین‌رو G4-E4-C4 (سه نت لطیف)
import { pluck } from './engine.js';
export function sfxHarvest(ctx, out, t0) {
  pluck(ctx, out, 392, t0, 0.09, 0.4);
  pluck(ctx, out, 329.6, t0 + 0.09, 0.08, 0.38);
  pluck(ctx, out, 261.6, t0 + 0.18, 0.08, 0.45);
}
