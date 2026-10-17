# -*- coding: utf-8 -*-
"""Identify which _full card matches the single shots; check row-2 clipping; red cluster analysis; 09-settings analysis."""
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
single = np.asarray(Image.open(f"{S}\\01-dark-sunny.png").convert("RGB"), dtype=np.float64)

# single card region: y26..806, x24..436
sc = single[26:806, 24:436, :]
print(f"single card: {sc.shape[1]}x{sc.shape[0]}")

CARDS = {
    "01-dark-sunny":   (47, 771, 24, 436),
    "02-dark-night":   (47, 771, 462, 874),
    "03-dark-rain":    (47, 771, 900, 1312),
    "04-light-sunny":  (47, 771, 1338, 1750),
    "05-light-snow":   (820, 1406, 24, 436),
    "06-dark-storm":   (820, 1406, 462, 874),
    "07-dark-failall": (820, 1406, 900, 1312),
    "08-light-failone":(820, 1406, 1338, 1750),
}

# compare single (resized to 100x200) with each _full card (resized 100x200)
sim = Image.fromarray(sc.astype(np.uint8)).resize((100, 200))
sima = np.asarray(sim, dtype=np.float64)
print("\nsingle-shot vs each _full card (mean abs diff, lower=more similar):")
for name, (y0, y1, x0, x1) in CARDS.items():
    cim = Image.fromarray(full[y0:y1, x0:x1].astype(np.uint8)).resize((100, 200))
    ca = np.asarray(cim, dtype=np.float64)
    print(f"  vs {name}: {np.abs(ca - sima).mean():.1f}")

# row-2 clipping check: is there content at the very bottom of _full (y1490-1500)?
print(f"\n_full bottom rows content (y1495..1500): {(lum(full[1495:1500]) > 0.06).sum()} px")
print(f"_full rows y1406..1495 content: {(lum(full[1406:1495]) > 0.06).sum()} px")
# content profile of last 120 rows of row2 cards
for name in ["05-light-snow", "06-dark-storm", "07-dark-failall", "08-light-failone"]:
    y0, y1, x0, x1 = CARDS[name]
    seg = full[y1-40:y1, x0:x1, :]
    br = lum(seg) > (0.5 if lum(full[y0:y1,x0:x1]).mean() < 0.3 else 0.3)
    print(f"  {name}: last-40-row bright px={int(br.sum())}  (content at card bottom)")

# red clusters in single shot
print("\nsingle-shot red-ish clusters (r>g*1.6 & r>b*1.6 & r>90):")
r, g, b = sc[...,0], sc[...,1], sc[...,2]
redm = (r > g*1.6) & (r > b*1.6) & (r > 90)
ys, xs = np.where(redm)
if len(ys):
    # cluster by coarse grid 40px
    from collections import Counter
    cnt = Counter((y//40, x//40) for y, x in zip(ys, xs))
    for (gy, gx), n in cnt.most_common(10):
        if n > 15:
            py = sc[gy*40:(gy+1)*40, gx*40:(gx+1)*40][redm[gy*40:(gy+1)*40, gx*40:(gx+1)*40]]
            m = py.mean(axis=0)
            print(f"  cell y={gy*40}-{gy*40+40} x={gx*40}-{gx*40+40}: {n}px avg rgb({m[0]:.0f},{m[1]:.0f},{m[2]:.0f})")

# 09-settings.png analysis
print("\n" + "="*74)
simg = np.asarray(Image.open(f"{S}\\09-settings.png").convert("RGB"), dtype=np.float64)
H9, W9 = simg.shape[:2]
print(f"09-settings.png {W9}x{H9}")
l9 = lum(simg)
# content bbox
row_bright = (l9 > 0.06).sum(axis=1)
col_bright = (l9 > 0.06).sum(axis=0)
ry = np.where(row_bright > 5)[0]; rx = np.where(col_bright > 5)[0]
print(f"content bbox x[{rx.min()}..{rx.max()}] y[{ry.min()}..{ry.max()}]")
# find the two theme panels (left/right) via vertical gaps
empty = row_bright <= 2
bands = []
y = 0
while y < H9:
    if not empty[y]:
        y0 = y
        while y < H9 and not empty[y]: y += 1
        bands.append((y0, y))
    else:
        y += 1
print(f"y bands: {bands}")
for (y0, y1) in bands:
    band = l9[y0:y1]
    cb = (band > 0.06).sum(axis=0)
    ex = cb <= 2
    xbands = []; x = 0
    W = band.shape[1]
    while x < W:
        if not ex[x]:
            x0 = x
            while x < W and not ex[x]: x += 1
            if x - x0 > 40: xbands.append((x0, x))
        else: x += 1
    print(f"  band y[{y0}:{y1}] h={y1-y0}: xchunks {xbands}")

# check bottom clipping of settings
print(f"last 10 rows bright px: {int((l9[-10:] > 0.06).sum())}")
print(f"content at very bottom row {H9-1}: {int((l9[-1] > 0.06).sum())} px")

# check right-edge clipping (2 panels side by side, 1560 wide => maybe 2x 780)
print(f"rightmost 5 cols bright px: {int((l9[:, -5:] > 0.06).sum())}")
