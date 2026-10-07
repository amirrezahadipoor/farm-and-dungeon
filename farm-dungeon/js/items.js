// items.js — سیستم آیتم‌های پوشیدنی + جدول دراپ هیولاها (بذر/سکه/آیتم)
// آیتم خوب = خیلی نادر: تیتر۳ معمولی ≈ ۰٫۰۵٪ به‌ازای هر کشتار؛ نخبه/باس شانس بهتر

// ---------- آیتم‌های پوشیدنی ----------
// slot: hat (جایگزین کلاه) · body (روی تنه) · boots (روی مچ پا) · sword (نمای حمله)
export const ITEMS = {
  // کلاه/خود
  capStraw:   { slot: 'hat', tier: 1, stat: { hp: 4 },            name: { fa: 'کلاه حصیری', en: 'Straw cap' } },
  helmLeather:{ slot: 'hat', tier: 1, stat: { hp: 10 },           name: { fa: 'خود چرمی', en: 'Leather helm' } },
  helmIron:   { slot: 'hat', tier: 2, stat: { hp: 22 },           name: { fa: 'خود آهنی', en: 'Iron helm' } },
  crownWar:   { slot: 'hat', tier: 3, stat: { hp: 34, crit: 0.04 }, name: { fa: 'تاج جنگ', en: 'War crown' } },
  // زره
  vestLeather:{ slot: 'body', tier: 1, stat: { hp: 12 },          name: { fa: 'جلیقه چرمی', en: 'Leather vest' } },
  plateIron:  { slot: 'body', tier: 2, stat: { hp: 28 },          name: { fa: 'زره آهنی', en: 'Iron plate' } },
  robeMage:   { slot: 'body', tier: 3, stat: { hp: 16, dmg: 3 },  name: { fa: 'ردای جادوگر', en: 'Mage robe' } },
  // چکمه
  bootsSwift: { slot: 'boots', tier: 2, stat: { speed: 0.05 },    name: { fa: 'چکمه تیزپا', en: 'Swift boots' } },
  bootsWar:   { slot: 'boots', tier: 3, stat: { speed: 0.03, hp: 14 }, name: { fa: 'چکمه جنگی', en: 'War boots' } },
  // شمشیر (نمایش هنگام حمله)
  swordCopper:{ slot: 'sword', tier: 1, stat: { dmg: 2 },         name: { fa: 'شمشیر مسی', en: 'Copper sword' } },
  swordIron:  { slot: 'sword', tier: 2, stat: { dmg: 5 },         name: { fa: 'شمشیر آهنی', en: 'Iron sword' } },
  swordCrystal:{ slot: 'sword', tier: 3, stat: { dmg: 9, crit: 0.05 }, name: { fa: 'شمشیر بلوری', en: 'Crystal sword' } },
};
export const SLOTS = ['hat', 'body', 'boots', 'sword'];
const byTier = (slot, t) => Object.keys(ITEMS).filter((id) => ITEMS[id].slot === slot && ITEMS[id].tier === t);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

// ---------- دراپ آیتم (شانس تیترها جداست؛ کف طبقه، تیتر بالاتر را می‌بُرد) ----------
export function rollItemDrop(floor, isElite, isBoss) {
  let chance, t2w, t3w;
  if (isBoss) { chance = 1; t2w = 0.55; t3w = 0.4; }
  else if (isElite) { chance = 0.12; t2w = 0.6; t3w = 0.14; }
  else { chance = 0.045; t2w = 0.11; t3w = 0.01; }
  if (Math.random() >= chance) return null;
  let tier = Math.random() < t3w ? 3 : Math.random() < t2w ? 2 : 1;
  if (tier >= 3 && floor < 7) tier = 2;  // تیتر۳ فقط در عمق
  if (tier === 2 && floor < 3) tier = 1; // تیتر۲ از طبقه‌ی ۳
  return pick(byTier('hat', tier).concat(byTier('body', tier), byTier('boots', tier).length ? byTier('boots', tier) : [], byTier('sword', tier)));
}

// ---------- دراپ بذر (تنها منبع بذر در کل بازی) ----------
const BASIC_W = { carrot: 40, wheat: 26, pumpkin: 16 }; // همیشه
const GOOD_W = { strawberry: 30, eggplant: 40, corn: 30 }; // باس
export function rollSeedDrop(floor, isElite, isBoss) {
  if (isBoss) return pick(Object.keys(GOOD_W).filter((t) => t !== 'eggplant' || floor >= 5).filter((t) => t !== 'corn' || floor >= 8));
  const chance = isElite ? 0.55 : 0.22;
  if (Math.random() >= chance) return null;
  const w = { ...BASIC_W };
  if (floor >= 3) w.strawberry = 10;
  if (floor >= 5) w.eggplant = 6;
  if (floor >= 8) w.corn = 3;
  let sum = 0; for (const k in w) sum += w[k];
  let r = Math.random() * sum;
  for (const k in w) { r -= w[k]; if (r <= 0) return k; }
  return 'carrot';
}

// ---------- دراپ سکه (کوچک — درآمد جانبی دانجن) ----------
export function rollCoinDrop(floor, isElite, isBoss) {
  if (isBoss) return 40 + 8 * floor;
  if (isElite) return 6 + 2 * floor;
  return Math.random() < 0.22 ? 2 + (floor >> 1) : 0;
}

// ---------- جمع آمار تجهیزشده‌ها ----------
export function equipStats(equipped) {
  const s = { dmg: 0, hp: 0, speed: 0, crit: 0 };
  if (!equipped) return s;
  for (const slot of SLOTS) {
    const it = ITEMS[equipped[slot]];
    if (!it) continue;
    s.dmg += it.stat.dmg || 0; s.hp += it.stat.hp || 0;
    s.speed += it.stat.speed || 0; s.crit += it.stat.crit || 0;
  }
  return s;
}
export const equipSig = (equipped) => !equipped ? '' : SLOTS.map((s) => equipped[s] || '-').join('.');
export const tierCol = (t) => t === 3 ? [230, 199, 74] : t === 2 ? [122, 208, 232] : [200, 196, 184]; // طلایی/فیروزه‌ای/خاکستری
export const seedCol = (type) => ({ carrot: [224, 123, 47], wheat: [212, 176, 74], pumpkin: [217, 127, 46], strawberry: [226, 72, 90], eggplant: [134, 87, 194], corn: [238, 200, 90] }[type] || [200, 200, 200]);
