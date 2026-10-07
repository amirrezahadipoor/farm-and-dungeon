// sfx/shrine.js — محراب: آرپ اسرارآمیز G4-B4-D5 آرام
import { pluck } from './engine.js';
export function sfxShrine(ctx, out, t0) {
  for (let i = 0; i < 3; i++) pluck(ctx, out, [392, 493.9, 587.3][i], t0 + i * 0.16, 0.06, 0.7, 'triangle', 0.04);
}
