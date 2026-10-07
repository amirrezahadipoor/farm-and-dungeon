// art/gl_batch.js — منابع و batcher مسیر GPU: اطلس ۲۰۴۸² (shelf packing)، تکسچر زمین پویا،
// مش زمین شیب‌دار (۱۶px و ۳۲px برای دو سطح کیفیت)، صف اسپرایت (۴رأس/۶اندیس)، نور و اورلی.
import { GLR, GLT, MAXL, MAXQ, VERT, uni, mkTex, mkProg, VS_LAY, FS_LAY } from './gl.js';

export const GLAT = { size: 2048, map: new Map(), x: 1, y: 1, shelfH: 0 };
const SB = { n: 0, data: null, vao: null, vbo: null, quad: null };
const GND = { m16: null, m32: null };
const LAY = { pr: null };
const _p = { cam: null, ax: null, persp: 0, view: null, tint: null };

function mesh(gl, step) {
  const C = (480 / step) | 0, R = (320 / step) | 0, v = [], idx = [];
  for (let y = 0; y <= R; y++) for (let x = 0; x <= C; x++) v.push(x * step, y * step);
  for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
    const a = y * (C + 1) + x;
    idx.push(a, a + 1, a + C + 2, a, a + C + 2, a + C + 1);
  }
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, n: idx.length };
}

export function glBatchInit() {
  const gl = GLR.gl;
  GLAT.map.clear(); GLAT.x = 1; GLAT.y = 1; GLAT.shelfH = 0; // رکوردهای UV باطل می‌شوند → بازپخت خودکار
  GLT.atlas = mkTex(gl, GLAT.size, GLAT.size);
  GLT.ground = mkTex(gl, GLT.cw, GLT.ch);
  GLT.ui = mkTex(gl, GLT.cw, GLT.ch);
  GLT.wx = mkTex(gl, GLT.cw, GLT.ch);
  LAY.pr = mkProg(gl, VS_LAY, FS_LAY);
  GLT.ramp = /(^|[?&])noramp=1/.test(location.search) ? 0 : 1; // سوییچ QA برای سنجش رمپ
  GND.m16 = mesh(gl, 16); GND.m32 = mesh(gl, 32);
  SB.data = new Float32Array(MAXQ * 4 * VERT);
  SB.vao = gl.createVertexArray();
  gl.bindVertexArray(SB.vao);
  SB.vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, SB.vbo);
  gl.bufferData(gl.ARRAY_BUFFER, SB.data.byteLength, gl.DYNAMIC_DRAW);
  const st = VERT * 4; // ۱۳ فلوat: pos2 rel2 uv2 col4 mode1 r01(2)
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, st, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, st, 8);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, st, 16);
  gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, st, 24);
  gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 1, gl.FLOAT, false, st, 40);
  gl.enableVertexAttribArray(5); gl.vertexAttribPointer(5, 2, gl.FLOAT, false, st, 44);
  const idx = new Uint16Array(MAXQ * 6);
  for (let i = 0; i < MAXQ; i++) { const b = i * 4, q = i * 6; idx[q] = b; idx[q + 1] = b + 1; idx[q + 2] = b + 2; idx[q + 3] = b; idx[q + 4] = b + 2; idx[q + 5] = b + 3; }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  SB.quad = gl.createVertexArray(); // کوآد واحد ۰..۱ (اورلی + لایه‌ها)
  gl.bindVertexArray(SB.quad);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
  gl.bindVertexArray(null);
}
// تکسچر لایه‌ها: افکت‌ها (مقیاس‌شده) و آب‌وهوا (۱:۱)
export function glUi(ras, w, h) {
  const gl = GLR.gl;
  gl.bindTexture(gl.TEXTURE_2D, GLT.ui);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, ras.d.subarray(0, w * h * 4));
}
export function glWx(ras, w, h) {
  const gl = GLR.gl;
  gl.bindTexture(gl.TEXTURE_2D, GLT.wx);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, ras.d.subarray(0, w * h * 4));
}
export function glLayer(which, w, h, uw, uh) {
  const gl = GLR.gl, pr = LAY.pr;
  if (!pr) return;
  gl.useProgram(pr.p);
  gl.uniform2f(uni(pr, 'u_size'), w, h);
  gl.uniform2f(uni(pr, 'u_uv'), uw, uh);
  gl.uniform2fv(uni(pr, 'u_vp'), GLR.vp);
  gl.uniform1f(uni(pr, 'u_scale'), GLR.uscale);
  gl.uniform1i(uni(pr, 'u_tex'), 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, which === 0 ? GLT.ui : GLT.wx);
  gl.bindVertexArray(SB.quad);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  gl.bindVertexArray(null);
  GLR.draws++;
}

// ---- اطلس: کلید یکتا → رکورد UV؛ سرریز = بازچینی از ابتدا (اسپرایت‌ها دوباره آپلود می‌شوند) ----
export function glAtlas(key, ras) {
  let rec = GLAT.map.get(key);
  if (rec) return rec;
  const gl = GLR.gl, pad = 1, w = ras.w + pad * 2, h = ras.h + pad * 2;
  if (GLAT.x + w > GLAT.size) { GLAT.x = 1; GLAT.y += GLAT.shelfH + 1; GLAT.shelfH = 0; }
  if (GLAT.y + h > GLAT.size) { GLAT.map.clear(); GLAT.x = 1; GLAT.y = 1; GLAT.shelfH = 0; }
  const x = GLAT.x, y = GLAT.y;
  gl.bindTexture(gl.TEXTURE_2D, GLT.atlas);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, x + pad, y + pad, ras.w, ras.h, gl.RGBA, gl.UNSIGNED_BYTE, ras.d);
  GLAT.x += w; if (h > GLAT.shelfH) GLAT.shelfH = h;
  rec = { u0: (x + pad + 0.02) / GLAT.size, v0: (y + pad + 0.02) / GLAT.size, u1: (x + pad + ras.w - 0.02) / GLAT.size, v1: (y + pad + ras.h - 0.02) / GLAT.size, w: ras.w, h: ras.h };
  GLAT.map.set(key, rec);
  return rec;
}
export function glGround(ras, w, h) {
  const gl = GLR.gl;
  gl.bindTexture(gl.TEXTURE_2D, GLT.ground);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, ras.d.subarray(0, w * h * 4));
}
export function glPush(rec, ax, ay, ox, oy, c, mode = 0) {
  if (SB.n >= MAXQ) glFlushSprites();
  const d = SB.data; let o = SB.n * 4 * VERT;
  const xs = [-ox, rec.w - ox, rec.w - ox, -ox], ys = [-oy, -oy, rec.h - oy, rec.h - oy];
  const us = [rec.u0, rec.u1, rec.u1, rec.u0], vs = [rec.v0, rec.v0, rec.v1, rec.v1];
  for (let i = 0; i < 4; i++) {
    d[o++] = ax; d[o++] = ay; d[o++] = xs[i]; d[o++] = ys[i]; d[o++] = us[i]; d[o++] = vs[i];
    d[o++] = c[0]; d[o++] = c[1]; d[o++] = c[2]; d[o++] = c[3]; d[o++] = mode;
    d[o++] = i === 1 || i === 2 ? 1 : 0; d[o++] = i >= 2 ? 1 : 0;
  }
  SB.n++;
}
export function glCam(cam, ax, persp, view, tint) { _p.cam = cam; _p.ax = ax; _p.persp = persp; _p.view = view; _p.tint = tint; }
export function glLights(list, cols, n) {
  GLT.n = n;
  if (n) { GLT.lights.set(list.subarray(0, n * 4)); GLT.lightsC.set(cols.subarray(0, n * 4)); }
}
// خورشید/ماه + قدرت نرمال/AO
export function glRim(x, y, k) { // جهت نور لبه (صفحه‌ای) + شدت
  GLT.rim[0] = x; GLT.rim[1] = y; GLT.rim[2] = k;
}
export function glSun(dir, col, k) {
  GLT.sun[0] = dir[0]; GLT.sun[1] = dir[1]; GLT.sun[2] = dir[2];
  GLT.sunC[0] = col[0]; GLT.sunC[1] = col[1]; GLT.sunC[2] = col[2];
  GLT.sunC[3] = k;
}
function bindCam(gl, pr) {
  gl.uniform2fv(uni(pr, 'u_cam'), _p.cam);
  gl.uniform2fv(uni(pr, 'u_view'), _p.view);
  gl.uniform2fv(uni(pr, 'u_ax'), _p.ax);
  gl.uniform2fv(uni(pr, 'u_vp'), GLR.vp);
  gl.uniform1f(uni(pr, 'u_persp'), _p.persp);
  gl.uniform1f(uni(pr, 'u_scale'), GLR.uscale);
  gl.uniform1f(uni(pr, 'u_flash'), GLR.flash);
  gl.uniform3fv(uni(pr, 'u_dark'), GLT.dark);
  gl.uniform4fv(uni(pr, 'u_tint'), _p.tint);
  gl.uniform4fv(uni(pr, 'u_light[0]'), GLT.lights);
  gl.uniform4fv(uni(pr, 'u_lightC[0]'), GLT.lightsC);
  gl.uniform1i(uni(pr, 'u_nl'), GLT.n);
  gl.uniform3fv(uni(pr, 'u_sun'), GLT.sun);
  gl.uniform4fv(uni(pr, 'u_sunC'), GLT.sunC);
  gl.uniform1i(uni(pr, 'u_tex'), 0);
}
export function glFrame(cam, ax, persp, view, tint, org, tsize, step) {
  const gl = GLR.gl;
  glCam(cam, ax, persp, view, tint);
  gl.clear(gl.COLOR_BUFFER_BIT);
  GLR.draws = 0; GLR.quads = 0;
  const pr = GLR.progs.g, m = step === 32 ? GND.m32 : GND.m16;
  gl.useProgram(pr.p);
  bindCam(gl, pr);
  gl.uniform2fv(uni(pr, 'u_org'), org);
  gl.uniform2fv(uni(pr, 'u_tsize'), tsize);
  gl.uniform2f(uni(pr, 'u_ts'), GLT.cw, GLT.ch);
  gl.uniform1f(uni(pr, 'u_relief'), GLT.relief);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, GLT.ground);
  gl.bindVertexArray(m.vao);
  gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_SHORT, 0);
  GLR.draws++;
  gl.bindVertexArray(null);
}
export function glFlushSprites() {
  if (!SB.n) return;
  const gl = GLR.gl, pr = GLR.progs.s;
  gl.useProgram(pr.p);
  bindCam(gl, pr);
  gl.uniform3fv(uni(pr, 'u_rim'), GLT.rim);
  gl.uniform1f(uni(pr, 'u_ramp'), GLT.ramp);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, GLT.atlas);
  gl.bindVertexArray(SB.vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, SB.vbo);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, SB.data.subarray(0, SB.n * 4 * VERT));
  gl.drawElements(gl.TRIANGLES, SB.n * 6, gl.UNSIGNED_SHORT, 0);
  gl.bindVertexArray(null);
  GLR.draws++; GLR.quads += SB.n; SB.n = 0;
}
export function glOverlay(fade, vig) {
  const gl = GLR.gl, pr = GLR.progs.o;
  gl.useProgram(pr.p);
  gl.uniform1f(uni(pr, 'u_fade'), fade);
  gl.uniform1f(uni(pr, 'u_vig'), vig);
  gl.uniform3f(uni(pr, 'u_fill'), 0.039, 0.031, 0.094);
  gl.bindVertexArray(SB.quad);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  gl.bindVertexArray(null);
}
