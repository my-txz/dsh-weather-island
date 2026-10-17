# -*- coding: utf-8 -*-
"""Final checks: row2 bottom clipping, text-line counts, 08 err block, settings strip red."""
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

# 1) text-line counts: 01 (724) vs 05 (586): row profiles of bright text
def text_lines(c, light):
    L = lum(c)
    ink = (L < 0.35) if light else (L > 0.55)
    rowink = ink.sum(axis=1)
    lines = []
    y = 0; H = c.shape[0]
    while y < H:
        if rowink[y] > 3:
            y0 = y
            while y < H and rowink[y] > 3: y += 1
            lines.append((y0, y, int(ink[y0:y].sum())))
        else: y += 1
    return lines

for name, (y0, y1, x0, x1, light) in {
    "01-dark-sunny(724)": (47, 771, 24, 436, False),
    "05-light-snow(586)": (820, 1406, 24, 436, True),
    "06-dark-storm(586)": (820, 1406, 462, 874, False),
    "07-dark-failall(587)": (820, 1407, 900, 1312, False),
    "08-light-failone(586)": (820, 1406, 1338, 1750, True),
}.items():
    c = full[y0:y1, x0:x1, :]
    lines = text_lines(c, light)
    print(f"\n{name}: {len(lines)} text lines; last 6:")
    for (a, b, n) in lines[-6:]:
        xs = np.where((lum(c[a:b]) < 0.35 if light else lum(c[a:b]) > 0.55).any(axis=0))[0]
        print(f"   y[{a}:{b}] h={b-a} x[{xs.min()}..{xs.max()}] n={n}  (abs y {y0+a}..{y0+b})")

# 2) 06 bottom edge slicing detail: bottom 30 rows
c6 = full[820:1406, 462:874, :]
L6 = lum(c6)
ink6 = L6 > 0.55
print("\n06-dark-storm bottom 30 rows ink per row:", [int(v) for v in ink6[-30:].sum(axis=1)])
print("06 card abs-bottom = y1406; last ink row at rel", int(np.where(ink6.any(axis=1))[0].max()))

# same for 07 and 08 and 05
for nm, (yy0, yy1, xx0, xx1, light) in {
    "07": (820, 1407, 900, 1312, False), "08": (820, 1406, 1338, 1750, True), "05": (820, 1406, 24, 436, True),
}.items():
    cc = full[yy0:yy1, xx0:xx1, :]
    LL = lum(cc)
    ii = (LL < 0.35) if light else (LL > 0.55)
    rows = np.where(ii.any(axis=1))[0]
    print(f"{nm}: last content row rel={rows.max()} of {cc.shape[0]-1} -> gap to edge = {cc.shape[0]-1-rows.max()}px")

# 3) 08 info block localization: find tinted region between sources(y~130?) and grid
c8 = full[820:1406, 1338:1750, :]
L8 = lum(c8)
r, g, b = c8[...,0], c8[...,1], c8[...,2]
# look for a blue/gray tinted band: pixels darker than bg but bluish
tint = (b > r) & (L8 < 0.62) & (L8 > 0.35)
rowtint = tint.sum(axis=1)
print("\n08 tinted (bluish darker) row profile (every 10px):")
for y in range(0, c8.shape[0], 10):
    n = int(rowtint[y:y+10].sum())
    if n > 300:
        print(f"   y[{y}:{y+10}] tint px={n}")

# 4) settings bottom strip red check
simg = np.asarray(Image.open(f"{S}\\09-settings.png").convert("RGB"), dtype=np.float64)
strip = simg[933:1100, 748:1428, :]
rs, gs, bs = strip[...,0], strip[...,1], strip[...,2]
redm = (rs > gs*1.5) & (rs > bs*1.5) & (rs > 90)
print(f"\nsettings bottom strip (y933-1100, right panel) red px: {int(redm.sum())}")
if redm.sum():
    ys, xs = np.where(redm)
    print(f"  red bbox x[{xs.min()}..{xs.max()}] y[{933+ys.min()}..{933+ys.max()}]")
    m = strip[redm].mean(axis=0)
    print(f"  avg red rgb({m[0]:.0f},{m[1]:.0f},{m[2]:.0f})")
# also left panel danger button zone: left panel bottom (y~730-933)
lp = simg[23:933, 47:693, :]
rl, gl, bl = lp[...,0], lp[...,1], lp[...,2]
redl = (rl > gl*1.5) & (rl > bl*1.5) & (rl > 90)
ys, xs = np.where(redl)
if len(ys):
    # biggest cluster
    print(f"\nsettings left panel red px total={int(redl.sum())}, bbox x[{xs.min()}..{xs.max()}] y[{23+ys.min()}..{23+ys.max()}]")
    from collections import Counter
    cnt = Counter((yy//30, xx//60) for yy, xx in zip(ys, xs))
    for k, v in cnt.most_common(5):
        yy0, yy1 = 23+k[0]*30, 23+k[0]*30+30
        xx0, xx1 = 47+k[1]*60, 47+k[1]*60+60
        seg = simg[yy0:yy1, xx0:xx1]
        mm = seg.reshape(-1,3).mean(axis=0)
        print(f"  cluster abs y[{yy0}:{yy1}] x[{xx0}:{xx1}] n={v} avg rgb({mm[0]:.0f},{mm[1]:.0f},{mm[2]:.0f})")
