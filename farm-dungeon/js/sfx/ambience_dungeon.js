// sfx/ambience_dungeon.js — پد تیره‌ی دانجن: D2+A2+ساب D1، تیره‌تر (LP ۲۶۰)
import { fadeStop } from './engine.js';
export function sfxAmbDungeon(ctx, out) {
  const t0 = ctx.currentTime;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(1, t0 + 3);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
  g.connect(lp); lp.connect(out);
  const mk = (f, peak, type) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; const og = ctx.createGain(); og.gain.value = peak; o.connect(og); og.connect(g); o.start(t0); return o; };
  const a = mk(73.42, 0.048, 'sine'), b = mk(110, 0.028, 'triangle'), c = mk(36.71, 0.03, 'sine');
  return { stop() { fadeStop([a, b, c], g, ctx, 1.2); } };
}
