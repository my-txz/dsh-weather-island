# -*- coding: utf-8 -*-
"""Correct analysis for LIGHT cards (dark text on light bg) + settings page panels."""
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

LIGHT = {
    "04-light-sunny":  (47, 771, 1338, 1750),
    "05-light-snow":   (820, 1406, 24, 436),
    "08-light-failone":(820, 1406, 1338, 1750),
}

for name, (y0, y1, x0, x1) in LIGHT.items():
    c = full[y0:y1, x0:x1, :]
    h, w = c.shape[:2]
    L = lum(c)
    print(f"\n{'='*72}\n{name} (LIGHT, {w}x{h})")
    # dark text = lum < 0.35 (ink); bg = lum > 0.5
    ink = L < 0.35
    bgm = L > 0.5
    print(f"  ink px: {int(ink.sum())}  bg px: {int(bgm.sum())}")
    if bgm.sum():
        bgL = L[bgm].mean()
        print(f"  bg mean lum: {bgL:.3f}")
        # darkest text vs bg
        if ink.sum():
            inkL = np.percentile(L[ink], 30)
            cr = (bgL + 0.05) / (min(inkL, np.percentile(L[ink],10)) + 0.05)
            print(f"  ink p10/p30 lum: {np.percentile(L[ink],10):.3f}/{inkL:.3f}  vs bg CR≈{cr:.1f}:1")
    # secondary text (muted gray) detection: lum in 0.35..0.5
    mid = (L >= 0.35) & (L <= 0.5)
    if mid.sum() and bgm.sum():
        midL = L[mid].mean()
        cr = (bgL+0.05)/(midL+0.05)
        print(f"  muted-gray px: {int(mid.sum())} mean lum={midL:.3f} CR vs bg≈{cr:.1f}:1 (secondary text legibility)")
    # edge clipping: ink touching card edges
    t,bo,l,r = int(ink[:4].sum()), int(ink[-4:].sum()), int(ink[:,:4].sum()), int(ink[:,-4:].sum())
    print(f"  ink-touching-edge T/B/L/R: {t}/{bo}/{l}/{r}")
    # per-band ink presence
    for i in range(6):
        seg = ink[i*h//6:(i+1)*h//6]
        if seg.sum() > 10:
            ys_, xs_ = np.where(seg)
            print(f"    band{i}: ink={int(seg.sum())} x[{xs_.min()}..{xs_.max()}] y[{ys_.min()}..{ys_.max()}]")

# error/soft-red block on 08 (light-failone): find pink/red text-like pixels
print("\n08 light-failone red/pink detail:")
c = full[820:1406, 1338:1750, :]
r, g, b = c[...,0], c[...,1], c[...,2]
redm = (r > g*1.35) & (r > b*1.25) & (r > 120)
ys, xs = np.where(redm)
print(f"  red-ish px: {int(redm.sum())}")
if len(ys):
    from collections import Counter
    cnt = Counter((yy//30, xx//30) for yy, xx in zip(ys, xs))
    for (gy, gx), n in cnt.most_common(8):
        print(f"    cluster y={gy*30}-{gy*30+30} x={gx*30}-{gx*30+30}: {n}px")

# ---------------- settings panels
print("\n" + "="*72 + "\n09-settings.png panels")
simg = np.asarray(Image.open(f"{S}\\09-settings.png").convert("RGB"), dtype=np.float64)
H9, W9 = simg.shape[:2]
l9 = lum(simg)
# left panel x47-693, right panel x748-1428, plus a bottom strip y945-1006 on the right
panels = {"left (dark?)": (23, 933, 47, 693), "right (light?)": (23, 933, 748, 1428)}
for pname, (y0, y1, x0, x1) in panels.items():
    p = simg[y0:y1, x0:x1, :]
    L = lum(p)
    mean = L.mean()
    print(f"\n{pname}: {x1-x0}x{y1-y0} mean_lum={mean:.3f} => {'LIGHT theme' if mean > 0.3 else 'DARK theme'}")
    # panel bg
    bgm = L > 0.5 if mean > 0.3 else L < 0.15
    print(f"  bg-ish px: {int(bgm.sum())}")
    # text ink
    ink = L < 0.35 if mean > 0.3 else L > 0.55
    if ink.sum():
        ys_, xs_ = np.where(ink)
        print(f"  text px: {int(ink.sum())}, bbox x[{xs_.min()}..{xs_.max()}] y[{ys_.min()}..{ys_.max()}]")
        # rows with text → group into lines
        rowink = ink.sum(axis=1)
        lines = []
        y = 0; H = p.shape[0]
        while y < H:
            if rowink[y] > 3:
                y0l = y
                while y < H and rowink[y] > 3: y += 1
                lines.append((y0l, y))
            else: y += 1
        print(f"  text lines: {len(lines)}")
        for (a, bnd) in lines[:40]:
            seg = ink[a:bnd]
            xs2 = np.where(seg.any(axis=0))[0]
            # ink color sample
            px = p[a:bnd][seg]
            m = px.mean(axis=0)
            print(f"    y[{a}:{bnd}] x[{xs2.min()}..{xs2.max()}] n={int(seg.sum())} avg rgb({m[0]:.0f},{m[1]:.0f},{m[2]:.0f})")
    # accent colors: blue gradient selected segment
    r, g, b = p[...,0], p[...,1], p[...,2]
    bluem = (b > r*1.35) & (b > 100) & (b > g*1.1)
    redm = (r > g*1.6) & (r > b*1.6) & (r > 90)
    greenm = (g > r*1.3) & (g > b*1.3) & (g > 110)
    print(f"  blue px: {int(bluem.sum())}  red px: {int(redm.sum())}  green px: {int(greenm.sum())}")
    for m2, lab in [(bluem, "blue"), (redm, "red"), (greenm, "green")]:
        if m2.sum() > 20:
            ys2, xs2 = np.where(m2)
            ys2 = ys2[:len(ys2)]
            # cluster into regions
            from collections import Counter
            cnt = Counter((yy//40, xx//60) for yy, xx in zip(ys2, xs2))
            tops = [(k, v) for k, v in cnt.most_common(6) if v > 25]
            print(f"    {lab} clusters:", [(f"y{k[0]*40}-{k[0]*40+40}", f"x{k[1]*60}-{k[1]*60+60}", v) for k, v in tops])

# bottom strip y945-1006 x748-1428 (second settings panel continues?)
strip = simg[945:1006, 748:1428, :]
Ls = lum(strip)
print(f"\nbottom strip y[945:1006] x[748:1428]: mean_lum={Ls.mean():.3f} textish={int((np.abs(Ls-0.5)<0.4).sum())}")
ink = (Ls < 0.35) | (Ls > 0.55)
if ink.sum():
    ys3, xs3 = np.where(ink)
    print(f"  strip content px={int(ink.sum())} bbox x[{xs3.min()}..{xs3.max()}] y[{ys3.min()}..{ys3.max()}]")
