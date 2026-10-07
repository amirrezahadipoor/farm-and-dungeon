// art/gl.js — هسته‌ی رندر GPU (فاز ۱ HD-2D): کانتکست WebGL2، شیدر زمین/اسپرایت/اورلی و بوت.
// باتچر/اطلس/مش در art/gl_batch.js. مسیر CPU دست‌نخورده = fallback کامل (jsdom/بدون WebGL2).
export const GLR = { ok: false, gl: null, w: 0, h: 0, vp: new Float32Array([2, 2]), uscale: 1, flash: 0, quads: 0, draws: 0, lost: false, restores: 0 };
export const MAXL = 24, MAXQ = 1400, VERT = 13;
export const GLT = {
  ground: 0, atlas: 0, ui: 0, wx: 0, cw: 512, ch: 384, n: 0,
  lights: new Float32Array(MAXL * 4), lightsC: new Float32Array(MAXL * 4),
  sun: new Float32Array([0.25, -0.6, 0.9]), sunC: new Float32Array([1, 0.96, 0.9, 0.4]), relief: 1,
  rim: new Float32Array([0.7, -0.7, 0.3]), ramp: 1, // نور لبه + سوییچ رمپ (فاز ۳)
  dark: new Float32Array([13 / 255, 11 / 255, 26 / 255]),
};

const COMMON = `
uniform vec4 u_light[${MAXL}];    // x,y صفحه‌ای | z شعاع | w قدرت 0..1
uniform vec4 u_lightC[${MAXL}];   // rgb رنگ | a ارتفاع (px)
uniform int u_nl;
uniform vec3 u_dark;              // رنگ محیط در تاریکی کامل
uniform vec4 u_tint;              // rgb تینت محیط | a مقدار تاریکی 0..255
uniform vec3 u_sun;               // جهت به‌سوی خورشید/ماه (فضای صفحه)؛ z = ارتفاع
uniform vec4 u_sunC;              // rgb رنگ خورشید | a شدت
uniform float u_flash;
// افت نور: درجه‌دو صاف + کمی wrap — نور رنگی و ارتفاع‌دار (فاز ۲)
float attenAt(vec2 p, int i) {
  vec4 L = u_light[i];
  vec2 d = L.xy - p;
  float q = dot(d, d) / (L.z * L.z);
  if (q >= 1.0) return 0.0;
  float a = 1.0 - q;
  return a * a * L.w;
}
vec3 lightSum(vec2 p, vec3 n) {
  vec3 acc = vec3(0.0);
  for (int i = 0; i < ${MAXL}; i++) {
    if (i >= u_nl) break;
    float at = attenAt(p, i);
    if (at <= 0.0) continue;
    vec4 C = u_lightC[i];
    vec2 d = u_light[i].xy - p;
    vec3 dir = normalize(vec3(d, C.a * 0.35 + 2.0));
    float ndl = max(dot(n, dir), 0.0) * 0.78 + 0.22 * n.z; // لبه‌ی نرم (wrap)
    acc += C.rgb * (at * ndl);
  }
  return acc;
}
vec3 ambientAt(vec2 p) {
  float a = u_tint.a;
  for (int i = 0; i < ${MAXL}; i++) {
    if (i >= u_nl) break;
    vec4 L = u_light[i];
    vec2 d = L.xy - p;
    float q = dot(d, d) / (L.z * L.z);
    if (q < 1.0) a -= 0.95 * L.w * (1.0 - q);
  }
  a = clamp(a, 0.0, 255.0);
  return mix(u_tint.rgb, u_dark, a / 255.0);
}
vec3 sunAt(vec3 n) {
  float k = max(dot(n, normalize(u_sun)), 0.0);
  return u_sunC.rgb * (u_sunC.a * (0.30 + 0.70 * k));
}
float luma3(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }`;
const PROJ = `
uniform vec2 u_cam, u_view, u_ax, u_vp;
uniform float u_persp, u_scale;
vec2 projW(vec2 w, out float kz) {
  vec2 d = w - u_cam;
  kz = 1.0 / (1.0 - d.y * u_persp);
  vec2 s = u_view * 0.5 + vec2(d.x * u_ax.x, d.y * u_ax.y) * kz;
  return floor(s + 0.5);
}
vec4 toClip(vec2 p) {
  return vec4(p.x * u_scale / u_vp.x * 2.0 - 1.0, 1.0 - p.y * u_scale / u_vp.y * 2.0, 0.0, 1.0);
}`;
// ---------------- زمین: نرمال رویه‌ای از خودِ تکسچر (۴ نمونه) + AO از فرورفتگی ----------------
const VS_GND = `#version 300 es
layout(location = 0) in vec2 a_world;
uniform vec2 u_org, u_tsize, u_ts;
out vec2 v_uv, v_sc;
${PROJ}
void main() {
  float kz;
  vec2 p = projW(a_world, kz);
  v_sc = p;
  v_uv = clamp((a_world - u_org) / u_tsize, vec2(0.0), vec2(1.0)) * (u_tsize / u_ts);
  gl_Position = toClip(p);
}`;
const FS_GND = `#version 300 es
precision mediump float;
uniform sampler2D u_tex;
uniform highp vec2 u_ts;  // اندازه‌ی تکسچر (گامِ نمونه‌ی نرمال) — دقت هم‌ارز ورتکس
uniform float u_relief;   // 0..1 قدرت نرمال/AO (سطح کیفیت)
in vec2 v_uv, v_sc;
out vec4 o;
${COMMON}
void main() {
  vec4 c = texture(u_tex, v_uv);
  if (c.a < 0.004) discard;
  vec2 tx = 2.0 / u_ts; // گام ۲px: پیکسل‌آرت لبه‌ی تیز دارد — گرادیان خام، نرمال را خرد می‌کند
  float lx = luma3(texture(u_tex, v_uv + vec2(tx.x, 0.0)).rgb);
  float lxd = luma3(texture(u_tex, v_uv - vec2(tx.x, 0.0)).rgb);
  float ly = luma3(texture(u_tex, v_uv + vec2(0.0, tx.y)).rgb);
  float lyd = luma3(texture(u_tex, v_uv - vec2(0.0, tx.y)).rgb);
  vec2 g = clamp(vec2(lxd - lx, lyd - ly) * 0.5, vec2(-0.22), vec2(0.22)); // مهار دامنه
  float relief = u_relief * 7.0;
  vec3 n = normalize(vec3(-g.x * relief, -g.y * relief, 1.0));
  float ao = clamp(1.0 - (abs(g.x) + abs(g.y)) * u_relief * 0.9, 0.82, 1.0); // AO ملایم، نه خفه‌کننده
  vec3 col = c.rgb * (ambientAt(v_sc) * ao + lightSum(v_sc, n)) + c.rgb * sunAt(n);
  o = vec4(mix(col, vec3(1.0), u_flash), c.a);
}`;
// ---------------- اسپرایت: mode 0 روبه‌دوربین، 1 UI بدون نور، 2 emissive، 3 دکالِ زمین‌تراز ----------------
const VS_SPR = `#version 300 es
layout(location = 0) in vec2 a_pos;
layout(location = 1) in vec2 a_rel;
layout(location = 2) in vec2 a_uv;
layout(location = 3) in vec4 a_col;
layout(location = 4) in float a_mode;
layout(location = 5) in vec2 a_r01;
out vec2 v_uv, v_sc, v_r01;
out vec4 v_col;
flat out float v_mode;
${PROJ}
void main() {
  float kz;
  vec2 p = projW(a_pos, kz);
  if (a_mode > 0.5 && a_mode < 1.5) { p = a_pos; kz = 1.0; } // فقط UI صفحه‌ای
  v_sc = p;
  v_uv = a_uv;
  v_col = a_col;
  v_mode = a_mode;
  v_r01 = a_r01; // 0..1 روی کوآد (بالا=0)
  vec2 rel = a_rel * u_ax.y;
  if (a_mode > 2.5) rel = vec2(a_rel.x * u_ax.x, a_rel.y * u_ax.y); // دکال روی صفحه‌ی زمین
  gl_Position = toClip(floor(p + rel * kz + 0.5));
}`;
const FS_SPR = `#version 300 es
precision mediump float;
uniform sampler2D u_tex;
uniform vec3 u_rim; // فاز ۳: نور لبه — xy جهت صفحه، z شدت
uniform float u_ramp; // فاز ۳: ۱ = رمپ ۵پله‌ی هیو-شیفت، ۰ = سایه‌زنی نرم فاز ۲ (سوییچ A/B برای QA)
in vec2 v_uv, v_sc, v_r01;
in vec4 v_col;
flat in float v_mode;
out vec4 o;
${COMMON}
void main() {
  vec4 c = texture(u_tex, v_uv) * v_col;
  if (c.a < 0.004) discard;
  vec3 col;
  if (v_mode > 1.5 && v_mode < 2.5) {            // emissive: خودزدا در تاریکی + نور محیطی ملایم
    float top = 1.0 - 0.18 * v_r01.y;
    col = c.rgb * (1.12 + 0.30 * luma3(lightSum(v_sc, vec3(0.0, -0.4, 1.0)))) * top;
  } else if (v_mode > 0.5) {
    col = c.rgb;                                  // UI / دکال زمین: بدون نور
  } else {                                       // روبه‌دوربین: نرمال رو به بالا-جلو
    vec3 n = normalize(vec3(0.0, -0.42, 1.0));
    float top = 1.0 - 0.10 * v_r01.y;
    vec3 shade = ambientAt(v_sc) + lightSum(v_sc, n) + sunAt(n) * 0.8;
    // رمپ ۵ پله‌ی هیو-شیفت (فاز ۳): سایه سرد، هایلایت گرم — هیوی نورِ رنگی حفظ می‌شود
    float li = max(luma3(shade), 0.001), q = clamp(li, 0.0, 1.45);
    float lv = mix(clamp(q, 0.0, 1.0), clamp(floor(q * 2.9 + 0.02), 0.0, 4.0) * 0.25, u_ramp);
    vec3 tint = mix(vec3(1.0), mix(vec3(0.72, 0.82, 1.24), vec3(1.18, 1.05, 0.82), lv), u_ramp);
    col = c.rgb * (shade / li) * (0.34 + 0.92 * lv) * tint * top;
    if (u_rim.z > 0.01) {                        // نور لبه: فقط مرزِ سمتِ نور (از کانال آلفا)
      vec2 px = fwidth(v_r01), rd = u_rim.xy;
      float aN = texture(u_tex, v_uv - rd * px * 1.4).a, aF = texture(u_tex, v_uv + rd * px * 1.4).a;
      float e = (aN < 0.4 && aF > 0.55) ? 1.0 : 0.0;
      e += texture(u_tex, v_uv - vec2(0.0, px.y * 1.4)).a < 0.4 ? 0.35 : 0.0;
      col += mix(c.rgb, vec3(1.0, 0.98, 0.9), 0.45) * e * u_rim.z;
    }
  }
  o = vec4(mix(col, vec3(1.0), u_flash), c.a);
}`;
function mkShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error('GLSL: ' + gl.getShaderInfoLog(s)); return null; }
  return s;
}
export function mkProg(gl, vs, fs) {
  const a = mkShader(gl, gl.VERTEX_SHADER, vs), b = mkShader(gl, gl.FRAGMENT_SHADER, fs);
  if (!a || !b) return null;
  const p = gl.createProgram();
  gl.attachShader(p, a); gl.attachShader(p, b); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error('LINK: ' + gl.getProgramInfoLog(p)); return null; }
  gl.deleteShader(a); gl.deleteShader(b);
  return { p, c: new Map() };
}
export function uni(pr, n) {
  let l = pr.c.get(n);
  if (l === undefined) {
    l = GLR.gl.getUniformLocation(pr.p, n);
    if (l === null) console.warn('uniform missing: ' + n);
    pr.c.set(n, l);
  }
  return l;
}
export function mkTex(gl, w, h) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

// لایه‌های صفحه‌ای (افکت‌ها/آب‌وهوا): کوآد واحد با تکسچر خودشان
export const VS_OVL = `#version 300 es
layout(location = 0) in vec2 a_p;
out vec2 v_uv;
void main() { v_uv = a_p; gl_Position = vec4(a_p * 2.0 - 1.0, 0.0, 1.0); }`;
const FS_OVL = `#version 300 es
precision mediump float;
uniform float u_fade, u_vig;
uniform vec3 u_fill;
in vec2 v_uv;
out vec4 o;
void main() {
  vec2 q = v_uv * 2.0 - 1.0;
  float a = 1.0 - u_fade;
  float v = smoothstep(0.70, 1.40, length(q)) * u_vig * 0.55;
  if (v > a) a = v;
  o = vec4(u_fill, a);
}`;
export const VS_LAY = `#version 300 es
layout(location = 0) in vec2 a_p;
uniform vec2 u_size, u_vp, u_uv;
uniform float u_scale;
out vec2 v_uv;
void main() {
  v_uv = a_p * u_uv;
  vec2 px = a_p * u_size;
  gl_Position = vec4(px.x * u_scale / u_vp.x * 2.0 - 1.0, 1.0 - px.y * u_scale / u_vp.y * 2.0, 0.0, 1.0);
}`;
export const FS_LAY = `#version 300 es
precision mediump float;
uniform sampler2D u_tex;
in vec2 v_uv;
out vec4 o;
void main() { o = texture(u_tex, v_uv); }`;

export function glInit(canvas) {
  let gl = null;
  try {
    gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  } catch (e) { gl = null; }
  if (!gl || typeof gl.createVertexArray !== 'function') return false;
  GLR.gl = gl;
  const g = mkProg(gl, VS_GND, FS_GND), s = mkProg(gl, VS_SPR, FS_SPR), o = mkProg(gl, VS_OVL, FS_OVL);
  if (!g || !s || !o) return false;
  GLR.progs = { g, s, o };
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0.078, 0.067, 0.141, 1);
  glBatchInit();
  GLR.ok = true; GLR.lost = false;
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); GLR.ok = false; GLR.lost = true; });
  canvas.onwebglcontextrestored = () => { GLR.restores++; GLR.ok2 = glInit(canvas); }; // همان context برمی‌گردد → منابع از نو
  return true;
}
export function glResize(w, h) {
  const gl = GLR.gl;
  gl.viewport(0, 0, w, h);
  GLR.w = w; GLR.h = h; GLR.vp[0] = w; GLR.vp[1] = h;
}
export function glReadback() {
  const gl = GLR.gl, w = gl.canvas.width, h = gl.canvas.height;
  const px = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) out.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
  return { w, h, d: out };
}
