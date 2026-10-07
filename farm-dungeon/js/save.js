// save.js — ذخیره‌سازی localStorage با try/catch + نسخه‌ی اسکیما + migration ساده + ریست
const MEALS_OK = (k) => k === 'salad' || k === 'bread' || k === 'pie';
export const SCHEMA_VERSION = 6;
const KEY = 'farmDungeon.save';

export function defaultSave() {
  return {
    v: SCHEMA_VERSION,
    coins: 60,
    essence: 0,
    inventory: { carrot: 0, wheat: 0, pumpkin: 0, strawberry: 0, eggplant: 0, corn: 0, apple: 0 },
    seeds: { carrot: 6, wheat: 0, pumpkin: 0, strawberry: 0, eggplant: 0, corn: 0 }, // بذر فقط از دانجن!
    items: {},      // آیتم‌های پوشیدنی: id → تعداد
    equipped: null, // { hat, body, boots, sword } — idهای پوشیده‌شده
    selectedCrop: 'carrot',
    upgrades: { land: 1, farm2: 0, worker: 0, wTill: 0, wPlant: 0, wWater: 0, wHarvest: 0, wSpeed: 0, sprinkler: 0, basket: 0, hoe: 0, can: 0, sickle: 0, sword: 0, armor: 0, boots: 0, fert: 0 },
    stats: { bestFloor: 1, kills: 0, deaths: 0, runs: 0, playT: 0 }, // playT = ثانیه‌ی انباشته‌ی مزرعه — روزِ سیب‌دار بین سشن‌ها پیوسته
    farm: null, // [{i, kind, wet, crop}] — فقط تایل‌های تغییرکرده
    lastSeen: Date.now(),
    lang: 'fa',
    mute: 0, // صدای خاموش (ن۳۳)
    buff: null, // غذای مسلح برای دور بعد (salad/bread/pie)
    quests: null, // سه مأموریت چرخان (quests.js)
  };
}

// migration ساده: v1..v5 → v6 (انبار بذر + آیتم‌های پوشیدنی)
function migrate(obj) {
  if (!obj.upgrades) obj.upgrades = defaultSave().upgrades;
  if (!obj.stats) obj.stats = defaultSave().stats;
  for (const k in defaultSave().stats) if (obj.stats[k] == null) obj.stats[k] = defaultSave().stats[k];
  for (const k in defaultSave().upgrades) if (obj.upgrades[k] == null) obj.upgrades[k] = defaultSave().upgrades[k];
  if (obj.inventory) for (const k in defaultSave().inventory) if (obj.inventory[k] == null) obj.inventory[k] = 0;
  if (!obj.seeds) obj.seeds = defaultSave().seeds;
  else for (const k in defaultSave().seeds) if (obj.seeds[k] == null) obj.seeds[k] = 0;
  if (!obj.items || typeof obj.items !== 'object') obj.items = {};
  if (!obj.equipped || typeof obj.equipped !== 'object') obj.equipped = null;
  if (obj.buff !== null && !MEALS_OK(obj.buff)) obj.buff = null;
  if (obj.lang == null) obj.lang = 'fa';
  obj.v = SCHEMA_VERSION;
  return obj;
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return defaultSave();
    if (obj.v !== SCHEMA_VERSION) return migrate(obj);
    // ادغام با پیش‌فرض‌ها برای میدان‌های جاافتاده
    const def = defaultSave();
    return { ...def, ...obj, upgrades: { ...def.upgrades, ...(obj.upgrades || {}) }, stats: { ...def.stats, ...(obj.stats || {}) }, inventory: { ...def.inventory, ...(obj.inventory || {}) } };
  } catch (e) {
    console.warn('save load failed:', e && e.message);
    return defaultSave();
  }
}

export function writeSave(data) {
  try {
    data.lastSeen = Date.now();
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('save write failed:', e && e.message);
    return false;
  }
}

export function resetSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* بی‌خیال */ }
}
