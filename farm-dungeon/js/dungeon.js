// dungeon.js — ساخت دانجن از نقشه‌های دست‌چین (ن۳۲): انتخاب blueprint + قرینه + چینش
// صندوق/محراب/مشعل/دکور/دشمن‌ها با مقیاس طبقه + تم رنگی (سنگ/خزه/گدازه/یخ هر ۵ طبقه)
import { Monster } from './monster.js';
import { BLUEPRINTS, BOSS_BLUEPRINT } from './dungeon_blueprints.js';
import { DEATH_COLORS } from './art/monster_parts.js';
import { Locomotion, GAITS } from './skeleton.js';
import { ACT_DUR } from './art/hero_pose.js';
import { groundSprite, E, TILE, COLS, ROWS, WORLD_W, WORLD_H } from './tiles.js';
import { Raster } from './raster.js';
import { FX } from './fx.js';
import { MOB_TAGS } from './mobs_new.js'; // ن۴۴: هیولاهای امضای هر معماری

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const POOL = [
  { kinds: ['slime', 'bat'], from: 1 }, { kinds: ['spider'], from: 2 }, { kinds: ['skeleton'], from: 3 },
  { kinds: ['wolf'], from: 4 }, { kinds: ['ghost'], from: 6 }, { kinds: ['golem'], from: 8 },
];
export const floor10 = (f) => f % 10 === 0;

export class Dungeon {
  constructor(seed, floor) {
    this.seed = seed; this.floor = floor;
    this.cols = COLS; this.rows = ROWS;
    this.rng = mulberry32(seed * 7919 + floor * 104729);
    this.grid = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) this.grid.push({ x, y, kind: 'wall', v: 0 });
    this.enemies = []; this.chests = []; this.drops = []; this.torches = [];
    this.shrine = null; // محراب باستانی (برکت انتخابی) — از طبقه ۲
    this._gen();
  }
  cell(x, y) { return (x < 0 || y < 0 || x >= COLS || y >= ROWS) ? null : this.grid[y * COLS + x]; }
  walkable(x, y) { const c = this.cell(x, y); return !!c && (c.kind === 'dfloor' || c.kind === 'stairs' || c.kind === 'decor'); }

  _gen() {
    const R = this.rng;
    this.theme = Math.floor((this.floor - 1) / 5) % 4; // تم: سنگ→خزه→گدازه→یخ
    const bp = floor10(this.floor) ? BOSS_BLUEPRINT : BLUEPRINTS[Math.floor(R() * BLUEPRINTS.length)];
    const flip = R() < 0.5; // قرینه‌ی افقی برای تنوع — اتصال حفظ می‌شود
    const FX = (x) => (flip ? this.cols - 1 - x : x);
    const chestC = [], shrineC = [], decorC = [], enemyC = [];
    let bossSpot = null;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const ch = bp.rows[y][x], xx = FX(x);
      const c = this.cell(xx, y);
      // ن۴۳: واریانت دیوار — ۰/۱ سالم، ۲ خرابی (~۱۰٪)، ۳ خزه‌گرفته (~۸٪)؛ خرابی/خزه قبلاً کد مرده بود
      const wv = () => { const u = R(); return u < 0.41 ? 0 : u < 0.82 ? 1 : u < 0.92 ? 2 : 3; };
      if (ch === '#') { c.kind = 'wall'; c.v = wv(); }
      else if (ch === 'T') { c.kind = 'wall'; c.v = wv(); this.torches.push({ x: xx, y }); }
      else if (ch === 'P') { c.kind = 'pillar'; c.v = R() < 0.35 ? 1 : 0; }
      else if (ch === 'W') { c.kind = 'water'; c.v = 0; }
      else if (ch === 'R') { c.kind = 'decor'; c.v = 5; } // فرش تالار تخت
      else if (ch === 'S') { c.kind = 'dfloor'; c.v = Math.floor(R() * 3); this.spawn = { x: xx, y }; }
      else if (ch === '>') { c.kind = 'stairs'; c.v = 0; this.stairs = { x: xx, y }; }
      else {
        c.kind = 'dfloor'; c.v = Math.floor(R() * 3);
        if (ch === 'C') chestC.push({ x: xx, y });
        else if (ch === 'H') shrineC.push({ x: xx, y });
        else if (ch === 'D') decorC.push({ x: xx, y });
        else if (ch === 'E') enemyC.push({ x: xx, y });
        else if (ch === 'B') bossSpot = { x: xx, y };
      }
    }
    // صندوق‌ها: از جایگاه‌های دست‌چین (۲-۴ تا)
    const nChests = Math.min(chestC.length, 2 + (R() < 0.5 ? 1 : 0) + (this.floor >= 4 ? 1 : 0));
    for (let i = chestC.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [chestC[i], chestC[j]] = [chestC[j], chestC[i]]; }
    for (let i = 0; i < nChests; i++) this.chests.push({ x: chestC[i].x, y: chestC[i].y, open: false });
    // محراب: طبقه‌ی ۲+، ۶۰٪ — روی جایگاه دست‌چینِ نقشه
    if (this.floor >= 2 && shrineC.length && R() < 0.6) {
      const sh = shrineC[Math.floor(R() * shrineC.length)];
      this.shrine = { x: sh.x * TILE + 8, y: sh.y * TILE + 8, used: false };
    }
    // دکور: جایگاه‌های دست‌چین (~۵۵٪) + پاشش ارگانیک روی کف (استخوان/قارچ/ترک/کریستال/تار)
    const DV = [0, 0, 0, 1, 1, 2, 2, 3, 4];
    for (const d of decorC) if (R() < 0.55) { const c = this.cell(d.x, d.y); c.kind = 'decor'; c.v = DV[Math.floor(R() * 9)]; }
    for (const c of this.grid) if (c.kind === 'dfloor' && R() < 0.06) { c.kind = 'decor'; c.v = DV[Math.floor(R() * 9)]; }
    // دشمن‌ها با مقیاس طبقه — روی مناطق E + کف دور از اسپاون
    const hpMul = 1 + 0.13 * (this.floor - 1), dmgMul = 1 + 0.075 * (this.floor - 1);
    if (floor10(this.floor)) {
      const b = bossSpot || this.stairs;
      this.enemies.push(new Monster('boss', b.x * TILE + 8, b.y * TILE + 8, 1 + Math.floor(this.floor / 20), { hpMul, dmgMul }));
      for (const k of ['slime', 'slime', 'bat']) {
        const spot = enemyC.length ? enemyC[Math.floor(R() * enemyC.length)] : this.spawn;
        this._spawnMobAt(k, spot.x, spot.y, hpMul, dmgMul);
      }
    } else {
      const n = 4 + Math.floor(this.floor * 1.3);
      const pool = POOL.filter((p) => p.from <= this.floor).flatMap((p) => p.kinds);
      const spots = enemyC.slice();
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const c = this.cell(x, y);
        if (c.kind === 'dfloor' && Math.abs(x - this.spawn.x) + Math.abs(y - this.spawn.y) >= 8) spots.push({ x, y });
      }
      for (let i = 0; i < n && spots.length; i++) {
        const sp = spots[Math.floor(R() * spots.length)];
        this._spawnMobAt(pool[Math.floor(R() * pool.length)], sp.x, sp.y, hpMul, dmgMul);
      }
      // ن۴۴: هیولاهای امضای معماری (مومیایی مقبره، کماندار میدان تیر، …) — ۱..۳ تا بر حسب طبقه
      const tags = MOB_TAGS[bp.name] || [];
      const nsig = 1 + (this.floor >= 5 ? 1 : 0) + (this.floor >= 12 ? 1 : 0);
      for (const k of tags) for (let i = 0; i < nsig && spots.length; i++) {
        const sp = spots[Math.floor(R() * spots.length)];
        this._spawnMobAt(k, sp.x, sp.y, hpMul, dmgMul);
      }
    }
  }
  // اسپاون روی تایل مشخص (نقشه‌ی دست‌چین)
  _spawnMobAt(kind, tx, ty, hpMul = 1, dmgMul = 1) {
    // نخبه: از طبقه‌ی ۳، ۱۵٪ شانس — قوی‌تر ولی غنیمت×۲٫۲ + قلب تضمینی
    const elite = this.floor >= 3 && this.rng() < 0.15;
    const m = { hpMul, dmgMul, elite };
    let x = tx, y = ty;
    for (let tries = 0; tries < 8 && !this.walkable(x, y); tries++) { x = tx + Math.floor(this.rng() * 5) - 2; y = ty + Math.floor(this.rng() * 5) - 2; }
    if (!this.walkable(x, y)) { x = this.spawn.x; y = this.spawn.y; }
    this.enemies.push(new Monster(kind, x * TILE + 8, y * TILE + 8, 1, m));
  }

}
