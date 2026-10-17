# -*- coding: utf-8 -*-
"""Deep structural analysis of the actual rendered card (01) + _full + 09-settings."""
import sys, io
import numpy as np
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
S = r"E:\opencode项目\DSH自制天气插件\dsh-weather-island\shots"

img = np.asarray(Image.open(f"{S}\\01-dark-sunny.png").convert("RGB"), dtype=np.float64)
H, W = img.shape[:2]

# ---- 1. card bounds: find columns where content differs from black bg
col_has = (np.abs(img - img[:, :5, :].mean(axis=1, keepdims=True)).sum(axis=2) > 24).sum(axis=0)
xs = np.where(col_has > 8)[0]
print(f"content x-range: {xs.min()}..{xs.max()} (W={W})")
row_has = (np.abs(img - img[:5, :, :].mean(axis=0, keepdims=True)).sum(axis=2) > 24).sum(axis=1)
ys = np.where(row_has > 8)[0]
print(f"content y-range: {ys.min()}..{ys.max()} (H={H})")

L, R = xs.min(), xs.max() + 1
T, B = ys.min(), ys.max() + 1
card = img[T:B, L:R, :]

# ---- 2. row profile: mean luminance & saturation per row (find sections)
def lum(px):
    c = px / 255.0
    c = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126*c[...,0] + 0.7152*c[...,1] + 0.0722*c[...,2]

cl = lum(card)
mx = card.max(axis=2); mn = card.min(axis=2)
sat = (mx - mn) / (mx + 1e-6)

print("\nrow profile (grouped every 20px): y, meanlum, meansat, maxlum(text), minlum")
for y in range(0, B-T, 20):
    seg = cl[y:y+20]; sseg = sat[y:y+20]
    print(f"  y={T+y:3d}: lum={seg.mean():.3f} sat={sseg.mean():.3f} max={seg.max():.3f} min={seg.min():.3f}")

# ---- 3. text-pixel map (high local contrast) per row → find text bands & check horizontal overflow
bright = cl > 0.55   # bright text/glyphs
print("\ntext rows (bright pixel counts per 10px row):")
rows = bright.sum(axis=1)
for y in range(0, B-T, 10):
    n = rows[y:y+10].sum()
    if n > 30:
        # horizontal extent of bright pixels in this band
        band = bright[y:y+10]
        cols = np.where(band.any(axis=0))[0]
        print(f"  y={T+y:3d}-{T+y+10:3d}: n={int(n):5d} x[{L+cols.min():3d}..{L+cols.max():3d}] gapL={cols.min()} gapR={R-L-1-cols.max()}")

# ---- 4. edge clipping check: bright text within 3px of card inner edges
print(f"\ncard inner bounds: x[{L}..{R-1}] y[{T}..{B-1}]")
for side, arr in [("left-edge", bright[:, :4]), ("right-edge", bright[:, -4:]), ("top-edge", bright[:4, :]), ("bottom-edge", bright[-4:, :])]:
    print(f"  bright pixels at {side}: {int(arr.sum())}")

# ---- 5. color semantic checks over the whole capture
r, g, b = card[...,0], card[...,1], card[...,2]
redmask = (r > g*1.6) & (r > b*1.6) & (r > 90)          # error red/pink
greenmask = (g > r*1.25) & (g > b*1.25) & (g > 120)    # success / AQI good
warmmask = (r > 140) & (r > b*1.5) & (g > 60)          # warm sun
print(f"\nred-ish px: {int(redmask.sum())}  green-ish px: {int(greenmask.sum())}  warm px: {int(warmmask.sum())}")
if redmask.sum(): 
    yy, xx = np.where(redmask)
    print(f"  red region bbox x[{L+xx.min()}..{L+xx.max()}] y[{T+yy.min()}..{T+yy.max()}]")
if greenmask.sum():
    yy, xx = np.where(greenmask)
    print(f"  green region bbox x[{L+xx.min()}..{L+xx.max()}] y[{T+yy.min()}..{T+yy.max()}]")
if warmmask.sum():
    yy, xx = np.where(warmmask)
    print(f"  warm region bbox x[{L+xx.min()}..{L+xx.max()}] y[{T+yy.min()}..{T+yy.max()}]")

# ---- 6. star specks (02 should have): tiny isolated bright dots on dark bg outside text
outside = img.copy()
outside[T:B, L:R, :] = 0
specks = (lum(outside) > 0.35).sum()
print(f"\nbright specks OUTSIDE card (stars?): {int(specks)}")

# ---- 7. sample distinctive colors: temperature gradient (find brightest large glyphs)
big = cl > 0.75
yy, xx = np.where(big)
if len(yy):
    print(f"\nbrightest glyph pixels bbox: x[{L+xx.min()}..{L+xx.max()}] y[{T+yy.min()}..{T+yy.max()}] count={len(yy)}")
    # sample colors of these
    cols = set()
    for i in range(0, len(yy), max(1, len(yy)//12)):
        y_, x_ = yy[i], xx[i]
        px = tuple(card[y_, x_].astype(int))
        cols.add(px)
    print("  sample bright glyph colors:", sorted(cols))
