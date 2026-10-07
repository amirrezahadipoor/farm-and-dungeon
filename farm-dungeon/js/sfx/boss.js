// sfx/boss.js — باس: طبل عمیق ۶۰→۳۰ + درون G2 بلند
import { thud, pluck } from './engine.js';
export function sfxBoss(ctx, out, t0) { thud(ctx, out, 60, 30, t0, 0.28, 0.9, 0.02); pluck(ctx, out, 98, t0 + 0.1, 0.1, 1.4, 'sine', 0.15); }
