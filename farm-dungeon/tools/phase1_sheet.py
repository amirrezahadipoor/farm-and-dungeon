#!/usr/bin/env python3
# phase1_sheet.py — برگه‌ی قبل/بعد فاز ۱ + متریک‌های مقایسه‌ای (CPU ۱:۱ در برابر WebGL2 دیوراما)
# خروجی: shots/p1_sheet.png  و  shots/p1_metrics1.json
import json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SH = os.path.join(ROOT, 'shots')
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FM = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
SC = ['farm_day', 'farm_night', 'farm_rain', 'dungeon', 'battle']
LB = {'farm_day': 'FARM DAY', 'farm_night': 'FARM NIGHT', 'farm_rain': 'FARM RAIN (weather layer)', 'dungeon': 'DUNGEON F1', 'battle': 'BATTLE F1'}
TILE = 16

def load(p):
    im = Image.open(p).convert('RGB')
    return np.asarray(im).astype(np.int32)

def lum(a): return 0.299 * a[:, :, 0] + 0.587 * a[:, :, 1] + 0.114 * a[:, :, 2]

def flat16(a):
    H, W = a.shape[:2]; sh = []
    for ty in range(0, H - TILE, TILE * 2):
        for tx in range(0, W - TILE, TILE * 2):
            t = a[ty:ty + TILE, tx:tx + TILE].reshape(-1, 3)
            q = (t[:, :3].astype(np.uint16) >> 3) @ np.array([1, 32, 1024], dtype=np.uint16)
            v, c = np.unique(q, return_counts=True)
            sh.append(c.max() / q.size)
    return round(float(np.mean(sh)), 3)

def ground_period(a, y0f=0.25, y1f=0.55):
    # دوره‌ی غالب ردیف‌ها در یک نوار افقی → ۱۶ = بدون پرسپکتیو، کمتر = فشردگی دور
    L = lum(a); h, w = L.shape
    strip = L[int(h * y0f):int(h * y1f), w // 4:3 * w // 4]
    if strip.shape[0] < 40: return None
    d = np.abs(np.diff(strip, axis=0)).mean(axis=1); d = d - d.mean()
    ac = np.correlate(d, d, 'full')[len(d) - 1:]; ac = ac / (ac[0] + 1e-9)
    win = ac[5:40]
    return int(np.argmax(win) + 5) if len(win) else None

def metrics(a):
    L = lum(a); mx = a.max(2); mn = a.min(2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0) * 255
    q = (a.astype(np.uint16) >> 2) @ np.array([1, 64, 4096], dtype=np.uint16)
    return {
        'colors': int(len(np.unique(q))),
        'meanL': round(float(L.mean()), 1),
        'dark%': round(float((L < 40).mean()) * 100, 1),
        'bright%': round(float((L > 210).mean()) * 100, 1),
        'sat': round(float(sat.mean()), 1),
        'flat16': flat16(a),
        'period_top': ground_period(a, 0.06, 0.30),
        'period_mid': ground_period(a, 0.35, 0.60),
        'period_bot': ground_period(a, 0.66, 0.92),
    }

M = {}
for s in SC:
    for tag, f in (('cpu', 'p1c_%s_dom.png' % s), ('gl', 'p1_%s_dom.png' % s)):
        p = os.path.join(SH, f)
        if os.path.exists(p):
            M.setdefault(s, {})[tag] = metrics(load(p))
json.dump(M, open(os.path.join(SH, 'p1_metrics1.json'), 'w'), indent=1)

# ---------- برگه ----------
CW, CH = 316, 640          # اندازه‌ی هر عکس در برگه
GAP, PAD, HDR = 16, 22, 118
cols = 2
sheet_w = PAD * 2 + cols * CW + GAP
row_h = CH + 96
sheet_h = HDR + len(SC) * row_h + 190
sheet = Image.new('RGB', (sheet_w, sheet_h), (18, 15, 33))
d = ImageDraw.Draw(sheet)
f1 = ImageFont.truetype(FB, 19); f2 = ImageFont.truetype(FB, 16)
f3 = ImageFont.truetype(FM, 12); f4 = ImageFont.truetype(FB, 13)
d.text((PAD, 16), 'PHASE 1 — HD-2D renderer: before (CPU 1:1)  →  after (WebGL2 diorama)', font=f1, fill=(230, 226, 245))
d.text((PAD, 42), 'same build, ?cpu=1 vs ?gl=1 · portrait 390x844 dpr2 · ground = textured tilted plane, props = y-sorted upright billboards', font=f3, fill=(150, 160, 200))
d.text((PAD, 60), 'period = dominant row period of the ground (16 = flat/no perspective, <16 = foreshortened rows)', font=f3, fill=(150, 160, 200))
d.text((PAD, 78), 'GPU: 2-4 draw calls/frame (ground + sprite batch + fx layer + weather layer) · atlas bakes ~23 · glGetError = 0 · 0 JS errors', font=f3, fill=(170, 235, 180))
d.text((PAD, 96), 'CPU fallback (?cpu=1) still boots and renders exactly like Phase 0 — used by jsdom / devices without WebGL2', font=f3, fill=(170, 235, 180))

y = HDR
for s in SC:
    d.text((PAD, y), LB[s], font=f2, fill=(255, 224, 130))
    for i, (tag, title) in enumerate((('cpu', 'BEFORE — CPU path'), ('gl', 'AFTER — GPU diorama'))):
        x = PAD + i * (CW + GAP)
        m = M.get(s, {}).get(tag)
        d.text((x, y + 22), title, font=f4, fill=(180, 200, 255) if tag == 'gl' else (205, 205, 205))
        p = os.path.join(SH, 'p1c_%s_dom.png' % s if tag == 'cpu' else 'p1_%s_dom.png' % s)
        if not os.path.exists(p):
            continue
        im = Image.open(p).convert('RGB')
        k = CW / im.width
        im = im.resize((CW, int(im.height * k)), Image.LANCZOS)
        crop = im.crop((0, 0, CW, min(CH, im.height)))
        sheet.paste(crop, (x, y + 40))
        d.rectangle([x, y + 40, x + CW - 1, y + 40 + crop.height - 1], outline=(70, 66, 100))
        if m:
            d.text((x, y + 46 + crop.height), 'col %d  L %.0f  dark %.1f%%  sat %.0f' % (m['colors'], m['meanL'], m['dark%'], m['sat']), font=f3, fill=(200, 230, 210))
            d.text((x, y + 62 + crop.height), 'flat16 %.2f   ground period %s/%s/%s  (top/mid/bot)' % (m['flat16'], m['period_top'], m['period_mid'], m['period_bot']), font=f3, fill=(230, 205, 170))
    y += row_h

y += 2
LINES = [
  ('Frame work per scene (ms, game-loop ema on a quiet window; the GPU path runs on SwiftShader here, so these are RELATIVE, not device truth):', (220, 200, 170)),
  ('   farm day 0.30 -> 0.36   farm night 0.54 -> 0.27   farm rain 0.48 -> 0.35   dungeon f1 0.91 -> 0.92   battle 0.96 -> 0.84   [CPU -> GPU, run-to-run noise +-0.1ms]', (220, 200, 170)),
  ('GPU submission: 2-4 draw calls/frame (ground plane + sprite batch + fx layer + weather layer) - 5-17 quads - lights <=24 (4 visible in dungeon)', (220, 200, 170)),
  ('   atlas bakes 21-23 - 2048x2048 atlas - single dynamic ground texture tied to the visible frame - subpixel camera (loop-consistent rounding, no jitter)', (220, 200, 170)),
  ('Boot matrix PASS: GPU + CPU x phone/landscape/desktop - glGetError 0 - 0 JS errors - tap moves hero (dx 16-32px) - inverse-camera worst error 0.0px', (170, 235, 180)),
  ('Gameplay smoke PASS (?gl=1): real command -> walk 238px -> till -> plant (soil+crop appear) - dungeon: reach enemy, skill, floor 2, hp 100 - 0 errors', (170, 235, 180)),
  ('WebGL2 context-loss PASS: lose -> auto-fallback to CPU path (no crash, no error) -> restore -> GPU path back within ~1.5s (polled re-init)', (170, 235, 180)),
  ('   jsdom / WebGL2-less devices keep the Phase-0 CPU renderer (?cpu=1 renders identically) - save/gameplay/maps untouched', (170, 235, 180)),
  ('Honest Octopath checklist after Phase 1:  1) diorama 4   2) tilt-shift DOF 0   3) light/bloom/AO 1   4) sprite ramps 3   5) tilesets 3   6) living world 2   7) UI 4   = 17/70', (255, 200, 190)),
  ('Missed: light is screen-space & shared by the whole batch (no per-sprite occlusion), no AO, no bloom/DOF, sprites not re-authored on 4-5 step ramps,', (200, 190, 220)),
  ('ground tiles still lack 47-blob transitions; tall props are billboards (parallax-free) by design of this phase.', (200, 190, 220)),
]
for i, (t, c) in enumerate(LINES):
    d.text((PAD, y + i * 18), t, font=f3, fill=c)
sheet.save(os.path.join(SH, 'p1_sheet.png'))
print('shots/p1_sheet.png', sheet.size)
sheet.save(os.path.join(SH, 'p1_sheet.png'))
print('shots/p1_sheet.png', sheet.size)
