// sfx/upgrade.js — ارتقا: آرپ بالارون C4-E4-G4-C5 با کشش
import { pluck } from './engine.js';
export function sfxUpgrade(ctx, out, t0) {
  for (let i = 0; i < 4; i++) pluck(ctx, out, [261.6, 329.6, 392, 523.25][i], t0 + i * 0.1, 0.08, 0.45);
}
