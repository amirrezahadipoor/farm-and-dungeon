// sfx/apple.js — سیب: زنگ نرم دو جزئی (C5+G4)
import { pluck } from './engine.js';
export function sfxApple(ctx, out, t0) { pluck(ctx, out, 392, t0, 0.08, 0.5); pluck(ctx, out, 523.25, t0 + 0.03, 0.05, 0.7); }
