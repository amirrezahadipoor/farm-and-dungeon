// sfx/rain_layer.js — باران آرام: نویز قهوه‌ای لوپ با فیلتر پایین (همراه پد)
import { noise, fadeStop } from './engine.js';
export function sfxRain(ctx, out) {
  const t0 = ctx.currentTime;
  const n = noise(ctx, out, t0, 2, 480, 0.05, true);
  return { stop() { fadeStop([n.src], n.g, ctx); } };
}
