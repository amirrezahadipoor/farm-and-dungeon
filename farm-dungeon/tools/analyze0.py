#!/usr/bin/env python3
# analyze0.py — ممیزی عددی baseline فاز ۰ + شیت قبل/بعد
# ورودی: shots/p0_raw_*.png (بوم بازی، مقیاس صحیح) + shots/p0_metrics.json
# خروجی: shots/p0_scene_*.png (رستر پیکسل‌دقیق) · shots/p0_audit.json · shots/p0_baseline_sheet.png
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SH = os.path.join(ROOT, 'shots')
M = json.load(open(os.path.join(SH, 'p0_metrics.json')))
TILE = 16
FONT_B = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FONT_M = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'

def lum(a):
    return 0.299 * a[:, :, 0] + 0.587 * a[:, :, 1] + 0.114 * a[:, :, 2]

def band_edge(L, k=3):
    gx = np.abs(np.diff(L, axis=1)); gy = np.abs(np.diff(L, axis=0))
    e = np.zeros(L.shape); e[:, 1:] += gx; e[1:, :] += gy
    h = L.shape[0]
    return [round(float(e[:h // k].mean()), 2), round(float(e[h // k:2 * h // k].mean()), 2), round(float(e[2 * h // k:].mean()), 2)]

def tile_flat(a, camx, camy):
    # تایل‌های ۱۶×۱۶ هم‌تراز با گرید دنیای بازی
    ox, oy = (-camx) % TILE, (-camy) % TILE
    shares, detail = [], []
    H, W = a.shape[:2]
    for ty in range(oy, H - TILE, TILE):
        for tx in range(ox, W - TILE, TILE):
            t = a[ty:ty + TILE, tx:tx + TILE].reshape(TILE * TILE, -1)
            q = (t[:, :3].astype(np.uint16) >> 3) @ np.array([1, 32, 1024], dtype=np.uint16)
            vals, cnt = np.unique(q, return_counts=True)
            shares.append(cnt.max() / q.size); detail.append(1 - cnt.max() / q.size)
    return round(float(np.mean(shares)), 3), round(float(np.mean(detail)) * 100, 1)

def sprite_contrast(a, st):
    hx, hy = st['hero']; cx, cy = st['cam']
    x, y = hx - cx - 20, hy - cy - 30
    H, W = a.shape[:2]
    x = max(0, min(W - 41, x)); y = max(0, min(H - 41, y))   # کلمپ داخل کادر (قهرمان ممکن است لبه باشد)
    box = a[y:y + 40, x:x + 40]; L = lum(box)
    ring = np.concatenate([L[:6].ravel(), L[-6:].ravel(), L[:, :6].ravel(), L[:, -6:].ravel()])
    bg = float(np.median(ring))
    top = float(np.percentile(L, 97))
    return {'bgL': round(bg, 1), 'sprL': round(top, 1), 'dL': round(top - bg, 1)}

def ground_period(a, camx, camy):
    # انرژی تفاضل ردیف‌ها روی نوار مرکزی → خودهمبستگی → دوره‌ی غالب (باید ۱۶ = بدون پرسپکتیو باشد)
    L = lum(a)
    h, w = L.shape
    strip = L[h // 3:h // 3 + 120, w // 4:3 * w // 4]
    if strip.shape[0] < 40: return None
    d = np.abs(np.diff(strip, axis=0)).mean(axis=1); d = d - d.mean()
    ac = np.correlate(d, d, 'full')[len(d) - 1:]
    ac = ac / (ac[0] + 1e-9)
    win = ac[6:40]
    return int(np.argmax(win) + 6) if len(win) else None

def aa_share(a):
    # سهم پیکسل‌هایی با گرادیان نرم (۱..۱۲) — نشانی از AA/بلور در برابر پله‌ی تیز پیکسل‌آرت
    L = lum(a); gx = np.abs(np.diff(L, axis=1));
    soft = ((gx > 0.5) & (gx < 12)).mean()
    hard = (gx >= 12).mean()
    return {'soft%': round(float(soft) * 100, 2), 'hard%': round(float(hard) * 100, 2)}

AUD = {}
for name, s in M['shots'].items():
    p = os.path.join(ROOT, s['raw']['file'])
    im = Image.open(p).convert('RGB'); st = s['state']
    sc = 1  # p0_raw_* = رستر صحنه (قبلاً dump بوم بود و /scale می‌شد)
    im2 = im.resize((im.width // sc, im.height // sc), Image.NEAREST)   # رستر پیکسل‌دقیق
    vh = st['view']['h'] if name.startswith('farm') or name.startswith('dungeon') or name.startswith('battle') or name.startswith('boss') else im2.height
    im2 = im2.crop((0, 0, min(im2.width, st['view']['w']), min(im2.height, vh)))  # فقط ناحیه‌ی بازی (بدون باند داک)
    im2.save(os.path.join(SH, 'p0_scene_%s.png' % name))
    a = np.asarray(im2).astype(np.float32)
    L = lum(a)
    q = (a.astype(np.uint16) >> 2) @ np.array([1, 64, 4096], dtype=np.uint16)
    vals, cnt = np.unique(q, return_counts=True)
    exact = len(np.unique(a.reshape(-1, 3), axis=0))
    hsv = np.asarray(Image.fromarray(a.astype(np.uint8)).convert('HSV')).astype(np.float32)
    hh, _ = np.histogram(hsv[:, :, 0], bins=12, range=(0, 256), weights=hsv[:, :, 1])
    flat, detail = tile_flat(a, st['cam'][0], st['cam'][1])
    AUD[name] = {
        'size': [im2.width, im2.height], 'scale': sc,
        'colors_exact': int(exact), 'colors_q4': int(len(vals)),
        'meanL': round(float(L.mean()), 1), 'stdL': round(float(L.std()), 1),
        'dark%': round(float((L < 40).mean()) * 100, 1), 'bright%': round(float((L > 210).mean()) * 100, 1),
        'bloom%': round(float(((L > 232) & (hsv[:, :, 1] > 110)).mean()) * 100, 2),
        'sat': round(float(hsv[:, :, 1].mean()), 1),
        'hue_dom%': round(float(hh.max() / max(1, hh.sum())) * 100, 1),
        'edge_bands': band_edge(L), 'tile_flat': flat, 'detail%/tile': detail,
        'sprite': sprite_contrast(a, st), 'ground_period_px': ground_period(a, st['cam'][0], st['cam'][1]),
        'aa': aa_share(a),
    }

json.dump(AUD, open(os.path.join(SH, 'p0_audit.json'), 'w'), indent=1, ensure_ascii=False)

# ---------- شیت قبل/بعد (baseline) ----------
Z = 2
PW = 195 * Z
PANELS = [('farm_day', 'FARM / DAY', 'farm_day'), ('farm_night', 'FARM / NIGHT', 'farm_night'),
          ('farm_rain', 'FARM / RAIN', 'farm_rain'), ('farm_dusk', 'FARM / DUSK', 'farm_dusk'),
          ('dungeon_f1', 'DUNGEON F1', 'dungeon_f1'), ('battle_f1', 'BATTLE F1', 'battle_f1')]
UI_ROW = ['farm_day', 'farm_night', 'dungeon_f1', 'boss_f10']
COLS, GAP = 3, 14
HEAD, CAP = 84, 58

panels = []
for key, lab, bk in PANELS:
    im = Image.open(os.path.join(SH, 'p0_scene_%s.png' % key)).convert('RGB')
    im = im.resize((im.width * Z, im.height * Z), Image.NEAREST)
    panels.append((lab, im, bk, key))
ph = max(p[1].height for p in panels)
ui = []
for key in UI_ROW:
    fp = os.path.join(SH, 'p0_full_%s.png' % key)
    if os.path.exists(fp):
        im = Image.open(fp).convert('RGB')
        ui.append((key.upper().replace('_', ' '), im.resize((205, int(im.height * 205 / im.width)), Image.LANCZOS)))
uh = max(u[1].height for u in ui) if ui else 0

# زوم ۳× از جزئیات آرت (دو کراپ از رستر واقعی) — قضاوت آیتم ۴ و ۵
zooms = []
for key, cx0, cy0 in [('farm_day', 92, 196), ('dungeon_f1', 76, 108)]:
    im = Image.open(os.path.join(SH, 'p0_scene_%s.png' % key)).convert('RGB')
    c = im.crop((cx0, cy0, cx0 + 64, cy0 + 64)).resize((64 * 3, 64 * 3), Image.NEAREST)
    zooms.append((key, c))
zh = zooms[0][1].height

rows = (len(panels) + COLS - 1) // COLS
TEXT_H = 350
W = COLS * PW + (COLS + 1) * GAP
H = HEAD + rows * (ph + CAP + GAP) + zh + 116 + (uh + 30 if ui else 0) + TEXT_H + GAP
sheet = Image.new('RGB', (W, H), (14, 12, 22)); dr = ImageDraw.Draw(sheet)
f1 = ImageFont.truetype(FONT_B, 26); f2 = ImageFont.truetype(FONT_B, 15); f3 = ImageFont.truetype(FONT_M, 13); f4 = ImageFont.truetype(FONT_B, 14)

dr.text((GAP, 16), 'FARM & DUNGEON  -  PHASE 0 BASELINE  (CPU 2D renderer, no GPU pipeline yet)', font=f1, fill=(242, 202, 92))
dr.text((GAP, 52), 'every panel = real gameplay frame from headless Chromium + SwiftShader WebGL2  ·  scene raster %dx%d scaled x%d nearest' % (
    AUD['farm_day']['size'][0], AUD['farm_day']['size'][1], Z), font=f3, fill=(168, 162, 190))

y0 = HEAD
for i, (lab, im, bk, key) in enumerate(panels):
    cx = GAP + (i % COLS) * (PW + GAP); cy = y0 + (i // COLS) * (ph + CAP + GAP)
    sheet.paste(im, (cx, cy))
    dr.rectangle([cx - 1, cy - 1, cx + im.width, cy + im.height], outline=(48, 44, 70))
    dr.text((cx + 2, cy + im.height + 6), lab, font=f2, fill=(150, 225, 255))
    b = M['bench'].get(bk)
    if b:
        dr.text((cx + 2, cy + im.height + 25), 'cpu %.2f ms/f @%dx%d' % (b['up'] + b['rn'] + b['pr'], b['view'][0], b['view'][1]), font=f3, fill=(214, 208, 230))
        dr.text((cx + 2, cy + im.height + 40), 'up %.2f + render %.2f + present %.2f' % (b['up'], b['rn'], b['pr']), font=f3, fill=(168, 164, 190))

y1 = y0 + rows * (ph + CAP + GAP) + 24
dr.text((GAP, y1 - 22), 'ART ZOOM x3 (tile flatness + sprite ramp, checklist 4 & 5):', font=f4, fill=(242, 202, 92))
for i, (key, c) in enumerate(zooms):
    x = GAP + i * (c.width + 24)
    sheet.paste(c, (x, y1)); dr.rectangle([x - 1, y1 - 1, x + c.width, y1 + c.height], outline=(48, 44, 70))
    dr.text((x + 2, y1 + c.height + 4), key, font=f3, fill=(170, 200, 235))

y2 = y1 + zh + 40
if ui:
    dr.text((GAP, y2 - 22), 'UI / FULL SCREEN (glass + dock, checklist 7):', font=f4, fill=(242, 202, 92))
    x = GAP
    for lab, im in ui:
        sheet.paste(im, (x, y2)); dr.rectangle([x - 1, y2 - 1, x + im.width, y2 + im.height], outline=(48, 44, 70))
        dr.text((x + 2, y2 + im.height + 4), lab, font=f3, fill=(170, 200, 235)); x += im.width + 12

y3 = H - TEXT_H - GAP
dr.text((GAP + 2, y3), 'OCTOPATH IDENTITY CHECKLIST  -  honest baseline score (0-10):', font=f2, fill=(242, 202, 92))
lines = [
    ('1  diorama camera: perspective ground + billboards', 0, 'orthographic; ground row autocorrelation = %d px, no vertical depth' % AUD['farm_day']['ground_period_px']),
    ('2  tilt-shift DOF: blurred top/bottom, sharp middle', 0, 'uniform sharpness; per-band edge %s (top/mid/bottom)' % (AUD['farm_day']['edge_bands'],)),
    ('3  colored light, bloom, god-rays, soft AO', 1, 'bloom %.2f%%; flat blue night tint + radial alpha "light stamp"; no soft shadow/AO' % AUD['farm_day']['bloom%']),
    ('4  sprites: 4-5 step hue-shifted ramp, sel-out, rim', 3, '3-step ramp, no hue shift, uniform 1px outline; hero contrast dL %.0f' % ((AUD['farm_day']['sprite'] or {}).get('dL', 0))),
    ('5  tilesets: 47-blob transitions, detail, props', 3, '4 variants + border tiles; single-color share/tile %.2f farm, %.2f dungeon' % (AUD['farm_day']['tile_flat'], AUD['dungeon_f1']['tile_flat'])),
    ('6  living world: wind, water, particles, weather', 2, 'water 4-frame cycle, rain, 2 birds; no wind/dust/fireflies/motes'),
    ('7  UI: glass panels, 9-slice, motion, RTL preserved', 4, 'dark flat panels, sharp corners, no blur/9-slice; RTL + fa font OK'),
]
for i, (t, sc, why) in enumerate(lines):
    yy = y3 + 26 + i * 30
    dr.text((GAP + 2, yy), '%s' % t, font=f3, fill=(236, 232, 246))
    dr.text((GAP + 445, yy), '.... %d/10' % sc, font=f3, fill=(255, 214, 110))
    dr.text((GAP + 535, yy), why, font=f3, fill=(148, 205, 168))
yy = y3 + 26 + len(lines) * 30 + 10
dr.text((GAP + 2, yy), 'TOTAL %d/70  (mean %.1f/10)   |   colors (6-bit quantized) farm %d / dungeon %d / boss %d   |   farm meanL %.0f  dark %s%%  bright %s%%  sat %.0f' % (
    sum(x[1] for x in lines), sum(x[1] for x in lines) / 7,
    AUD['farm_day']['colors_q4'], AUD['dungeon_f1']['colors_q4'], AUD['boss_f10']['colors_q4'],
    AUD['farm_day']['meanL'], AUD['farm_day']['dark%'], AUD['farm_day']['bright%'], AUD['farm_day']['sat']), font=f3, fill=(190, 235, 195))
dr.text((GAP + 2, yy + 18), 'RAF in headless SwiftShader (proxy, NOT a phone): farm med %.1f p95 %.1f  ·  dungeon med %.1f p95 %.1f  ·  boss med %.1f ms' % (
    M['raf_farm']['med'], M['raf_farm']['p95'], M['raf_dungeon']['med'], M['raf_dungeon']['p95'], M['raf_boss']['med']), font=f3, fill=(190, 235, 195))
_ff = [round(sum(M['bench'][k][x] for x in ('up', 'rn', 'pr')), 2) for k in ('farm_day', 'farm_night', 'farm_rain', 'dungeon_f1', 'battle_f1', 'boss_f10')]
dr.text((GAP + 2, yy + 36), 'CPU frame (update+render+present) @195x349: farm day %.2f / night %.2f / rain %.2f / dungeon %.2f / battle %.2f / boss %.2f ms   -   target budget 8 ms' % tuple(_ff), font=f3, fill=(190, 235, 195))
dr.text((GAP + 2, yy + 54), 'verdict: 13/70 = 1.9/10 - clean flat 2D pixel art; structurally far from HD-2D (camera, depth, light, post, UI glass missing)', font=f3, fill=(255, 170, 150))
sheet.save(os.path.join(SH, 'p0_baseline_sheet.png'))
print('sheet -> shots/p0_baseline_sheet.png', sheet.size)
