// astar.js — A* روی گرید ۳۰×۲۰ با حرکت ۴جهته (تپ برای حرکت)
export function findPath(farm, sx, sy, gx, gy) {
  const W = farm.cols, H = farm.rows;
  if (sx === gx && sy === gy) return [];
  if (!farm.walkable(gx, gy)) return null;
  const N = W * H;
  const g = new Float64Array(N).fill(Infinity);
  const came = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const idx = (x, y) => y * W + x;
  const h = (x, y) => Math.abs(x - gx) + Math.abs(y - gy);
  const open = [idx(sx, sy)];
  g[idx(sx, sy)] = 0;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (open.length) {
    // کمترین f در لیست باز (گرید کوچک است؛ کافی و سریع)
    let bi = 0, bf = Infinity;
    for (let i = 0; i < open.length; i++) {
      const f = g[open[i]] + h(open[i] % W, (open[i] / W) | 0);
      if (f < bf) { bf = f; bi = i; }
    }
    const cur = open.splice(bi, 1)[0];
    if (cur === idx(gx, gy)) {
      const path = [];
      let c = cur;
      while (c !== idx(sx, sy) && c !== -1) { path.push({ x: c % W, y: (c / W) | 0 }); c = came[c]; }
      return path.reverse();
    }
    closed[cur] = 1;
    const cx = cur % W, cy = (cur / W) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || !farm.walkable(nx, ny)) continue;
      const ni = idx(nx, ny);
      if (closed[ni]) continue;
      const ng = g[cur] + 1;
      if (ng < g[ni]) {
        g[ni] = ng; came[ni] = cur;
        if (!open.includes(ni)) open.push(ni);
      }
    }
  }
  return null;
}
