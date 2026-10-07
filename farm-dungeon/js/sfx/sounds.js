// sfx/sounds.js — ثبت صداها: نگاشت نام→ماژول (هر صدا یک فایل) + مدیریت آمبینت/باران
import { ac, sfxOut, gate, armed, unlockAudio, setMute, isMuted } from './engine.js';
import { sfxAmbFarm } from './ambience_farm.js';
import { sfxAmbDungeon } from './ambience_dungeon.js';
import { sfxRain } from './rain_layer.js';
import { sfxTill } from './till.js';
import { sfxWater } from './water.js';
import { sfxPlant } from './plant.js';
import { sfxHarvest } from './harvest.js';
import { sfxCoin } from './coin.js';
import { sfxApple } from './apple.js';
import { sfxGolden } from './golden.js';
import { sfxUpgrade } from './upgrade.js';
import { sfxGate } from './gate.js';
import { sfxFloor } from './floor.js';
import { sfxHit } from './hit.js';
import { sfxKill } from './kill.js';
import { sfxHurt } from './hurt.js';
import { sfxBoss } from './boss.js';
import { sfxShrine } from './shrine.js';
import { sfxChest } from './chest.js';
import { sfxQuest } from './quest.js';
import { sfxUi } from './ui.js';
import { sfxSkill } from './skill.js';
import { sfxShoot } from './shoot.js';
import { sfxFire } from './fire.js';

const ONESHOTS = {
  till: sfxTill, water: sfxWater, plant: sfxPlant, harvest: sfxHarvest,
  coin: sfxCoin, apple: sfxApple, golden: sfxGolden, upgrade: sfxUpgrade,
  gate: sfxGate, floor: sfxFloor, hit: sfxHit, kill: sfxKill, hurt: sfxHurt,
  boss: sfxBoss, shrine: sfxShrine, chest: sfxChest, quest: sfxQuest,
  ui: sfxUi, skill: sfxSkill, shoot: sfxShoot, fire: sfxFire,
};

export function playSfx(name) {
  const t0 = gate(name);
  if (t0 < 0) return false;
  const fn = ONESHOTS[name];
  if (!fn) return false;
  try { fn(ac(), sfxOut(), t0); return true; } catch (e) { return false; }
}

// ---- آمبینت پیوسته: یک پد در هر لحظه + لایه‌ی باران ----
const _amb = new Map(); // kind → handle
function _stopKind(kind) {
  const h = _amb.get(kind);
  if (h) { try { h.stop(); } catch (e) {} _amb.delete(kind); }
}
export function setAmbient(kind) { // 'farm' | 'dungeon' | null
  if (!armed()) return; // قبل از اولین لمس کاربر: بی‌صدا (سیاست autoplay)
  const c = ac(); if (!c) return;
  for (const k of [..._amb.keys()]) if (k !== 'rain' && k !== kind) _stopKind(k);
  if (kind && !_amb.has(kind)) {
    try {
      const fn = kind === 'farm' ? sfxAmbFarm : kind === 'dungeon' ? sfxAmbDungeon : null;
      if (fn) _amb.set(kind, fn(c, sfxOut()));
    } catch (e) {}
  }
}
export function setRain(on) {
  if (!armed()) return;
  const c = ac(); if (!c) return;
  if (on && !_amb.has('rain')) { try { _amb.set('rain', sfxRain(c, sfxOut())); } catch (e) {} }
  else if (!on) _stopKind('rain');
}
export { unlockAudio, setMute, isMuted };
