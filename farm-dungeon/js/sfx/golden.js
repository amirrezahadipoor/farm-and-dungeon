// sfx/golden.js — محصول طلایی: درخشش آرام چهار نت
import { pluck } from './engine.js';
export function sfxGolden(ctx, out, t0) {
  for (let i = 0; i < 4; i++) pluck(ctx, out, [392, 493.9, 587.3, 784][i], t0 + i * 0.08, 0.06, 0.5);
}
