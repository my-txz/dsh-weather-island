# -*- coding: utf-8 -*-
"""2D grid analysis of _full.png: find card rows/cols, extract & compare each card."""
import sys, io
import numpy as np
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
S = r"E:\opencode项目\DSH自制天气插件\dsh-weather-island\shots"

def lum(px):
    c = px / 255.0
    c = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126*c[...,0] + 0.7152*c[...,1] + 0.0722*c[...,2]

full = np.asarray(Image.open(f"{S}\\_full.png").convert("RGB"), dtype=np.float64)
FH, FW = full.shape[:2]
fl = lum(full)

# split into y bands using empty rows (ignore the scrollbar col 1862:1871)
core = fl[:, :1855]
row_bright = (core > 0.06).sum(axis=1)
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
print(f"y bands: {bands}")

cards = []
for bi, (y0, y1) in enumerate(bands):
    band = fl[y0:y1, :1855]
    cb = (band > 0.06).sum(axis=0)
    ex = cb <= 2
    xbands = []
    x = 0
    W = band.shape[1]
    while x < W:
        if not ex[x]:
            x0 = x
            while x < W and not ex[x]:
                x += 1
            if x - x0 > 30:
                xbands.append((x0, x))
        else:
            x += 1
    print(f"band {bi} y[{y0}:{y1}] h={y1-y0}: x-chunks {xbands}")
    for (x0, x1) in xbands:
        cards.append((y0, y1, x0, x1))

print(f"\n{len(cards)} card candidates")
for i, (y0, y1, x0, x1) in enumerate(cards):
    c = full[y0:y1, x0:x1, :]
    m = c.reshape(-1, 3).mean(axis=0)
    mx = c.max(axis=2); mn = c.min(axis=2)
    satm = ((mx - mn) / (mx + 1e-6)).mean()
    # hue histogram
    r, g, b = c[...,0], c[...,1], c[...,2]
    mxc = c.max(axis=2); mnc = c.min(axis=2); sc = (mxc-mnc)/(mxc+1e-6)
    hue = np.zeros_like(r)
    mask = mxc == r; hue[mask] = (((g-b)/(mxc-mnc+1e-6))[mask]) % 6
    mask2 = (mxc == g) & ~mask; hue[mask2] = (((b-r)/(mxc-mnc+1e-6))[mask2]) + 2
    mask3 = (mxc == b) & ~mask & ~mask2; hue[mask3] = (((r-g)/(mxc-mnc+1e-6))[mask3]) + 4
    huedeg = hue * 60
    sp = huedeg[sc > 0.3]
    top = ""
    if len(sp):
        hist, edges = np.histogram(sp, bins=12, range=(0,360))
        idx = np.argsort(hist)[::-1][:3]
        top = " ".join(f"{int(edges[j])}°:{int(hist[j])}" for j in idx if hist[j] > 0)
    # error red pixels
    redm = (r > g*1.6) & (r > b*1.6) & (r > 90)
    print(f"  card{i} y[{y0}:{y1}] x[{x0}:{x1}] {x1-x0}x{y1-y0}  avg=rgb({m[0]:.0f},{m[1]:.0f},{m[2]:.0f}) lum={lum(c).mean():.3f} sat={satm:.3f} redpx={int(redm.sum())}  hues: {top}")

# pairwise similarity of cards (resized)
print("\npairwise similarity (resize to 100x220, mean abs diff):")
resized = []
for (y0, y1, x0, x1) in cards:
    im = Image.fromarray(full[y0:y1, x0:x1].astype(np.uint8)).resize((100, 220))
    resized.append(np.asarray(im, dtype=np.float64))
n = len(resized)
for i in range(n):
    for j in range(i+1, n):
        d = np.abs(resized[i] - resized[j]).mean()
        print(f"  card{i} vs card{j}: {d:.1f}")
