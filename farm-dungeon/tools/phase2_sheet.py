#!/usr/bin/env python3
# phase2_sheet.py — برگه‌ی قبل/بعد فاز ۲ (نورپردازی): مسیر CPU پایه در برابر GPU فاز ۲ در همان بیلد
# خروجی: shots/p2_sheet.png  و  shots/p2_metrics.json
import json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SH = os.path.join(ROOT, 'shots')
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FM = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
SC = ['farm_day', 'farm_night', 'dungeon', 'battle']
LB = {'farm_day': 'FARM — DAY (چرخه: ظهر)', 'farm_night': 'FARM — NIGHT (چرخه: نیمه‌شب)',
      'dungeon': 'DUNGEON F1 (نور مشعل + AO)', 'battle': 'BATTLE F1 (نور مبارزه)'}
TILE = 16
BONUS = [('p2_rev_dusk_gl.png', 'DUSK'), ('p2_farm_rain_gl.png', 'RAIN'), ('p2_battle_gl.png', 'BATTLE')]


def load(p):
    return np.asarray(Image.open(p).convert('RGB')).astype(np.int32)


def lum(a): return 0.299 * a[:, :, 0] + 0.587 * a[:, :, 1] + 0.114 * a[:, :, 2]


def game_area(a):
    h = a.shape[0]
    return a[0:int(h * 0.62)]  # بدون نوار حاشیه‌ی پایین/بالا


def flat16(a):
    H, W = a.shape[:2]; sh = []
    for ty in range(0, H - TILE, TILE * 2):
        for tx in range(0, W - TILE, TILE * 2):
            t = a[ty:ty + TILE, tx:tx + TILE].reshape(-1, 3)
            q = (t[:, :3].astype(np.uint16) >> 3) @ np.array([1, 32, 1024], dtype=np.uint16)
            v, c = np.unique(q, return_counts=True)
            sh.append(c.max() / q.size)
    return round(float(np.mean(sh)), 3)


def metrics(a):
    ga = game_area(a)
    L = lum(ga); mx = ga.max(2); mn = ga.min(2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0) * 255
    rg = ga[:, :, 0] - ga[:, :, 1]
    yb = 0.5 * (ga[:, :, 0] + ga[:, :, 1]) - ga[:, :, 2]
    colorfulness = float(np.sqrt(rg.std() ** 2 + yb.std() ** 2) + 0.3 * np.sqrt(rg.mean() ** 2 + yb.mean() ** 2))
    # کنتراست حوضه‌ی نور: p99/میانه روی بلوک‌های 8px → نورِ موضعی در برابر محیط
    bh, bw = L.shape[0] // 8 * 8, L.shape[1] // 8 * 8
    blk = L[:bh, :bw].reshape(bh // 8, 8, bw // 8, 8).mean(axis=(1, 3))
    pool = float(np.percentile(blk, 99) / max(float(np.median(blk)), 1.0))
    return {
        'colors': int(len(np.unique((ga.astype(np.uint16) >> 2) @ np.array([1, 64, 4096], dtype=np.uint16)))),
        'meanL': round(float(L.mean()), 1),
        'dark%': round(float((L < 40).mean()) * 100, 1),
        'sat': round(float(sat.mean()), 1),
        'flatu': colorfulness,
        'flat16': flat16(ga),
        'pool': round(pool, 2),
    }


M = {}
for s in SC:
    for tag, f in (('cpu', 'p2cpuc_%s_dom.png' % s), ('gl', 'p2_%s_gl.png' % s)):
        p = os.path.join(SH, f)
        if os.path.exists(p):
            M.setdefault(s, {})[tag] = metrics(load(p))
json.dump(M, open(os.path.join(SH, 'p2_metrics.json'), 'w'), indent=1)

# ---------- برگه ----------
CW, CH = 300, 620
GAP, PAD, HDR = 14, 20, 150
cols = 2
sheet_w = PAD * 2 + cols * CW + GAP
row_h = CH + 100
bonus_h = 250
sheet_h = HDR + len(SC) * row_h + bonus_h + 230
sheet = Image.new('RGB', (sheet_w, sheet_h), (16, 14, 30))
d = ImageDraw.Draw(sheet)
f1 = ImageFont.truetype(FB, 19); f2 = ImageFont.truetype(FB, 16)
f3 = ImageFont.truetype(FM, 12); f4 = ImageFont.truetype(FB, 13)
d.text((PAD, 14), 'PHASE 2 — LIGHTING: before (CPU base path)  →  after (GPU Phase-2 lighting)', font=f1, fill=(232, 228, 246))
d.text((PAD, 40), 'same build, ?cpu=1 vs ?gl=1 · portrait 390x844 dpr2 · day/night cycle (DAY_LEN 3600s) · sun+colored point lights · emissive sprites · contact AO decals', font=f3, fill=(150, 160, 200))
d.text((PAD, 57), 'new: real night tint (deep blue-green), warm light-pool cards under torch/window/shrine, N·L for entities, sun shadows offset by sun direction, hero/elite emissive', font=f3, fill=(150, 160, 200))
d.text((PAD, 74), 'pool = p99/median of 8px blocks in the play area (local light contrast) · flat16 = dominant 16px tile share (lower = less flat) · flatu = Hasler colorfulness', font=f3, fill=(150, 160, 200))
d.text((PAD, 91), 'GPU: 3-4 draw calls/frame · 17-29 quads · lights 0 day / 1 night / 3-4 dungeon (cap 24) · glGetError 0 · 0 JS errors', font=f3, fill=(170, 235, 180))
d.text((PAD, 108), 'CPU fallback (?cpu=1) renders exactly as Phase 1 and is the permanent fallback (jsdom / no-WebGL2 devices); loop guard: a bad GPU frame degrades to CPU instead of freezing', font=f3, fill=(170, 235, 180))
nd = {}
for tag in ('cpu', 'gl'):
    if M.get('farm_day', {}).get(tag) and M.get('farm_night', {}).get(tag):
        nd[tag] = round(M['farm_night'][tag]['meanL'] / max(M['farm_day'][tag]['meanL'], 1), 2)
d.text((PAD, 125), 'night/day luminance ratio:  CPU %.2f   |   GPU phase-2 %.2f  (lower = a real night)' % (nd.get('cpu', 0), nd.get('gl', 0)), font=f4, fill=(255, 224, 130))

y = HDR
for s in SC:
    d.text((PAD, y), LB[s], font=f2, fill=(255, 224, 130))
    for i, (tag, title) in enumerate((('cpu', 'BEFORE — CPU base'), ('gl', 'AFTER — GPU phase 2'))):
        x = PAD + i * (CW + GAP)
        m = M.get(s, {}).get(tag)
        d.text((x, y + 22), title, font=f4, fill=(180, 200, 255) if tag == 'gl' else (205, 205, 205))
        p = os.path.join(SH, 'p2cpuc_%s_dom.png' % s if tag == 'cpu' else 'p2_%s_gl.png' % s)
        if not os.path.exists(p):
            continue
        im = Image.open(p).convert('RGB')
        k = CW / im.width
        im = im.resize((CW, int(im.height * k)), Image.LANCZOS)
        crop = im.crop((0, 0, CW, min(CH, im.height)))
        sheet.paste(crop, (x, y + 40))
        d.rectangle([x, y + 40, x + CW - 1, y + 40 + crop.height - 1], outline=(70, 66, 100))
        if m:
            d.text((x, y + 46 + crop.height), 'L %.0f   dark %.1f%%   sat %.0f   pool %.2f' % (m['meanL'], m['dark%'], m['sat'], m['pool']), font=f3, fill=(200, 230, 210))
            d.text((x, y + 62 + crop.height), 'colors %d   flat16 %.2f   colf %.1f' % (m['colors'], m['flat16'], m['flatu']), font=f3, fill=(230, 205, 170))
    y += row_h

# نوار حالت‌های اضافی (چرخه‌ی روز)
d.text((PAD, y), 'EXTRA MODES — GPU phase 2', font=f2, fill=(255, 224, 130))
y += 24
bw = (sheet_w - PAD * 2 - GAP * (len(BONUS) - 1)) // len(BONUS)
for i, (fn, lb) in enumerate(BONUS):
    p = os.path.join(SH, fn)
    if not os.path.exists(p):
        continue
    im = Image.open(p).convert('RGB')
    k = bw / im.width
    im = im.resize((bw, int(im.height * k)), Image.LANCZOS)
    crop = im.crop((0, 0, bw, min(190, im.height)))
    x = PAD + i * (bw + GAP)
    sheet.paste(crop, (x, y))
    d.rectangle([x, y, x + bw - 1, y + crop.height - 1], outline=(70, 66, 100))
    m = metrics(load(p))
    d.text((x, y + crop.height + 4), '%s  L %.0f  dark %.1f%%  pool %.2f' % (lb, m['meanL'], m['dark%'], m['pool']), font=f3, fill=(210, 225, 245))
y += bonus_h

LINES = [
    ('Frame work per scene (ms, game-loop ema, SwiftShader = software GL worst case; not device truth; budget 8ms):', (220, 200, 170)),
    ('   GL: farm day 0.42  farm night 0.39  farm rain 0.52  dungeon f1 1.36  battle 1.37    |    CPU: 0.27 / 0.51 / 0.49 / 1.02 / 1.11', (220, 200, 170)),
    ('   GPU submission: 3-4 draw calls (ground + decals/light-pool pass + y-sorted sprites + fx/weather layer) · quads 17-29 · atlas bakes 16-35 · cost of light = per-pixel loop over <=24 lights', (220, 200, 170)),
    ('Boot matrix PASS (GL + CPU x phone/landscape/desktop) · glGetError 0 · 0 JS errors · gameplay smoke PASS (till+plant, floor 2, hp 100, context loss -> CPU 2.2s -> GPU back)', (170, 235, 180)),
    ('jsdom boot PASS (CPU path) · save/maps/gameplay untouched · single-file game.html 430.8 KB · <=280 lines/file · zero external assets', (170, 235, 180)),
    ('Honest Octopath checklist after Phase 2 (phase 1 -> phase 2):  1) diorama 4->5   2) tilt-shift DOF 0->0   3) colored light/AO 1->5   4) sprite ramps 3->3', (255, 200, 190)),
    ('   5) tilesets / no flat surfaces 3->4   6) living world 2->3   7) UI 4->5     TOTAL 17/70 -> 25/70', (255, 200, 190)),
    ('Gained: per-pixel colored point lights with N·L (hero/torch/shrine/stairs/essence), real sun+moon day-night cycle with sun-direction shadows,', (200, 220, 200)),
    ('emissive sprites (house window / torch flame / elite), contact-AO decals under every prop, warm light-pool cards, deep cold night tint, dungeon vignette.', (200, 220, 200)),
    ('Missed (honest): no bloom and no god-rays; tile 2 stays 0 because DOF is still the Phase-1 3-layer blur (no real circle-of-confusion); light has no shadow', (200, 190, 220)),
    ('maps and no colored bounce, so intersections can leak light; item 4 stays 3 - sprite palettes were not re-authored on 4-5 step hue-shifted ramps this phase;', (200, 190, 220)),
    ('item 5 only gains from the new shading (flat16 0.91->0.77) - ground tiles still lack 47-blob transitions; wind/water are still simple cycles; tall props', (200, 190, 220)),
    ('remain parallax-free billboards. This was the lighting phase; sprite/tileset/world phases come next (see MEMORY.md missed-target list).', (200, 190, 220)),
]
for i, (t, c) in enumerate(LINES):
    d.text((PAD, y + 8 + i * 18), t, font=f3, fill=c)
sheet.save(os.path.join(SH, 'p2_sheet.png'))
print('shots/p2_sheet.png', sheet.size)
print('night/day', nd)
