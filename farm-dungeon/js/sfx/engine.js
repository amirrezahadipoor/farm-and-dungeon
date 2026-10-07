// sfx/engine.js — موتور صدای آرام (ن۳۳): WebAudio رویه‌ای، بیس‌پایین، بدون فایل خارجی.
// اصول ضد-گوش‌خراش: فقط sine/triangle، حمله‌ی نرم (بدون کلیک)، آستانه‌ی دینامیک (compressor)،
// فیلتر پایین‌گذر کلی، دامنه‌ی کم per-voice، نرخ‌محدود برای ضربه‌های پیاپی.
let _ctx = null, _master = null, _muted = false, _armed = false, _noiseBuf = null;
const _last = new Map();

export function ac() {
  if (_ctx) return _ctx;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return null;
  try {
    _ctx = new AC();
    _master = _ctx.createGain();
    _master.gain.value = _muted ? 0 : 0.5; // استاد آرام (اگر از قبل خاموش شده)
    const lp = _ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = 0.4; // نرمی کلی
    const comp = _ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 6; comp.attack.value = 0.01; comp.release.value = 0.25;
    _master.connect(lp); lp.connect(comp); comp.connect(_ctx.destination);
  } catch (e) { _ctx = null; }
  return _ctx;
}
export function sfxOut() { return _master; }
export function armed() { return _armed; }
export function unlockAudio() { // اولین لمس کاربر → بیدار شدن صدا (سیاست autoplay موبایل)
  _armed = true;
  const c = ac();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}
export function setMute(m) {
  _muted = !!m;
  if (_master && _ctx) { const t = _ctx.currentTime; _master.gain.cancelScheduledValues(t); _master.gain.setValueAtTime(_master.gain.value, t); _master.gain.linearRampToValueAtTime(_muted ? 0 : 0.5, t + 0.12); }
}
export function isMuted() { return _muted; }
// نرخ‌محدود: تکرار پیاپی یک صدا (ضربه‌ها) فشرده می‌شود — خروجی -1 یعنی پخش نشود
export function gate(name, minGap = 0.06) {
  if (!_armed || _muted) return -1;
  const c = ac(); if (!c) return -1;
  const t = c.currentTime, last = _last.get(name) || -1e9;
  if (t - last < minGap) return -1;
  _last.set(name, t);
  return t;
}
// پاکت نرم: حمله‌ی خطی + افت نمایی — هرگز از صفرِ مطلق نمی‌پرد (ضد-کلیک)
export function env(g, t0, attack, peak, dur, sustain = false) {
  const a = g.gain;
  a.setValueAtTime(0.0001, t0);
  a.linearRampToValueAtTime(peak, t0 + attack);
  if (!sustain) a.exponentialRampToValueAtTime(0.0001, t0 + dur);
}
// نُت نرم (sine/triangle) — پایه‌ی همه‌ی ملودی‌های آرام
export function pluck(ctx, out, freq, t0, peak = 0.12, dur = 0.45, type = 'sine', attack = 0.012) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  env(g, t0, attack, peak, dur);
  o.connect(g); g.connect(out);
  o.start(t0); o.stop(t0 + dur + 0.08);
  return o;
}
// برخورد بیس: افت فرکانس f0→f1 — ضربه‌های لطیف
export function thud(ctx, out, f0, f1, t0, peak = 0.2, dur = 0.3, attack = 0.008) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  env(g, t0, attack, peak, dur);
  o.connect(g); g.connect(out);
  o.start(t0); o.stop(t0 + dur + 0.08);
}
// نویز قهوه‌ای نرم (baran/سوپ) — یک‌بار ساخته می‌شود
export function noise(ctx, out, t0, dur, cutoff = 600, peak = 0.08, loop = false, attack = 0.02) {
  if (!_noiseBuf) {
    const len = Math.floor(ctx.sampleRate * 2);
    _noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = _noiseBuf.getChannelData(0);
    let lastS = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; lastS = (lastS + 0.02 * w) / 1.02; d[i] = lastS * 3.5; }
  }
  const src = ctx.createBufferSource(); src.buffer = _noiseBuf; src.loop = loop;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff;
  const g = ctx.createGain();
  env(g, t0, loop ? 1.2 : attack, peak, loop ? 2 : dur, loop);
  src.connect(f); f.connect(g); g.connect(out);
  src.start(t0);
  if (!loop) src.stop(t0 + dur + 0.08);
  return { src, g };
}
// استاپ نرم هندل آمبینت: رمپ پایین سپس توقف
export function fadeStop(nodes, gainNode, ctx, time = 0.8) {
  const t = ctx.currentTime;
  try { gainNode.gain.cancelScheduledValues(t); gainNode.gain.setValueAtTime(gainNode.gain.value || 0.0001, t); gainNode.gain.linearRampToValueAtTime(0.0001, t + time); } catch (e) {}
  for (const n of nodes) { try { n.stop(t + time + 0.05); } catch (e) {} }
}
