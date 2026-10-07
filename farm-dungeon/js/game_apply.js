// game_apply.js — اعمال ابزار روی تایل + اقتصاد برداشت/طلایی (جداسازی از game.js — ن۳۴):
// ضربه در نیمه‌ی انیمیشن اعمال می‌شود؛ سکه/ذرات/شناورها همین‌جا
import { CROPS, WATER_TIME, pondK } from './farm.js';
import { E, TILE } from './tiles.js';

const PART = {
  till: [E.soilHi, E.soilSh], plant: [E.wheatHi, E.wheatSh], water: [E.waterHi, E.sparkle],
  harvestCarrot: [E.carrot, E.carrotHi], harvestWheat: [E.wheat, E.wheatHi], harvestPumpkin: [E.pumpkin, E.pumpkinHi],
  harvestStrawberry: [E.straw, E.strawHi], harvestEggplant: [E.eggplant, E.eggplantHi], harvestCorn: [E.corn, E.cornHi],
};

// اعمال نتیجه‌ی ابزار (از Game.update صدا می‌شود) — res.ev: till/plant/water/harvest
export function gameApply(game) {
  const w = game.hero.work;
  if (!w) return;
  if (w.tool === 'seed') {
    if (game.wallet.seeds[game.wallet.selectedCrop] <= 0) { game.log.push({ k: 'noSeeds', type: game.wallet.selectedCrop }); return; }
    if (!game.farm.canPlant(game.wallet.selectedCrop, w.tx, w.ty)) { game.log.push({ k: 'orchardOnly' }); return; }
  }
  const res = game.farm.applyTool(w.tool, w.tx, w.ty, game.wallet.selectedCrop);
  if (!res.ok) { if (res.needFarm2) game.log.push({ k: 'orchardOnly' }); return; }
  if (game.onSfx) game.onSfx(res.ev); // صدای ابزار: till/plant/water/harvest
  if (res.ev === 'water') {
    const c0 = game.farm.cell(w.tx, w.ty);
    if (c0) c0.wetT = WATER_TIME * (1 + 0.2 * game.toolLvls.can) * pondK(w.tx, w.ty); // خاکِ نزدیک حوضچه دیرتر خشک می‌شود
  }
  if (res.ev === 'plant') game.wallet.seeds[res.type]--; // بذر مصرف شد
  const cx = w.tx * TILE + 8, cy = w.ty * TILE + 8;
  if (res.ev === 'till') {
    partBurst(game, w.tx, w.ty, 'till');
    game.fx.shake(1.5, 0.1); game.fx.stop(0.03);
    if (game.toolLvls.hoe >= 3) { // بیل ارتقایافته: یک همسایه‌ی چمن هم شخم می‌خورد
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const c2 = game.farm.cell(w.tx + dx, w.ty + dy);
        if (c2 && c2.farmable && c2.kind === 'grass') { c2.kind = 'soil'; partBurst(game, w.tx + dx, w.ty + dy, 'till'); break; }
      }
    }
  } else if (res.ev === 'plant') {
    partBurst(game, w.tx, w.ty, 'plant');
  } else if (res.ev === 'water') {
    partBurst(game, w.tx, w.ty, 'water');
    if (game.toolLvls.can >= 3) { // آبپاش ارتقایافته: خاک‌های همسایه هم آب می‌خورند
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const c2 = game.farm.cell(w.tx + dx, w.ty + dy);
        if (c2 && c2.kind === 'soil' && c2.crop && !c2.wet) { c2.wet = true; c2.wetT = WATER_TIME * (1 + 0.2 * game.toolLvls.can); partBurst(game, w.tx + dx, w.ty + dy, 'water'); }
      }
    }
  } else if (res.ev === 'harvest') {
    if (game.toolLvls.sickle >= 2 && Math.random() < 0.22 * (game.toolLvls.sickle - 1)) res.count += 1; // داس: محصول اضافه
    game.wallet.inventory[res.type] += res.count;
    game.float(cx, cy - 6, '+' + res.count, 'gold');
    partBurst(game, w.tx, w.ty, 'harvest' + res.type[0].toUpperCase() + res.type.slice(1));
    if (res.g) { // محصول طلایی: پاداش متغیر!
      const bonus = CROPS[res.type].sell * 4 * res.count;
      game.wallet.coins += bonus;
      game.float(cx, cy - 18, '+' + bonus, 'crit', { scale: 1.2 });
      game.fx.burst(cx, cy, [[255, 220, 120, 255], [255, 255, 255, 255]], 12, { sp: 40, up: 30, life: 0.5 });
      game.log.push({ k: 'golden', n: bonus });
      if (game.onSfx) game.onSfx('golden');
      if (game.onEvent) game.onEvent('golden', 1);
    }
    if (game.onEvent) game.onEvent('harvest', res.count);
  }
}

// پاشش ذرات رنگیِ هر رویداد ابزار
function partBurst(game, tx, ty, kind) {
  const cols = PART[kind];
  if (!cols) return;
  game.fx.burst(tx * TILE + 8, ty * TILE + 8, cols, 10, { sp: 24, up: 26, life: 0.45 });
}
