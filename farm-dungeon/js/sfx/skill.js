// sfx/skill.js — مهارت چرخش: سُس نرم + نت E4
import { noise, pluck } from './engine.js';
export function sfxSkill(ctx, out, t0) { noise(ctx, out, t0, 0.28, 750, 0.05, false, 0.06); pluck(ctx, out, 329.6, t0 + 0.05, 0.06, 0.25, 'triangle'); }
