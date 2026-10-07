// art/dungeon_depth.js — عمق و بافت دانجن: سایه‌ی دیوار روی کف، لبه‌ی روشن،
// سنگ‌ریزه/ترک ریز کف، خزه روی دیوار — همه تصادفیِ قطعی (بدون حالت)
// ن۴۳: رنگ‌ها از پالت تم (DPAL) — قبلاً آرایه‌ی هاردکد جدا + لبه‌ی بنفش در همه‌ی تم‌ها
import { DPAL } from './ground.js';
const hR = (x, y) => { let hh = (x * 374761393 + y * 668265263) | 0; hh = (hh ^ (hh >> 13)) * 1274126177; return ((hh ^ (hh >> 16)) >>> 0) / 4294967295; };
const _ec = [0, 0, 0, 0];

// روی بومِ صحنه: سایه + لبه برای هر دیواری که بالایش کف است + بافت کف + خزه
export function drawDungeonDepth(r, D, cx, cy, TILE, ROWS, COLS) {
  for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) {
    const c = D.cell(tx, ty);
    const sx = tx * TILE - cx, sy = ty * TILE - cy;
    if (sx < -TILE || sy < -TILE || sx > r.w || sy > r.h) continue;
    if (c.kind === 'wall' && D.walkable(tx, ty + 1)) {
      const P = DPAL(D.theme | 0);
      r.rect(sx, sy + TILE, TILE, 3, [12, 10, 24, 70]);        // سایه‌ی روی کف
      _ec[0] = P.stoneHi[0]; _ec[1] = P.stoneHi[1]; _ec[2] = P.stoneHi[2]; _ec[3] = 220;
      r.rect(sx, sy + TILE - 1, TILE, 1, _ec);                 // لبه‌ی روشن پایین دیوار — رنگ تم
      const m = hR(tx * 13, ty * 7);
      if (m < 0.30) { // خزه‌ی آویزان از لبه‌ی دیوار — رنگش از پالت تم (ن۴۳: تک‌منبع DPAL)
        _ec[0] = P.moss[0]; _ec[1] = P.moss[1]; _ec[2] = P.moss[2]; _ec[3] = 200;
        const mx = sx + 2 + Math.floor(hR(tx, ty * 3) * 12);
        r.px(mx, sy + TILE, _ec);
        _ec[0] = P.mossD[0]; _ec[1] = P.mossD[1]; _ec[2] = P.mossD[2]; _ec[3] = 160;
        r.px(mx, sy + TILE + 1, _ec);
        if (m < 0.12) { _ec[3] = 200; _ec[0] = P.moss[0]; _ec[1] = P.moss[1]; _ec[2] = P.moss[2]; r.px(mx + 1, sy + TILE + 1, _ec); }
      }
    }
    if (c.kind === 'dfloor') {
      const P = DPAL(D.theme | 0);
      const hh = hR(tx, ty);
      if (hh < 0.17) { // سنگ‌ریزه — رنگ تم
        const px4 = 2 + Math.floor(hR(tx * 3, ty * 5) * 12), py4 = 2 + Math.floor(hR(tx * 7, ty * 11) * 12);
        r.px(sx + px4, sy + py4, P.stoneSh);
        if (hh < 0.07) r.px(sx + px4 + 2, sy + py4 + 1, P.brickOut);
      } else if (hh < 0.21) { // ترک ریز کف
        const px4 = 3 + Math.floor(hR(tx * 5, ty) * 10), py4 = 3 + Math.floor(hR(tx, ty * 9) * 10);
        r.px(sx + px4, sy + py4, P.brickOut); r.px(sx + px4 + 1, sy + py4 + 1, P.brickOut);
      }
    }
  }
}
