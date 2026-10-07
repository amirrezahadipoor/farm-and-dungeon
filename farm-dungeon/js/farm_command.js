// farm_command.js — مسیریابی فرمانِ تپ در مزرعه (بدون DOM): صف رنگ‌آمیزی،
// دروازه‌ی دانجن، خانه (میز کار)، سیب‌دار، تابلوی باغ شمالی، ایستادن کنار تایلِ کار
import { TILE, COLS, ROWS } from './tiles.js';
import { findPath } from './astar.js';

const DX4 = [1, -1, 0, 0], DY4 = [0, 0, 1, -1]; // ثابت ماژول — بدون تخصیص آرایه در هر فرمان

// نزدیک‌ترین تایل قابل‌رفتِ همسایه‌ی (tx,ty) نسبت به قهرمان — برای ایستادن «کنار» نه «روی»
function nearFree(f, tx, ty, hx, hy) {
  let best = null, bd = 1e9;
  for (let i = 0; i < 4; i++) {
    const nx = tx + DX4[i], ny = ty + DY4[i];
    if (!f.walkable(nx, ny)) continue;
    const d = Math.hypot(nx * TILE + 8 - hx, ny * TILE + 8 - hy);
    if (d < bd) { bd = d; best = { x: nx, y: ny }; }
  }
  return best;
}

export function farmCommand(game, wx, wy) {
  const h = game.hero, f = game.farm, wallet = game.wallet;
  const busy = h.act >= 0 || h.path.length > 0;
  if (busy) {
    // رنگ‌آمیزی: صف کار تا ۸ تایل متمایز
    const tx0 = Math.floor(wx / TILE), ty0 = Math.floor(wy / TILE);
    const c0 = f.cell(tx0, ty0);
    if (c0 && f.farmable(tx0, ty0)) {
      // تایل کشت: برو به صف (اگر پر بود، نادیده — مسیر قهرمان دزدیده نشود! قبلاً fall-through می‌کرد و قهرمان بین تایل‌ها نوسان می‌گرفت)
      if (game.queue.length < 8 && !game.queue.some((q) => q.tx === tx0 && q.ty === ty0)) {
        const tool = f.autoTool(tx0, ty0);
        if (tool && !(tool === 'seed' && (wallet.seeds[wallet.selectedCrop] <= 0 || !f.canPlant(wallet.selectedCrop, tx0, ty0)))) {
          game.queue.push({ tx: tx0, ty: ty0 });
          game.marker = { x: tx0, y: ty0, t: 0 };
        }
      }
      return;
    }
    if (h.act >= 0) { h.pending = [wx, wy]; return; }
  }
  const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return;
  let goal = { x: tx, y: ty }, work = null;
  const cT = f.cell(tx, ty);

  if (cT && cT.kind === 'sign') { // تپ روی تابلوی «فروشی» باغ شمالی → برو کنارش و بخر
    const best = nearFree(f, tx, ty, h.x, h.y);
    if (!best) { game.log.push({ k: 'blocked' }); return; }
    goal = best; work = { sign: true };
  } else if (f.isGate(tx, ty)) { // تپ روی دروازه‌ی دانجن
    const best = nearFree(f, tx, ty, h.x, h.y);
    if (best && Math.hypot(best.x * TILE + 8 - h.x, best.y * TILE + 8 - h.y) < 30) { game.onGate && game.onGate(); return; } // نزدیک دروازه → ورود
    if (!best) { game.log.push({ k: 'blocked' }); return; }
    goal = best; work = { gate: true };
  } else if (!f.walkable(tx, ty)) {
    if (cT && cT.kind === 'tree' && (cT.variant & 1)) {
      // سیب‌دار: برو کنارش و یک سیب بردار (هر درخت، هر روز یک‌بار)
      const best = nearFree(f, tx, ty, h.x, h.y);
      if (!best) { game.log.push({ k: 'blocked' }); return; }
      goal = best; work = { tree: true, tx, ty };
    } else if (cT && cT.kind === 'house') {
      // خانه: میز کار قهرمان — منوی ارتقاها/مأموریت‌ها
      const best = nearFree(f, tx, ty, h.x, h.y);
      if (!best) { game.log.push({ k: 'blocked' }); return; }
      goal = best; work = { house: true };
    } else {
      // پرچین/آب/حصار: به نزدیک‌ترین تایل قابل‌رفتِ همسایه برو
      const best = nearFree(f, tx, ty, h.x, h.y);
      if (!best) { game.log.push({ k: 'blocked' }); return; }
      goal = best;
    }
  } else if (f.farmable(tx, ty)) {
    const tool = f.autoTool(tx, ty);
    if (tool === 'seed' && !f.canPlant(wallet.selectedCrop, tx, ty)) { game.log.push({ k: 'orchardOnly' }); return; } // بذر باغ شمالی؟ بدون راه‌رفتن
    if (tool === 'seed' && wallet.seeds[wallet.selectedCrop] <= 0) { game.log.push({ k: 'noSeeds', type: wallet.selectedCrop }); return; } // بذر نداری — فقط از دانجن!
    else if (tool) work = { tx, ty, tool };
    else if (tool === null) work = { tx, ty, tool: null, info: true }; // در حال رشد: فقط درصد
    if (work) {
      // برای کار، کنار تایل بایست (نه روی آن)
      const best = nearFree(f, tx, ty, h.x, h.y);
      if (best) goal = best;
    }
  }
  const start = { x: Math.floor(h.x / TILE), y: Math.floor(h.y / TILE) };
  const path = findPath(f, start.x, start.y, goal.x, goal.y);
  if (path == null) { game.log.push({ k: 'blocked' }); return; }
  h.path = path;
  h.work = work;
  h.run = path.length > 8;
  game.marker = work ? { x: tx, y: ty, t: 0 } : null;
}
