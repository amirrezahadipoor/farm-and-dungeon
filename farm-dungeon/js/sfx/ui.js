// sfx/ui.js — کلیک UI: تیک لطیف و کوتاه
import { pluck, noise } from './engine.js';
export function sfxUi(ctx, out, t0) { pluck(ctx, out, 440, t0, 0.035, 0.07); noise(ctx, out, t0, 0.035, 700, 0.02); }
