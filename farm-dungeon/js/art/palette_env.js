// tiles.js — تایل‌های ۱۶×۱۶ رویه‌ای (چمن/خاک/پرچین/آب/حصار) + محصولات ۴ مرحله‌ای + فونت پیکسلی ۳×۵
import { Raster } from '../raster.js';

export const TILE = 16;
export const COLS = 30, ROWS = 20;
export const WORLD_W = COLS * TILE, WORLD_H = ROWS * TILE;

// پالت ثابت محیط
const P = {
  grass:'#4c8a4b', grassHi:'#5fa75e', grassBlade:'#6db75f', grassSh:'#3c6f3f',
  flowerW:'#e8e3d3', flowerY:'#e8c74a',
  soil:'#8a5a33', soilHi:'#a06c40', soilSh:'#6e4526', furrow:'#5a3820',
  soilWet:'#6f4a2b', soilWetHi:'#7f5836', soilWetSh:'#553720', wet:'#4f6fae',
  hedge:'#2e5b34', hedgeHi:'#437c44', hedgeSh:'#20422a', hedgeOut:'#16301e',
  water:'#3d6fae', waterHi:'#5b8fd4', waterSh:'#2c5488', sparkle:'#b8d6f2',
  wood:'#8a5a33', woodHi:'#a97b4e', woodSh:'#63401f',
  leaf:'#4f9a45', leafHi:'#66b358', leafSh:'#3a7a35', sprout:'#7cc069',
  carrot:'#e07b2f', carrotHi:'#f2974e',
  wheatG:'#7fa348', wheat:'#d4b04a', wheatHi:'#eccf6e', wheatSh:'#a8862f',
  pumpkin:'#d97f2e', pumpkinHi:'#efa14e', pumpkinSh:'#a85a1d', stem:'#5f7a3a',
  straw:'#e2485a', strawHi:'#ff8592', strawSh:'#a62e44',
  eggplant:'#8657c2', eggplantHi:'#a678e0', eggplantSh:'#5f3a92',
  corn:'#eec85a', cornHi:'#ffe58e', cornSh:'#c09a3a',
  gold:'#e6c74a', white:'#f2efe4',
  stone:'#5a5668', stoneHi:'#6e6a80', stoneSh:'#454253', brickOut:'#2b2838',
  brick:'#4a4458', brickHi:'#5a546c', torch:'#e8974a', torchHi:'#ffcf7a', essence:'#7ad0e8',
  heart:'#e06c8a', stairs:'#8a8496', stairsSh:'#5f5a6e', berry:'#d4506a', essenceSh:'#4a7488', bone:'#e8e4d8',
};
export const E = {};
for (const k in P) E[k] = [parseInt(P[k].slice(1, 3), 16), parseInt(P[k].slice(3, 5), 16), parseInt(P[k].slice(5, 7), 16), 255];

export const h2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295; };
const cache = new Map();
export function sprite(key, fn) {
  let s = cache.get(key);
  if (!s) { s = new Raster(TILE, TILE); fn(s); s.markOpaque(); cache.set(key, s); }
  return s;
}
