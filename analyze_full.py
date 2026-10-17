# -*- coding: utf-8 -*-
"""Analyze _full.png structure and what lies right of x=436 in 01."""
import sys, io
import numpy as np
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
S = r"E:\opencode项目\DSH自制天气插件\dsh-weather-island\shots"

def lum(px):
    c = px / 255.0
    c = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126*c[...,0] + 0.7152*c[...,1] + 0.0722*c[...,2]

# ---- A. what is at x 436..459 in 01?
img = np.asarray(Image.open(f"{S}\\01-dark-sunny.png").convert("RGB"), dtype=np.float64)
right = img[:, 436:, :]
rl = lum(right)
bright = rl > 0.55
print("A. right strip x[436..459]:")
print(f"   mean lum={rl.mean():.4f}  bright(>0.55) px={int(bright.sum())}")
if bright.sum():
    ys, xs = np.where(bright)
    print(f"   bright bbox: x[436+{xs.min()}..436+{xs.max()}] y[{ys.min()}..{ys.max()}]")
    # sample
    for i in range(0, min(len(ys), 5)):
        print(f"   sample ({436+xs[i]},{ys[i]}): rgb{tuple(right[ys[i], xs[i]].astype(int))}")

# col profile of right strip
colsum = bright.sum(axis=0)
print("   per-col bright counts:", [int(c) for c in colsum])

# ---- B. _full.png structure
full = np.asarray(Image.open(f"{S}\\_full.png").convert("RGB"), dtype=np.float64)
FH, FW = full.shape[:2]
print(f"\nB. _full.png {FW}x{FH}")
fl = lum(full)
# find content rows/cols (non-black)
row_bright = (fl > 0.08).sum(axis=1)
col_bright = (fl > 0.08).sum(axis=0)
ry = np.where(row_bright > 20)[0]; rx = np.where(col_bright > 20)[0]
print(f"   content bbox: x[{rx.min()}..{rx.max()}] y[{ry.min()}..{ry.max()}]")

# scan for card-sized blobs: find vertical gaps (rows with no content) to split into bands
empty = row_bright <= 2
bands = []
y = 0
while y < FH:
    if not empty[y]:
        y0 = y
        while y < FH and not empty[y]:
            y += 1
        bands.append((y0, y))
    else:
        y += 1
print(f"   {len(bands)} vertical bands: {bands}")

# horizontal split of each band
for (y0, y1) in bands:
    band = fl[y0:y1, :]
    cb = (band > 0.08).sum(axis=0)
    ex = cb <= 2
    xbands = []
    x = 0
    W = band.shape[1]
    while x < W:
        if not ex[x]:
            x0 = x
            while x < W and not ex[x]:
                x += 1
            xbands.append((x0, x))
        else:
            x += 1
    print(f"   band y[{y0}:{y1}] h={y1-y0}: {len(xbands)} x-chunks:")
    for (x0, x1) in xbands:
        chunk = full[y0:y1, x0:x1, :]
        m = chunk.reshape(-1,3).mean(axis=0)
        # hue analysis
        mx = chunk.max(axis=2); mn = chunk.min(axis=2)
        satm = ((mx-mn)/(mx+1e-6)).mean()
        print(f"     x[{x0}:{x1}] w={x1-x0}  avg=rgb({m[0]:.0f},{m[1]:.0f},{m[2]:.0f}) sat={satm:.3f} lum={lum(chunk).mean():.4f}")
