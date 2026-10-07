// sfx/ambience_farm.js — پد آرام مزرعه: دونت C2+G2+دیتون، تنفس ۲.۵ث، تیره‌شده با LP ۳۲۰
import { fadeStop } from './engine.js';
export function sfxAmbFarm(ctx, out) {
  const t0 = ctx.currentTime;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(1, t0 + 2.5); // تنفس ورود
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
  g.connect(lp); lp.connect(out);
  const mk = (f, peak, type) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; const og = ctx.createGain(); og.gain.value = peak; o.connect(og); og.connect(g); o.start(t0); return o; };
  const a = mk(65.41, 0.05, 'sine'), b = mk(98, 0.032, 'triangle'), c = mk(65.9, 0.02, 'sine');
  return { stop() { fadeStop([a, b, c], g, ctx, 1.2); } };
}
